using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Policies;

/// <summary>Asks for the most recent expert policy changes.</summary>
public sealed record ListExpertPolicyHistoryQuery;

/// <summary>The most recent policy changes, newest first.</summary>
public sealed class ListExpertPolicyHistoryHandler(IPolicySettingRepository settings)
    : IQueryHandler<ListExpertPolicyHistoryQuery, IReadOnlyList<PolicySettingChangeResponse>>
{
    private const int MaxChanges = 100;

    public async Task<IReadOnlyList<PolicySettingChangeResponse>> HandleAsync(
        ListExpertPolicyHistoryQuery query,
        CancellationToken ct
    )
    {
        var changes = await settings.ListChangesAsync(MaxChanges, ct);
        return changes
            .Select(x => new PolicySettingChangeResponse(
                x.Id.ToString(),
                x.Key,
                x.OldValue,
                x.NewValue,
                x.Reason,
                x.ChangedByUserId.ToString(),
                x.ChangedAt
            ))
            .ToList();
    }
}
