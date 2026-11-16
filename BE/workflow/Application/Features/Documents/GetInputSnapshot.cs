using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Reads a saved input snapshot of an owned document.</summary>
public sealed record GetInputSnapshotQuery(Guid DocumentId, Guid UserId, Guid? SnapshotId);

/// <summary>Returns the requested snapshot, or the latest one when none is named; null when nothing was saved yet.</summary>
public sealed class GetInputSnapshotHandler(
    IDocumentRepository documents,
    IInputSnapshotRepository snapshots
) : IQueryHandler<GetInputSnapshotQuery, InputSnapshotDto?>
{
    public async Task<InputSnapshotDto?> HandleAsync(
        GetInputSnapshotQuery query,
        CancellationToken ct
    )
    {
        var document = await documents.GetByIdAsync(query.DocumentId, ct);
        if (document is null)
            throw WorkflowErrors.DocumentNotFound(query.DocumentId);
        if (document.OwnerUserId != query.UserId)
            throw WorkflowErrors.DocumentAccessDenied();

        var snapshot = query.SnapshotId is { } id
            ? await snapshots.GetByIdAsync(id, ct)
            : await snapshots.GetLatestByDocumentIdAsync(query.DocumentId, ct);
        if (
            query.SnapshotId is { } requested
            && (snapshot is null || snapshot.DocumentId != query.DocumentId)
        )
        {
            throw WorkflowErrors.SnapshotNotFound(requested);
        }

        return snapshot is null
            ? null
            : new(
                snapshot.Id,
                snapshot.DocumentId,
                snapshot.VersionNo,
                snapshot.Data,
                snapshot.CreatedBy,
                snapshot.CreatedAt
            );
    }
}
