using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Sessions;

public sealed record LogoutCommand(Guid UserId, string? RefreshToken);

public sealed class LogoutHandler(
    IUserRepository users,
    IRefreshTokenRepository refreshTokens,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<LogoutCommand>
{
    public async Task HandleAsync(LogoutCommand command, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(command.RefreshToken))
            return;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await users.GetLockedAsync(command.UserId, ct);
        var current = await refreshTokens.FindForUserAsync(
            OpaqueTokens.Hash(command.RefreshToken),
            command.UserId,
            ct
        );
        current?.Revoke(clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
