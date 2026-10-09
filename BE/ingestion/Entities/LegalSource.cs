using Caps.Common.Database;

namespace ingestion.Entities;

public sealed class LegalSource
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string DocumentNumber { get; set; } = default!;
    public string DocType { get; set; } = default!;
    public string? IssuingAuthority { get; set; }
    public string Title { get; set; } = default!;
    public string Metadata { get; set; } = "{}"; // jsonb
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<LegalAmendment> AmendingAmendments { get; set; } = new List<LegalAmendment>();
    public ICollection<LegalAmendment> AmendedAmendments { get; set; } = new List<LegalAmendment>();
    public ICollection<KnowledgeDocument> KnowledgeDocuments { get; set; } = new List<KnowledgeDocument>();
}
