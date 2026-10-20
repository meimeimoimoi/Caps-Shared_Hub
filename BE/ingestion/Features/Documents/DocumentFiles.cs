using System.IO.Compression;
using Caps.Common.Domain;

namespace Caps.Ingestion.Features.Documents;

/// <summary>Files an admin may upload, recognized by their bytes, never by name or the client's content type.</summary>
public static class DocumentFiles
{
    public const int MaxBytes = 20 * 1024 * 1024;
    public const string Docx =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    /// <summary>Checks size and format.</summary>
    /// <returns>The content type to store: PDF or DOCX.</returns>
    public static string Validate(byte[] content)
    {
        if (content.Length == 0)
            throw IngestionErrors.FileRequired();
        if (content.Length > MaxBytes)
            throw IngestionErrors.FileTooLarge(MaxBytes);
        if (FileSignature.Detect(content) == FileSignature.Pdf)
            return FileSignature.Pdf;
        if (IsDocx(content))
            return Docx;
        throw IngestionErrors.FileInvalidType();
    }

    // A DOCX is a zip package whose main part is word/document.xml
    private static bool IsDocx(byte[] content)
    {
        try
        {
            using var zip = new ZipArchive(new MemoryStream(content, writable: false));
            return zip.GetEntry("word/document.xml") != null;
        }
        catch (InvalidDataException)
        {
            return false;
        }
    }
}
