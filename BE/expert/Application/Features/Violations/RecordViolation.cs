using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>Workflow reported a review case that counts against the expert.</summary>
public sealed record RecordViolationCommand(
    Guid ExpertUserId,
    Guid ReviewCaseId,
    string Kind,
    DateTimeOffset OccurredAt
);

/// <summary>
/// Stores the violation once per case. Crossing 9 points in 90 days suspends every approved service, which
/// refunds waiting requests (workflow) and emails the expert (notification); only an admin reinstates.
/// </summary>
public sealed class RecordViolationHandler(
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IExpertViolations violations,
    IApplicantLock locks,
    IServiceAccessNotifier notifier,
    IAuditTrail audit,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RecordViolationCommand>
{
    public async Task HandleAsync(RecordViolationCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(command.ExpertUserId, ct);
        var profile = await profiles.FindByUserAsync(command.ExpertUserId, ct);
        if (profile == null)
        {
            return;
        }
        var violation = ExpertViolation.Record(
            command.ReviewCaseId,
            profile.Id,
            command.Kind,
            command.OccurredAt
        );
        // A redelivered event changes nothings
        if (!await violations.AddAsync(violation, ct))
        {
            return;
        }
        var now = clock.GetUtcNow();
        var all = await violations.PointsAsync(
            [profile.Id],
            now.AddDays(-ViolationRules.WindowDays),
            ct
        );
        var points = all.GetValueOrDefault(profile.Id);
        if (
            points >= ViolationRules.SuspendAt
            && points - violation.Points < ViolationRules.SuspendAt
        )
        {
            await SuspendAllAsync(profile.Id, points, now, ct);
        }
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    private async Task SuspendAllAsync(
        Guid profileId,
        int points,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var note =
            $"Tạm ngưng hoạt động: {points} điểm vi phạm trong {ViolationRules.WindowDays} ngày.";
        foreach (var latest in await qualifications.ListLatestByProfileAsync(profileId, ct))
        {
            if (latest.Status != QualificationStatus.ApprovedForService)
            {
                continue;
            }
            // The list is read-only; load the tracked row with its profile for the notifier
            var qualification = (await qualifications.FindWithProfileAsync(latest.Id, ct))!;
            var changed = qualification.ChangeServiceAccess(
                SystemActor.UserId,
                ServiceAccessAction.Suspend,
                note,
                now
            );
            qualifications.AddEvent(changed);
            await notifier.EnqueueAsync(qualification, changed, "SUSPENDED", ct);
            audit.Record(
                AuditActions.Qualification,
                qualification.Id,
                AuditActions.ServiceSuspended,
                SystemActor.UserId,
                now,
                new { serviceCode = qualification.ServiceCode, note }
            );
        }
    }
}
