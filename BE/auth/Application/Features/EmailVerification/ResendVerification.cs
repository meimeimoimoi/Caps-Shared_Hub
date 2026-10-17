using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.EmailVerification;

/// <summary>Sends a new verification email to the signed-in, still unverified account.</summary>
public sealed record ResendVerificationCommand(Guid UserId);

/// <summary>Queues a fresh verification email; older links stop working.</summary>
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
        if (!user.IsPendingVerification)
            throw AuthErrors.AlreadyVerified();
        await emails.QueueAsync(user, VerificationPurpose.VerifyEmail, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
