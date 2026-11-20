using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for generating an AI document draft version via the Python AI service.</summary>
public static class GenerateDraft
{
    private static readonly ConcurrentDictionary<Guid, byte> InFlightDocuments = new();
    private static readonly TimeSpan DuplicateCooldown = TimeSpan.FromSeconds(30);

    private static readonly JsonWriterOptions CanonicalWriterOptions = new()
    {
        Indented = false,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>Command to generate a new AI draft version for a document.</summary>
    public sealed record GenerateDraftCommand(
        Guid DocumentId,
        Guid UserId,
        Guid? SnapshotId,
        Guid? TemplateVersionId,
        string? Citations
    );

    /// <summary>Handles duplicate protection, optional billing credit hold, AI draft generation, and persistence.</summary>
    public sealed class GenerateDraftHandler(
        IDocumentRepository documentRepository,
        IInputSnapshotRepository inputSnapshotRepository,
        IDocumentVersionRepository documentVersionRepository,
        Abstractions.ITemplateRepository templateRepository,
        IAiDraftingClient aiDraftingClient,
        AiCreditChargeService aiCreditChargeService,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
    ) : ICommandHandler<GenerateDraftCommand, DocumentVersionDetailDto>
    {
        public async Task<DocumentVersionDetailDto> HandleAsync(
            GenerateDraftCommand command,
            CancellationToken ct
        )
        {
            var document = await documentRepository.GetByIdAsync(command.DocumentId, ct);
            if (document is null)
            {
                throw WorkflowErrors.DocumentNotFound(command.DocumentId);
            }

            if (document.OwnerUserId != command.UserId)
            {
                throw WorkflowErrors.DocumentAccessDenied();
            }

            var now = timeProvider.GetUtcNow();

            // 1. Resolve snapshot
            InputSnapshot? snapshot;
            if (command.SnapshotId.HasValue)
            {
                snapshot = await inputSnapshotRepository.GetByIdAsync(command.SnapshotId.Value, ct);
                if (snapshot is null || snapshot.DocumentId != document.Id)
                {
                    throw WorkflowErrors.SnapshotNotFound(command.SnapshotId.Value);
                }
            }
            else
            {
                snapshot = await inputSnapshotRepository.GetLatestByDocumentIdAsync(
                    document.Id,
                    ct
                );
                if (snapshot is null)
                {
                    throw WorkflowErrors.SnapshotRequired();
                }
            }

            // 2. Guard against rapid duplicate draft calls on the same document
            var existingVersions = await documentVersionRepository.GetByDocumentIdAsync(
                document.Id,
                ct
            );
            var latestAiDraft = existingVersions.FirstOrDefault(v => v.VersionType == "AI_DRAFT");
            if (
                latestAiDraft is not null
                && latestAiDraft.InputSnapshotId == snapshot.Id
                && now - latestAiDraft.CreatedAt < DuplicateCooldown
            )
            {
                throw WorkflowErrors.DraftCooldownActive();
            }

            if (!InFlightDocuments.TryAdd(document.Id, 0))
            {
                throw WorkflowErrors.DraftInProgress();
            }

            try
            {
                // 3. Load template schema from explicit version or the document's published template
                Guid? resolvedTemplateVersionId = command.TemplateVersionId;
                string? templateSchema;
                if (resolvedTemplateVersionId.HasValue)
                {
                    templateSchema = await documentRepository.GetTemplateFieldSchemaAsync(
                        resolvedTemplateVersionId.Value,
                        ct
                    );
                }
                else if (document.TemplateId.HasValue)
                {
                    var publishedTemplate = await templateRepository.FindPublishedAsync(
                        document.TemplateId.Value,
                        ct
                    );
                    resolvedTemplateVersionId = publishedTemplate?.Id;
                    templateSchema = publishedTemplate?.FieldSchema;
                }
                else
                {
                    templateSchema = null;
                }

                // 4. Reserve quota / billing credits before invoking AI service
                var billingNote = $"AI draft for document {document.Id}";
                var reservation = await aiCreditChargeService.ReserveAsync(
                    command.UserId,
                    AiChargeKind.Draft,
                    billingNote,
                    now,
                    ct
                );

                try
                {
                    // 5. Generate JSON draft content via Python AI service (RAG + unauthorized_numbers check)
                    var draftResponse = await aiDraftingClient.GenerateDraftAsync(
                        new AiDraftRequest(
                            document.Id,
                            snapshot.Data,
                            templateSchema,
                            document.PeriodStart,
                            document.PeriodEnd
                        ),
                        ct
                    );

                    // 6. Canonicalize JSON before jsonb storage & compute deterministic SHA-256 hash
                    var canonicalContent = CanonicalizeJson(draftResponse.Content);
                    var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(canonicalContent));
                    var contentHash = Convert.ToHexStringLower(hashBytes);

                    var normalizedCitations = NormalizeJsonb(command.Citations);
                    if (
                        normalizedCitations is null
                        && draftResponse.Citations.ValueKind == JsonValueKind.Array
                        && draftResponse.Citations.GetArrayLength() > 0
                    )
                    {
                        normalizedCitations = draftResponse.Citations.GetRawText();
                    }

                    // 7. Resolve next version number & persist atomically with usage/credit settlement
                    var settledAt = timeProvider.GetUtcNow();
                    var nextVersionNo = await documentVersionRepository.GetNextVersionNoAsync(
                        document.Id,
                        ct
                    );
                    var assessment = draftResponse.HasUnauthorizedNumbers
                        ? "AI_GENERATED_UNAUTHORIZED_NUMBERS"
                        : "AI_GENERATED_PENDING_REVIEW";

                    var documentVersion = new DocumentVersion
                    {
                        Id = UuidV7.NewGuid(),
                        DocumentId = document.Id,
                        VersionNo = nextVersionNo,
                        VersionType = "AI_DRAFT",
                        InputSnapshotId = snapshot.Id,
                        TemplateVersionId = resolvedTemplateVersionId,
                        Citations = normalizedCitations,
                        DraftAssessment = assessment,
                        ReviewCaseId = null,
                        FileUrl = null,
                        Content = canonicalContent,
                        ContentHash = contentHash,
                        IsImmutable = false,
                        CreatedBy = command.UserId,
                        CreatedAt = settledAt,
                    };

                    document.UpdatedAt = settledAt;

                    await using var tx = await unitOfWork.BeginTransactionAsync(ct);
                    await aiCreditChargeService.RecordCapturedUsageAsync(
                        reservation,
                        command.UserId,
                        conversationId: null,
                        questionId: null,
                        settledAt,
                        ct
                    );
                    await documentVersionRepository.AddAsync(documentVersion, ct);
                    await unitOfWork.SaveChangesAsync(ct);

                    await aiCreditChargeService.CaptureHeldCreditAsync(
                        reservation,
                        documentVersion.Id,
                        billingNote,
                        ct
                    );
                    await tx.CommitAsync(ct);

                    return new DocumentVersionDetailDto(
                        documentVersion.Id,
                        documentVersion.DocumentId,
                        documentVersion.VersionNo,
                        documentVersion.VersionType,
                        documentVersion.InputSnapshotId,
                        documentVersion.TemplateVersionId,
                        documentVersion.Citations,
                        documentVersion.DraftAssessment,
                        documentVersion.Content,
                        documentVersion.ContentHash,
                        documentVersion.IsImmutable,
                        documentVersion.CreatedBy,
                        documentVersion.CreatedAt
                    );
                }
                catch
                {
                    await aiCreditChargeService.ReleaseOnErrorAsync(
                        reservation,
                        "AI draft generation failed"
                    );
                    throw;
                }
            }
            finally
            {
                InFlightDocuments.TryRemove(document.Id, out _);
            }
        }

        private static string CanonicalizeJson(JsonElement element)
        {
            using var buffer = new MemoryStream();
            using (var writer = new Utf8JsonWriter(buffer, CanonicalWriterOptions))
            {
                WriteCanonicalElement(writer, element);
            }

            return Encoding.UTF8.GetString(buffer.ToArray());
        }

        private static void WriteCanonicalElement(Utf8JsonWriter writer, JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    writer.WriteStartObject();
                    foreach (
                        var prop in element
                            .EnumerateObject()
                            .OrderBy(p => p.Name, StringComparer.Ordinal)
                    )
                    {
                        writer.WritePropertyName(prop.Name);
                        WriteCanonicalElement(writer, prop.Value);
                    }
                    writer.WriteEndObject();
                    break;

                case JsonValueKind.Array:
                    writer.WriteStartArray();
                    foreach (var item in element.EnumerateArray())
                    {
                        WriteCanonicalElement(writer, item);
                    }
                    writer.WriteEndArray();
                    break;

                default:
                    element.WriteTo(writer);
                    break;
            }
        }

        private static string? NormalizeJsonb(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            var trimmed = raw.Trim();
            try
            {
                using var _ = JsonDocument.Parse(trimmed);
                return trimmed;
            }
            catch (JsonException)
            {
                return JsonSerializer.Serialize(trimmed);
            }
        }
    }
}
