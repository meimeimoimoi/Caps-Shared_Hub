namespace Caps.RagQuery.Options;

public sealed class AiServiceOptions
{
    public const string SectionName = "AiService";
    public string BaseUrl { get; set; } = "http://localhost:8000";
    public int TimeoutSeconds { get; set; } = 80;
    public string InternalKey { get; set; } = string.Empty;
}
