using System.Text.Json;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Entities;

namespace Caps.Ingestion.DTOs.Responses;

/// <summary>The stored original of an uploaded document, ready to stream.</summary>
public sealed record DocumentFile(Stream Content, string ContentType, string FileName);

/// <summary>
/// One document version for the split-screen review: its legal source, metadata and parsed content, shown
/// next to the original.
/// </summary>
/// <param name="ContentJson">Parsed text: preamble, chapters → articles → units, closing, appendices, warnings. Null until an uploaded file is split.</param>
/// <param name="Metadata">For crawled documents, ingest holds the crawler's suggestion for the reviewer.</param>
/// <param name="FileUrl">API path that streams the stored original (uploads only).</param>
/// <param name="SourceUrl">Page of the document on the crawled site; crawled originals are not stored.</param>
/// <param name="ApprovedBy">Admin who approved or rejected this version.</param>
public sealed record DocumentPreviewResponse(
    Guid Id,
    Guid LegalSourceId,
    string DocumentNumber,
    string DocType,
    string? IssuingAuthority,
    string Title,
    int VersionNo,
    string Source,
    string Status,
    DateOnly? IssuedDate,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    Guid? CrawlJobId,
    Guid? UploadedBy,
    string? RejectionReason,
    Guid? ApprovedBy,
    DateTimeOffset? ApprovedAt,
    string? LastError,
    DateTimeOffset CreatedAt,
    JsonElement? Metadata,
    JsonElement? ContentJson,
    string? FileUrl,
    string? SourceUrl
)
{
    public static DocumentPreviewResponse From(KnowledgeDocument x)
    {
        var uploaded = x.Source == DocumentSources.ManualUpload;
        return new(
            x.Id,
            x.LegalSourceId,
            x.LegalSource.DocumentNumber,
            x.LegalSource.DocType,
            x.LegalSource.IssuingAuthority,
            x.LegalSource.Title,
            x.VersionNo,
            x.Source,
            x.Status,
            x.IssuedDate,
            x.EffectiveFrom,
            x.EffectiveTo,
            x.CrawlJobId,
            x.UploadedBy,
            x.RejectionReason,
            x.ApprovedBy,
            x.ApprovedAt,
            x.LastError,
            x.CreatedAt,
            JsonColumn.Read(x.Metadata),
            JsonColumn.Read(x.ContentJson),
            // Same path through the gateway as KnowledgeDocumentsController.OpenFile
            uploaded ? $"/api/v1/knowledge/documents/{x.Id}/file" : null,
            uploaded || x.FileUrl.Length == 0 ? null : x.FileUrl
        );
    }
}

/// <summary>A document version in the review queue, with the legal source it belongs to.</summary>
/// <param name="HasContent">False while an uploaded file waits for the worker to split it into articles.</param>
/// <param name="LastError">Why the worker could not split the file, if it failed.</param>
public sealed record DocumentSummaryResponse(
    Guid Id,
    Guid LegalSourceId,
    string DocumentNumber,
    string DocType,
    string Title,
    int VersionNo,
    string Source,
    string Status,
    DateOnly? IssuedDate,
    DateOnly? EffectiveFrom,
    bool HasContent,
    string? LastError,
    DateTimeOffset CreatedAt
)
{
    public static DocumentSummaryResponse From(KnowledgeDocument x, LegalSource source) =>
        new(
            x.Id,
            source.Id,
            source.DocumentNumber,
            source.DocType,
            source.Title,
            x.VersionNo,
            x.Source,
            x.Status,
            x.IssuedDate,
            x.EffectiveFrom,
            x.ContentJson != null,
            x.LastError,
            x.CreatedAt
        );
}
