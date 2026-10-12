using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.EmailVerification;

/// <summary>Verification through the link in the email (the user may not be signed in).</summary>
public sealed record VerifyEmailCommand(string Token);

public sealed class VerifyEmailHandler(
    IVerificationTokenRedeemer redeemer,
    IVerificationTokenRepository tokens,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<VerifyEmailCommand>
{
    public async Task HandleAsync(VerifyEmailCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var (user, token) = await redeemer.FindUsableAsync(
            command.Token,
            VerificationPurpose.VerifyEmail,
            ct
        );
        if (user.Status != UserStatus.PendingVerification)
            throw AccountGuards.Invalid();
        var now = clock.GetUtcNow();
        token.UsedAt = now;
        user.EmailVerifiedAt = now;
        user.Status = UserStatus.Active;
        user.UpdatedAt = now;
        // Once verified via the link, the 6-digit code from the same email can no longer be used
        await tokens.InvalidateUnusedAsync(user.Id, VerificationPurpose.VerifyEmailCode, now, ct);
        // The old restricted session does not gain ACTIVE rights; the client refreshes to get them.
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
