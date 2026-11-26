using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for creating a new document workspace.</summary>
public static class CreateDocument
{
    /// <summary>Command to create a new document workspace for a user.</summary>
    public sealed record CreateDocumentCommand(
        Guid UserId,
        string Title,
        Guid? TemplateId,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd,
        string? Source,
        string? Metadata
    );

    /// <summary>Handles validating period bounds and persisting a new document workspace.</summary>
    public sealed class CreateDocumentHandler(
        IDocumentRepository documentRepository,
        ITemplateRepository templates,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
    ) : ICommandHandler<CreateDocumentCommand, DocumentSummaryDto>
    {
        public async Task<DocumentSummaryDto> HandleAsync(
            CreateDocumentCommand command,
            CancellationToken ct
        )
        {
            var metadata = JsonInput.OrEmptyObject(command.Metadata, "metadata");
            DateOnly periodStart;
            DateOnly periodEnd;
            if (command.TemplateId is { } templateId)
            {
                // An unknown or unpublished template would otherwise fail on the foreign key (500)
                var published =
                    await templates.FindPublishedAsync(templateId, ct)
                    ?? throw Domain.WorkflowErrors.TemplateNotFound();
                // The form decides the period: users draft only the tax year its published version applies to
                (periodStart, periodEnd) = published.TaxPeriod();
            }
            else if (command is { PeriodStart: { } start, PeriodEnd: { } end } && end >= start)
            {
                (periodStart, periodEnd) = (start, end);
            }
            else
            {
                throw WorkflowErrors.DocumentInvalidPeriod();
            }

            var now = timeProvider.GetUtcNow();
            var document = new Document
            {
                Id = UuidV7.NewGuid(),
                OwnerUserId = command.UserId,
                Source = string.IsNullOrWhiteSpace(command.Source)
                    ? "TEMPLATE"
                    : command.Source.Trim().ToUpperInvariant(),
                TemplateId = command.TemplateId,
                Title = command.Title.Trim(),
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                Status = "DRAFT",
                VerifiedVersionId = null,
                Metadata = metadata,
                CreatedAt = now,
                UpdatedAt = now,
            };

            await documentRepository.AddAsync(document, ct);
            await unitOfWork.SaveChangesAsync(ct);

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
            )
            {
                PinnedTemplateVersionId = DocumentSummaryDto.ReadPinnedTemplateVersion(
                    document.Metadata
                ),
            };
        }
    }
}
