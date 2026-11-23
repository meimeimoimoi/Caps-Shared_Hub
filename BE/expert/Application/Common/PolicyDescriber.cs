using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Policies;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the configured defaults with the stored values, in display order.</summary>
public sealed class PolicyDescriber(IPolicySettingRepository settings, ExpertPolicyOptions options)
    : IPolicyDescriber
{
    public async Task<ExpertPolicyResponse> DescribeAsync(CancellationToken ct)
    {
        var stored = (await settings.ListAsync(ct)).ToDictionary(x => x.Key);
        var defaults = options.AdjustableDefaults;
        return new(
            PolicySettingKeys
                .All.Select(key =>
                {
                    var range = PolicySettingKeys.Ranges[key];
                    stored.TryGetValue(key, out var row);
                    return new PolicySettingResponse(
                        key,
                        row != null ? PolicySettingKeys.Clamp(key, row.Value) : defaults[key],
                        defaults[key],
                        range.Min,
                        range.Max,
                        row?.UpdatedAt,
                        row?.UpdatedByUserId.ToString()
                    );
                })
                .ToArray()
        );
    }
}
