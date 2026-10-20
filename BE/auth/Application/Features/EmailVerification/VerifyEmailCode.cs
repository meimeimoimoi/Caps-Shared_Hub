using Caps.Auth.Application.Abstractions.Messaging;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.EmailVerification;

/// <summary>Verification with the 6-digit code; returns a new ACTIVE session.</summary>
public sealed record VerifyEmailCodeCommand(Guid UserId, string Code);

/// <summary>Activates the account from the 6-digit code, with a limited number of attempts.</summary>
public sealed class VerifyEmailCodeHandler(
    IUserRepository users,
    IVerificationTokenRepository tokens,
    ISessionIssuer sessions,
    IAccountEventOutbox accountEvents,
    IUnitOfWork unitOfWork,
    AuthOptions options,
    TimeProvider clock
) : ICommandHandler<VerifyEmailCodeCommand, SessionResult>
{
    public async Task<SessionResult> HandleAsync(
        VerifyEmailCodeCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(command.UserId, ct);
        if (!user.IsPendingVerification)
            throw AuthErrors.AlreadyVerified();
        var now = clock.GetUtcNow();
        var code = await tokens.FindLatestActiveAsync(
            user.Id,
            VerificationPurpose.VerifyEmailCode,
            ct
        );
        if (code?.IsExpired(now) != false)
            throw AuthErrors.CodeExpired();
        if (code.AttemptsExhausted(options.MaxCodeAttempts))
            throw AuthErrors.CodeLocked();
        if (!OpaqueTokens.HashEquals(code.TokenHash, OpaqueTokens.HashCode(user.Id, command.Code)))
        {
            code.RecordFailedAttempt();
            // Keep the failed attempt even though the request fails
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw code.AttemptsExhausted(options.MaxCodeAttempts)
                ? AuthErrors.CodeLocked()
                : AuthErrors.CodeInvalid(options.MaxCodeAttempts - code.AttemptCount);
        }
        code.MarkUsed(now);
        user.VerifyEmail(now);
        accountEvents.StatusChanged(user);
        await tokens.InvalidateUnusedAsync(user.Id, VerificationPurpose.VerifyEmail, now, ct);
        // Return a new ACTIVE session so the user continues right away without signing in again
        var session = await sessions.IssueAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return session;
    }
}
