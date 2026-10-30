using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>A client's complaint about a delivery, as both parties see it.</summary>
/// <param name="DecideBy">When the admin should have decided.</param>
/// <param name="RefundPct">Share of the fee returned to the client, once decided.</param>
public sealed record DisputeResponse(
    string Id,
    string Reason,
    string Description,
    string Status,
    DateTimeOffset OpenedAt,
    DateTimeOffset DecideBy,
    string? ExpertStatement,
    DateTimeOffset? ExpertStatementAt,
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
            d.ExpertStatement,
            d.ExpertStatementAt,
            d.RefundPct,
            d.ResolutionNote,
            d.ClosedAt
        );
}
