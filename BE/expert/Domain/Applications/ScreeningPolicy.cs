namespace Caps.Expert.Domain.Applications;

/// <summary>Policy parameters governing Gate 1 automated pre-screening (Section 3 and Section 4).</summary>
/// <param name="NearThresholdExtraYears">Extra years above MinYearsExperience still flagged for review.</param>
/// <param name="AiTimeout">Maximum duration for an AI screening run before it times out.</param>
/// <param name="VisionEnabled">Whether images and scanned PDFs are sent to the internal vision model.</param>
public sealed record ScreeningPolicy(
    int NearThresholdExtraYears,
    TimeSpan AiTimeout,
    bool VisionEnabled
);
