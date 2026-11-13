using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;

using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;
public sealed class CreateDocument
{
    public sealed record CreateDocumentCommand(
        Guid UserId,
        string Title,
        Guid? TemplateId,
        DateOnly PeriodStart,
        DateOnly PeriodEnd,
        string? Source,
        string? Metadata
        );

    public sealed class CreateDocumentHandler(
        IDocumentRepository documentRepository,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
        ) : ICommandHandler<CreateDocumentCommand, DocumentSummaryDto>
    {
        public async Task<DocumentSummaryDto> HandleAsync(CreateDocumentCommand command, CancellationToken ct)
        {
            if(command.PeriodEnd < command.PeriodStart)
            {
                throw WorkflowErrors.Document_InvalidPeriod();
            }

            var now = DateTime.UtcNow;
            var document = new Document
            {
                Id = UuidV7.NewGuid(),
                OwnerUserId = command.UserId,
                Source = string.IsNullOrWhiteSpace(command.Source) ? "TEMPLATE" : command.Source.Trim().ToUpperInvariant(),
                TemplateId = command.TemplateId,
                Title = command.Title.Trim(),
                PeriodStart = command.PeriodStart,
                PeriodEnd = command.PeriodEnd,
                Status = "DRAFT",
                VerifiedVersionId = null,
                Metadata = string.IsNullOrWhiteSpace(command.Metadata) ? "{}" : command.Metadata,
                CreatedAt = now,
                UpdatedAt = now,
            };

            await documentRepository.AddAsync(document, ct);
            await unitOfWork.SaveChangesAsync( ct);

            return new DocumentSummaryDto(
                document.Id,
                document.OwnerUserId,
                document.Source,
                document.TemplateId,
                document.Title,
                document.PeriodStart,
                document.PeriodEnd,
                document.Status,
                document.VerifiedVersionId,
                document.CreatedAt,
                document.UpdatedAt
                );
        }
    }
}
