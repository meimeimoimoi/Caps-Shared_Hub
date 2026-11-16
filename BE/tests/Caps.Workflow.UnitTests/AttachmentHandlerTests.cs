using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Attachments;
using Caps.Workflow.Domain.Review;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

public sealed class AttachmentHandlerTests
{
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly byte[] Pdf = [.. "%PDF-1.7 test"u8];

    [Fact]
    public async Task An_upload_stores_the_bytes_and_records_the_file()
    {
        var run = new Run();

        var response = await run.Upload(Client);

        var key = Assert.Single(run.Storage.Files.Keys);
        Assert.Equal($"review-cases/{run.Case.Id}/{response.Id}", key);
        Assert.Equal(FileSignature.Pdf, response.ContentType);
        Assert.Single(run.Attachments.Stored);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task A_failed_save_removes_the_stored_file()
    {
        var run = new Run(saveFails: true);

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.Upload(Client));

        Assert.Empty(run.Storage.Files);
        Assert.Single(run.Storage.Deleted);
    }

    [Fact]
    public async Task A_full_case_stores_nothing()
    {
        var run = new Run(existing: ReviewAttachment.MaxPerCase);

        var e = await Assert.ThrowsAsync<AppException>(() => run.Upload(Client));

        Assert.Equal("ATTACHMENT_LIMIT", e.Code);
        Assert.Empty(run.Storage.Files);
    }

