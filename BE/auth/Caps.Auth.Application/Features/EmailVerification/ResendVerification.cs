using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.EmailVerification;

public sealed record ResendVerificationCommand(Guid UserId);

public sealed class ResendVerificationHandler(
    IUserRepository users,
    IAccountEmailQueue emails,
    IUnitOfWork unitOfWork
) : ICommandHandler<ResendVerificationCommand>
{
    public async Task HandleAsync(ResendVerificationCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(command.UserId, ct);
        if (user.Status != UserStatus.PendingVerification)
            throw new AuthFailure(409, "ALREADY_VERIFIED", "Account is not pending verification.");
        await emails.QueueAsync(user, VerificationPurpose.VerifyEmail, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
