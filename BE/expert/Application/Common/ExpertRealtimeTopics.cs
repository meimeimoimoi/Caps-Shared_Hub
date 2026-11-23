namespace Caps.Expert.Application.Common;

/// <summary>Real-time topics the expert service publishes; the FE maps each to the queries it refetches.</summary>
public static class ExpertRealtimeTopics
{
    public const string Applications = "expert.applications";
    public const string Qualifications = "expert.qualifications";
    public const string Pricing = "expert.pricing";
}
