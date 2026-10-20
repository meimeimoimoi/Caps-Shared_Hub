using Caps.Auth.Application.Abstractions.Messaging;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Users;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Sessions;

/// <summary>Sign-in with the ID token returned by Google Identity Services on the SPA.</summary>
public sealed record GoogleLoginCommand(string IdToken);

/// <summary>
/// Signs in with Google: finds the account by Google id, then by verified email (linking it),
/// and otherwise creates an active account without a password.
/// </summary>
public sealed class GoogleLoginHandler(
    IGoogleIdTokenValidator google,
    IUserRepository users,
    ISessionIssuer sessions,
    IAccountEventOutbox accountEvents,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<GoogleLoginCommand, SessionResult>
{
    public async Task<SessionResult> HandleAsync(GoogleLoginCommand command, CancellationToken ct)
    {
        var identity = await google.ValidateAsync(command.IdToken, ct);
        // Linking by email is only safe when Google vouches for the address
        if (!identity.EmailVerified)
            throw AuthErrors.GoogleEmailUnverified();
        var id =
            await users.FindIdByGoogleSubjectAsync(identity.Subject, ct)
            ?? await users.FindIdByEmailAsync(User.NormalizeEmail(identity.Email), ct);
        if (id is null)
            return await RegisterAsync(identity, ct);

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(id.Value, ct);
        user.EnsureCanSignIn();
        var wasPending = user.IsPendingVerification;
        user.LinkGoogle(identity.Subject, clock.GetUtcNow());
        // Linking a verified Google account activates a pending account
        if (wasPending && !user.IsPendingVerification)
            accountEvents.StatusChanged(user);
        var session = await sessions.IssueAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return session;
    }

    private async Task<SessionResult> RegisterAsync(GoogleIdentity identity, CancellationToken ct)
    {
        var user = User.RegisterWithGoogle(
            identity.Email,
            identity.Name,
            identity.Subject,
            clock.GetUtcNow()
        );
        await users.AddAsync(user, RoleCodes.User, ct);
        accountEvents.StatusChanged(user);
        var session = await sessions.IssueAsync(user, ct, isNew: true);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Lost a race with a concurrent sign-up for the same email or Google account
            throw AuthErrors.EmailExists();
        }
        return session;
    }
}
