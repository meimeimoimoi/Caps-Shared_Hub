using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Application.Features.Documents;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

// Checks the document API handlers from feat/ai-service against fakes.
public sealed class DocumentHandlerTests
{
    private static readonly Guid Owner = Guid.NewGuid();
    private static readonly Guid Stranger = Guid.NewGuid();
    private static readonly DateOnly Jan = new(2026, 1, 1);
    private static readonly DateOnly Mar = new(2026, 3, 31);

    [Fact]
    public async Task Create_rejects_a_period_that_ends_before_it_starts()
    {
        var store = new Store();
        var e = await Assert.ThrowsAsync<AppException>(() =>
            Create(store).HandleAsync(new(Owner, "Q1", null, Mar, Jan, null, null), default)
        );
        Assert.Equal("WORKFLOW_DOCUMENT_INVALID_PERIOD", e.Code);
        Assert.False(store.Saved);
    }

    [Fact]
    public async Task Create_saves_a_draft_owned_by_the_caller()
    {
        var store = new Store();
        var dto = await Create(store)
            .HandleAsync(new(Owner, "  Q1 VAT  ", null, Jan, Mar, null, null), default);
        Assert.Equal("Q1 VAT", dto.Title);
        Assert.Equal("DRAFT", dto.Status);
        Assert.Equal("TEMPLATE", dto.Source);
        Assert.Equal(Owner, store.Documents.Single().OwnerUserId);
        Assert.True(store.Saved);
    }

    // metadata is a jsonb column: non-JSON text must be a 400, not a database error
    [Fact]
    public async Task Create_rejects_metadata_that_is_not_json()
    {
        var store = new Store();
        var e = await Assert.ThrowsAsync<AppException>(() =>
            Create(store).HandleAsync(new(Owner, "Q1", null, Jan, Mar, null, "not json"), default)
        );
        Assert.Equal("WORKFLOW_DOCUMENT_INVALID_JSON", e.Code);
        Assert.False(store.Saved);
    }

    [Fact]
    public async Task Create_rejects_a_template_that_is_not_published()
    {
        var store = new Store();
        var e = await Assert.ThrowsAsync<AppException>(() =>
            Create(store)
                .HandleAsync(new(Owner, "Q1", Guid.NewGuid(), Jan, Mar, null, null), default)
        );
        Assert.Equal("TEMPLATE_NOT_FOUND", e.Code);
        Assert.False(store.Saved);
    }

    [Fact]
    public async Task List_caps_the_page_size()
    {
        var store = new Store();
        var page = await new GetDocument.GetDocumentsHandler(store).HandleAsync(
            new(Owner, null, 1, 100_000),
            default
        );
        Assert.True(page.PageSize <= 100, $"pageSize {page.PageSize} is not capped");
    }

    [Fact]
    public async Task Snapshot_of_someone_elses_document_is_a_document_access_error()
    {
        var store = new Store();
        var doc = store.AddDocument(Owner);
        var e = await Assert.ThrowsAsync<AppException>(() =>
            Snapshot(store).HandleAsync(new(doc.Id, Stranger, "{}"), default)
        );
        Assert.Equal("WORKFLOW_DOCUMENT_ACCESS_DENIED", e.Code);
        Assert.Empty(store.Snapshots);
    }

    [Fact]
    public async Task Snapshot_of_a_missing_document_is_not_found()
    {
        var e = await Assert.ThrowsAsync<AppException>(() =>
            Snapshot(new Store()).HandleAsync(new(Guid.NewGuid(), Owner, "{}"), default)
        );
        Assert.Equal("WORKFLOW_DOCUMENT_NOT_FOUND", e.Code);
    }

    [Fact]
    public async Task Snapshots_are_numbered_per_document()
    {
        var store = new Store();
        var doc = store.AddDocument(Owner);
        var first = await Snapshot(store).HandleAsync(new(doc.Id, Owner, "{\"a\":1}"), default);
        var second = await Snapshot(store).HandleAsync(new(doc.Id, Owner, "{\"a\":2}"), default);
        Assert.Equal([1, 2], new[] { first.VersionNo, second.VersionNo });
    }

