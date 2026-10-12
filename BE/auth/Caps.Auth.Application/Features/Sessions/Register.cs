using Caps.Auth.Application.Abstractions;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Sessions;

public sealed record RegisterCommand(string Email, string Password, string? DisplayName);

public sealed class RegisterHandler(
    IEmailDomainPolicy emailPolicy,
    IUserRepository users,
    IPasswordHasher hasher,
    IAccountEmailQueue emails,
    ISessionIssuer sessions,
    IUnitOfWork unitOfWork
) : ICommandHandler<RegisterCommand, SessionResult>
{
    public async Task<SessionResult> HandleAsync(RegisterCommand command, CancellationToken ct)
    {
        // Reject disposable/undeliverable emails before creating the account and sending the verification email
        await emailPolicy.EnsureDeliverableAsync(command.Email, ct);
        var email = OpaqueTokens.NormalizeEmail(command.Email);
        if (await users.EmailExistsAsync(email, ct))
            throw EmailExists();
        var user = new User
        {
            Email = email,
            FullName = string.IsNullOrWhiteSpace(command.DisplayName)
                ? email.Split('@')[0]
                : command.DisplayName.Trim(),
        };
        user.PasswordHash = hasher.Hash(command.Password);
        await users.AddAsync(user, RoleCodes.User, ct);
        await emails.QueueAsync(user, VerificationPurpose.VerifyEmail, ct);
        var session = await sessions.IssueAsync(user, ct, isNew: true);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            throw EmailExists();
        }
        return session;
    }

    private static AuthFailure EmailExists() =>
        new(409, "EMAIL_EXISTS", "Email already registered.");
}
