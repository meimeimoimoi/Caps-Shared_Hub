using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.EmailVerification;

/// <summary>Verification through the link in the email (the user may not be signed in).</summary>
public sealed record VerifyEmailCommand(string Token);

/// <summary>Activates the account from the emailed link.</summary>
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
        // An old link must not reveal whether the account is already verified
        if (!user.IsPendingVerification)
            throw AuthErrors.InvalidCredentials();
        var now = clock.GetUtcNow();
        token.MarkUsed(now);
        user.VerifyEmail(now);
        // Once verified via the link, the 6-digit code from the same email can no longer be used
        await tokens.InvalidateUnusedAsync(user.Id, VerificationPurpose.VerifyEmailCode, now, ct);
        // The old restricted session does not gain ACTIVE rights; the client refreshes to get them.
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
