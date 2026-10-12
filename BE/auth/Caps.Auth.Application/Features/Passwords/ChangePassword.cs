using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Passwords;

public sealed record ChangePasswordCommand(Guid UserId, string CurrentPassword, string NewPassword);

public sealed class ChangePasswordHandler(
    IUserRepository users,
    IPasswordHasher hasher,
    ISessionIssuer sessions,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ChangePasswordCommand, SessionResult>
{
    public async Task<SessionResult> HandleAsync(
        ChangePasswordCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(command.UserId, ct);
        user.EnsureCanSignIn();
        if (hasher.Verify(user.PasswordHash, command.CurrentPassword) == PasswordCheck.Failed)
            throw AuthErrors.CurrentPasswordInvalid();
        if (command.NewPassword == command.CurrentPassword)
            throw AuthErrors.PasswordUnchanged();
        user.ChangePassword(hasher.Hash(command.NewPassword), clock.GetUtcNow());
        // Sign out every other device; the current device gets a new session right below.
        await sessions.RevokeAllAsync(user, ct);
        var session = await sessions.IssueAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return session;
    }
}
