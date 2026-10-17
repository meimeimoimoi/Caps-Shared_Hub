namespace Caps.Ingestion.Entities;

/// <summary>Records that one legal source amends (or replaces) another.</summary>
public sealed class LegalAmendment
{
    public Guid AmendingSourceId { get; set; }
    public LegalSource AmendingSource { get; set; } = default!;

    public Guid AmendedSourceId { get; set; }
    public LegalSource AmendedSource { get; set; } = default!;

    public string RelationType { get; set; } = "AMENDS";
    public string? AffectedArticles { get; set; } // jsonb
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
