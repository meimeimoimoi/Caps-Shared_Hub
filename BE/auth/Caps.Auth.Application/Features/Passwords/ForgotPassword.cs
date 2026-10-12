using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Passwords;

public sealed record ForgotPasswordCommand(string Email);

/// <summary>Always succeeds silently so the response never reveals whether the email exists.</summary>
public sealed class ForgotPasswordHandler(
    IUserRepository users,
    IVerificationTokenRepository tokens,
    IAccountEmailQueue emails,
    IUnitOfWork unitOfWork,
    AuthOptions options,
    TimeProvider clock
) : ICommandHandler<ForgotPasswordCommand>
{
    public async Task HandleAsync(ForgotPasswordCommand command, CancellationToken ct)
    {
        var id = await users.FindIdByEmailAsync(OpaqueTokens.NormalizeEmail(command.Email), ct);
        if (id is null)
            return;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(id.Value, ct);
        if (!user.CanSignIn)
            return;
        // Same response even during cooldown, to avoid revealing whether the email exists.
        var since = clock.GetUtcNow().AddSeconds(-options.EmailCooldownSeconds);
        if (
            await tokens.AnyCreatedSinceAsync(user.Id, VerificationPurpose.ResetPassword, since, ct)
        )
            return;
        await emails.QueueAsync(user, VerificationPurpose.ResetPassword, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
