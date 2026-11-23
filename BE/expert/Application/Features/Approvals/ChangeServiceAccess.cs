using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Approvals;

/// <summary>A System Admin suspends (note required) or reinstates an approved service.</summary>
public sealed record ChangeServiceAccessCommand(
    Guid AdminUserId,
    Guid QualificationId,
    string Action,
    string? Note
);

/// <summary>Records the change under the expert's lock and tells the expert.</summary>
public sealed class ChangeServiceAccessHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IServiceAccessNotifier notifier,
    IAuditTrail audit,
    IQualificationReviewDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<ChangeServiceAccessCommand, ReviewQualificationResponse>
{
    public async Task<ReviewQualificationResponse> HandleAsync(
        ChangeServiceAccessCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var applicantUserId =
            await qualifications.FindApplicantUserIdAsync(command.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        await locks.AcquireAsync(applicantUserId, ct);
        var qualification =
            await qualifications.FindWithProfileAsync(command.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var action = command.Action.Trim().ToUpperInvariant();
        var changed = qualification.ChangeServiceAccess(
            command.AdminUserId,
            action,
            command.Note,
            clock.GetUtcNow()
        );
        qualifications.AddEvent(changed);
        var suspended = action == ServiceAccessAction.Suspend;
        var change = suspended ? "SUSPENDED" : "REINSTATED";
        await notifier.EnqueueAsync(qualification, changed, change, ct);
        audit.Record(
            AuditActions.Qualification,
            qualification.Id,
            suspended ? AuditActions.ServiceSuspended : AuditActions.ServiceReinstated,
            command.AdminUserId,
            changed.CreatedAt,
            new { serviceCode = qualification.ServiceCode, note = changed.Note }
        );
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            [applicantUserId],
            [Permission.ExpertReview, Permission.ExpertApprove],
            ct
        );
        return await describer.DescribeAsync(qualification, ct);
    }
}
