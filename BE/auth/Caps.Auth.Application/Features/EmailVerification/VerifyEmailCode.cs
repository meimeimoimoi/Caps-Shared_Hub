using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.EmailVerification;

/// <summary>Verification with the 6-digit code; returns a new ACTIVE session.</summary>
public sealed record VerifyEmailCodeCommand(Guid UserId, string Code);

public sealed class VerifyEmailCodeHandler(
    IUserRepository users,
    IVerificationTokenRepository tokens,
    ISessionIssuer sessions,
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
        if (user.Status != UserStatus.PendingVerification)
            throw new AuthFailure(409, "ALREADY_VERIFIED", "Account is not pending verification.");
        var now = clock.GetUtcNow();
        var row = await tokens.FindLatestActiveAsync(
            user.Id,
            VerificationPurpose.VerifyEmailCode,
            ct
        );
        if (row == null || row.ExpiresAt <= now)
            throw new AuthFailure(
                400,
                "CODE_EXPIRED",
                "The code has expired. Request a new email."
            );
        if (row.AttemptCount >= options.MaxCodeAttempts)
            throw CodeLocked();
        if (!OpaqueTokens.HashEquals(row.TokenHash, OpaqueTokens.HashCode(user.Id, command.Code)))
        {
            row.AttemptCount++;
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw row.AttemptCount >= options.MaxCodeAttempts
                ? CodeLocked()
                : new AuthFailure(
                    400,
                    "CODE_INVALID",
                    $"Incorrect code. {options.MaxCodeAttempts - row.AttemptCount} attempts left."
                );
        }
        row.UsedAt = now;
        user.EmailVerifiedAt = now;
        user.Status = UserStatus.Active;
        user.UpdatedAt = now;
        await tokens.InvalidateUnusedAsync(user.Id, VerificationPurpose.VerifyEmail, now, ct);
        // Return a new ACTIVE session so the user continues right away without signing in again
        var session = await sessions.IssueAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return session;
    }

    private static AuthFailure CodeLocked() =>
        new(429, "CODE_LOCKED", "Too many incorrect codes. Request a new email.");
}