    [Fact]
    public async Task Snapshot_rejects_data_that_is_not_json()
    {
        var store = new Store();
        var doc = store.AddDocument(Owner);
        var e = await Assert.ThrowsAsync<AppException>(() =>
            Snapshot(store).HandleAsync(new(doc.Id, Owner, "revenue 100"), default)
        );
        Assert.Equal("WORKFLOW_DOCUMENT_INVALID_JSON", e.Code);
        Assert.Empty(store.Snapshots);
    }

    [Fact]
    public async Task Versions_are_hidden_from_strangers()
    {
        var store = new Store();
        var doc = store.AddDocument(Owner);
        var e = await Assert.ThrowsAsync<AppException>(() =>
            new GetDocumentVersions.GetDocumentVersionHandler(store, store).HandleAsync(
                new(doc.Id, Stranger),
                default
            )
        );
        Assert.Equal("WORKFLOW_DOCUMENT_ACCESS_DENIED", e.Code);
    }

    [Fact]
    public async Task Version_detail_of_another_document_is_not_found()
    {
        var store = new Store();
        var mine = store.AddDocument(Owner);
        var foreign = store.AddVersion(store.AddDocument(Owner));
        var e = await Assert.ThrowsAsync<AppException>(() =>
            new GetDocumentVersionDetail.GetDocumentVersionDetailHandler(store, store).HandleAsync(
                new(mine.Id, foreign.Id, Owner),
                default
            )
        );
        Assert.Equal("WORKFLOW_DOCUMENT_VERSION_NOT_FOUND", e.Code);
    }

    [Fact]
    public async Task Download_returns_the_requested_version()
    {
        var store = new Store();
        var doc = store.AddDocument(Owner);
        var version = store.AddVersion(doc);
        var dto = await new DownloadDocumentVersion.DownloadDocumentVersionHandler(
            store,
            store,
            TimeProvider.System
        ).HandleAsync(new(doc.Id, version.Id, Owner, "docx"), default);
        Assert.Contains(version.Id.ToString(), dto.DownloadUrl);
        Assert.Equal("docx", dto.Format);
    }

    [Fact]
    public async Task Download_is_hidden_from_strangers()
    {
        var store = new Store();
        var doc = store.AddDocument(Owner);
        var version = store.AddVersion(doc);
        var e = await Assert.ThrowsAsync<AppException>(() =>
            new DownloadDocumentVersion.DownloadDocumentVersionHandler(
                store,
                store,
                TimeProvider.System
            ).HandleAsync(new(doc.Id, version.Id, Stranger, null), default)
        );
        Assert.Equal("WORKFLOW_DOCUMENT_ACCESS_DENIED", e.Code);
    }

    private static CreateDocument.CreateDocumentHandler Create(Store s) =>
        new(s, new NoPublishedTemplates(), s, TimeProvider.System);

    private static CreateInputSnapshot.CreateInputSnapshotHandler Snapshot(Store s) =>
        new(s, s, s, TimeProvider.System);

    private sealed class NoPublishedTemplates : ITemplateRepository
    {
        public void Add(Template template) => throw new NotSupportedException();

        public void Add(TemplateVersion version) => throw new NotSupportedException();

        public Task<TemplateVersion?> FindPublishedAsync(Guid templateId, CancellationToken ct) =>
            Task.FromResult<TemplateVersion?>(null);

