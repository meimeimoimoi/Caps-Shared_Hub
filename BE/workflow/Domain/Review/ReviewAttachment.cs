using System.IO.Compression;
using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>A file a party added to a review case: material for the review, or evidence in a dispute.</summary>
public sealed class ReviewAttachment
{
    public const int MaxBytes = 10 * 1024 * 1024;
    public const int MaxPerCase = 20;
    public const int MaxFileNameLength = 255;
    public const string Docx =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private static readonly byte[] ZipMagic = [0x50, 0x4B, 0x03, 0x04];

    private ReviewAttachment() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; private set; }
    public ReviewCase ReviewCase { get; } = default!;

    /// <summary>Unused until answers to a question carry files; kept because the column exists.</summary>
    public Guid? InfoRequestId { get; }
    public InfoRequest? InfoRequest { get; }

    /// <summary>The object storage key; files are served only through an API that checks access.</summary>
    public string FileUrl { get; private set; } = default!;
    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long SizeBytes { get; private set; }
    public Guid UploadedBy { get; private set; }
    public DateTimeOffset UploadedAt { get; private set; }

    // Only ReviewCase adds attachments, after checking who may and when
    internal static ReviewAttachment Create(
        Guid reviewCaseId,
        Guid uploadedBy,
        string? fileName,
        byte[] content,
        DateTimeOffset now
    )
    {
        var attachment = new ReviewAttachment
        {
            ReviewCaseId = reviewCaseId,
            UploadedBy = uploadedBy,
            ContentType = DetectType(content),
            FileName = NameOf(fileName),
            SizeBytes = content.Length,
            UploadedAt = now,
        };
        attachment.FileUrl = $"review-cases/{reviewCaseId}/{attachment.Id}";
        return attachment;
    }

    /// <summary>PDF, JPEG, PNG, WebP or Word (.docx), told apart by the bytes; the name and the browser's type are not trusted.</summary>
    private static string DetectType(byte[] content)
    {
        if (content.Length == 0)
        {
            throw WorkflowErrors.AttachmentRequired();
        }
        if (content.Length > MaxBytes)
        {
            throw WorkflowErrors.AttachmentTooLarge(MaxBytes);
        }
        return FileSignature.Detect(content)
            ?? (IsDocx(content) ? Docx : throw WorkflowErrors.AttachmentTypeInvalid());
    }

    // Some browsers send a full path; keep only the name, trimmed and bounded
    private static string NameOf(string? fileName)
    {
        var name = Path.GetFileName(fileName?.Trim() ?? "");
        if (string.IsNullOrEmpty(name) || name.Length > MaxFileNameLength)
        {
            throw WorkflowErrors.TextRequired("File name", MaxFileNameLength);
        }
        return name;
    }

    // A .docx is a zip holding word/document.xml; any other zip, or a broken one, is rejected
    private static bool IsDocx(byte[] content)
    {
        if (!content.AsSpan().StartsWith(ZipMagic))
        {
            return false;
        }
        try
        {
            using var zip = new ZipArchive(new MemoryStream(content, writable: false));
            return zip.GetEntry("word/document.xml") is not null;
        }
        catch (InvalidDataException)
        {
            return false;
        }
    }
}
