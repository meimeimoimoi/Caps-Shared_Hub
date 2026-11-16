using System.Text.Json;
using Caps.Workflow.Domain.Exceptions;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Checks client JSON bound for a jsonb column, so bad input is a 400 instead of a database error.</summary>
internal static class JsonInput
{
    /// <summary>The text when it is valid JSON, "{}" when blank.</summary>
    public static string OrEmptyObject(string? raw, string field)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return "{}";
        try
        {
            using var _ = JsonDocument.Parse(raw);
            return raw;
        }
        catch (JsonException)
        {
            throw WorkflowErrors.DocumentInvalidJson(field);
        }
    }
}
