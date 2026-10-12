using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.Common;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Passwords;

public sealed record ResetPasswordCommand(string Token, string Password);

public sealed class ResetPasswordHandler(
    IVerificationTokenRedeemer redeemer,
    IVerificationTokenRepository tokens,
    IPasswordHasher hasher,
    ISessionIssuer sessions,
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
        AccountGuards.EnsureEligible(user);
        var now = clock.GetUtcNow();
        user.PasswordHash = hasher.Hash(command.Password);
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;
        user.UpdatedAt = now;
        token.UsedAt = now;
        await sessions.RevokeAllAsync(user, ct);
        await tokens.InvalidateUnusedAsync(user.Id, VerificationPurpose.ResetPassword, now, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
