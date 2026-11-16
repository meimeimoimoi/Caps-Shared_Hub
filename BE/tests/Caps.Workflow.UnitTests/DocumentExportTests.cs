using System.IO.Compression;
using System.Text;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Application.Features.Documents;
using Caps.Workflow.Domain.Workspace;
using Caps.Workflow.Infrastructure.Documents;

namespace Caps.Workflow.UnitTests;

public sealed class DocumentExportTests
{
    private static readonly Guid OwnerId = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 11, 15, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Download_descriptor_for_ai_draft_uses_file_endpoint_and_requested_format()
    {
        var store = new Store();
        var (doc, version) = store.SeedDraft(OwnerId, "To khai thue TNDN", "AI_DRAFT");
        var handler = new DownloadDocumentVersion.DownloadDocumentVersionHandler(
            store,
            store,
            new FixedTimeProvider(Now)
        );

        var result = await handler.HandleAsync(new(doc.Id, version.Id, OwnerId, "DOCX"), default);

        Assert.Equal(
            $"/api/v1/documents/{doc.Id}/versions/{version.Id}/file?format=docx",
            result.DownloadUrl
        );
        Assert.Equal("To_khai_thue_TNDN_v1.docx", result.FileName);
        Assert.Equal("docx", result.Format);
        Assert.Equal(version.ContentHash, result.ContentHash);
        Assert.Equal(Now.AddHours(2), result.ExpiresAt);
    }

    [Fact]
    public async Task Download_descriptor_for_external_file_preserves_stored_filename_and_extension()
    {
        var store = new Store();
        var (doc, version) = store.SeedExternalFile(
            OwnerId,
            "uploads/2026/sample.pdf",
            """{"fileName":"original-contract.pdf","contentType":"application/pdf"}"""
        );
        var handler = new DownloadDocumentVersion.DownloadDocumentVersionHandler(
            store,
            store,
            new FixedTimeProvider(Now)
        );

        var result = await handler.HandleAsync(new(doc.Id, version.Id, OwnerId, "docx"), default);

        Assert.Equal($"/api/v1/documents/{doc.Id}/versions/{version.Id}/file", result.DownloadUrl);
        Assert.Equal("original-contract.pdf", result.FileName);
        Assert.Equal("pdf", result.Format);
    }

    [Fact]
    public async Task Open_file_for_external_version_streams_bytes_from_object_storage()
    {
        var store = new Store();
        var payload = Encoding.UTF8.GetBytes("%PDF-1.4 stored file");
        store.Files["uploads/doc-v1.pdf"] = payload;
        var (doc, version) = store.SeedExternalFile(
            OwnerId,
            "uploads/doc-v1.pdf",
            """{"fileName":"ho-so-khai-thue.pdf","contentType":"application/pdf"}"""
        );
        var exporter = new RecordingExporter();
        var handler = new OpenDocumentVersionFile.OpenDocumentVersionFileHandler(
            store,
            store,
            store,
            exporter
        );

        var file = await handler.HandleAsync(new(doc.Id, version.Id, OwnerId, null), default);

        Assert.Null(exporter.LastFormat);
        Assert.Equal("application/pdf", file.ContentType);
        Assert.Equal("ho-so-khai-thue.pdf", file.FileName);
        await using var copy = new MemoryStream();
        await file.Content.CopyToAsync(copy);
        Assert.Equal(payload, copy.ToArray());
    }

