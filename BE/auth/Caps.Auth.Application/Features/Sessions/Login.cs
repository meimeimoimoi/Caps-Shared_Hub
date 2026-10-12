using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Sessions;

public sealed record LoginCommand(string Email, string Password);

public sealed class LoginHandler(
    IUserRepository users,
    IPasswordHasher hasher,
    ISessionIssuer sessions,
    IUnitOfWork unitOfWork,
    AuthOptions options,
    TimeProvider clock
) : ICommandHandler<LoginCommand, SessionResult>
{
    public async Task<SessionResult> HandleAsync(LoginCommand command, CancellationToken ct)
    {
        var id = await users.FindIdByEmailAsync(OpaqueTokens.NormalizeEmail(command.Email), ct);
        if (id is null)
        {
            hasher.VerifyAgainstDummy(command.Password);
            throw AccountGuards.Invalid();
        }
        var now = clock.GetUtcNow();
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(id.Value, ct);
        AccountGuards.EnsureEligible(user);
        if (user.LockoutEnd > now)
            throw AccountGuards.Invalid();
        var result = hasher.Verify(user.PasswordHash, command.Password);
        if (result == PasswordCheck.Failed)
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= options.MaxFailedAttempts)
            {
                user.LockoutEnd = now.AddMinutes(options.LockoutMinutes);
                user.FailedLoginAttempts = 0;
            }
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw AccountGuards.Invalid();
        }
        if (result == PasswordCheck.SuccessRehashNeeded)
            user.PasswordHash = hasher.Hash(command.Password);
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;
        var session = await sessions.IssueAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return session;
    }
}
