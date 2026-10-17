using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Sessions;

/// <summary>Signs this device out; the refresh token comes from its cookie.</summary>
/// <param name="TokenId">The jti of the access token used for this request, revoked everywhere until it expires.</param>
public sealed record LogoutCommand(
    Guid UserId,
    string? RefreshToken,
    string? TokenId,
    DateTimeOffset? TokenExpiresAt
);

/// <summary>Signs this device out: revokes its refresh token and its access token in every service.</summary>
public sealed class LogoutHandler(
    IUserRepository users,
    IRefreshTokenRepository refreshTokens,
    ISessionRevocationStore revocations,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<LogoutCommand>
{
    public async Task HandleAsync(LogoutCommand command, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(command.RefreshToken))
            await RevokeRefreshTokenAsync(command.UserId, command.RefreshToken, ct);
        // Only this device: its access token stops working now instead of when it expires
        if (!string.IsNullOrEmpty(command.TokenId) && command.TokenExpiresAt is { } expiresAt)
            await revocations.RevokeTokenAsync(command.TokenId, expiresAt, ct);
    }

    private async Task RevokeRefreshTokenAsync(
        Guid userId,
        string refreshToken,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await users.GetLockedAsync(userId, ct);
        var current = await refreshTokens.FindForUserAsync(
            OpaqueTokens.Hash(refreshToken),
            userId,
            ct
        );
        current?.Revoke(clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
