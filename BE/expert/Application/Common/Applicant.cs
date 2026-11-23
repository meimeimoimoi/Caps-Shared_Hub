using Caps.Common.Application;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Common;

/// <summary>
/// The signed-in applicant as described by the access token. Email verification comes from the token's
/// account status, so this service never asks the identity service.
/// </summary>
public sealed record Applicant(Guid UserId, string Email, bool EmailVerified)
{
    private const string ActiveStatus = "ACTIVE";

    public static Applicant From(ICurrentUser user) =>
        new(user.RequireUserId(), user.Email ?? "", user.AccountStatus == ActiveStatus);

    /// <summary>The token's account status, recorded on the profile for the Marketplace filter.</summary>
    public string AccountStatus => EmailVerified ? ActiveStatus : "PENDING_VERIFICATION";

    /// <summary>Name shown until the applicant saves one: the local part of the email.</summary>
    public string DefaultName => Email.Split('@')[0];

    /// <summary>Every change to the application requires a verified email (the account must be ACTIVE).</summary>
    public void EnsureVerified()
    {
        if (!EmailVerified)
            throw ExpertErrors.EmailNotVerified();
    }
}