    [Fact]
    public async Task Open_file_for_ai_draft_exports_with_normalized_format_and_denies_other_users()
    {
        var store = new Store();
        var (doc, version) = store.SeedDraft(OwnerId, "Bao cao TNDN", "AI_DRAFT");
        var exporter = new RecordingExporter();
        var handler = new OpenDocumentVersionFile.OpenDocumentVersionFileHandler(
            store,
            store,
            store,
            exporter
        );

        var exported = await handler.HandleAsync(new(doc.Id, version.Id, OwnerId, "docx"), default);

        Assert.Equal("docx", exporter.LastFormat);
        Assert.Equal(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            exported.ContentType
        );
        Assert.Equal("Bao_cao_TNDN_v1.docx", exported.FileName);

        var denied = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new(doc.Id, version.Id, Guid.NewGuid(), "pdf"), default)
        );
        Assert.Equal(ErrorType.Forbidden, denied.Type);
    }

    [Theory]
    [InlineData("pdf")]
    [InlineData("docx")]
    public void Document_file_exporter_renders_valid_pdf_and_docx_with_vietnamese_content(
        string format
    )
    {
        var store = new Store();
        var (doc, version) = store.SeedDraft(
            OwnerId,
            "Giải trình Thuế TNDN - Điều 1",
            "AI_DRAFT",
            contentJson: """
            {
              "taxpayerName": "Công ty TNHH Thương mại Việt",
              "sections": [
                { "heading": "Căn cứ pháp lý", "detail": "Thông tư 78/2014/TT-BTC" }
              ]
            }
            """,
            citationsJson: """
            [
              {
                "documentNumber": "78/2014/TT-BTC",
                "title": "Hướng dẫn thuế TNDN",
                "article": "Điều 1",
                "effectiveFrom": "2014-08-02"
              }
            ]
            """
        );
        var exporter = new DocumentFileExporter();

        var bytes = exporter.Export(doc, version, format);

        Assert.NotEmpty(bytes);
        if (format == "pdf")
        {
            Assert.Equal("%PDF-"u8.ToArray(), bytes[..5]);
            return;
        }

        using var ms = new MemoryStream(bytes);
        using var zip = new ZipArchive(ms, ZipArchiveMode.Read);
        var mainPart = zip.GetEntry("word/document.xml");
        Assert.NotNull(mainPart);
        using var reader = new StreamReader(mainPart.Open(), Encoding.UTF8);
        var xml = reader.ReadToEnd();
        Assert.Contains("Giải trình Thuế TNDN - Điều 1", xml);
        Assert.Contains("Công ty TNHH Thương mại Việt", xml);
        Assert.Contains("78/2014/TT-BTC", xml);
    }

    private sealed class RecordingExporter : IDocumentFileExporter
    {
        public string? LastFormat { get; private set; }

        public byte[] Export(Document document, DocumentVersion version, string format)
        {
            LastFormat = format;
            return "stub-bytes"u8.ToArray();
        }
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }

    private sealed class Store : IDocumentRepository, IDocumentVersionRepository, IObjectStorage
    {
        private readonly List<Document> documents = [];
        private readonly List<DocumentVersion> versions = [];
        public Dictionary<string, byte[]> Files { get; } = [];

        public (Document Doc, DocumentVersion Version) SeedDraft(
            Guid ownerId,
            string title,
            string versionType,
            string contentJson = "{\"summary\":\"ok\"}",
            string? citationsJson = null
        )
        {
            var doc = new Document
            {
                Id = Guid.NewGuid(),
                OwnerUserId = ownerId,
                Source = "FREEFORM",
                Title = title,
                PeriodStart = new DateOnly(2026, 1, 1),
                PeriodEnd = new DateOnly(2026, 3, 31),
                Status = "DRAFT",
                Metadata = "{}",
                CreatedAt = Now,
                UpdatedAt = Now,
            };
            var version = new DocumentVersion
            {
                Id = Guid.NewGuid(),
                DocumentId = doc.Id,
                VersionNo = 1,
                VersionType = versionType,
                DraftAssessment = "AI_GENERATED_PENDING_REVIEW",
                Citations = citationsJson,
                Content = contentJson,
                ContentHash = "hash-v1",
                CreatedBy = ownerId,
                CreatedAt = Now,
            };
            documents.Add(doc);
            versions.Add(version);
            return (doc, version);
        }

        public (Document Doc, DocumentVersion Version) SeedExternalFile(
            Guid ownerId,
            string storageKey,
            string contentMetadataJson
        )
        {
            var doc = new Document
            {
                Id = Guid.NewGuid(),
                OwnerUserId = ownerId,
                Source = "FREEFORM",
                Title = "External upload",
                PeriodStart = new DateOnly(2026, 1, 1),
                PeriodEnd = new DateOnly(2026, 3, 31),
                Status = "DRAFT",
                Metadata = "{}",
                CreatedAt = Now,
                UpdatedAt = Now,
            };
            var version = new DocumentVersion
            {
                Id = Guid.NewGuid(),
                DocumentId = doc.Id,
                VersionNo = 1,
                VersionType = Document.ExternalFile,
                FileUrl = storageKey,
                Content = contentMetadataJson,
                ContentHash = "ext-hash",
                CreatedBy = ownerId,
                CreatedAt = Now,
            };
            documents.Add(doc);
            versions.Add(version);
            return (doc, version);
        }

        public Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(documents.SingleOrDefault(d => d.Id == id));

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

        public Task AddAsync(Document document, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<bool> OwnsVersionAsync(
            Guid userId,
            Guid documentId,
            Guid versionId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        Task<DocumentVersion?> IDocumentVersionRepository.GetByIdAsync(
            Guid id,
            CancellationToken ct
        ) => Task.FromResult(versions.SingleOrDefault(v => v.Id == id));

        public Task<IReadOnlyList<DocumentVersion>> GetByDocumentIdAsync(
            Guid documentId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<int> GetNextVersionNoAsync(Guid documentId, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task AddAsync(DocumentVersion version, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task PutAsync(
            string key,
            byte[] content,
            string contentType,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<Stream> OpenAsync(string key, CancellationToken ct) =>
            Task.FromResult<Stream>(new MemoryStream(Files[key]));

        public Task DeleteQuietlyAsync(string key) => Task.CompletedTask;
    }
}
