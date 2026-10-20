using Caps.Ingestion.Entities;

namespace Caps.Ingestion.DTOs.Responses;

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
