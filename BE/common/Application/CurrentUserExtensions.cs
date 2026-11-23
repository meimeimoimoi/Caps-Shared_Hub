namespace Caps.Common.Application;

/// <summary>Helpers for reading the signed-in user safely.</summary>
public static class CurrentUserExtensions
{
    /// <summary>The signed-in user's id; a missing or malformed subject claim is an invalid session.</summary>
    public static Guid RequireUserId(this ICurrentUser user) =>
        Guid.TryParse(user.UserId, out var id)
            ? id
            : throw CommonErrors.InvalidSession("Invalid session.");
}
