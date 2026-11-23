namespace Caps.Common.Application;

/// <summary>
/// Health check tags. /healthz (liveness) runs no checks, so a database outage never gets the process
/// restarted; /readyz (readiness) runs the checks tagged <see cref="Ready"/>, e.g. the service's database.
/// </summary>
public static class HealthTags
{
    public const string Ready = "ready";
}
