using Caps.Common.Domain;

namespace Caps.Ingestion.Entities;

/// <summary>A searchable piece of a legal document (article, clause, point), indexed in the vector store.</summary>
public sealed class KbChunk
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid KnowledgeDocumentId { get; set; }
    public KnowledgeDocument KnowledgeDocument { get; set; } = default!;

    public int ChunkIndex { get; set; }
    public string QdrantPointId { get; set; } = default!;
    public string? Article { get; set; }
    public string? Clause { get; set; }
    public string? Point { get; set; }
    public int? Page { get; set; }
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Metadata { get; set; } = "{}"; // jsonb
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
