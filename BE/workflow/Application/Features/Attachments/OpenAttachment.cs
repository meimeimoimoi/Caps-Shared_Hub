using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Attachments;

/// <summary>One file of the case, for a party or (UserId null) a system admin handling a dispute.</summary>
public sealed record OpenAttachmentQuery(Guid? UserId, Guid ReviewCaseId, Guid AttachmentId);

/// <summary>Streams the file; a file of another case is not found, so ids cannot be probed across cases.</summary>
public sealed class OpenAttachmentHandler(
    IReviewCaseRepository cases,
    IReviewAttachmentRepository attachments,
    IObjectStorage storage
) : IQueryHandler<OpenAttachmentQuery, AttachmentFile>
{
    public async Task<AttachmentFile> HandleAsync(OpenAttachmentQuery query, CancellationToken ct)
    {
        var reviewCase =
            await cases.FindAsync(query.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        if (query.UserId is { } userId)
        {
            reviewCase.EnsureVisibleTo(userId);
        }
        var attachment =
            await attachments.FindAsync(reviewCase.Id, query.AttachmentId, ct)
            ?? throw WorkflowErrors.AttachmentNotFound();
        var content = await storage.OpenAsync(attachment.FileUrl, ct);
        return new(content, attachment.ContentType, attachment.FileName);
    }
}
