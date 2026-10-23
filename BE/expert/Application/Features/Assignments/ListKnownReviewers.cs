using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Assignments;

/// <summary>Reviewers a System Admin can hand a review to.</summary>
public sealed record ListKnownReviewersQuery;

/// <summary>Every reviewer this service has seen with the review permission, by email.</summary>
public sealed class ListKnownReviewersHandler(IKnownReviewerRepository reviewers)
    : IQueryHandler<ListKnownReviewersQuery, IReadOnlyList<KnownReviewerResponse>>
{
    public async Task<IReadOnlyList<KnownReviewerResponse>> HandleAsync(
        ListKnownReviewersQuery query,
        CancellationToken ct
    )
    {
        var known = await reviewers.ListAsync(ct);
        return known
            .Select(x => new KnownReviewerResponse(x.UserId.ToString(), x.Email, x.LastSeenAt))
            .ToArray();
    }
}
