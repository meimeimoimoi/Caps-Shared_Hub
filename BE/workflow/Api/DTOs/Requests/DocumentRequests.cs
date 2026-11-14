using System.ComponentModel.DataAnnotations;

namespace Caps.Workflow.Api.DTOs.Requests;

public static class DocumentRequests
{
    public sealed record CreateDocumentRequest(
        [Required, MaxLength(200)] string Title,
        Guid? TemplateId,
        [Required] DateOnly PeriodStart,
        [Required] DateOnly PeriodEnd,
        [MaxLength(50)] string? Source,
        [MaxLength(100_000)] string? Metadata
    );

    public sealed record CreateSnapshotRequest([Required, MaxLength(100_000)] string Data);

    public sealed record GenerateDraftRequest(
        Guid? SnapshotId,
        Guid? TemplateVersionId,
        string? Citations
    );

    public sealed record DownloadDocumentRequest([MaxLength(10)] string? Format);
}
