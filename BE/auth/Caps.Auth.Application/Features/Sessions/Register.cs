using Caps.Auth.Application.Abstractions;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Sessions;

/// <summary>Sign-up with email and password; the account starts unverified.</summary>
public sealed record RegisterCommand(string Email, string Password, string? DisplayName);

/// <summary>Creates the account, sends the verification email and signs the new user in.</summary>
public sealed class RegisterHandler(
    IEmailDomainPolicy emailPolicy,
    IUserRepository users,
    IPasswordHasher hasher,
    IAccountEmailQueue emails,
    ISessionIssuer sessions,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RegisterCommand, SessionResult>
{
    public async Task<SessionResult> HandleAsync(RegisterCommand command, CancellationToken ct)
    {
        // Reject disposable/undeliverable emails before creating the account and sending the verification email
        await emailPolicy.EnsureDeliverableAsync(command.Email, ct);
        if (await users.EmailExistsAsync(User.NormalizeEmail(command.Email), ct))
            throw AuthErrors.EmailExists();
        var user = User.Register(
            command.Email,
            command.DisplayName,
            hasher.Hash(command.Password),
            clock.GetUtcNow()
        );
        await users.AddAsync(user, RoleCodes.User, ct);
        await emails.QueueAsync(user, VerificationPurpose.VerifyEmail, ct);
        var session = await sessions.IssueAsync(user, ct, isNew: true);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Lost a race with a concurrent sign-up for the same email
            throw AuthErrors.EmailExists();
        }
        return session;
    }
}
