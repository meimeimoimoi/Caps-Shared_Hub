using System.Text.Json;

namespace Caps.Workflow.Application.Features.Documents.DTOs;

/// <summary>Data transfer objects for document workspaces, input snapshots, versions, and exports.</summary>
public static class DocumentDtos
{
    /// <summary>Summary metadata for a user's document workspace.</summary>
    public sealed record DocumentSummaryDto(
        Guid Id,
        Guid OwnerUserId,
        string Source,
        Guid? TemplateId,
        string Title,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd,
        string Status,
        Guid? VerifiedVersionId,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt
    )
    {
        public Guid? PinnedTemplateVersionId { get; init; }

        public static Guid? ReadPinnedTemplateVersion(string? metadata)
        {
            if (string.IsNullOrWhiteSpace(metadata))
                return null;
            try
            {
                using var json = JsonDocument.Parse(metadata);
                return
                    json.RootElement.ValueKind == JsonValueKind.Object
                    && json.RootElement.TryGetProperty("templateVersionId", out var version)
                    && version.ValueKind == JsonValueKind.String
                    && version.TryGetGuid(out var id)
                    ? id
                    : null;
            }
            catch (JsonException)
            {
                return null;
            }
        }
    }

    /// <summary>Generic paginated result container.</summary>
    public sealed record PagedResultDto<T>(
        IReadOnlyList<T> Items,
        int TotalCount,
        int Page,
        int PageSize
    );

    /// <summary>An immutable form input snapshot captured for a document.</summary>
    public sealed record InputSnapshotDto(
        Guid Id,
        Guid DocumentId,
        int VersionNo,
        string Data,
        Guid CreatedBy,
        DateTimeOffset CreatedAt
    );

    /// <summary>Structured blocking or warning issue attached to an AI-generated document draft.</summary>
    public sealed record DraftIssueDto(
        string Code,
        string Type,
        string Severity,
        string Description,
        string? FieldId = null,
        string? CitationId = null
    );

    /// <summary>Summary of a document version in version history.</summary>
    public sealed record DocumentVersionSummaryDto(
        Guid Id,
        Guid DocumentId,
        int VersionNo,
        string VersionType,
        Guid? InputSnapshotId,
        Guid? TemplateVersionId,
        string ContentHash,
        bool IsImmutable,
        Guid CreatedBy,
        DateTimeOffset CreatedAt,
        string? DraftAssessment = null
    );

    /// <summary>Full content, hash, citations, readiness assessment, and issues of a document version.</summary>
    public sealed record DocumentVersionDetailDto(
        Guid Id,
        Guid DocumentId,
        int VersionNo,
        string VersionType,
        Guid? InputSnapshotId,
        Guid? TemplateVersionId,
        string? Citations,
        string? DraftAssessment,
        string Content,
        string ContentHash,
        bool IsImmutable,
        Guid CreatedBy,
        DateTimeOffset CreatedAt,
        IReadOnlyList<DraftIssueDto>? DraftIssues = null
    );

    /// <summary>Signed download URL and metadata for an exported document version.</summary>
    public sealed record DownloadDocumentResultDto(
        string DownloadUrl,
        string FileName,
        string Format,
        string ContentHash,
        DateTimeOffset ExpiresAt
    );
}
