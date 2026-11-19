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
    private static ReviewCase Delivered(string result, string? revisedContent = null)
    {
        var reviewCase = Accepted();
        var reason = result == ReviewCase.CannotVerify ? "Missing invoices" : null;
        reviewCase.Deliver(
            Expert,
            ExpertUser,
            result,
            "Summary",
            reason,
            ["Article 9, CIT Law"],
            true,
            Now,
            revisedContent
        );
        return reviewCase;
    }

    [Fact]
    public void The_expert_version_holds_the_edited_draft()
    {
        var reviewCase = Delivered(ReviewCase.Verified, """{"tax_rate":"20%"}""");

        var version = DocumentVersion.ExpertReview(reviewCase, 3, Now);

        Assert.Equal("""{"tax_rate":"20%"}""", reviewCase.RevisedContent);
        var document = JsonDocument.Parse(version.Content).RootElement.GetProperty("document");
        Assert.Equal("20%", document.GetProperty("tax_rate").GetString());
    }

    [Fact]
    public void Without_an_edited_draft_the_document_is_null()
    {
        var version = DocumentVersion.ExpertReview(Delivered(ReviewCase.Verified), 3, Now);

        Assert.Null(Delivered(ReviewCase.Verified).RevisedContent);
        Assert.Equal(
            JsonValueKind.Null,
            JsonDocument.Parse(version.Content).RootElement.GetProperty("document").ValueKind
        );
    }

    [Theory]
    [InlineData("[1,2]")] // not an object
    [InlineData("\"text\"")]
    [InlineData("{broken")]
    public void An_edited_draft_must_be_a_json_object(string revisedContent)
    {
        var reviewCase = Accepted();

        Assert.Equal(
            "REVISED_CONTENT_INVALID",
            Errors.CodeOf(() =>
                reviewCase.Deliver(
                    Expert,
                    ExpertUser,
                    ReviewCase.Verified,
                    "Summary",
                    null,
                    ["Article 9, CIT Law"],
                    true,
                    Now,
                    revisedContent
                )
            )
        );
        // Nothing was delivered
        Assert.Equal(ReviewCaseStatus.InReview, reviewCase.Status);
    }

    [Fact]
    public void An_edited_draft_is_bounded()
    {
        var tooLong = $$"""{"a":"{{new string('x', ReviewCase.MaxContentLength)}}"}""";

        Assert.Equal(
            "REVISED_CONTENT_INVALID",
            Errors.CodeOf(() =>
                Accepted()
                    .Deliver(
                        Expert,
                        ExpertUser,
                        ReviewCase.Verified,
                        "Summary",
                        null,
                        ["Article 9, CIT Law"],
                        true,
                        Now,
                        tooLong
                    )
            )
        );
    }

    private static ReviewCase Accepted()
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
        return reviewCase;
    }

    [Fact]
    public void Status_follows_the_review_cases()
    {
        var doc = new Document { Title = "Q1" };
        var verified = Guid.NewGuid();

        doc.SyncReview(paidCaseOpen: true, null, verifiedIsLatest: false, Now);
        Assert.Equal(("IN_REVIEW", Now), (doc.Status, doc.UpdatedAt));

        doc.SyncReview(false, verified, verifiedIsLatest: false, Now);
        Assert.Equal(("VERIFIED", verified), (doc.Status, doc.VerifiedVersionId));

        // A later case on the verified version that ends badly leaves it verified
        doc.SyncReview(false, null, verifiedIsLatest: true, Now);
        Assert.Equal(("VERIFIED", verified), (doc.Status, doc.VerifiedVersionId));

        // A new paid case puts it back in review without losing the verified version
        doc.SyncReview(true, null, verifiedIsLatest: true, Now);
        Assert.Equal(("IN_REVIEW", verified), (doc.Status, doc.VerifiedVersionId));
    }

    [Fact]
    public void A_document_never_verified_goes_back_to_draft()
    {
        var doc = new Document { Title = "Q1" };

        doc.SyncReview(true, null, false, Now);
        doc.SyncReview(false, null, false, Now);

        Assert.Equal(("DRAFT", (Guid?)null), (doc.Status, doc.VerifiedVersionId));
    }

    [Fact]
    public void A_new_client_version_after_verification_is_a_draft_that_keeps_the_verified_one()
    {
        var doc = new Document { Title = "Q1" };
        var verified = Guid.NewGuid();
        doc.SyncReview(false, verified, false, Now);

        doc.StartNewDraft(Now.AddDays(1));
        Assert.Equal(
            ("DRAFT", verified, Now.AddDays(1)),
            (doc.Status, doc.VerifiedVersionId, doc.UpdatedAt)
        );

        // A case on the new draft that ends badly leaves it a draft, not the older verified state
        doc.SyncReview(true, null, verifiedIsLatest: false, Now);
        doc.SyncReview(false, null, verifiedIsLatest: false, Now);
        Assert.Equal(("DRAFT", verified), (doc.Status, doc.VerifiedVersionId));

        // Verifying the new draft makes the document VERIFIED on the newer expert version
        var newer = Guid.NewGuid();
        doc.SyncReview(false, newer, verifiedIsLatest: false, Now);
        Assert.Equal(("VERIFIED", newer), (doc.Status, doc.VerifiedVersionId));
    }

    [Theory]
    [InlineData("DRAFT")]
    [InlineData("IN_REVIEW")] // a running case keeps the document in review
    public void A_new_version_changes_only_a_verified_document(string status)
    {
        var doc = new Document { Title = "Q1", Status = status };

        doc.StartNewDraft(Now);

        Assert.Equal(status, doc.Status);
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
