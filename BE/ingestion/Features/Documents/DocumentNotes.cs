using System.Text.Json.Nodes;

namespace Caps.Ingestion.Features.Documents;

/// <summary>Keeps why and by whom an admin acted on a version, inside its metadata JSON.</summary>
public static class DocumentNotes
{
    /// <summary>Sets metadata[key] = { reason, by, at }, keeping the other metadata (e.g. the crawler's ingest hints).</summary>
    public static string Add(string metadata, string key, string reason, Guid by, DateTimeOffset at)
    {
        var root = JsonNode.Parse(metadata) as JsonObject ?? [];
        root[key] = new JsonObject
        {
            ["reason"] = reason,
            ["by"] = by.ToString(),
            ["at"] = at.ToString("O"),
        };
        return root.ToJsonString();
    }
}
