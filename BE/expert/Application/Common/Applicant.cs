using Caps.Common.Application;

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

    /// <summary>Name shown until the applicant saves one: the local part of the email.</summary>
    public string DefaultName => Email.Split('@')[0];
}
