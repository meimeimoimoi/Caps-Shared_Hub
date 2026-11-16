using System.Text.Json;
using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Application.Features.Documents;
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
            """[{"name":"revenue","type":"number"}]""",
            Owner,
            Now
        );
        publishedVersion.Publish(null);

        var store = new Store(publishedVersion);
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
        Assert.Equal("AI_GENERATED_PENDING_REVIEW", result.DraftAssessment);
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

    private static GenerateDraft.GenerateDraftHandler CreateHandler(Store store) =>
        new(store, store, store, store, store, store, store, new FixedClock());

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Store(TemplateVersion? publishedTemplate)
        : IDocumentRepository,
            IInputSnapshotRepository,
            IDocumentVersionRepository,
            ITemplateRepository,
            IAiUsageRepository,
            IAiDraftingClient,
            IUnitOfWork,
            ITransaction
    {
        public List<Document> Documents { get; } = [];
        public List<InputSnapshot> Snapshots { get; } = [];
        public List<DocumentVersion> Versions { get; } = [];
        public List<AiUsage> Usages { get; } = [];
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

        public void Add(Template newTemplate) => throw new NotSupportedException();

        public void Add(TemplateVersion version) => throw new NotSupportedException();

        public Task AddAsync(AiUsage usage, CancellationToken ct = default)
        {
            Usages.Add(usage);
            return Task.CompletedTask;
        }

        public Task<AiDraftResponse> GenerateDraftAsync(
            AiDraftRequest request,
            CancellationToken ct = default
        )
        {
            LastRequest = request;
            return Task.FromResult(
                new AiDraftResponse(
                    JsonSerializer.SerializeToElement(new { summary = "Generated" }),
                    "ai-hash",
                    false,
                    [],
                    JsonSerializer.SerializeToElement(Array.Empty<object>())
                )
            );
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
