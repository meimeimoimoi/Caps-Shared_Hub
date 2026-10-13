using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Sessions;

public sealed record RefreshSessionCommand(string RefreshToken);

public sealed class RefreshSessionHandler(
    IUserRepository users,
    IRefreshTokenRepository refreshTokens,
    ISessionIssuer sessions,
    ISessionRevocationStore revocations,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RefreshSessionCommand, SessionResult>
{
    public async Task<SessionResult> HandleAsync(
        RefreshSessionCommand command,
        CancellationToken ct
    )
    {
        var found =
            await refreshTokens.FindByHashAsync(OpaqueTokens.Hash(command.RefreshToken), ct)
            ?? throw AuthErrors.InvalidCredentials();
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(found.UserId, ct);
        user.EnsureCanSignIn();
        var current = await refreshTokens.GetAsync(found.Id, ct);
        if (current.IsRevoked)
        {
            // A rotated token being reused => likely stolen: revoke every refresh session.
            // A token revoked by sign-out/password change/reset is only rejected, so an old device
            // refreshing on its own does not kick out the user's new session.
            if (await refreshTokens.HasSuccessorAsync(current.Id, ct))
            {
                await sessions.RevokeAllAsync(user, ct);
                await unitOfWork.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                await revocations.RevokeAllAsync(user.Id, user.TokenVersion, ct);
            }
            throw AuthErrors.InvalidCredentials();
        }
        var now = clock.GetUtcNow();
        if (current.IsExpired(now))
            throw AuthErrors.InvalidCredentials();
        current.Revoke(now);
        var session = await sessions.IssueAsync(user, ct, rotatedFrom: current.Id);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return session;
    }
}
