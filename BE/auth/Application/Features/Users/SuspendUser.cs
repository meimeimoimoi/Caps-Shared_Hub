using Caps.Auth.Application.Abstractions.Messaging;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Users;

/// <summary>A System Admin locks an account, giving the reason.</summary>
public sealed record SuspendUserCommand(Guid AdminUserId, Guid UserId, string? Reason);

/// <summary>
/// Locks the account, ends every session it has and tells the other services, so the lock takes effect at once
/// instead of when the access token expires.
/// </summary>
public sealed class SuspendUserHandler(
    IUserRepository users,
    IUserDirectoryReader directory,
    ISessionIssuer sessions,
    ISessionRevocationStore revocations,
    IAccountEventOutbox accountEvents,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SuspendUserCommand, ManagedUserResponse>
{
    public async Task<ManagedUserResponse> HandleAsync(
        SuspendUserCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.LockAsync(command.UserId, ct) ?? throw AuthErrors.UserNotFound();
        user.Suspend(command.AdminUserId, command.Reason, clock.GetUtcNow());
        await sessions.RevokeAllAsync(user, ct);
        accountEvents.StatusChanged(user);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // Published after commit, so other services never see a revocation that was rolled back
        await revocations.RevokeAllAsync(user.Id, user.TokenVersion, ct);
        return await directory.FindAsync(user.Id, ct) ?? throw AuthErrors.UserNotFound();
    }
}
