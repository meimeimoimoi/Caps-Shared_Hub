using Caps.Ingestion.Data;
using Caps.Ingestion.Entities;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>Version numbering of a legal source's documents, shared by crawler imports and admin uploads.</summary>
public static class LegalSourceVersions
{
    /// <summary>
    /// Finds the source by its number, adding <paramref name="candidate"/> when it is new, and returns the next
    /// version number. Call inside a transaction: the number stays locked until it ends, so two imports or
    /// uploads of the same document cannot take the same version.
    /// </summary>
    public static async Task<(LegalSource Source, int Version)> ClaimNextAsync(
        IngestionDbContext db,
        LegalSource candidate,
        CancellationToken ct
    )
    {
        var lockKey = "knowledge.legal_source:" + candidate.DocumentNumber;
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({lockKey}, 0))",
            ct
        );
        var source = await db.LegalSources.FirstOrDefaultAsync(
            x => x.DocumentNumber == candidate.DocumentNumber,
            ct
        );
        if (source is null)
        {
            db.LegalSources.Add(candidate);
            return (candidate, 1);
        }
        var latest = await db
            .KnowledgeDocuments.Where(x => x.LegalSourceId == source.Id)
            .MaxAsync(x => (int?)x.VersionNo, ct);
        return (source, (latest ?? 0) + 1);
    }
}
