using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>A file added to a review case.</summary>
/// <param name="UploadedBy">The account that added it: the case's client or expert.</param>
public sealed record AttachmentResponse(
    string Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    string UploadedBy,
    DateTimeOffset UploadedAt
)
{
    public static AttachmentResponse From(ReviewAttachment a) =>
        new(
            a.Id.ToString(),
            a.FileName,
            a.ContentType,
            a.SizeBytes,
            a.UploadedBy.ToString(),
            a.UploadedAt
        );
}

/// <summary>A file's bytes to send back, with its detected type and original name.</summary>
public sealed record AttachmentFile(Stream Content, string ContentType, string FileName);
