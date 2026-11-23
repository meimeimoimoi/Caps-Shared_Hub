using Caps.Common.Application;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Entities;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Sources;

/// <summary>The amendment family tree around one legal source.</summary>
public sealed record GetSourceTreeQuery(Guid SourceId);

/// <summary>
/// Follows what the source amends up to the original (a source that amends nothing), then walks down level
/// by level to every source amending it. One query per level; visited sources are skipped so cycles end, and
/// each walk stops after <see cref="MaxDepth"/> levels.
/// </summary>
public sealed class GetSourceTreeHandler(IngestionDbContext db)
    : IQueryHandler<GetSourceTreeQuery, AmendmentTreeNodeResponse>
{
    private const int MaxDepth = 10;

    public async Task<AmendmentTreeNodeResponse> HandleAsync(
        GetSourceTreeQuery query,
        CancellationToken ct
    )
    {
        if (!await db.LegalSources.AnyAsync(x => x.Id == query.SourceId, ct))
            throw IngestionErrors.SourceNotFound();

        // Up: when a source amends several others, the earliest recorded link is followed
        var root = query.SourceId;
        HashSet<Guid> visited = [root];
        for (var depth = 0; depth < MaxDepth; depth++)
        {
            var current = root;
            var parent = await db
                .LegalAmendments.Where(x => x.AmendingSourceId == current)
                .OrderBy(x => x.CreatedAt)
                .ThenBy(x => x.AmendedSourceId)
                .Select(x => (Guid?)x.AmendedSourceId)
                .FirstOrDefaultAsync(ct);
            if (parent is not { } next || !visited.Add(next))
                break;
            root = next;
        }

        // Down: each source amending the current level becomes a child of the source it amends
        Dictionary<Guid, List<LegalAmendment>> children = [];
        HashSet<Guid> inTree = [root];
        List<Guid> level = [root];
        for (var depth = 0; depth < MaxDepth && level.Count > 0; depth++)
        {
            var parents = level;
            var links = await db
                .LegalAmendments.AsNoTracking()
                .Where(x => parents.Contains(x.AmendedSourceId))
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(ct);
            level = [];
            foreach (var link in links)
            {
                if (!inTree.Add(link.AmendingSourceId))
                    continue;
                if (!children.TryGetValue(link.AmendedSourceId, out var siblings))
                    children[link.AmendedSourceId] = siblings = [];
                siblings.Add(link);
                level.Add(link.AmendingSourceId);
            }
        }

        var sources = await db
            .LegalSources.Where(x => inTree.Contains(x.Id))
            .Select(x => new
            {
                x.Id,
                x.DocumentNumber,
                x.Title,
                x.DocType,
            })
            .ToDictionaryAsync(x => x.Id, ct);
        return Node(root, null);

        AmendmentTreeNodeResponse Node(Guid id, LegalAmendment? link)
        {
            var source = sources[id];
            var kids = children.TryGetValue(id, out var links)
                ? links.ConvertAll(x => Node(x.AmendingSourceId, x))
                : [];
            return new(
                source.Id,
                source.DocumentNumber,
                source.Title,
                source.DocType,
                link?.RelationType,
                JsonColumn.Read(link?.AffectedArticles),
                kids
            );
        }
    }
}
