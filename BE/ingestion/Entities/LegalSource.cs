using Caps.Common.Domain;

namespace Caps.Ingestion.Entities;

/// <summary>A legal document identified by its official number (law, decree, circular).</summary>
public sealed class LegalSource
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string DocumentNumber { get; set; } = default!;
    public string DocType { get; set; } = default!;
    public string? IssuingAuthority { get; set; }
    public string Title { get; set; } = default!;
    public string Metadata { get; set; } = "{}"; // jsonb
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<LegalAmendment> AmendingAmendments { get; set; } = [];
    public ICollection<LegalAmendment> AmendedAmendments { get; set; } = [];
    public ICollection<KnowledgeDocument> KnowledgeDocuments { get; set; } = [];
}
