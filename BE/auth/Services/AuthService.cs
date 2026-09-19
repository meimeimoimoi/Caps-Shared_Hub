using System.Security.Cryptography;
using System.Text;
using auth.Data;
using auth.DTOs.Requests;
using auth.DTOs.Responses;
using auth.Entities;
using auth.Services.Interface;
using Caps.Common.Exceptions;
using Caps.Common.Security;
using Microsoft.EntityFrameworkCore;

namespace auth.Services;

/// <summary>
/// Architecture-phase implementation: EF Core + SHA256 demo hash.
/// TODO(prod): replace with BCrypt/Argon2 + refresh tokens + lockout.
/// </summary>
public sealed class AuthService(AuthDbContext db, IJwtTokenService jwt) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw new DomainException("Email already registered.");

        var user = new User
        {
            Email = email,
            DisplayName = request.DisplayName ?? email.Split('@')[0],
            PasswordHash = Hash(request.Password),
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        var token = jwt.CreateToken(user.Id.ToString(), user.Email);
        return new AuthResponse(token, user.Id.ToString(), user.Email, user.DisplayName);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new NotFoundException("Invalid email or password.");
        if (user.PasswordHash != Hash(request.Password))
            throw new DomainException("Invalid email or password.");
        var token = jwt.CreateToken(user.Id.ToString(), user.Email);
        return new AuthResponse(token, user.Id.ToString(), user.Email, user.DisplayName);
    }

    private static string Hash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes("caps::" + input));
        return Convert.ToHexString(bytes);
    }
}
