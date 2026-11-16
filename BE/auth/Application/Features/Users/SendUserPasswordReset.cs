using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Users;

/// <summary>A System Admin sends an account the password reset email.</summary>
public sealed record SendUserPasswordResetCommand(Guid UserId);

/// <summary>
/// Queues the same email as "forgot password"; the admin never sees or sets the password. Fails with
/// EMAIL_COOLDOWN when one was sent too recently and USER_CANNOT_SIGN_IN for a locked account.
/// </summary>
public sealed class SendUserPasswordResetHandler(
    IUserRepository users,
    IAccountEmailQueue emails,
    IUnitOfWork unitOfWork
) : ICommandHandler<SendUserPasswordResetCommand>
{
    public async Task HandleAsync(SendUserPasswordResetCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.LockAsync(command.UserId, ct) ?? throw AuthErrors.UserNotFound();
        if (!user.CanSignIn)
        {
            throw AuthErrors.UserCannotSignIn();
        }
        await emails.QueueAsync(user, VerificationPurpose.ResetPassword, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
