namespace Caps.Workflow.Domain.Review;

// The client's rating of the expert once the case is over
public sealed partial class ReviewCase
{
    public const int MaxStars = 5;

    /// <summary>1 to 5 stars, set once by the client; feeds the expert's marketplace rating.</summary>
    public short? Rating { get; private set; }
    public string? RatingComment { get; private set; }
    public DateTimeOffset? RatedAt { get; private set; }

    /// <summary>
    /// The client rates the expert once, after the case ends with a delivery the client accepted or an admin
    /// decided. A rating cannot be changed, so the expert's average never has to be recomputed.
    /// </summary>
    public void Rate(Guid requesterUserId, int stars, string? comment, DateTimeOffset now)
    {
        EnsureRequester(requesterUserId);
        if (
            Status
            is not (
                ReviewCaseStatus.Completed
                or ReviewCaseStatus.AutoConfirmed
                or ReviewCaseStatus.Resolved
            )
        )
        {
            throw WorkflowErrors.RatingClosed(Status);
        }
        if (RatedAt != null)
        {
            throw WorkflowErrors.RatingExists();
        }
        if (stars is < 1 or > MaxStars)
        {
            throw WorkflowErrors.RatingInvalid(MaxStars);
        }
        Rating = (short)stars;
        RatingComment = OptionalText(comment, "Comment");
        RatedAt = now;
        UpdatedAt = now;
    }
}
