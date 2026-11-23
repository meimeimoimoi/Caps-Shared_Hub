using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>Every excuse request waiting for a System Admin.</summary>
public sealed record ListExcuseRequestsQuery;

/// <summary>Oldest first, so the admin answers in order.</summary>
public sealed class ListExcuseRequestsHandler(IExpertViolations violations, TimeProvider clock)
    : IQueryHandler<ListExcuseRequestsQuery, IReadOnlyList<ExcuseRequestResponse>>
{
    public async Task<IReadOnlyList<ExcuseRequestResponse>> HandleAsync(
        ListExcuseRequestsQuery query,
        CancellationToken ct
    )
    {
        var since = clock.GetUtcNow().AddDays(-ViolationRules.WindowDays);
        var rows = await violations.ListPendingRequestsAsync(ct);
        return rows.Select(r => new ExcuseRequestResponse(
                r.Expert.Id.ToString(),
                r.Expert.DisplayName,
                r.Expert.ContactEmail,
                ListViolationsHandler.Describe(r.Violation, since)
            ))
            .ToList();
    }
}
