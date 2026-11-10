namespace Caps.Auth.Application.DTOs.Responses;

/// <summary>Accounts in one calendar month (Vietnam time); only verified accounts count.</summary>
/// <param name="Start">First day of the month, yyyy-MM-dd.</param>
/// <param name="Partial">The month is still running.</param>
/// <param name="NewUsers">Accounts created in the month.</param>
/// <param name="TotalUsers">Accounts at the end of the month (now, for the current month).</param>
public sealed record UserStatPeriodResponse(
    string Start,
    bool Partial,
    int NewUsers,
    int TotalUsers
);

/// <summary>Account figures for the System Admin dashboard, oldest month first.</summary>
public sealed record UserStatsResponse(UserStatPeriodResponse[] Periods);