        public Task<IReadOnlyList<TemplateVersion>> ListPublishedAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<Template?> FindByCodeAsync(string code, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<TemplateVersion?> FindLatestVersionAsync(
            Guid templateId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<TemplateVersion?> FindPublishedVersionAsync(
            Guid templateId,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }

    private sealed class Store
        : IDocumentRepository,
            IInputSnapshotRepository,
            IDocumentVersionRepository,
            IUnitOfWork
    {
        public const string AiContent = "{\"sections\":[]}";
        public List<Document> Documents { get; } = [];
        public List<InputSnapshot> Snapshots { get; } = [];
        public List<DocumentVersion> Versions { get; } = [];
        public bool Saved { get; private set; }

        public Document AddDocument(Guid owner)
        {
            var d = new Document
            {
                Id = Guid.NewGuid(),
                OwnerUserId = owner,
                Title = "Q1",
                Source = "TEMPLATE",
                Status = "DRAFT",
                Metadata = "{}",
                PeriodStart = Jan,
                PeriodEnd = Mar,
            };
            Documents.Add(d);
            return d;
        }

        public InputSnapshot AddSnapshot(Document d)
        {
            var s = new InputSnapshot
            {
                Id = Guid.NewGuid(),
                DocumentId = d.Id,
                VersionNo = Snapshots.Count(x => x.DocumentId == d.Id) + 1,
                Data = "{}",
            };
            Snapshots.Add(s);
            return s;
        }

        public DocumentVersion AddVersion(Document d)
        {
            var v = new DocumentVersion
            {
                Id = Guid.NewGuid(),
                DocumentId = d.Id,
                VersionNo = Versions.Count(x => x.DocumentId == d.Id) + 1,
                VersionType = "AI_DRAFT",
                Content = AiContent,
                ContentHash = "H",
            };
            Versions.Add(v);
            return v;
        }

        Task<Document?> IDocumentRepository.GetByIdAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Documents.SingleOrDefault(x => x.Id == id));

        public Task<(IReadOnlyList<Document> Items, int TotalCount)> GetPageByUserIdAsync(
            Guid userId,
            string? status,
            int page,
            int pageSize,
            CancellationToken ct = default
        ) => Task.FromResult<(IReadOnlyList<Document>, int)>(([], 0));

        public Task<bool> OwnsVersionAsync(
            Guid userId,
            Guid documentId,
            Guid versionId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<string?> GetTemplateFieldSchemaAsync(
            Guid templateVersionId,
            CancellationToken ct = default
        ) => Task.FromResult<string?>(null);

        public Task AddAsync(Document document, CancellationToken ct = default)
        {
            Documents.Add(document);
            return Task.CompletedTask;
        }

        Task<InputSnapshot?> IInputSnapshotRepository.GetByIdAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Snapshots.SingleOrDefault(x => x.Id == id));

        public Task<InputSnapshot?> GetLatestByDocumentIdAsync(
            Guid documentId,
            CancellationToken ct = default
        ) =>
            Task.FromResult(
                Snapshots.Where(x => x.DocumentId == documentId).MaxBy(x => x.VersionNo)
            );

        Task<int> IInputSnapshotRepository.GetNextVersionNoAsync(
            Guid documentId,
            CancellationToken ct
        ) => Task.FromResult(Snapshots.Count(x => x.DocumentId == documentId) + 1);

        public Task AddAsync(InputSnapshot inputSnapshot, CancellationToken ct = default)
        {
            Snapshots.Add(inputSnapshot);
            return Task.CompletedTask;
        }

        Task<DocumentVersion?> IDocumentVersionRepository.GetByIdAsync(
            Guid id,
            CancellationToken ct
        ) => Task.FromResult(Versions.SingleOrDefault(x => x.Id == id));

        public Task<IReadOnlyList<DocumentVersion>> GetByDocumentIdAsync(
            Guid documentId,
            CancellationToken ct = default
        ) =>
            Task.FromResult<IReadOnlyList<DocumentVersion>>(
                Versions.Where(x => x.DocumentId == documentId).ToList()
            );

        Task<int> IDocumentVersionRepository.GetNextVersionNoAsync(
            Guid documentId,
            CancellationToken ct
        ) => Task.FromResult(Versions.Count(x => x.DocumentId == documentId) + 1);

        public Task AddAsync(DocumentVersion version, CancellationToken ct = default)
        {
            Versions.Add(version);
            return Task.CompletedTask;
        }

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task SaveChangesAsync(CancellationToken ct)
        {
            Saved = true;
            return Task.CompletedTask;
        }
    }
}
