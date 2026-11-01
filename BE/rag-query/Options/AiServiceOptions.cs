namespace Caps.RagQuery.Options;

public sealed class AiServiceOptions
{
    public const string SectionName = "AiService";
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public int TimeOutSeconds { get; set; } = 60;
}
