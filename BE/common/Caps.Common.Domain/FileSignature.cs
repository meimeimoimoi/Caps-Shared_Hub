namespace Caps.Common.Domain;

/// <summary>
/// Detects a file type from its leading bytes. Never trust the extension or the client's Content-Type:
/// both are chosen by the uploader.
/// </summary>
public static class FileSignature
{
    public const string Pdf = "application/pdf";
    public const string Jpeg = "image/jpeg";
    public const string Png = "image/png";
    public const string Webp = "image/webp";

    private static readonly byte[] PngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    /// <summary>Recognizes PDF, JPEG, PNG and WebP from their first bytes.</summary>
    /// <returns>The detected MIME type, or null when the format is not recognized.</returns>
    public static string? Detect(ReadOnlySpan<byte> d)
    {
        if (d.Length >= 5 && d[..5].SequenceEqual("%PDF-"u8))
            return Pdf;
        if (d.Length >= 3 && d[0] == 0xFF && d[1] == 0xD8 && d[2] == 0xFF)
            return Jpeg;
        if (d.Length >= 8 && d[..8].SequenceEqual(PngMagic))
            return Png;
        if (d.Length >= 12 && d[..4].SequenceEqual("RIFF"u8) && d[8..12].SequenceEqual("WEBP"u8))
            return Webp;
        return null;
    }
}
