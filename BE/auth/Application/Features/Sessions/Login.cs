using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Users;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Sessions;

/// <summary>Email and password sign-in.</summary>
public sealed record LoginCommand(string Email, string Password);

/// <summary>Signs in, counting wrong passwords towards a lockout without revealing which part was wrong.</summary>
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
        var id = await users.FindIdByEmailAsync(User.NormalizeEmail(command.Email), ct);
        if (id is null)
        {
            hasher.VerifyAgainstDummy(command.Password);
            throw AuthErrors.InvalidCredentials();
        }
        var now = clock.GetUtcNow();
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(id.Value, ct);
        user.EnsureCanSignIn();
        if (user.IsLockedOut(now))
            throw AuthErrors.InvalidCredentials();
        var result = hasher.Verify(user.PasswordHash, command.Password);
        if (result == PasswordCheck.Failed)
        {
            user.RecordFailedLogin(
                options.MaxFailedAttempts,
                TimeSpan.FromMinutes(options.LockoutMinutes),
                now
            );
            // Keep the failed attempt even though the request fails
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw AuthErrors.InvalidCredentials();
        }
        user.RecordSuccessfulLogin(
            result == PasswordCheck.SuccessRehashNeeded ? hasher.Hash(command.Password) : null
        );
        var session = await sessions.IssueAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return session;
    }
}
