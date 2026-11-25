using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Attachments;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>The admin queue of open disputes, or with Closed the decided and withdrawn ones.</summary>
public sealed record ListOpenDisputesQuery(bool Closed = false);

/// <summary>
/// Open disputes earliest decision deadline first, each flagged when its window has passed; closed ones most
/// recently closed first, never flagged.
/// </summary>
public sealed class ListOpenDisputesHandler(
    IReviewDisputeRepository disputes,
    IReviewAttachmentRepository attachments,
    TimeProvider clock
) : IQueryHandler<ListOpenDisputesQuery, AdminDisputeResponse[]>
{
    public async Task<AdminDisputeResponse[]> HandleAsync(
        ListOpenDisputesQuery query,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var listed = await disputes.ListAsync(!query.Closed, ct);
        var rows = new List<AdminDisputeResponse>(listed.Count);
        // ponytail: one source lookup per dispute; batch it if the list grows past a few dozen
        foreach (var x in listed)
        {
            var source = await attachments.FindSourceAsync(x.Case.SourceVersionId, ct);
            rows.Add(
                new AdminDisputeResponse(
                    x.Case.Id.ToString(),
                    x.Case.RequesterEmail,
                    x.Case.RequesterUserId.ToString(),
                    x.Case.ExpertProfileId.ToString(),
                    x.Case.Fee,
                    x.Case.PlatformFeePct,
                    x.Case.Result,
                    x.Case.ReviewSummary,
                    !query.Closed && now > x.Dispute.DecideBy,
                    DisputeResponse.From(x.Dispute),
                    // Only an uploaded file has a name; a draft written in the app has none
                    source?.FileUrl
                        is null
                        ? null
                        : OpenSourceFileHandler.FileNameOf(source.Content)
                )
            );
        }
        return [.. rows];
    }
}
