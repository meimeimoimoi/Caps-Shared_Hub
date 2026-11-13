using System.ComponentModel.DataAnnotations;
using Caps.Ingestion.Features.Documents;

namespace Caps.Ingestion.DTOs.Requests;

/// <summary>Rejects a pending document; the reason is kept with it.</summary>
public sealed record RejectDocumentRequest([Required, MaxLength(1000)] string Reason)
{
    public RejectDocumentCommand ToCommand(Guid reviewerUserId, Guid documentId) =>
        new(reviewerUserId, documentId, Reason);
}

/// <summary>A legal document file uploaded by a Knowledge Admin, with the metadata of its legal source.</summary>
public sealed class UploadDocumentRequest
{
    /// <summary>PDF or DOCX, at most 20 MB.</summary>
    public IFormFile? File { get; init; }

    /// <summary>Official number, e.g. 47/2024/TT-BGTVT; a number already stored adds a new version.</summary>
    [Required, MaxLength(256)]
    public string DocumentNumber { get; init; } = "";

    /// <summary>Document type as named on vbpl.vn, e.g. Luật, Nghị định, Thông tư, Quyết định.</summary>
    [Required, MaxLength(128)]
    public string DocType { get; init; } = "";

    [MaxLength(512)]
    public string? IssuingAuthority { get; init; }

    [Required, MaxLength(2000)]
    public string Title { get; init; } = "";

    public DateOnly? IssuedDate { get; init; }
    public DateOnly? EffectiveFrom { get; init; }
    public DateOnly? EffectiveTo { get; init; }

    public UploadDocumentCommand ToCommand(Guid userId, byte[] content) =>
        new(
            userId,
            File?.FileName ?? "",
            content,
            DocumentNumber.Trim(),
            DocType.Trim(),
            IssuingAuthority?.Trim(),
            Title.Trim(),
            IssuedDate,
            EffectiveFrom,
            EffectiveTo
        );
}
