using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

public sealed class CaseDetailsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 1, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    [Fact]
    public void A_running_or_unpaid_case_has_no_outcome()
    {
        Assert.Null(Booked().Outcome());
        Assert.Null(InReview().Outcome());
    }

    [Fact]
    public void A_declined_request_was_refunded_in_full()
    {
        var reviewCase = Paid();
        reviewCase.Decline(ExpertProfile, Expert, "Busy", Now);

        Assert.Equal(new ReviewSettlement(1_000_000, 0, 0), reviewCase.Outcome());
    }

    [Fact]
    public void A_completed_case_shows_the_fee_split()
    {
        var reviewCase = InReview();
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "Done", null, Now);
        reviewCase.Confirm(Client, Now);

        Assert.Equal(new ReviewSettlement(0, 200_000, 800_000), reviewCase.Outcome());
    }

    [Fact]
    public async Task The_case_detail_lists_the_experts_questions()
    {
        var reviewCase = InReview();
        var (question, _) = reviewCase.RequestInformation(
            ExpertProfile,
            Expert,
            "Which year?",
            Now
        );

        var response = await new GetReviewCaseHandler(
            new FakeCases(reviewCase),
            new FakeInfoRequests(question),
            new FakeSources(null)
        ).HandleAsync(new(Client, reviewCase.Id), default);

        var shown = Assert.Single(response.InfoRequests!);
        Assert.Equal("Which year?", shown.Message);
        Assert.Equal(InfoRequest.Open, shown.Status);
        Assert.Equal(reviewCase.UpdatedAt, response.UpdatedAt);
        Assert.Null(response.Settlement);
    }

    [Fact]
    public async Task The_detail_carries_the_ai_draft_but_not_an_uploaded_files_details()
    {
        var reviewCase = InReview();
        var draft = new DocumentVersion
        {
            Id = reviewCase.SourceVersionId,
            Content = """{"tax_rate":"22%"}""",
        };
        var upload = new DocumentVersion
        {
            Id = reviewCase.SourceVersionId,
            Content = """{"fileName":"a.pdf"}""",
            FileUrl = "documents/x/y",
        };

        var forDraft = await Detail(reviewCase, draft);
        var forUpload = await Detail(reviewCase, upload);

        Assert.Equal("22%", forDraft.SourceContent!.Value.GetProperty("tax_rate").GetString());
        Assert.Null(forDraft.RevisedContent);
        Assert.Null(forUpload.SourceContent);
    }

    private static Task<Application.DTOs.Responses.ReviewCaseResponse> Detail(
        ReviewCase reviewCase,
        DocumentVersion source
    ) =>
        new GetReviewCaseHandler(
            new FakeCases(reviewCase),
            new FakeInfoRequests(null),
            new FakeSources(source)
        ).HandleAsync(new(Client, reviewCase.Id), default);

    private sealed class FakeSources(DocumentVersion? source) : IReviewAttachmentRepository
    {
        public Task<DocumentVersion?> FindSourceAsync(Guid versionId, CancellationToken ct) =>
            Task.FromResult(source?.Id == versionId ? source : null);

        public Task<int> CountAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<ReviewAttachment>> ListAsync(
            Guid reviewCaseId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<ReviewAttachment?> FindAsync(
            Guid reviewCaseId,
            Guid attachmentId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(ReviewAttachment attachment) => throw new NotSupportedException();
    }

    private static ReviewCase Booked() =>
        ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(ExpertProfile, Expert),
                "Check my CIT return",
                null,
                Now.AddHours(-3)
            )
            .Case;

    private static ReviewCase Paid()
    {
        var reviewCase = Booked();
        reviewCase.ConfirmPayment(Now.AddHours(-3));
        return reviewCase;
    }

    private static ReviewCase InReview()
    {
        var reviewCase = Paid();
        reviewCase.Accept(ExpertProfile, Expert, Now.AddHours(-2));
        return reviewCase;
    }

    private sealed class FakeInfoRequests(InfoRequest? question) : IInfoRequestRepository
    {
        public Task<IReadOnlyList<InfoRequest>> ListAsync(
            Guid reviewCaseId,
            CancellationToken ct
        ) => Task.FromResult<IReadOnlyList<InfoRequest>>(question is null ? [] : [question]);

        public Task<InfoRequest?> FindOpenForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public void Add(InfoRequest request) => throw new NotSupportedException();
    }

    private sealed class FakeCases(ReviewCase reviewCase) : IReviewCaseRepository
    {
        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult<ReviewCase?>(reviewCase.Id == reviewCaseId ? reviewCase : null);

        public Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

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
