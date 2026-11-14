using System.Text.Json;
using Caps.Workflow.Domain.Review;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.UnitTests;

public sealed class DocumentReviewTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 14, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid ExpertUser = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    // Paid, accepted and delivered with the given result
    private static ReviewCase Delivered(string result)
    {
        var reviewCase = ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(Expert, ExpertUser),
                "Check my CIT return",
                null,
                Now
            )
            .Case;
        reviewCase.ConfirmPayment(Now);
        reviewCase.Accept(Expert, ExpertUser, Now);
        var reason = result == ReviewCase.CannotVerify ? "Missing invoices" : null;
        reviewCase.Deliver(Expert, ExpertUser, result, "Summary", reason, Now);
        return reviewCase;
    }

    [Fact]
    public void Status_follows_the_review_cases()
    {
        var doc = new Document { Title = "Q1" };
        var verified = Guid.NewGuid();

        doc.SyncReview(paidCaseOpen: true, null, Now);
        Assert.Equal(("IN_REVIEW", Now), (doc.Status, doc.UpdatedAt));

        doc.SyncReview(false, verified, Now);
        Assert.Equal(("VERIFIED", verified), (doc.Status, doc.VerifiedVersionId));

        // A later case that ends badly leaves the verified version in place
        doc.SyncReview(false, null, Now);
        Assert.Equal(("VERIFIED", verified), (doc.Status, doc.VerifiedVersionId));

        // A new paid case puts it back in review without losing the verified version
        doc.SyncReview(true, null, Now);
        Assert.Equal(("IN_REVIEW", verified), (doc.Status, doc.VerifiedVersionId));
    }

    [Fact]
    public void A_document_never_verified_goes_back_to_draft()
    {
        var doc = new Document { Title = "Q1" };

        doc.SyncReview(true, null, Now);
        doc.SyncReview(false, null, Now);

        Assert.Equal(("DRAFT", (Guid?)null), (doc.Status, doc.VerifiedVersionId));
    }

    [Fact]
    public void A_version_keeps_the_first_case_that_locked_it()
    {
        var version = new DocumentVersion();
        var first = Guid.NewGuid();

        version.LockForReview(first);
        version.LockForReview(Guid.NewGuid());

        Assert.True(version.IsImmutable);
        Assert.Equal(first, version.ReviewCaseId);
    }

    [Fact]
    public void The_expert_version_is_a_new_locked_version_of_the_same_document()
    {
        var reviewCase = Delivered(ReviewCase.Verified);

        var version = DocumentVersion.ExpertReview(reviewCase, 3, Now);

        Assert.Equal(reviewCase.DocumentId, version.DocumentId);
        Assert.Equal(reviewCase.Id, version.ReviewCaseId);
        Assert.Equal(ExpertUser, version.CreatedBy);
        Assert.Equal(
            (3, "EXPERT_REVIEWED", true),
            (version.VersionNo, version.VersionType, version.IsImmutable)
        );
        Assert.NotEqual(reviewCase.SourceVersionId, version.Id);
        Assert.Equal(64, version.ContentHash.Length); // SHA-256 in hex

        var content = JsonDocument.Parse(version.Content).RootElement;
        Assert.Equal(ReviewCase.Verified, content.GetProperty("result").GetString());
        Assert.Equal("Summary", content.GetProperty("summary").GetString());
        Assert.Equal(reviewCase.SourceVersionId, content.GetProperty("sourceVersionId").GetGuid());
    }

    [Theory]
    [InlineData(ReviewCase.Verified, true)]
    [InlineData(ReviewCase.CannotVerify, false)] // 00-overview §7.1: no verified version
    public void Only_an_accepted_verified_result_verifies_the_document(string result, bool verified)
    {
        var reviewCase = Delivered(result);
        Assert.False(reviewCase.VerifiedOutcome); // delivered but not accepted yet

        reviewCase.Confirm(Client, Now);

        Assert.Equal(verified, reviewCase.VerifiedOutcome);
    }
}
