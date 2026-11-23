using System.Text.Json;

namespace Caps.Ingestion.DTOs.Responses;

/// <summary>Returns a jsonb column (a string on the entity) as JSON instead of an escaped string.</summary>
public static class JsonColumn
{
    public static JsonElement? Read(string? json) =>
        json is null ? null : JsonSerializer.Deserialize<JsonElement>(json);
}
