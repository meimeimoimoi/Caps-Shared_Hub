using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>A client's complaint about a delivery, as both parties see it.</summary>
/// <param name="DecideBy">When the admin should have decided.</param>
/// <param name="RefundPct">Share of the fee returned to the client, once decided.</param>
/// <param name="StatementDueBy">The expert explains before then; the admin waits for it unless the statement came earlier.</param>
public sealed record DisputeResponse(
    string Id,
    string Reason,
    string Description,
    string Status,
    DateTimeOffset OpenedAt,
    DateTimeOffset DecideBy,
    bool Extended,
    string? ExpertStatement,
    DateTimeOffset? ExpertStatementAt,
    DateTimeOffset StatementDueBy,
    short? RefundPct,
    string? ResolutionNote,
    DateTimeOffset? ClosedAt
)
{
    public static DisputeResponse From(ReviewDispute d) =>
        new(
            d.Id.ToString(),
            d.Reason,
            d.Description,
            d.Status,
            d.OpenedAt,
            d.DecideBy,
            d.Extended,
            d.ExpertStatement,
            d.ExpertStatementAt,
            d.StatementDueBy,
            d.RefundPct,
            d.ResolutionNote,
            d.ClosedAt
        );
}

/// <summary>An open dispute in the admin queue, with what the admin needs to decide it and who the parties are.</summary>
/// <param name="Overdue">Past the decision window (2 working days, or 4 once extended); nothing is decided automatically.</param>
/// <param name="SourceFileName">Name of the file the client uploaded for review; null for a draft written in the app.</param>
public sealed record AdminDisputeResponse(
    string ReviewCaseId,
    string? RequesterEmail,
    string RequesterUserId,
    string ExpertProfileId,
    long Fee,
    short PlatformFeePct,
    string? Result,
    string? ReviewSummary,
    bool Overdue,
    DisputeResponse Dispute,
    string? SourceFileName = null
);
