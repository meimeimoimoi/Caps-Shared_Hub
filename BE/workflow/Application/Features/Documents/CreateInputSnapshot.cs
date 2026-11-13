using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;
public class CreateInputSnapshot
{
    public sealed record CreateInputSnapshotCommand(
        Guid DocumentId,
        Guid UserId,
        string Data
        );

    public sealed class CreatInputSnapshotHandler(
        IDocumentRepository documentRepository,
        IInputSnapshotRepository inputSnapshotRepository,
        IUnitOfWork unitOfWork,
         TimeProvider timeProvider
        ) : ICommandHandler<CreateInputSnapshotCommand, InputSnapshotDto>
    {
        public async Task<InputSnapshotDto> HandleAsync(CreateInputSnapshotCommand command, CancellationToken ct)
        {
            var document = await documentRepository.GetByIdAsync(command.DocumentId, ct);
            if (document == null)
            {
                throw WorkflowErrors.Document_NotFound(command.DocumentId);
            }

            if (document.OwnerUserId != command.UserId)
            {
                throw WorkflowErrors.Conversation_AccessDenied();
            }

            var nextVersionNo = await inputSnapshotRepository.GetNextVersionNoAsync(command.DocumentId, ct);
            var now = DateTime.UtcNow;

            var snapshot = new InputSnapshot();
            snapshot.Id = UuidV7.NewGuid();
            snapshot.DocumentId = command.DocumentId;
            snapshot.VersionNo = nextVersionNo;
            snapshot.Data = string.IsNullOrWhiteSpace(command.Data) ? "{}" : command.Data;
            snapshot.CreatedBy = command.UserId;
            snapshot.CreatedAt = now;

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
