using System.Security.Cryptography;
using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.Features.Documents.UploadDocument;

namespace Caps.Workflow.UnitTests;

public sealed class DocumentUploadTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 15, 8, 0, 0, TimeSpan.Zero);
    private static readonly byte[] Pdf = [.. "%PDF-1.7 test"u8];
    private static readonly Guid Owner = Guid.NewGuid();
    private static readonly DateOnly Jan1 = new(2026, 1, 1);
    private static readonly DateOnly Mar31 = new(2026, 3, 31);

    private static Document Upload(byte[] content, string? name = "C:/me/tax.pdf") =>
        Document.Upload(Owner, "Q1", Jan1, Mar31, name, content, Now);

    [Fact]
    public void The_file_becomes_version_one()
    {
        var document = Upload(Pdf);
        var version = Assert.Single(document.Versions);

        Assert.Equal(
            ("EXTERNAL_FILE", "Q1", "DRAFT"),
            (document.Source, document.Title, document.Status)
        );
        Assert.Equal((Owner, Now), (document.OwnerUserId, document.CreatedAt));
        Assert.Equal(document.Id, version.DocumentId);
        Assert.Equal(
            (1, "EXTERNAL_FILE", false),
            (version.VersionNo, version.VersionType, version.IsImmutable)
        );
        Assert.Equal($"documents/{document.Id}/{version.Id}", version.FileUrl);
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(Pdf)), version.ContentHash);
        // Only the name is kept, never the client's path
        Assert.Contains("\"fileName\":\"tax.pdf\"", version.Content);
        Assert.Contains("\"contentType\":\"application/pdf\"", version.Content);
    }

    [Fact]
    public void Bad_input_is_refused()
    {
        Assert.Equal("ATTACHMENT_TYPE_INVALID", Errors.CodeOf(() => Upload([.. "hello"u8])));
        Assert.Equal("ATTACHMENT_REQUIRED", Errors.CodeOf(() => Upload([])));
        Assert.Equal("TEXT_REQUIRED", Errors.CodeOf(() => Upload(Pdf, name: null)));
        Assert.Equal(
            "WORKFLOW_DOCUMENT_INVALID_PERIOD",
            Errors.CodeOf(() => Document.Upload(Owner, "Q1", Mar31, Jan1, "a.pdf", Pdf, Now))
        );
    }

    [Fact]
    public async Task Upload_stores_the_file_and_returns_the_version_to_book()
    {
        var (handler, storage, documents) = Handler(saveFails: false);

        var version = await handler.HandleAsync(Command(Pdf), CancellationToken.None);

        var document = Assert.Single(documents.Added);
        Assert.Equal(document.Id, version.DocumentId);
        Assert.Equal(document.Versions.Single().Id, version.Id);
        Assert.Equal(Pdf, storage.Files[$"documents/{document.Id}/{version.Id}"]);
    }

    [Fact]
    public async Task A_failed_save_removes_the_stored_file()
    {
        var (handler, storage, _) = Handler(saveFails: true);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.HandleAsync(Command(Pdf), CancellationToken.None)
        );

        Assert.Empty(storage.Files);
        Assert.Single(storage.Deleted);
    }

    [Fact]
    public async Task A_refused_file_is_never_stored()
    {
        var (handler, storage, documents) = Handler(saveFails: false);

        await Assert.ThrowsAnyAsync<Exception>(() =>
            handler.HandleAsync(Command([.. "hello"u8]), CancellationToken.None)
        );

        Assert.Empty(storage.Files);
        Assert.Empty(documents.Added);
    }

    private static UploadDocumentCommand Command(byte[] content) =>
        new(Owner, "Q1", Jan1, Mar31, "tax.pdf", content);

    private static (UploadDocumentHandler, FakeStorage, FakeDocuments) Handler(bool saveFails)
    {
        var storage = new FakeStorage();
        var documents = new FakeDocuments();
        var clock = new FixedClock();
        return (new(documents, storage, new FakeUnitOfWork(saveFails), clock), storage, documents);
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class FakeStorage : IObjectStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];
        public List<string> Deleted { get; } = [];

        public Task PutAsync(string key, byte[] content, string contentType, CancellationToken ct)
        {
            Files[key] = content;
            return Task.CompletedTask;
        }

        public Task<Stream> OpenAsync(string key, CancellationToken ct) =>
            Task.FromResult<Stream>(new MemoryStream(Files[key]));

        public Task DeleteQuietlyAsync(string key)
        {
            Files.Remove(key);
            Deleted.Add(key);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeDocuments : IDocumentRepository
    {
        public List<Document> Added { get; } = [];

        public Task AddAsync(Document document, CancellationToken ct = default)
        {
            Added.Add(document);
            return Task.CompletedTask;
        }

        public Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
            throw new NotSupportedException();

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
        ) => throw new NotSupportedException();

        public Task<bool> OwnsVersionAsync(
            Guid userId,
            Guid documentId,
            Guid versionId,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }

    private sealed class FakeUnitOfWork(bool saveFails) : IUnitOfWork, ITransaction
    {
        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) =>
            saveFails ? throw new InvalidOperationException("Database down") : Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
