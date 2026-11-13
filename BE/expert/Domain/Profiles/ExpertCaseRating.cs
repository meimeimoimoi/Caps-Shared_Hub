namespace Caps.Expert.Domain.Profiles;

/// <summary>
/// One client's rating of a finished review case. The key is the case, so a repeated call from workflow
/// counts once; ExpertProfile.RatingAvg and RatingCount summarise these rows.
/// </summary>
public sealed class ExpertCaseRating
{
    private ExpertCaseRating() { }

    public Guid ReviewCaseId { get; }
    public Guid ExpertProfileId { get; }
    public short Stars { get; }
    public DateTimeOffset RatedAt { get; }
}
