using Caps.Auth.Application.Abstractions.Messaging;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Users;

/// <summary>A System Admin unlocks a suspended account.</summary>
public sealed record ReinstateUserCommand(Guid UserId);

/// <summary>Returns the account to its status before the lock and tells the other services; the user signs in again.</summary>
public sealed class ReinstateUserHandler(
    IUserRepository users,
    IUserDirectoryReader directory,
    IAccountEventOutbox accountEvents,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ReinstateUserCommand, ManagedUserResponse>
{
    public async Task<ManagedUserResponse> HandleAsync(
        ReinstateUserCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user =
            await users.LockAsync(command.UserId, ct) ?? throw AuthErrors.UserNotFound();
        user.Reinstate(clock.GetUtcNow());
        accountEvents.StatusChanged(user);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await directory.FindAsync(user.Id, ct) ?? throw AuthErrors.UserNotFound();
    }
}
