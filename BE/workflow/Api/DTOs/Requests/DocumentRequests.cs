using System.ComponentModel.DataAnnotations;

namespace Caps.Workflow.Api.DTOs.Requests;

public class DocumentRequests
{
    public sealed record CreateDocumentRequest(
        [Required] string Title,
        Guid? TemplateId,
        [Required] DateOnly PeriodStart,
        [Required] DateOnly PeriodEnd,
        string? Source,
        string? Metadata
    );

    public sealed record CreateSnapshotRequest(
        [Required] string Data
    );

    public sealed record GenerateDraftRequest(
        Guid? SnapshotId,
        Guid? TemplateVersionId,
        string? Citations
    );

    public sealed record DownloadDocumentRequest(
        string? Format
    );
}
