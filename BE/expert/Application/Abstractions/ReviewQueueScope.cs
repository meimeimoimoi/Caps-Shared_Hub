namespace Caps.Expert.Application.Abstractions;

/// <summary>Who is reading the queue and which claims to show (ReviewClaimFilter); claims older than the hold have expired.</summary>
public sealed record ReviewQueueScope(
    string ClaimFilter,
    Guid ViewerUserId,
    DateTimeOffset Now,
    TimeSpan Hold
)
{
    public string SortBy { get; init; } = "queue";
    public bool SortDescending { get; init; }
    public DateTimeOffset ExpiredBefore => Now - Hold;
}
