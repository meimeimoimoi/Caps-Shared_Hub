namespace Caps.Expert.Infrastructure.Ai;

/// <summary>Connection settings ("AiService" section) for calling the internal Python ai-service.</summary>
public sealed class AiServiceOptions
{
    public string BaseUrl { get; set; } = "http://localhost:8000";
    public string InternalKey { get; set; } = "";
    public int TimeoutSeconds { get; set; } = 150;
}
