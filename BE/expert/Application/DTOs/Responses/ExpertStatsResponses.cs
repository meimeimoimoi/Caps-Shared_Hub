namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>Experts approved in one calendar month (Vietnam time).</summary>
/// <param name="Start">First day of the month, yyyy-MM-dd.</param>
/// <param name="Partial">The month is still running.</param>
/// <param name="NewExperts">Experts whose first final approval for any service happened in the month.</param>
public sealed record ExpertStatPeriodResponse(string Start, bool Partial, int NewExperts);

/// <summary>Expert figures for the System Admin dashboard.</summary>
/// <param name="Periods">Oldest month first, ending with the current (partial) month.</param>
/// <param name="ServingExperts">Experts with at least one approved service right now.</param>
/// <param name="SuspendedExperts">Experts whose services are all suspended right now.</param>
public sealed record ExpertStatsResponse(
    ExpertStatPeriodResponse[] Periods,
    int ServingExperts,
    int SuspendedExperts
);
