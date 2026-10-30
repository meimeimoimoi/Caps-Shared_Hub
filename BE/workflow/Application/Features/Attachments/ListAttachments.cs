using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Attachments;

/// <summary>The case's files, for a party or (UserId null) a system admin handling a dispute.</summary>
public sealed record ListAttachmentsQuery(Guid? UserId, Guid ReviewCaseId);

/// <summary>Returns the files oldest first; to anyone but the parties or an admin the case does not exist.</summary>
public sealed class ListAttachmentsHandler(
    IReviewCaseRepository cases,
    IReviewAttachmentRepository attachments
) : IQueryHandler<ListAttachmentsQuery, AttachmentResponse[]>
{
    public async Task<AttachmentResponse[]> HandleAsync(
        ListAttachmentsQuery query,
        CancellationToken ct
    )
    {
        var reviewCase =
            await cases.FindAsync(query.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        if (query.UserId is { } userId)
        {
            reviewCase.EnsureVisibleTo(userId);
        }
        var files = await attachments.ListAsync(reviewCase.Id, ct);
        return files.Select(AttachmentResponse.From).ToArray();
    }
}
