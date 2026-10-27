using System.Text.Json.Nodes;

namespace Caps.Ingestion.Dtos;

public static class AiServiceDtos
{
    public record AiIngestRequestDto
    {
        public string KnowledgeDocumentId { get; set; } = string.Empty;
        public string LegalSourceId { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? DocType { get; set; }
        public string? EffectiveFrom { get; set; }
        public string? EffectiveTo { get; set; }
        public string? VbhnEffectiveFrom { get; set; }
        public JsonNode? ContentJson { get; set; }
        public List<JsonNode>? Chunks { get; set; }
    }

    public record AiIngestResponseDto
    {
        public string Status { get; set; } = string.Empty;
        public int TotalChunks { get; set; }
        public List<AiChunkItemDto> KbChunks { get; set; } = [];
    }

    public class AiChunkItemDto
    {
        public int ChunkIndex { get; set; }
        public string QdrantPointId { get; set; } = string.Empty;
        public string? Article { get; set; }
        public string? Clause { get; set; }
        public string? Point { get; set; }
        public string? EffectiveFrom { get; set; }
        public string? EffectiveTo { get; set; }
        public JsonNode? Metadata { get; set; }
    }
}
