namespace Caps.Ingestion.Dtos;

public class DocumentActionResponseDto
{
    public Guid DocumentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? TotalChunksIndexed { get; set; }
    public int RetryCount { get; set; }
    public string? LastError { get; set; }
}
