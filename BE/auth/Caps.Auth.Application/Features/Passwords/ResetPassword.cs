using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.Common;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Passwords;

/// <summary>The emailed reset token and the new password.</summary>
public sealed record ResetPasswordCommand(string Token, string Password);

/// <summary>Sets the new password, lifts any lockout and signs out every session.</summary>
public sealed class ResetPasswordHandler(
    IVerificationTokenRedeemer redeemer,
    IVerificationTokenRepository tokens,
    IPasswordHasher hasher,
    ISessionIssuer sessions,
    ISessionRevocationStore revocations,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ResetPasswordCommand>
{
    public async Task HandleAsync(ResetPasswordCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var (user, token) = await redeemer.FindUsableAsync(
            command.Token,
            VerificationPurpose.ResetPassword,
            ct
        );
        user.EnsureCanSignIn();
        var now = clock.GetUtcNow();
        user.ResetPassword(hasher.Hash(command.Password), now);
        token.MarkUsed(now);
        // Anyone holding an old session or another reset link is signed out
        await sessions.RevokeAllAsync(user, ct);
        await tokens.InvalidateUnusedAsync(user.Id, VerificationPurpose.ResetPassword, now, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await revocations.RevokeAllAsync(user.Id, user.TokenVersion, ct);
    }
}
