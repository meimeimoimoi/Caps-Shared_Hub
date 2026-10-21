using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>EF Core queries for the review queues: filter, count and order in PostgreSQL.</summary>
public sealed class ReviewQueueReader(ExpertDbContext db) : IReviewQueueReader
{
    public Task<int> CountApplicationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        CancellationToken ct
    ) => Applications(statuses, search).CountAsync(ct);

    public async Task<IReadOnlyList<ReviewQueueRowResponse>> ListApplicationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        int take,
        CancellationToken ct
    ) =>
        await Applications(statuses, search)
            .OrderBy(x => x.SubmittedAt)
            .ThenBy(x => x.Id)
            .Take(take)
            .Select(x => new ReviewQueueRowResponse(
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
                x.PreviousApplicationId != null
            ))
            .ToListAsync(ct);

    public Task<int> CountQualificationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        IReadOnlyCollection<string> matchingServiceCodes,
        CancellationToken ct
    ) => Qualifications(statuses, search, matchingServiceCodes).CountAsync(ct);

    public async Task<IReadOnlyList<ReviewQueueRowResponse>> ListQualificationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        IReadOnlyCollection<string> matchingServiceCodes,
        int take,
        CancellationToken ct
    ) =>
        await Qualifications(statuses, search, matchingServiceCodes)
            .OrderBy(x => x.SubmittedAt)
            .ThenBy(x => x.Id)
            .Take(take)
            .Select(x => new ReviewQueueRowResponse(
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
                x.PreviousQualificationId != null
            ))
            .ToListAsync(ct);

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

    private IQueryable<ExpertApplication> Applications(
        IReadOnlyCollection<string> statuses,
        string? search
    )
    {
        var query = db.ExpertApplications.AsNoTracking().Where(x => statuses.Contains(x.Status));
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
        IReadOnlyCollection<string> matchingServiceCodes
    )
    {
        var query = db.Qualifications.AsNoTracking().Where(x => statuses.Contains(x.Status));
        if (search == null)
            return query;
        var pattern = Like(search);
        return query.Where(x =>
            EF.Functions.ILike(x.ExpertProfile.DisplayName ?? "", pattern)
            || EF.Functions.ILike(x.ExpertProfile.ContactEmail ?? "", pattern)
            || matchingServiceCodes.Contains(x.ServiceCode)
        );
    }

    // ILIKE treats % and _ as wildcards and \ as the escape character: search for them literally
    private static string Like(string search) =>
        "%" + search.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
}
