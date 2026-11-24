using System.Text.Json;
using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.Features.Documents;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

public sealed class GenerateDraftTests
{
    private static readonly Guid Owner = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 11, 15, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Jan1 = new(2026, 1, 1);
    private static readonly DateOnly Mar31 = new(2026, 3, 31);

    [Fact]
    public async Task Generates_draft_using_published_template_when_version_is_omitted()
    {
        var template = Template.Create("CIT_Q1", "CIT Declaration", null, Now);
        var publishedVersion = TemplateVersion.SaveDraft(
            template,
            null,
            """[{"name":"revenue","type":"number","required":true}]""",
            Owner,
            Now
        );
        publishedVersion.Publish(null);

        var store = new Store(publishedVersion)
        {
            NextResponse = new AiDraftResponse(
                JsonSerializer.SerializeToElement(new { revenue = 1000 }),
                "ai-hash",
                false,
                [],
                JsonSerializer.SerializeToElement(
                    new[]
                    {
                        new
                        {
                            document_number = "320/2025/ND-CP",
                            doc_title = "Decree 320",
                            article = "Điều 11",
                            effective_from = "2025-01-01",
                        },
                    }
                )
            ),
        };
        var doc = store.AddDocument(Owner, template.Id);
        var snapshot = store.AddSnapshot(doc, "{\"revenue\":1000}");
        var handler = CreateHandler(store);

        var result = await handler.HandleAsync(
            new(doc.Id, Owner, snapshot.Id, TemplateVersionId: null, Citations: null),
            default
        );

        Assert.Equal(publishedVersion.Id, result.TemplateVersionId);
        Assert.Equal(publishedVersion.FieldSchema, store.LastRequest?.TemplateSchemaJson);
        Assert.Equal("AI_DRAFT", result.VersionType);
        Assert.Equal(DraftReadinessStatus.Ready, result.DraftAssessment);
        Assert.Empty(result.DraftIssues!);
        var usage = Assert.Single(store.Usages);
        Assert.Equal((AiUsagePaidWith.Free, AiUsageState.Captured), (usage.PaidWith, usage.State));
        Assert.True(store.Saved);
    }

    [Fact]
    public async Task Uses_explicit_template_version_schema_when_provided()
    {
        var store = new Store(publishedTemplate: null);
        var explicitVersionId = Guid.NewGuid();
        store.ExplicitSchemas[explicitVersionId] = """[{"name":"profit","type":"number"}]""";
        var doc = store.AddDocument(Owner, templateId: null);
        store.AddSnapshot(doc, "{\"profit\":500}");

        var result = await CreateHandler(store)
            .HandleAsync(new(doc.Id, Owner, null, explicitVersionId, null), default);

        Assert.Equal(explicitVersionId, result.TemplateVersionId);
        Assert.Equal(
            store.ExplicitSchemas[explicitVersionId],
            store.LastRequest?.TemplateSchemaJson
        );
    }

    [Fact]
    public async Task Stays_free_when_ai_billing_is_disabled()
    {
        var store = new Store(publishedTemplate: null);
        var doc = store.AddDocument(Owner, templateId: null);
        store.AddSnapshot(doc, "{}");

        var result = await CreateHandler(store, new AiBillingSettings { Enabled = false })
            .HandleAsync(new(doc.Id, Owner, null, null, null), default);

        Assert.Equal("AI_DRAFT", result.VersionType);
        Assert.Empty(store.HoldCalls);
        var usage = Assert.Single(store.Usages);
        Assert.Equal(
            (AiUsagePaidWith.Free, 0L, AiUsageState.Captured),
            (usage.PaidWith, usage.CreditHold, usage.State)
        );
    }

    [Fact]
    public async Task Rejects_when_wallet_credits_are_exhausted()
    {
        var store = new Store(publishedTemplate: null) { WalletBalance = 1_000 };
        var doc = store.AddDocument(Owner, templateId: null);
        store.AddSnapshot(doc, "{}");

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            CreateHandler(store, EnabledBillingSettings)
                .HandleAsync(new(doc.Id, Owner, null, null, null), default)
        );

