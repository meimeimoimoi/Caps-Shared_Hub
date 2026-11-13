using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Features.Documents.DTOs;
public static class DocumentDtos
{
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

    public sealed record PagedResultDto<T>(
        IReadOnlyList<T> Items,
        int TotalCount,
        int Page,
        int PageSize
        );

    public sealed record InputSnapshotDto(
        Guid Id,
        Guid DocumentId,
        int VersionNo,
        string Data,
        Guid CreatedBy,
        DateTimeOffset CreatedAt
        );

    public sealed record DocumentVersionSummaryDto(
        Guid id,
        Guid DocumentId,
        int VersionId,
        string VersionType,
        Guid? InputSnapshotId,
        Guid? TemplateVersionId,
        string ContentHash,
        bool IsImutable,
        Guid CreatedBy,
        DateTimeOffset CreatedAt
        );

    public sealed record DocumentVersionDetailDto(
        Guid Id,
        Guid DocumentId,
        int VersionNo,
        string VersionType,
        Guid? InputSnapshotId,
        Guid? TemplateVersionId,
        string? Citations,
        string? DarftAssessment,
        string Content,
        string ContentHash,
        bool IsImutable,
        Guid CreatedBy,
        DateTimeOffset CreatedAt
        );

    public sealed record DownloadDocumentResultDto(
        string DownloadUrl,
        string FileName,
        string Format,
        string ContentHash,
        DateTimeOffset ExpiresAt
        );
}
