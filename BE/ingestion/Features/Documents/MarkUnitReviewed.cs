using System.Text.Json.Nodes;
using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>A Knowledge Admin ticks one parsed unit (article title, clause or point) off the review checklist.</summary>
public sealed record MarkUnitReviewedCommand(Guid DocumentId, string UnitId);

/// <summary>
/// Sets reviewed = true on the unit inside content_json, so the checklist survives reloads and is shared by
/// admins. Parsing the file again replaces content_json, which starts the checklist over.
/// </summary>
public sealed class MarkUnitReviewedHandler(IngestionDbContext db, IUnitOfWork unitOfWork)
    : ICommandHandler<MarkUnitReviewedCommand>
{
    public async Task HandleAsync(MarkUnitReviewedCommand command, CancellationToken ct)
    {
        var document =
            await db.KnowledgeDocuments.FirstOrDefaultAsync(x => x.Id == command.DocumentId, ct)
            ?? throw IngestionErrors.DocumentNotFound();
        if (document.Status != DocumentStatuses.Pending)
            throw IngestionErrors.DocumentNotPending();
        // shortcut: read-modify-write, so two admins ticking the same document at the same instant can lose a
        // tick; move to a jsonb update or a review table if documents get reviewed by several admins at once.
        document.ContentJson =
            ReviewedUnits.Mark(document.ContentJson, command.UnitId)
            ?? throw IngestionErrors.UnitNotFound();
        await unitOfWork.SaveChangesAsync(ct);
    }
}

/// <summary>Finds a unit in content_json (chapters → articles → units) by id.</summary>
public static class ReviewedUnits
{
    /// <summary>The content with the unit marked reviewed, or null when there is no such unit.</summary>
    public static string? Mark(string? contentJson, string unitId)
    {
        if (contentJson is null || JsonNode.Parse(contentJson) is not JsonObject root)
            return null;
        var unit = (root["chapters"] as JsonArray ?? [])
            .SelectMany(c => c?["articles"] as JsonArray ?? [])
            .SelectMany(a => a?["units"] as JsonArray ?? [])
            .OfType<JsonObject>()
            .FirstOrDefault(u => u["id"]?.ToString() == unitId);
        if (unit is null)
            return null;
        unit["reviewed"] = true;
        return root.ToJsonString();
    }
}
