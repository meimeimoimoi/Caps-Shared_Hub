namespace Caps.Notification.Email;

/// <summary>Images embedded in the assembly, so emails never depend on an external image URL.</summary>
public static class EmailAssets
{
    public const string LogoContentId = "shared-hub-logo";

    public static InlineImage Logo { get; } =
        new(LogoContentId, Read("notification.email-logo.png"), "image/png");

    private static byte[] Read(string resource)
    {
        using var stream =
            typeof(EmailAssets).Assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Embedded resource {resource} is missing.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }
}
