using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>
/// One page of the review queue. Applications are included only for the given application statuses and
/// qualifications only for the given qualification statuses, so one call can serve a single gate or both.
/// </summary>
/// <param name="ClaimFilter">MINE, UNCLAIMED, ALL or (default) MINE_OR_UNCLAIMED, relative to the viewer.</param>
public sealed record SearchReviewQueueQuery(
    IReadOnlyList<string> ApplicationStatuses,
    IReadOnlyList<string> QualificationStatuses,
    string? Search,
    int Page,
    int PageSize,
    Guid ViewerUserId,
    string? ClaimFilter
);

/// <summary>Counts and pages in the database; when both gates are asked for, merges the two by submission time.</summary>
public sealed class SearchReviewQueueHandler(
    IReviewQueueReader queue,
    IServiceCatalogRepository catalog,
    IExpertPolicyProvider policies,
    TimeProvider clock
) : IQueryHandler<SearchReviewQueueQuery, ReviewQueuePageResponse>
{
    public const int MaxPageSize = 100;
    public const int MaxSearchLength = 100;

    public async Task<ReviewQueuePageResponse> HandleAsync(
        SearchReviewQueueQuery query,
        CancellationToken ct
    )
    {
        if (query.Page < 1 || query.PageSize < 1 || query.PageSize > MaxPageSize)
            throw ExpertErrors.InvalidPaging(MaxPageSize);
        var applicationStatuses = Normalize(query.ApplicationStatuses);
        var qualificationStatuses = Normalize(query.QualificationStatuses);
        var search = query.Search?.Trim();
        if (string.IsNullOrEmpty(search))
            search = null;
        else if (search.Length > MaxSearchLength)
            search = search[..MaxSearchLength];

        // Reviewers search services by name; the catalog is small, so the match is resolved here
        var services = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        string[] serviceCodes =
            search == null
                ? []
                : services
                    .Where(x =>
                        x.Value.Contains(search, StringComparison.OrdinalIgnoreCase)
                        || x.Key.Contains(search, StringComparison.OrdinalIgnoreCase)
                    )
                    .Select(x => x.Key)
                    .ToArray();

        // Claims expire when read, so the filter and each row use the same server time
        var scope = new ReviewQueueScope(
            ReviewClaimFilter.Normalize(query.ClaimFilter),
            query.ViewerUserId,
            clock.GetUtcNow(),
            (await policies.GetReviewClaimAsync(ct)).Hold
        );

        // Each source returns its first skip + pageSize rows; merging them gives the exact page
        var skip = (query.Page - 1) * query.PageSize;
        var take = skip + query.PageSize;
        var total = 0;
        var rows = new List<ReviewQueueRowResponse>();
        if (applicationStatuses.Length > 0)
        {
            total += await queue.CountApplicationsAsync(applicationStatuses, search, scope, ct);
            rows.AddRange(
                await queue.ListApplicationsAsync(applicationStatuses, search, scope, take, ct)
            );
        }
        if (qualificationStatuses.Length > 0)
        {
            total += await queue.CountQualificationsAsync(
                qualificationStatuses,
                search,
                serviceCodes,
                scope,
                ct
            );
            rows.AddRange(
                await queue.ListQualificationsAsync(
                    qualificationStatuses,
                    search,
                    serviceCodes,
                    scope,
                    take,
                    ct
                )
            );
        }
        var finalApproval = await policies.GetFinalApprovalAsync(ct);
        // Same order as the sources: final approvals by Gate 2 PASS time, the rest by submission
        var items = rows.OrderBy(x => x.PassedAt ?? x.SubmittedAt ?? DateTimeOffset.MinValue)
            .ThenBy(x => x.Id, StringComparer.Ordinal)
            .Skip(skip)
            .Take(query.PageSize)
            .Select(x =>
                x.ServiceCode == null
                    ? x
                    : x with
                    {
                        ServiceName = services.GetValueOrDefault(x.ServiceCode),
                    }
            )
            .Select(x =>
                x.PassedAt is not DateTimeOffset passedAt
                    ? x
                    : x with
                    {
                        FinalApprovalDueAt = FinalApprovalRules.DueAt(passedAt, finalApproval),
                        FinalApprovalOverdue = FinalApprovalRules.IsOverdue(
                            passedAt,
                            finalApproval,
                            scope.Now
                        ),
                    }
            )
            .ToArray();
        var work = await policies.GetReviewWorkAsync(ct);
        return new ReviewQueuePageResponse(items, query.Page, query.PageSize, total, work.SlaDays);
    }

    private static string[] Normalize(IReadOnlyList<string>? statuses) =>
        (statuses ?? [])
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant())
            .Distinct()
            .ToArray();
}
