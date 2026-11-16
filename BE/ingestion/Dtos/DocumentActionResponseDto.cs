namespace Caps.Ingestion.Dtos;

/// <summary>Result returned after approving, retrying, or updating metadata of a knowledge document.</summary>
public class DocumentActionResponseDto
{
    public Guid DocumentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? TotalChunksIndexed { get; set; }
    public int RetryCount { get; set; }
    public string? LastError { get; set; }
}

/// <summary>Result returned after deleting a knowledge document and its indexed vectors.</summary>
public sealed record DeleteDocumentResponseDto(
    Guid DocumentId,
    int DeletedVectorsCount,
    string Message
);
