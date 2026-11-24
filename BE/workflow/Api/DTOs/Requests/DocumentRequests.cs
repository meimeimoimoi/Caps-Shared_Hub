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

    public sealed record CreateSnapshotRequest(
        [Required, MaxLength(100_000)] string Data,
        int? ExpectedRevision
    );

    public sealed record GenerateDraftRequest(
        Guid? SnapshotId,
        Guid? TemplateVersionId,
        string? Citations
    );

    public sealed record DownloadDocumentRequest([MaxLength(10)] string? Format);

    /// <summary>Multipart form for creating a document from an uploaded file.</summary>
    /// <param name="Title">Document name shown to the client and the expert, at most 200 characters.</param>
    /// <param name="PeriodStart">First day of the tax period the document covers (yyyy-MM-dd).</param>
    /// <param name="PeriodEnd">Last day of the tax period (yyyy-MM-dd); must not be before PeriodStart.</param>
    /// <param name="File">The document: PDF, JPEG, PNG, WebP or Word .docx, at most 50 MB.</param>
    public sealed record UploadDocumentRequest(
        [Required, MaxLength(200)] string Title,
        [Required] DateOnly PeriodStart,
        [Required] DateOnly PeriodEnd,
        IFormFile? File
    );
}