        Assert.Equal("INSUFFICIENT_CREDITS", ex.Code);
        Assert.Null(store.LastRequest);
        Assert.False(store.Saved);
    }

    [Fact]
    public async Task Holds_and_captures_credits_with_document_version_when_enabled()
    {
        var store = new Store(publishedTemplate: null) { WalletBalance = 5_000 };
        var doc = store.AddDocument(Owner, templateId: null);
        store.AddSnapshot(doc, "{}");

        var result = await CreateHandler(store, EnabledBillingSettings)
            .HandleAsync(new(doc.Id, Owner, null, null, null), default);

        Assert.Equal(3_000, store.WalletBalance);
        Assert.Single(store.HoldCalls);
        var captured = Assert.Single(store.CaptureCalls);
        Assert.Equal(result.Id, captured.DocumentVersionId);
        Assert.Empty(store.ReleaseCalls);
        var usage = Assert.Single(store.Usages);
        Assert.Equal(
            (AiUsagePaidWith.Credit, 2_000L, AiUsageState.Captured),
            (usage.PaidWith, usage.CreditHold, usage.State)
        );
    }

    [Fact]
    public async Task Releases_held_credits_when_ai_drafting_fails()
    {
        var store = new Store(publishedTemplate: null) { WalletBalance = 5_000, FailDraft = true };
        var doc = store.AddDocument(Owner, templateId: null);
        store.AddSnapshot(doc, "{}");

        await Assert.ThrowsAsync<AppException>(() =>
            CreateHandler(store, EnabledBillingSettings)
                .HandleAsync(new(doc.Id, Owner, null, null, null), default)
        );

        Assert.Equal(5_000, store.WalletBalance);
        Assert.Single(store.HoldCalls);
        Assert.Empty(store.CaptureCalls);
        Assert.Single(store.ReleaseCalls);
        Assert.False(store.Saved);
    }

    [Fact]
    public async Task Rejects_when_no_snapshot_exists()
    {
        var store = new Store(publishedTemplate: null);
        var doc = store.AddDocument(Owner, templateId: null);

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            CreateHandler(store).HandleAsync(new(doc.Id, Owner, null, null, null), default)
        );

        Assert.Equal("WORKFLOW_SNAPSHOT_REQUIRED", ex.Code);
        Assert.Null(store.LastRequest);
        Assert.False(store.Saved);
    }

    [Fact]
    public async Task Rejects_duplicate_call_within_cooldown_for_same_snapshot()
    {
        var store = new Store(publishedTemplate: null);
        var doc = store.AddDocument(Owner, templateId: null);
        var snapshot = store.AddSnapshot(doc, "{\"revenue\":100}");
        store.Versions.Add(
            new DocumentVersion
            {
                Id = Guid.NewGuid(),
                DocumentId = doc.Id,
                VersionNo = 1,
                VersionType = "AI_DRAFT",
                InputSnapshotId = snapshot.Id,
                Content = "{\"summary\":\"prev\"}",
                ContentHash = "hash",
                CreatedBy = Owner,
                CreatedAt = Now.AddSeconds(-10),
            }
        );

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            CreateHandler(store).HandleAsync(new(doc.Id, Owner, snapshot.Id, null, null), default)
        );

        Assert.Equal("WORKFLOW_DRAFT_COOLDOWN", ex.Code);
        Assert.Null(store.LastRequest);
    }

    [Fact]
    public async Task Charges_credits_without_consuming_chat_free_quota_when_free_quota_is_enabled()
    {
        var store = new Store(publishedTemplate: null) { WalletBalance = 5_000 };
        var doc = store.AddDocument(Owner, templateId: null);
        store.AddSnapshot(doc, "{}");
        var settings = new AiBillingSettings
        {
            Enabled = true,
            FreeQuotaEnabled = true,
            InitialFreeQuota = 10,
            DraftCreditCost = 2_000,
        };

        await CreateHandler(store, settings)
            .HandleAsync(new(doc.Id, Owner, null, null, null), default);

        Assert.Empty(store.Quotas);
        Assert.Equal(3_000, store.WalletBalance);
        Assert.Single(store.HoldCalls);
        Assert.Equal(AiUsagePaidWith.Credit, Assert.Single(store.Usages).PaidWith);
    }

    [Fact]
    public async Task Readiness_is_ready_with_warnings_when_only_warnings_exist()
    {
        var template = Template.Create("CIT_WARN", "CIT Declaration", null, Now);
        var publishedVersion = TemplateVersion.SaveDraft(
            template,
            null,
            """
            [
              {"id":"revenue","label":"Doanh thu","required":true},
              {"id":"note","label":"Ghi chú bổ sung","required":false}
            ]
            """,
            Owner,
            Now
        );
        publishedVersion.Publish(null);

        var store = new Store(publishedVersion)
        {
            NextResponse = new AiDraftResponse(
                JsonSerializer.SerializeToElement(new { revenue = 1000 }),
                "ai-hash",
                false,
                [],
                JsonSerializer.SerializeToElement(
                    new[]
                    {
                        new
                        {
                            document_number = "320/2025/ND-CP",
                            doc_title = "Decree 320",
                            article = (string?)null,
                            effective_from = (string?)null,
                        },
                    }
                )
            ),
        };
        var doc = store.AddDocument(Owner, template.Id);
        var snapshot = store.AddSnapshot(doc, "{\"revenue\":1000}");

        var result = await CreateHandler(store)
            .HandleAsync(new(doc.Id, Owner, snapshot.Id, null, null), default);

        Assert.Equal(DraftReadinessStatus.ReadyWithWarnings, result.DraftAssessment);
        Assert.NotNull(result.DraftIssues);
        Assert.All(result.DraftIssues!, i => Assert.Equal(DraftIssueSeverity.Warning, i.Severity));
        Assert.Contains(
            result.DraftIssues!,
            i => i.Code == DraftIssueCode.MissingOptionalField && i.FieldId == "note"
        );
        Assert.Contains(
            result.DraftIssues!,
            i => i.Code == DraftIssueCode.IncompleteCitationMetadata
        );

        var detail = await new GetDocumentVersionDetail.GetDocumentVersionDetailHandler(
            store,
            store
        ).HandleAsync(new(doc.Id, result.Id, Owner), default);
        Assert.Equal(DraftReadinessStatus.ReadyWithWarnings, detail.DraftAssessment);
        Assert.Equal(result.DraftIssues!.Count, detail.DraftIssues!.Count);
    }

    [Fact]
    public async Task Readiness_is_not_ready_when_grounding_issue_or_empty_citations_occur()
    {
        var template = Template.Create("CIT_GROUND", "CIT Declaration", null, Now);
        var publishedVersion = TemplateVersion.SaveDraft(
            template,
            null,
            """[{"id":"revenue","label":"Doanh thu","required":true}]""",
            Owner,
            Now
        );
        publishedVersion.Publish(null);

        var store = new Store(publishedVersion)
        {
            NextResponse = new AiDraftResponse(
                JsonSerializer.SerializeToElement(new { revenue = 1000 }),
                "ai-hash",
                false,
                [],
                JsonSerializer.SerializeToElement(Array.Empty<object>()),
                HasGroundingIssues: true,
                Issues:
                [
                    new AiDraftIssue(
                        DraftIssueCode.MissingLegalBasis,
                        DraftIssueType.GroundingIssue,
                        DraftIssueSeverity.Blocking,
                        "Không tìm thấy căn cứ pháp lý phù hợp."
                    ),
                ]
            ),
        };
        var doc = store.AddDocument(Owner, template.Id);
        var snapshot = store.AddSnapshot(doc, "{\"revenue\":1000}");

        var result = await CreateHandler(store)
            .HandleAsync(new(doc.Id, Owner, snapshot.Id, null, null), default);

        Assert.Equal(DraftReadinessStatus.NotReady, result.DraftAssessment);
        var issue = Assert.Single(result.DraftIssues!);
        Assert.Equal(DraftIssueCode.MissingLegalBasis, issue.Code);
        Assert.Equal(DraftIssueType.GroundingIssue, issue.Type);
        Assert.Equal(DraftIssueSeverity.Blocking, issue.Severity);

        var persisted = Assert.Single(store.Versions);
        Assert.Equal(DraftReadinessStatus.NotReady, persisted.DraftAssessment);
        Assert.Contains(DraftIssueCode.MissingLegalBasis, persisted.DraftIssues);
    }

    [Fact]
    public async Task Readiness_is_not_ready_for_unauthorized_numbers_missing_required_field_or_untraceable_citation()
    {
        var template = Template.Create("CIT_BLOCK", "CIT Declaration", null, Now);
        var publishedVersion = TemplateVersion.SaveDraft(
            template,
            null,
            """
            [
              {"id":"revenue","label":"Doanh thu","required":true},
              {"id":"taxableIncome","label":"Thu nhập tính thuế","required":true},
              {"id":"optionalNote","label":"Ghi chú","required":false}
            ]
            """,
            Owner,
            Now
        );
        publishedVersion.Publish(null);

        var store = new Store(publishedVersion)
        {
            NextResponse = new AiDraftResponse(
                JsonSerializer.SerializeToElement(new { revenue = 1000 }),
                "ai-hash",
                HasUnauthorizedNumbers: true,
                UnauthorizedNumbers: ["999999"],
                Citations: JsonSerializer.SerializeToElement(
                    new[] { new { doc_title = "Unknown source" } }
                )
            ),
        };
        var doc = store.AddDocument(Owner, template.Id);
        var snapshot = store.AddSnapshot(doc, "{\"revenue\":1000}");

        var result = await CreateHandler(store)
            .HandleAsync(new(doc.Id, Owner, snapshot.Id, null, null), default);

        Assert.Equal(DraftReadinessStatus.NotReady, result.DraftAssessment);
        var issues = result.DraftIssues!;
        Assert.Contains(
            issues,
            i =>
                i.Code == DraftIssueCode.UnauthorizedNumbers
                && i.Severity == DraftIssueSeverity.Blocking
        );
        Assert.Contains(
            issues,
            i =>
                i.Code == DraftIssueCode.MissingRequiredSection
                && i.FieldId == "taxableIncome"
                && i.Severity == DraftIssueSeverity.Blocking
        );
        Assert.Contains(
            issues,
            i =>
                i.Code == DraftIssueCode.UntraceableRequiredCitation
                && i.Severity == DraftIssueSeverity.Blocking
        );
        // Warning issue is also preserved alongside blocking issues
        Assert.Contains(
            issues,
            i =>
                i.Code == DraftIssueCode.MissingOptionalField
                && i.FieldId == "optionalNote"
                && i.Severity == DraftIssueSeverity.Warning
        );
    }

    private static readonly AiBillingSettings FreeBillingSettings = new() { Enabled = false };

    private static readonly AiBillingSettings EnabledBillingSettings = new()
    {
        Enabled = true,
        ChatCreditCost = 1_000,
        DraftCreditCost = 2_000,
    };

    private static GenerateDraft.GenerateDraftHandler CreateHandler(
        Store store,
        AiBillingSettings? settings = null
    )
    {
        var billing = settings ?? FreeBillingSettings;
        var clock = new FixedClock();
        var chargeService = new AiCreditChargeService(store, store, store, billing, clock);
        return new(store, store, store, store, store, chargeService, billing, store, clock);
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Store(TemplateVersion? publishedTemplate)
        : IDocumentRepository,
            IInputSnapshotRepository,
            IDocumentVersionRepository,
            ITemplateRepository,
            IAiQuotaRepository,
            IAiUsageRepository,
            IAiCredits,
            IAiDraftingClient,
            IUnitOfWork,
            ITransaction
    {
        public List<Document> Documents { get; } = [];
        public List<InputSnapshot> Snapshots { get; } = [];
        public List<DocumentVersion> Versions { get; } = [];
        public Dictionary<Guid, AiQuota> Quotas { get; } = [];
        public List<AiUsage> Usages { get; } = [];
        public List<Guid> HoldCalls { get; } = [];
        public List<(Guid UsageId, Guid? DocumentVersionId)> CaptureCalls { get; } = [];
        public List<Guid> ReleaseCalls { get; } = [];
        public long WalletBalance { get; set; }
        public long WalletHeld { get; set; }
        public bool FailDraft { get; set; }
        public AiDraftResponse? NextResponse { get; set; }
        public Dictionary<Guid, string> ExplicitSchemas { get; } = [];
        public AiDraftRequest? LastRequest { get; private set; }
        public bool Saved { get; private set; }

        public Document AddDocument(Guid owner, Guid? templateId)
        {
            var doc = new Document
            {
                Id = Guid.NewGuid(),
                OwnerUserId = owner,
                Source = templateId.HasValue ? "TEMPLATE" : "FREEFORM",
                TemplateId = templateId,
                Title = "Q1 Tax",
                PeriodStart = Jan1,
                PeriodEnd = Mar31,
                Status = "DRAFT",
                Metadata = "{}",
                CreatedAt = Now,
                UpdatedAt = Now,
            };
            Documents.Add(doc);
            return doc;
        }

        public InputSnapshot AddSnapshot(Document doc, string data)
        {
            var snapshot = new InputSnapshot
            {
                Id = Guid.NewGuid(),
                DocumentId = doc.Id,
                VersionNo = Snapshots.Count(s => s.DocumentId == doc.Id) + 1,
                Data = data,
                CreatedBy = doc.OwnerUserId,
                CreatedAt = Now,
            };
            Snapshots.Add(snapshot);
            return snapshot;
        }

        public Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(Documents.SingleOrDefault(d => d.Id == id));

        public Task<(IReadOnlyList<Document> Items, int TotalCount)> GetPageByUserIdAsync(
            Guid userId,
            string? status,
            int page,
            int pageSize,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<string?> GetTemplateFieldSchemaAsync(
            Guid templateVersionId,
            CancellationToken ct = default
        ) =>
            Task.FromResult(
                ExplicitSchemas.TryGetValue(templateVersionId, out var schema) ? schema : null
            );

        public Task AddAsync(Document document, CancellationToken ct = default)
        {
            Documents.Add(document);
            return Task.CompletedTask;
        }

        public Task<bool> OwnsVersionAsync(
            Guid userId,
            Guid documentId,
            Guid versionId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        Task<InputSnapshot?> IInputSnapshotRepository.GetByIdAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Snapshots.SingleOrDefault(s => s.Id == id));

        public Task<InputSnapshot?> GetLatestByDocumentIdAsync(
            Guid documentId,
            CancellationToken ct = default
        ) =>
            Task.FromResult(
                Snapshots.Where(s => s.DocumentId == documentId).MaxBy(s => s.VersionNo)
            );

        Task<int> IInputSnapshotRepository.GetNextVersionNoAsync(
            Guid documentId,
            CancellationToken ct
        ) => Task.FromResult(Snapshots.Count(s => s.DocumentId == documentId) + 1);

        public Task AddAsync(InputSnapshot inputSnapshot, CancellationToken ct = default)
        {
            Snapshots.Add(inputSnapshot);
            return Task.CompletedTask;
        }

        Task<DocumentVersion?> IDocumentVersionRepository.GetByIdAsync(
            Guid id,
            CancellationToken ct
        ) => Task.FromResult(Versions.SingleOrDefault(v => v.Id == id));

        public Task<IReadOnlyList<DocumentVersion>> GetByDocumentIdAsync(
            Guid documentId,
            CancellationToken ct = default
        ) =>
            Task.FromResult<IReadOnlyList<DocumentVersion>>(
                Versions.Where(v => v.DocumentId == documentId).ToList()
            );

        Task<int> IDocumentVersionRepository.GetNextVersionNoAsync(
            Guid documentId,
            CancellationToken ct
        ) => Task.FromResult(Versions.Count(v => v.DocumentId == documentId) + 1);

        public Task AddAsync(DocumentVersion documentVersion, CancellationToken ct = default)
        {
            Versions.Add(documentVersion);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<TemplateVersion>> ListPublishedAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<TemplateVersion?> FindPublishedAsync(Guid templateId, CancellationToken ct) =>
            Task.FromResult(
                publishedTemplate is not null && publishedTemplate.TemplateId == templateId
                    ? publishedTemplate
                    : null
            );

        public Task<Template?> FindByCodeAsync(string code, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<TemplateVersion?> FindLatestVersionAsync(
            Guid templateId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<TemplateVersion?> FindReleasedVersionAsync(
            Guid versionId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<TemplateVersion?> FindPublishedVersionAsync(
            Guid templateId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<Template>> ListWithVersionsAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<Template?> FindWithVersionsAsync(Guid templateId, CancellationToken ct) =>
            throw new NotSupportedException();

        public void Add(Template newTemplate) => throw new NotSupportedException();

        public void Add(TemplateVersion version) => throw new NotSupportedException();

        public Task AddAsync(AiUsage usage, CancellationToken ct = default)
        {
            Usages.Add(usage);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<AiUsage>> FindByQuestionIdsAsync(
            IReadOnlyCollection<Guid> questionIds,
            CancellationToken ct = default
        ) =>
            Task.FromResult<IReadOnlyList<AiUsage>>(
                Usages
                    .Where(u => u.QuestionId.HasValue && questionIds.Contains(u.QuestionId.Value))
                    .ToList()
            );

        public Task<AiQuota?> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Quotas.GetValueOrDefault(userId));

        public Task AddAsync(AiQuota aiQuota, CancellationToken ct = default)
        {
            Quotas[aiQuota.UserId] = aiQuota;
            return Task.CompletedTask;
        }

        public Task<bool> TryReserveOneAsync(
            Guid userId,
            int initialBalance,
            DateTimeOffset now,
            CancellationToken ct = default
        )
        {
            if (!Quotas.TryGetValue(userId, out var quota))
            {
                quota = AiQuota.Create(userId, initialBalance, now);
                Quotas[userId] = quota;
            }
            if (!quota.HasAvailableQuota())
                return Task.FromResult(false);
            quota.Deduct(1, now);
            return Task.FromResult(true);
        }

        public Task RefundOneAsync(Guid userId, DateTimeOffset now, CancellationToken ct = default)
        {
            if (Quotas.TryGetValue(userId, out var quota))
                quota.Refund(1, now);
            return Task.CompletedTask;
        }

        public Task<AiDraftResponse> GenerateDraftAsync(
            AiDraftRequest request,
            CancellationToken ct = default
        )
        {
            LastRequest = request;
            if (FailDraft)
            {
                throw WorkflowErrors.DraftGenerationFailed();
            }

            return Task.FromResult(
                NextResponse
                    ?? new AiDraftResponse(
                        JsonSerializer.SerializeToElement(new { summary = "Generated" }),
                        "ai-hash",
                        false,
                        [],
                        JsonSerializer.SerializeToElement(Array.Empty<object>())
                    )
            );
        }

        public Task HoldAsync(
            Guid userId,
            Guid aiUsageId,
            long amount,
            string? note,
            CancellationToken ct
        )
        {
            if (WalletBalance < amount)
            {
                throw new AppException(
                    ErrorType.Conflict,
                    "INSUFFICIENT_CREDITS",
                    "The wallet balance is not enough."
                );
            }

            WalletBalance -= amount;
            WalletHeld += amount;
            HoldCalls.Add(aiUsageId);
            return Task.CompletedTask;
        }

        public Task CaptureAsync(
            Guid aiUsageId,
            Guid? documentVersionId,
            string? note,
            CancellationToken ct
        )
        {
            WalletHeld = 0;
            CaptureCalls.Add((aiUsageId, documentVersionId));
            return Task.CompletedTask;
        }

        public Task ReleaseAsync(Guid aiUsageId, string? note, CancellationToken ct)
        {
            WalletBalance += WalletHeld;
            WalletHeld = 0;
            ReleaseCalls.Add(aiUsageId);
            return Task.CompletedTask;
        }

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct)
        {
            Saved = true;
            return Task.CompletedTask;
        }

        public Task CommitAsync(CancellationToken ct) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
