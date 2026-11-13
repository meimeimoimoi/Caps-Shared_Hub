namespace Caps.Ingestion.DTOs.Responses;

/// <summary>Result of importing a crawled document; Imported is false when the same file was already stored.</summary>
public sealed record ImportedDocumentResponse(Guid DocumentId, bool Imported);