    [Fact]
    public async Task Parties_and_admins_list_the_files_and_nobody_else()
    {
        var run = new Run();
        await run.Upload(Expert);
        var handler = new ListAttachmentsHandler(run.Cases, run.Attachments);

        var forClient = await handler.HandleAsync(new(Client, run.Case.Id), default);
        var forAdmin = await handler.HandleAsync(new(null, run.Case.Id), default);
        var e = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new(Guid.NewGuid(), run.Case.Id), default)
        );

        Assert.Single(forClient);
        Assert.Single(forAdmin);
        Assert.Equal("REVIEW_CASE_NOT_FOUND", e.Code);
    }

    [Fact]
    public async Task A_party_opens_a_file_of_the_case()
    {
        var run = new Run();
        var uploaded = await run.Upload(Client);

        var file = await new OpenAttachmentHandler(
            run.Cases,
            run.Attachments,
            run.Storage
        ).HandleAsync(new(Expert, run.Case.Id, Guid.Parse(uploaded.Id)), default);

        Assert.Equal(FileSignature.Pdf, file.ContentType);
        Assert.Equal("tax.pdf", file.FileName);
        await using var reader = new MemoryStream();
        await file.Content.CopyToAsync(reader);
        Assert.Equal(Pdf, reader.ToArray());
    }

    [Fact]
    public async Task A_file_of_another_case_is_not_found()
    {
        var run = new Run();

        var e = await Assert.ThrowsAsync<AppException>(() =>
            new OpenAttachmentHandler(run.Cases, run.Attachments, run.Storage).HandleAsync(
                new(Client, run.Case.Id, Guid.NewGuid()),
                default
            )
        );

        Assert.Equal("ATTACHMENT_NOT_FOUND", e.Code);
    }

    [Fact]
    public async Task The_expert_and_an_admin_open_the_uploaded_source_file()
    {
        var run = new Run();
        var key = run.UploadedSource("""{"fileName":"tax.pdf","contentType":"application/pdf"}""");
        var handler = new OpenSourceFileHandler(run.Cases, run.Attachments, run.Storage);

        var file = await handler.HandleAsync(new(Expert, run.Case.Id), default);
        var forAdmin = await handler.HandleAsync(new(null, run.Case.Id), default);

        Assert.Equal(("application/pdf", "tax.pdf"), (file.ContentType, file.FileName));
        await using var reader = new MemoryStream();
        await file.Content.CopyToAsync(reader);
        Assert.Equal(Pdf, reader.ToArray());
        Assert.Equal("tax.pdf", forAdmin.FileName);
        Assert.True(run.Storage.Files.ContainsKey(key));
    }

    [Fact]
    public async Task A_source_without_recorded_details_still_downloads()
    {
        var run = new Run();
        run.UploadedSource("{}");

        var file = await new OpenSourceFileHandler(
            run.Cases,
            run.Attachments,
            run.Storage
        ).HandleAsync(new(Client, run.Case.Id), default);

        Assert.Equal(
            ("application/octet-stream", "document-v1"),
            (file.ContentType, file.FileName)
        );
    }

    [Fact]
    public async Task A_version_built_in_the_app_has_no_file()
    {
        var run = new Run();
        run.Attachments.Versions.Add(
            new DocumentVersion
            {
                Id = run.Case.SourceVersionId,
                VersionNo = 1,
                Content = "{}",
            }
        );

        var e = await Assert.ThrowsAsync<AppException>(() =>
            new OpenSourceFileHandler(run.Cases, run.Attachments, run.Storage).HandleAsync(
                new(Expert, run.Case.Id),
                default
            )
        );

        Assert.Equal("ATTACHMENT_NOT_FOUND", e.Code);
    }

    [Fact]
    public async Task Nobody_else_opens_the_source_file()
    {
        var run = new Run();
        run.UploadedSource("{}");

        var e = await Assert.ThrowsAsync<AppException>(() =>
            new OpenSourceFileHandler(run.Cases, run.Attachments, run.Storage).HandleAsync(
                new(Guid.NewGuid(), run.Case.Id),
                default
            )
        );

        Assert.Equal("REVIEW_CASE_NOT_FOUND", e.Code);
    }

    private sealed class Run
    {
        public Run(bool saveFails = false, int existing = 0)
        {
            var now = TimeProvider.System.GetUtcNow();
            Case = ReviewCase
                .Request(
                    Client,
                    "client@caps.test",
                    Guid.NewGuid(),
                    Guid.NewGuid(),
                    Offers.Sample(ExpertProfile, Expert),
                    "Check my CIT return",
                    null,
                    now
                )
                .Case;
            Case.ConfirmPayment(now);
            Case.Accept(ExpertProfile, Expert, now);
            Cases = new FakeCases(Case);
            Attachments = new FakeAttachments(existing);
            UnitOfWork = new FakeUnitOfWork(saveFails);
        }

        public ReviewCase Case { get; }
        public FakeCases Cases { get; }
        public FakeAttachments Attachments { get; }
        public FakeStorage Storage { get; } = new();
        public FakeUnitOfWork UnitOfWork { get; }

        public Task<AttachmentResponse> Upload(Guid userId) =>
            new AddAttachmentHandler(
                Cases,
                Attachments,
                Storage,
                UnitOfWork,
                TimeProvider.System
            ).HandleAsync(new(userId, Case.Id, "tax.pdf", Pdf), default);

        // The client's uploaded file as the case's source version; returns its storage key
        public string UploadedSource(string content)
        {
            var key = $"documents/{Case.DocumentId}/{Case.SourceVersionId}";
            Attachments.Versions.Add(
                new DocumentVersion
                {
                    Id = Case.SourceVersionId,
                    DocumentId = Case.DocumentId,
                    VersionNo = 1,
                    FileUrl = key,
                    Content = content,
                }
            );
            Storage.Files[key] = Pdf;
            return key;
        }
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

    private sealed class FakeAttachments(int existing) : IReviewAttachmentRepository
    {
        public List<ReviewAttachment> Stored { get; } = [];

        public Task<int> CountAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult(existing + Stored.Count);

        public Task<IReadOnlyList<ReviewAttachment>> ListAsync(
            Guid reviewCaseId,
            CancellationToken ct
        ) =>
            Task.FromResult<IReadOnlyList<ReviewAttachment>>(
                Stored.Where(x => x.ReviewCaseId == reviewCaseId).ToList()
            );

        public Task<ReviewAttachment?> FindAsync(
            Guid reviewCaseId,
            Guid attachmentId,
            CancellationToken ct
        ) =>
            Task.FromResult(
                Stored.SingleOrDefault(x => x.Id == attachmentId && x.ReviewCaseId == reviewCaseId)
            );

        public void Add(ReviewAttachment attachment) => Stored.Add(attachment);

        public List<DocumentVersion> Versions { get; } = [];

        public Task<DocumentVersion?> FindSourceAsync(Guid versionId, CancellationToken ct) =>
            Task.FromResult(Versions.SingleOrDefault(x => x.Id == versionId));
    }

    private sealed class FakeUnitOfWork(bool saveFails) : IUnitOfWork, ITransaction
    {
        public bool Committed { get; private set; }

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) =>
            saveFails ? throw new InvalidOperationException("Database down") : Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct)
        {
            Committed = true;
            return Task.CompletedTask;
        }

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    private sealed class FakeCases(ReviewCase reviewCase) : IReviewCaseRepository
    {
        public Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult<ReviewCase?>(reviewCase.Id == reviewCaseId ? reviewCase : null);

        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            FindForUpdateAsync(reviewCaseId, ct);

        public void AddHistory(ReviewStatusHistory history) { }

        public void Add(ReviewCase reviewCase) => throw new NotSupportedException();

        public Task<IReadOnlyList<ReviewCase>> ListForUserAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<Guid>> ListPendingIdsAsync(
            Guid expertUserId,
            string? serviceCode,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }
}
