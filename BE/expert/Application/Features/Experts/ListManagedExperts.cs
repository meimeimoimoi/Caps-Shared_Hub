using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Experts;

/// <summary>Expert–Services a System Admin manages after final approval: serving or suspended.</summary>
public sealed record ListManagedExpertsQuery;

/// <summary>Adds service names and reviewer emails to the rows read from the database.</summary>
public sealed class ListManagedExpertsHandler(
    IManagedExpertReader reader,
    IServiceCatalogRepository catalog,
    IKnownReviewerRepository reviewers
) : IQueryHandler<ListManagedExpertsQuery, IReadOnlyList<ManagedExpertResponse>>
{
    /// <summary>Actor value for changes made by the system itself (e.g. automatic registration).</summary>
    public const string SystemActor = "SYSTEM";

    /// <summary>Actor value for an admin this service has no email for.</summary>
    public const string AdminActor = "ADMIN";

    private static readonly string[] AdminStatuses =
    [
        QualificationStatus.ApprovedForService,
        QualificationStatus.Suspended,
    ];

    public async Task<IReadOnlyList<ManagedExpertResponse>> HandleAsync(
        ListManagedExpertsQuery query,
        CancellationToken ct
    )
    {
        var rows = await reader.ListAsync(ct);
        if (rows.Count == 0)
            return [];

        var services = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        var people = rows.SelectMany(r => r.Events.Select(e => e.ActorUserId))
            .Concat(rows.Select(r => r.CompetencyReviewerUserId).OfType<Guid>())
            .ToHashSet();
        var emails = await reviewers.FindEmailsAsync(people, ct);
        string Name(Guid id) => emails.GetValueOrDefault(id) ?? id.ToString();
        // Who made a status change: the system, the expert, a known reviewer, or else an admin (final
        // approval and service access need ExpertApprove) or the bare id
        string Actor(ManagedExpertRow row, ManagedExpertEventRow e) =>
            e.ActorUserId == Guid.Empty ? SystemActor
            : e.ActorUserId == row.ExpertUserId
                ? row.DisplayName ?? row.Email ?? Name(e.ActorUserId)
            : emails.GetValueOrDefault(e.ActorUserId)
                ?? (AdminStatuses.Contains(e.ToStatus) ? AdminActor : e.ActorUserId.ToString());

        return rows.Select(r => new ManagedExpertResponse(
                r.QualificationId.ToString(),
                r.ApplicationId.ToString(),
                r.ExpertProfileId.ToString(),
                r.DisplayName,
                r.Email,
                r.YearsExperience,
                r.Fields,
                r.ServiceCode,
                services.GetValueOrDefault(r.ServiceCode) ?? r.ServiceCode,
                r.Status,
                r.AcceptingRequests,
                r.Fee,
                r.TurnaroundHours,
                r.Capacity,
                r.ActiveCases,
                r.ApprovedAt,
                r.CompetencyReviewerUserId is { } reviewer ? Name(reviewer) : null,
                r.Events.OrderByDescending(e => e.At)
                    .Select(e => new ManagedExpertEventResponse(
                        Actor(r, e),
                        e.FromStatus,
                        e.ToStatus,
                        e.Note,
                        e.At
                    ))
                    .ToArray()
            ))
            .ToArray();
    }
}
