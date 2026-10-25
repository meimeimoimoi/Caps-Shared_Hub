namespace Caps.Expert.Application.Abstractions;

/// <summary>Who is reading the queue and which claims to show (ReviewClaimFilter); claims older than the hold have expired.</summary>
public sealed record ReviewQueueScope(
    string ClaimFilter,
    Guid ViewerUserId,
    DateTimeOffset Now,
    TimeSpan Hold
)
{
    public DateTimeOffset ExpiredBefore => Now - Hold;
}
