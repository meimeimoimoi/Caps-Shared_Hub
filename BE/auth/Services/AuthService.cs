using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using auth.Data;
using auth.DTOs.Requests;
using auth.DTOs.Responses;
using auth.Entities;
using auth.Services.Interface;
using Caps.Common.Messaging;
using Caps.Common.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

namespace auth.Services;
public sealed class AuthService(AuthDbContext db, IPasswordHasher<User> hasher, JwtOptions jwt,
    IOptions<AuthOptions> options, IDataProtectionProvider protection, TimeProvider clock) : IAuthService
{
    private readonly AuthOptions o = options.Value;
    private DateTimeOffset Now => clock.GetUtcNow();
    private readonly IDataProtector protector = protection.CreateProtector("AuthEmailOutbox.v1");
    private static string Normalize(string email) => email.Trim().ToLowerInvariant();
    private static string Secret() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    public static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    private static AuthFailure Invalid() => new(401, "INVALID_CREDENTIALS", "Invalid credentials or token.");
    private async Task<User> Lock(Guid id, CancellationToken ct) =>
        await db.Users.FromSqlInterpolated($"SELECT * FROM identity.users WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw Invalid();
    private async Task<User> Find(Guid id, CancellationToken ct) => await db.Users.FindAsync([id], ct) ?? throw Invalid();
    private static void Eligible(User u) { if (u.Status != "ACTIVE" && u.Status != "PENDING_VERIFICATION") throw Invalid(); }
    private static void Active(User u) { if (u.Status != "ACTIVE") throw new AuthFailure(403, "ACCOUNT_NOT_ACTIVE", "Email verification and active account required."); }

    public async Task<SessionResult> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        var email = Normalize(request.Email);
        if (await db.Users.AnyAsync(x => x.Email == email, ct)) throw new AuthFailure(409, "EMAIL_EXISTS", "Email already registered.");
        var user = new User { Email = email, FullName = string.IsNullOrWhiteSpace(request.DisplayName) ? email.Split('@')[0] : request.DisplayName.Trim() };
        user.PasswordHash = hasher.HashPassword(user, request.Password);
        var role = await db.Roles.SingleAsync(x => x.Code == "USER", ct);
        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await QueueEmail(user, "VERIFY_EMAIL", ct);
        var session = await Session(user, null, ct);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: "23505" })
        { throw new AuthFailure(409, "EMAIL_EXISTS", "Email already registered."); }
        return session;
    }
    public async Task<SessionResult> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var id = await db.Users.Where(x => x.Email == Normalize(request.Email)).Select(x => (Guid?)x.Id).SingleOrDefaultAsync(ct);
        if (id is null) { hasher.VerifyHashedPassword(new User(), DummyHash, request.Password); throw Invalid(); }
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await Lock(id.Value, ct);
        Eligible(user);
        if (user.LockoutEnd > Now) throw Invalid();
        var result = user.PasswordHash.Length == 64 ? PasswordVerificationResult.Failed : hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= o.MaxFailedAttempts) { user.LockoutEnd = Now.AddMinutes(o.LockoutMinutes); user.FailedLoginAttempts = 0; }
            await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); throw Invalid();
        }
        if (result == PasswordVerificationResult.SuccessRehashNeeded) user.PasswordHash = hasher.HashPassword(user, request.Password);
        user.FailedLoginAttempts = 0; user.LockoutEnd = null;
        var session = await Session(user, null, ct);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return session;
    }
    private static readonly string DummyHash = new PasswordHasher<User>().HashPassword(new User(), "Unused-account-timing-padding-42");
    public async Task<SessionResult> RefreshAsync(string token, CancellationToken ct)
    {
        var hash = HashToken(token);
        var found = await db.RefreshTokens.AsNoTracking().SingleOrDefaultAsync(x => x.TokenHash == hash, ct) ?? throw Invalid();
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await Lock(found.UserId, ct); Eligible(user);
        var current = await db.RefreshTokens.SingleAsync(x => x.Id == found.Id, ct);
        if (current.RevokedAt != null)
        {
            // Chính sách bảo thủ: replay thu hồi mọi refresh session của user.
            await RevokeAll(user, ct); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); throw Invalid();
        }
        if (current.ExpiresAt <= Now) throw Invalid();
        current.RevokedAt = Now;
        var session = await Session(user, current.Id, ct);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return session;
    }
    public async Task LogoutAsync(Guid userId, string? token, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(token)) return;
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await Lock(userId, ct);
        var hash = HashToken(token);
        var current = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash && x.UserId == userId, ct);
        if (current != null && current.RevokedAt == null) current.RevokedAt = Now;
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
    public async Task VerifyAsync(string token, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var (user, verification) = await Verification(token, "VERIFY_EMAIL", ct);
        if (user.Status != "PENDING_VERIFICATION") throw Invalid();
        verification.UsedAt = Now; user.EmailVerifiedAt = Now; user.Status = "ACTIVE"; user.UpdatedAt = Now;
        // Phiên hạn chế cũ không tự nhận quyền ACTIVE; client refresh để lấy quyền mới.
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
    public async Task ResendAsync(Guid id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await Lock(id, ct);
        if (user.Status != "PENDING_VERIFICATION") throw new AuthFailure(409, "ALREADY_VERIFIED", "Account is not pending verification.");
        await QueueEmail(user, "VERIFY_EMAIL", ct);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
    public async Task ForgotAsync(string email, CancellationToken ct)
    {
        var id = await db.Users.Where(x => x.Email == Normalize(email)).Select(x => (Guid?)x.Id).SingleOrDefaultAsync(ct);
        if (id is null) return;
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var user = await Lock(id.Value, ct);
        if (user.Status != "ACTIVE" && user.Status != "PENDING_VERIFICATION") return;
        // Response chung, kể cả bị cooldown, tránh tiết lộ email tồn tại.
        if (await db.VerificationTokens.AnyAsync(x => x.UserId == user.Id && x.Purpose == "RESET_PASSWORD" && x.CreatedAt > Now.AddSeconds(-o.EmailCooldownSeconds), ct)) return;
        await QueueEmail(user, "RESET_PASSWORD", ct);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
    public async Task ResetAsync(ResetPasswordRequest request, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var (user, verification) = await Verification(request.Token, "RESET_PASSWORD", ct); Eligible(user);
        user.PasswordHash = hasher.HashPassword(user, request.Password); user.FailedLoginAttempts = 0; user.LockoutEnd = null; user.UpdatedAt = Now;
        verification.UsedAt = Now; await RevokeAll(user, ct);
        await db.VerificationTokens.Where(x => x.UserId == user.Id && x.Purpose == "RESET_PASSWORD" && x.UsedAt == null && x.InvalidatedAt == null)
            .ExecuteUpdateAsync(x => x.SetProperty(t => t.InvalidatedAt, Now), ct);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
    private async Task<(User, VerificationToken)> Verification(string raw, string purpose, CancellationToken ct)
    {
        var hash = HashToken(raw);
        var existing = await db.VerificationTokens.AsNoTracking().SingleOrDefaultAsync(x => x.TokenHash == hash && x.Purpose == purpose, ct) ?? throw Invalid();
        var user = await Lock(existing.UserId, ct);
        var token = await db.VerificationTokens.SingleAsync(x => x.Id == existing.Id, ct);
        if (token.UsedAt != null || token.InvalidatedAt != null || token.ExpiresAt <= Now) throw Invalid();
        return (user, token);
    }
    private async Task QueueEmail(User user, string purpose, CancellationToken ct)
    {
        if (await db.VerificationTokens.AnyAsync(x => x.UserId == user.Id && x.Purpose == purpose && x.CreatedAt > Now.AddSeconds(-o.EmailCooldownSeconds), ct))
            throw new AuthFailure(429, "EMAIL_COOLDOWN", "Please wait before requesting another email.");
        await db.VerificationTokens.Where(x => x.UserId == user.Id && x.Purpose == purpose && x.UsedAt == null && x.InvalidatedAt == null)
            .ExecuteUpdateAsync(x => x.SetProperty(t => t.InvalidatedAt, Now), ct);
        var raw = Secret(); var expires = Now.AddMinutes(purpose == "VERIFY_EMAIL" ? o.VerificationMinutes : o.ResetMinutes);
        db.VerificationTokens.Add(new VerificationToken { UserId = user.Id, Purpose = purpose, TokenHash = HashToken(raw), CreatedAt = Now, ExpiresAt = expires });
        var path = purpose == "VERIFY_EMAIL" ? "/verify-email" : "/reset-password";
        var payload = new AuthEmailRequestedEvent(Guid.NewGuid(), user.Email, purpose, o.FrontendUrl.TrimEnd('/') + path + "?token=" + raw, expires);
        db.EmailOutbox.Add(new AuthEmailOutbox { Id = payload.Id, ProtectedPayload = protector.Protect(JsonSerializer.Serialize(payload)), CreatedAt = Now });
    }
    private async Task RevokeAll(User user, CancellationToken ct)
    {
        user.TokenVersion++;
        await db.RefreshTokens.Where(x => x.UserId == user.Id && x.RevokedAt == null)
            .ExecuteUpdateAsync(x => x.SetProperty(t => t.RevokedAt, Now), ct);
    }
    private async Task<SessionResult> Session(User user, Guid? parent, CancellationToken ct)
    {
        var me = await Describe(user, ct);
        var claims = new List<Claim> { new(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), new("account_status", user.Status), new("token_version", user.TokenVersion.ToString()) };
        if (user.Status == "ACTIVE") { claims.AddRange(me.Roles.Select(x => new Claim("role", x))); claims.AddRange(me.Permissions.Select(x => new Claim("permission", x))); }
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key));
        var access = new JwtSecurityToken(jwt.Issuer, jwt.Audience, claims, Now.UtcDateTime, Now.AddMinutes(o.AccessMinutes).UtcDateTime, new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        var raw = Secret(); var expiry = Now.AddDays(o.RefreshDays);
        db.RefreshTokens.Add(new AuthRefreshToken { UserId = user.Id, TokenHash = HashToken(raw), ExpiresAt = expiry, IssuedAt = Now, RotatedFrom = parent });
        return new(new(new JwtSecurityTokenHandler().WriteToken(access), o.AccessMinutes * 60, me), raw, expiry);
    }
    private async Task<MeResponse> Describe(User u, CancellationToken ct)
    {
        var roles = await db.UserRoles.Where(x => x.UserId == u.Id).Select(x => x.Role.Code).ToArrayAsync(ct);
        // Khớp với JWT: chỉ tài khoản ACTIVE mới có quyền nghiệp vụ.
        var permissions = u.Status == "ACTIVE"
            ? await db.UserRoles.Where(x => x.UserId == u.Id).SelectMany(x => x.Role.RolePermissions).Select(x => x.Permission.Code).Distinct().ToArrayAsync(ct)
            : [];
        // Đăng ký mới chưa SaveChanges nên role cố định USER chỉ trong response.
        if (db.Entry(u).State == EntityState.Added) roles = ["USER"];
        return new(u.Id.ToString(), u.Email, u.FullName, u.Phone, u.Status, u.EmailVerifiedAt != null, roles, permissions);
    }
    public async Task<MeResponse> MeAsync(Guid id, CancellationToken ct) => await Describe(await Find(id, ct), ct);
    public async Task<MeResponse> UpdateAsync(Guid id, UpdateProfileRequest r, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var u = await Lock(id, ct); Active(u); u.FullName = r.DisplayName.Trim(); u.Phone = r.Phone?.Trim(); u.UpdatedAt = Now;
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return await Describe(u, ct);
    }
    private async Task BusinessAccess(Guid id, CancellationToken ct)
    {
        Active(await Find(id, ct));
        if (!await db.UserRoles.AnyAsync(x => x.UserId == id && x.Role.Code == "USER", ct)) throw new AuthFailure(403, "USER_ROLE_REQUIRED", "USER role required.");
    }
    private static BusinessResponse ToBusiness(BusinessProfile b) => new(b.CompanyName, b.TaxCode, b.Address, b.Representative, b.ContactEmail, b.ContactPhone);
    public async Task<BusinessResponse?> BusinessAsync(Guid id, CancellationToken ct)
    {
        await BusinessAccess(id, ct); var b = await db.BusinessProfiles.SingleOrDefaultAsync(x => x.UserId == id, ct); return b == null ? null : ToBusiness(b);
    }
    public async Task<BusinessResponse> UpdateBusinessAsync(Guid id, BusinessProfileRequest r, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct); await Lock(id, ct); await BusinessAccess(id, ct);
        var b = await db.BusinessProfiles.SingleOrDefaultAsync(x => x.UserId == id, ct);
        if (b == null) { b = new BusinessProfile { UserId = id }; db.BusinessProfiles.Add(b); }
        b.CompanyName = r.CompanyName.Trim(); b.TaxCode = r.TaxCode.Trim(); b.Address = r.Address?.Trim(); b.Representative = r.Representative?.Trim(); b.ContactEmail = r.ContactEmail?.Trim(); b.ContactPhone = r.ContactPhone?.Trim(); b.UpdatedAt = Now;
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return ToBusiness(b);
    }
}
