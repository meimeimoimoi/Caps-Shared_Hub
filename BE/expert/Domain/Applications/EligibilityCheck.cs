using Caps.Common.Domain;

namespace Caps.Expert.Domain.Applications;

/// <summary>
/// One requirement's result in a Gate 1 decision (BR-E14, BR-E28). Rows are linked to the decision's
/// event, so every past decision keeps its own results.
/// </summary>
public sealed class EligibilityCheck
{
    private EligibilityCheck() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ApplicationId { get; private set; }

    /// <summary>The status change that recorded this decision.</summary>
    public Guid EventId { get; private set; }
    public string Criterion { get; private set; } = default!;
    public string Result { get; private set; } = default!;
    public string? Note { get; private set; }

    /// <summary>Account id from the identity service (no foreign key across services).</summary>
    public Guid ReviewerUserId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static EligibilityCheck Record(
        ExpertApplicationEvent decision,
        CriterionResult result,
        Guid reviewerUserId
    ) =>
        new()
        {
            ApplicationId = decision.ApplicationId,
            EventId = decision.Id,
            Criterion = result.Code,
            Result = result.Result,
            Note = result.Note,
            ReviewerUserId = reviewerUserId,
            CreatedAt = decision.CreatedAt,
        };
}
