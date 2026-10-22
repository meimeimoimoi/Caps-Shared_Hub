using Caps.Expert.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Policies;
using Caps.Expert.Domain.Qualifications;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>
/// Reads the stored policy values once per request and falls back to the configured defaults. The table holds a
/// few rows, so reading it directly keeps every instance in step with an admin change without a shared cache.
/// </summary>
public sealed class ExpertPolicyProvider(ExpertDbContext db, ExpertPolicyOptions options)
    : IExpertPolicyProvider
{
    private IReadOnlyDictionary<string, int>? values;

    public async Task<EligibilityPolicy> GetEligibilityAsync(CancellationToken ct)
    {
        var current = await LoadAsync(ct);
        return new(
            current[PolicySettingKeys.MinYearsExperience],
            TimeSpan.FromDays(current[PolicySettingKeys.ReapplyNotEligibleDays]),
            options.AllowedNotApplicableCriteria
        );
    }

    public async Task<CompetencyPolicy> GetCompetencyAsync(CancellationToken ct)
    {
        var current = await LoadAsync(ct);
        return new(TimeSpan.FromDays(current[PolicySettingKeys.ReapplyCompetencyFailDays]));
    }

    private async Task<IReadOnlyDictionary<string, int>> LoadAsync(CancellationToken ct)
    {
        if (values != null)
            return values;
        var stored = await db
            .PolicySettings.AsNoTracking()
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);
        values = options.AdjustableDefaults.ToDictionary(
            x => x.Key,
            x =>
                stored.TryGetValue(x.Key, out var value)
                    ? PolicySettingKeys.Clamp(x.Key, value)
                    : x.Value
        );
        return values;
    }
}
