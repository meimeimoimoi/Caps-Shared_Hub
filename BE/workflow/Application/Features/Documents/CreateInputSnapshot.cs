using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for capturing an immutable input form snapshot for a document.</summary>
public static class CreateInputSnapshot
{
    /// <summary>Command to save a new form input snapshot for a document.</summary>
    public sealed record CreateInputSnapshotCommand(
        Guid DocumentId,
        Guid UserId,
        string Data
    );

    /// <summary>Handles versioning and persisting an immutable input snapshot.</summary>
    public sealed class CreateInputSnapshotHandler(
        IDocumentRepository documentRepository,
        IInputSnapshotRepository inputSnapshotRepository,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
    ) : ICommandHandler<CreateInputSnapshotCommand, InputSnapshotDto>
    {
        public async Task<InputSnapshotDto> HandleAsync(CreateInputSnapshotCommand command, CancellationToken ct)
        {
            var document = await documentRepository.GetByIdAsync(command.DocumentId, ct);
            if (document is null)
            {
                throw WorkflowErrors.Document_NotFound(command.DocumentId);
            }

            if (document.OwnerUserId != command.UserId)
            {
                throw WorkflowErrors.Document_AccessDenied();
            }

            var nextVersionNo = await inputSnapshotRepository.GetNextVersionNoAsync(command.DocumentId, ct);
            var now = timeProvider.GetUtcNow();

            var snapshot = new InputSnapshot
            {
                Id = UuidV7.NewGuid(),
                DocumentId = command.DocumentId,
                VersionNo = nextVersionNo,
                Data = string.IsNullOrWhiteSpace(command.Data) ? "{}" : command.Data,
                CreatedBy = command.UserId,
                CreatedAt = now
            };

            document.UpdatedAt = now;

            await inputSnapshotRepository.AddAsync(snapshot, ct);
            await unitOfWork.SaveChangesAsync(ct);

            return new InputSnapshotDto(
                snapshot.Id,
                snapshot.DocumentId,
                snapshot.VersionNo,
                snapshot.Data,
                snapshot.CreatedBy,
                snapshot.CreatedAt
            );
        }
    }
}
