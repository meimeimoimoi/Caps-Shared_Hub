using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>EF Core queries for the review queues: filter, count and order in PostgreSQL.</summary>
public sealed class ReviewQueueReader(ExpertDbContext db) : IReviewQueueReader
{
    // Both gates wait for the expert in this status; the claim does not expire meanwhile
    private const string WaitingForExpert = ExpertApplicationStatus.NeedMoreInformation;

    public Task<int> CountApplicationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        ReviewQueueScope scope,
        CancellationToken ct
    ) => Applications(statuses, search, scope).CountAsync(ct);

    public async Task<IReadOnlyList<ReviewQueueRowResponse>> ListApplicationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        ReviewQueueScope scope,
        int take,
        CancellationToken ct
    )
    {
        var expiredBefore = scope.ExpiredBefore;
        var rows = await Applications(statuses, search, scope)
            .OrderBy(x => x.SubmittedAt)
            .ThenBy(x => x.Id)
            .Take(take)
            .Select(x => new QueueRow(
                new ReviewQueueRowResponse(
                    x.Id.ToString(),
                    "GATE_1",
                    x.ExpertProfile.UserId.ToString(),
                    x.ExpertProfile.DisplayName,
                    x.ExpertProfile.YearsExperience,
                    x.ExpertProfile.Fields,
                    null,
                    null,
                    x.Status,
                    x.SubmittedAt,
                    x.PreviousApplicationId != null,
                    null,
                    null,
                    null,
                    false,
                    null,
                    null,
                    false
                ),
                x.ClaimedByUserId != null
                && (x.Status == WaitingForExpert || x.ClaimedAt > expiredBefore)
                    ? x.ClaimedByUserId
                    : null,
                x.ClaimedAt,
                x.Status == WaitingForExpert,
                (
                    from r in db.KnownReviewers
                    where r.UserId == x.ClaimedByUserId
                    select r.Email
                ).FirstOrDefault()
            ))
            .ToListAsync(ct);
        return rows.ConvertAll(x => x.ToResponse(scope));
    }

    public Task<int> CountQualificationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        IReadOnlyCollection<string> matchingServiceCodes,
        ReviewQueueScope scope,
        CancellationToken ct
    ) => Qualifications(statuses, search, matchingServiceCodes, scope).CountAsync(ct);

    public async Task<IReadOnlyList<ReviewQueueRowResponse>> ListQualificationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        IReadOnlyCollection<string> matchingServiceCodes,
        ReviewQueueScope scope,
        int take,
        CancellationToken ct
    )
    {
        var expiredBefore = scope.ExpiredBefore;
        // Final approval waits from the Gate 2 PASS, so the oldest pass (the overdue ones) comes first
        var rows = await Qualifications(statuses, search, matchingServiceCodes, scope)
            .OrderBy(x =>
                x.Status == QualificationStatus.PendingFinalApproval
                    ? x.DecidedAt
                    : (DateTimeOffset?)x.SubmittedAt
            )
            .ThenBy(x => x.Id)
            .Take(take)
            .Select(x => new QueueRow(
                new ReviewQueueRowResponse(
                    x.Id.ToString(),
                    "GATE_2",
                    x.ExpertProfile.UserId.ToString(),
                    x.ExpertProfile.DisplayName,
                    x.ExpertProfile.YearsExperience,
                    x.ExpertProfile.Fields,
                    x.ServiceCode,
                    null,
                    x.Status,
                    x.SubmittedAt,
                    x.PreviousQualificationId != null,
                    null,
                    null,
                    null,
                    false,
                    x.Status == QualificationStatus.PendingFinalApproval ? x.DecidedAt : null,
                    null,
                    false
                ),
                x.ClaimedByUserId != null
                && (x.Status == WaitingForExpert || x.ClaimedAt > expiredBefore)
                    ? x.ClaimedByUserId
                    : null,
                x.ClaimedAt,
                x.Status == WaitingForExpert,
                (
                    from r in db.KnownReviewers
                    where r.UserId == x.ClaimedByUserId
                    select r.Email
                ).FirstOrDefault()
            ))
            .ToListAsync(ct);
        return rows.ConvertAll(x => x.ToResponse(scope));
    }

    public Task<int> CountFinalApprovalsPassedBeforeAsync(
        DateTimeOffset passedBefore,
        CancellationToken ct
    ) =>
        db
            .Qualifications.AsNoTracking()
            .CountAsync(
                x =>
                    x.Status == QualificationStatus.PendingFinalApproval
                    && x.DecidedAt < passedBefore,
                ct
            );

    public async Task<IReadOnlyDictionary<string, int>> CountApplicationsByStatusAsync(
        CancellationToken ct
    ) =>
        await db
            .ExpertApplications.AsNoTracking()
            .Where(x => x.Status != ExpertApplicationStatus.Draft)
            .GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, ct);

    public async Task<IReadOnlyDictionary<string, int>> CountQualificationsByStatusAsync(
        CancellationToken ct
    ) =>
        await db
            .Qualifications.AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, ct);

    public async Task<IReadOnlyDictionary<string, int>> CountApplicationsByStatusAsync(
        ReviewQueueScope scope,
        CancellationToken ct
    ) =>
        await ByClaim(
                db.ExpertApplications.AsNoTracking()
                    .Where(x => x.Status != ExpertApplicationStatus.Draft),
                scope
            )
            .GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, ct);

    public async Task<IReadOnlyDictionary<string, int>> CountQualificationsByStatusAsync(
        ReviewQueueScope scope,
        CancellationToken ct
    ) =>
        await ByClaim(db.Qualifications.AsNoTracking(), scope)
            .GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, ct);

    private IQueryable<ExpertApplication> Applications(
        IReadOnlyCollection<string> statuses,
        string? search,
        ReviewQueueScope scope
    )
    {
        var query = ByClaim(
            db.ExpertApplications.AsNoTracking().Where(x => statuses.Contains(x.Status)),
            scope
        );
        if (search == null)
            return query;
        var pattern = Like(search);
        return query.Where(x =>
            EF.Functions.ILike(x.ExpertProfile.DisplayName ?? "", pattern)
            || EF.Functions.ILike(x.ExpertProfile.ContactEmail ?? "", pattern)
        );
    }

    private IQueryable<ExpertServiceQualification> Qualifications(
        IReadOnlyCollection<string> statuses,
        string? search,
        IReadOnlyCollection<string> matchingServiceCodes,
        ReviewQueueScope scope
    )
    {
        var query = ByClaim(
            db.Qualifications.AsNoTracking().Where(x => statuses.Contains(x.Status)),
            scope
        );
        if (search == null)
            return query;
        var pattern = Like(search);
        return query.Where(x =>
            EF.Functions.ILike(x.ExpertProfile.DisplayName ?? "", pattern)
            || EF.Functions.ILike(x.ExpertProfile.ContactEmail ?? "", pattern)
            || matchingServiceCodes.Contains(x.ServiceCode)
        );
    }

    // A claim is active while waiting for the expert or until the hold runs out (same rule as ReviewClaimRules)
    private static IQueryable<ExpertApplication> ByClaim(
        IQueryable<ExpertApplication> query,
        ReviewQueueScope scope
    )
    {
        var viewer = scope.ViewerUserId;
        var expiredBefore = scope.ExpiredBefore;
        return scope.ClaimFilter switch
        {
            ReviewClaimFilter.Mine => query.Where(x =>
                x.ClaimedByUserId == viewer
                && (x.Status == WaitingForExpert || x.ClaimedAt > expiredBefore)
            ),
            ReviewClaimFilter.Unclaimed => query.Where(x =>
                x.ClaimedByUserId == null
                || (x.Status != WaitingForExpert && x.ClaimedAt <= expiredBefore)
            ),
            ReviewClaimFilter.MineOrUnclaimed => query.Where(x =>
                x.ClaimedByUserId == null
                || x.ClaimedByUserId == viewer
                || (x.Status != WaitingForExpert && x.ClaimedAt <= expiredBefore)
            ),
            _ => query,
        };
    }

    private static IQueryable<ExpertServiceQualification> ByClaim(
        IQueryable<ExpertServiceQualification> query,
        ReviewQueueScope scope
    )
    {
        var viewer = scope.ViewerUserId;
        var expiredBefore = scope.ExpiredBefore;
        return scope.ClaimFilter switch
        {
            ReviewClaimFilter.Mine => query.Where(x =>
                x.ClaimedByUserId == viewer
                && (x.Status == WaitingForExpert || x.ClaimedAt > expiredBefore)
            ),
            ReviewClaimFilter.Unclaimed => query.Where(x =>
                x.ClaimedByUserId == null
                || (x.Status != WaitingForExpert && x.ClaimedAt <= expiredBefore)
            ),
            ReviewClaimFilter.MineOrUnclaimed => query.Where(x =>
                x.ClaimedByUserId == null
                || x.ClaimedByUserId == viewer
                || (x.Status != WaitingForExpert && x.ClaimedAt <= expiredBefore)
            ),
            _ => query,
        };
    }

    // ILIKE treats % and _ as wildcards and \ as the escape character: search for them literally
    private static string Like(string search) =>
        "%" + search.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";

    /// <summary>A queue row with its raw claim; the expiry and "mine" are worked out after reading.</summary>
    private sealed record QueueRow(
        ReviewQueueRowResponse Row,
        Guid? HolderUserId,
        DateTimeOffset? ClaimedAt,
        bool WaitingForExpert,
        string? HolderEmail
    )
    {
        public ReviewQueueRowResponse ToResponse(ReviewQueueScope scope) =>
            HolderUserId == null
                ? Row
                : Row with
                {
                    ClaimedByUserId = HolderUserId.ToString(),
                    ClaimedByEmail = HolderEmail,
                    ClaimExpiresAt = ReviewClaimRules.ExpiresAt(
                        HolderUserId,
                        ClaimedAt,
                        WaitingForExpert,
                        scope.Hold
                    ),
                    HeldByMe = HolderUserId == scope.ViewerUserId,
                };
    }
}
