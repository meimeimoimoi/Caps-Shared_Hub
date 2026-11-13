using System.Text.Json;

namespace Caps.Workflow.Application.Abstractions.Documents;

public sealed record AiDraftRequest(
    Guid DocumentId,
    string SnapshotDataJson,
    string? TemplateSchemaJson,
    DateOnly PeriodStart,
    DateOnly PeriodEnd
);

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
    Task<AiDraftResponse> GenerateDraftAsync(AiDraftRequest request, CancellationToken ct = default);
}

