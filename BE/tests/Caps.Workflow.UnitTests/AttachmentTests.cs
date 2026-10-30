using System.IO.Compression;
using Caps.Common.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class AttachmentTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly byte[] Pdf = [.. "%PDF-1.7 test"u8];

    [Fact]
    public void A_party_adds_a_file_while_the_review_runs()
    {
        var reviewCase = InReview();

        var attachment = reviewCase.AddAttachment(Client, "C:/Users/me/tax.pdf", Pdf, 0, Now);

        Assert.Equal(FileSignature.Pdf, attachment.ContentType);
        Assert.Equal("tax.pdf", attachment.FileName);
        Assert.Equal(Pdf.Length, attachment.SizeBytes);
        Assert.Equal(Client, attachment.UploadedBy);
        Assert.Equal($"review-cases/{reviewCase.Id}/{attachment.Id}", attachment.FileUrl);
    }

    [Fact]
    public void A_word_document_is_accepted()
    {
        var attachment = InReview()
            .AddAttachment(Expert, "to-khai.docx", Zip("word/document.xml"), 0, Now);

        Assert.Equal(ReviewAttachment.Docx, attachment.ContentType);
    }

    [Theory]
    [InlineData("xl/workbook.xml")] // an Excel workbook is a zip too, but not a Word document
    [InlineData("readme.txt")]
    public void Another_zip_is_rejected(string entry) =>
        Assert.Equal(
            "ATTACHMENT_TYPE_INVALID",
            Errors.CodeOf(() => InReview().AddAttachment(Client, "a.docx", Zip(entry), 0, Now))
        );

    [Fact]
    public void A_renamed_file_is_judged_by_its_bytes() =>
        Assert.Equal(
            "ATTACHMENT_TYPE_INVALID",
            Errors.CodeOf(() =>
                InReview().AddAttachment(Client, "invoice.pdf", [.. "MZ executable"u8], 0, Now)
            )
        );

    [Fact]
    public void An_empty_or_oversized_file_is_rejected()
    {
        var reviewCase = InReview();
        var big = new byte[ReviewAttachment.MaxBytes + 1];
        Pdf.CopyTo(big, 0);

        Assert.Equal(
            "ATTACHMENT_REQUIRED",
            Errors.CodeOf(() => reviewCase.AddAttachment(Client, "a.pdf", [], 0, Now))
        );
        Assert.Equal(
            "ATTACHMENT_TOO_LARGE",
            Errors.CodeOf(() => reviewCase.AddAttachment(Client, "a.pdf", big, 0, Now))
        );
    }

    [Fact]
    public void A_missing_file_is_reported_before_its_missing_name() =>
        Assert.Equal(
            "ATTACHMENT_REQUIRED",
            Errors.CodeOf(() => InReview().AddAttachment(Client, null, [], 0, Now))
        );

    [Fact]
    public void A_file_needs_a_name() =>
        Assert.Equal(
            "TEXT_REQUIRED",
            Errors.CodeOf(() => InReview().AddAttachment(Client, "  ", Pdf, 0, Now))
        );

    [Fact]
    public void A_stranger_cannot_add_files() =>
        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => InReview().AddAttachment(Guid.NewGuid(), "a.pdf", Pdf, 0, Now))
        );

    [Fact]
    public void Files_wait_for_the_expert_to_accept()
    {
        var unpaid = Booked();

        Assert.Equal(
            "ATTACHMENTS_CLOSED",
            Errors.CodeOf(() => unpaid.AddAttachment(Client, "a.pdf", Pdf, 0, Now))
        );
    }

    [Fact]
    public void A_dispute_takes_files_as_evidence()
    {
        var reviewCase = InReview();
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "Done", null, Now);
        reviewCase.OpenDispute(Client, "DELIVERABLE_INCOMPLETE", "VAT missing", Now);

        var attachment = reviewCase.AddAttachment(Client, "vat.pdf", Pdf, 0, Now);

        Assert.Equal(reviewCase.Id, attachment.ReviewCaseId);
    }

    [Fact]
    public void A_case_holds_at_most_20_files() =>
        Assert.Equal(
            "ATTACHMENT_LIMIT",
            Errors.CodeOf(() =>
                InReview().AddAttachment(Client, "a.pdf", Pdf, ReviewAttachment.MaxPerCase, Now)
            )
        );

    private static byte[] Zip(string entry)
    {
        using var buffer = new MemoryStream();
        using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            using var writer = new StreamWriter(zip.CreateEntry(entry).Open());
            writer.Write("<xml/>");
        }
        return buffer.ToArray();
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
                Now.AddHours(-2)
            )
            .Case;

    private static ReviewCase InReview()
    {
        var reviewCase = Booked();
        reviewCase.ConfirmPayment(Now.AddHours(-2));
        reviewCase.Accept(ExpertProfile, Expert, Now.AddHours(-1));
        return reviewCase;
    }
}
