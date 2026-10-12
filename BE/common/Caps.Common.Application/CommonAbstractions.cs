namespace Caps.Common.Application;

public interface ICurrentUser
{
    string? UserId { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
}

public static class CurrentUserExtensions
{
    /// <summary>The signed-in user's id; a missing or malformed subject claim is an invalid session.</summary>
    public static Guid RequireUserId(this ICurrentUser user) =>
        Guid.TryParse(user.UserId, out var id)
            ? id
            : throw CommonErrors.InvalidSession("Invalid session.");
}

public interface IDateTimeProvider
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
