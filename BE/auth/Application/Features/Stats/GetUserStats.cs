using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Stats;

/// <summary>Account statistics over the last <paramref name="Months"/> calendar months, including the current one.</summary>
public sealed record GetUserStatsQuery(int Months);

/// <summary>Counts sign-ups per month and carries a running total from the accounts created before.</summary>
public sealed class GetUserStatsHandler(IUserStatsReader stats, TimeProvider clock)
    : IQueryHandler<GetUserStatsQuery, UserStatsResponse>
{
    public async Task<UserStatsResponse> HandleAsync(GetUserStatsQuery query, CancellationToken ct)
    {
        var months = StatMonths.Last(query.Months, clock.GetUtcNow());
        var signups = await stats.ListSignupsAsync(months[0].Start, months[^1].End, ct);
        var newUsers = new int[months.Count];
        foreach (var createdAt in signups)
        {
            var i = StatMonths.IndexOf(months, createdAt);
            if (i >= 0)
                newUsers[i]++;
        }
        var total = await stats.CountUsersBeforeAsync(months[0].Start, ct);
        var periods = new UserStatPeriodResponse[months.Count];
        for (var i = 0; i < months.Count; i++)
        {
            total += newUsers[i];
            periods[i] = new(months[i].Key, months[i].Partial, newUsers[i], total);
        }
        return new UserStatsResponse(periods);
    }
}
