namespace Caps.Auth.Application.Abstractions.Persistence;

/// <summary>
/// Read side of the admin dashboard. Only verified accounts count: one still waiting for email verification is
/// not a user yet.
/// </summary>
public interface IUserStatsReader
{
    /// <summary>When each verified account was created, for accounts created in [start, endBefore).</summary>
    Task<IReadOnlyList<DateTimeOffset>> ListSignupsAsync(
        DateTimeOffset start,
        DateTimeOffset endBefore,
        CancellationToken ct
    );

    /// <summary>Verified accounts created before the given instant.</summary>
    Task<int> CountUsersBeforeAsync(DateTimeOffset before, CancellationToken ct);
}
