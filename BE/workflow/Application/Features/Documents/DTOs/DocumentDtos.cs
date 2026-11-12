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
    );

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
        DateTimeOffset CreatedAt
    );

    /// <summary>Full content, hash, citations, and metadata of a document version.</summary>
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
        DateTimeOffset CreatedAt
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
