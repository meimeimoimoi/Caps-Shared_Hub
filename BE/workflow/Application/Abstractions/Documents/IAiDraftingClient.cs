using System.Text.Json;

namespace Caps.Workflow.Application.Abstractions.Documents;

/// <summary>Request payload for generating a document draft through the Python AI service.</summary>
public sealed record AiDraftRequest(
    Guid DocumentId,
    string SnapshotDataJson,
    string? TemplateSchemaJson,
    DateOnly PeriodStart,
    DateOnly PeriodEnd
);

/// <summary>Response returned by the Python AI drafting service.</summary>
public sealed record AiDraftResponse(
    JsonElement Content,
    string ContentHash,
    bool HasUnauthorizedNumbers,
    IReadOnlyList<string> UnauthorizedNumbers,
    JsonElement Citations
);

/// <summary>Client interface for generating document drafts through the Python AI service.</summary>
public interface IAiDraftingClient
{
    Task<AiDraftResponse> GenerateDraftAsync(
        AiDraftRequest request,
        CancellationToken ct = default
    );
}
