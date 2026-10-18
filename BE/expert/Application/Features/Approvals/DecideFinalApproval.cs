using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Approvals;

/// <summary>A System Admin's final approval: APPROVE or RETURN_FOR_REVIEW, with a note.</summary>
public sealed record DecideFinalApprovalCommand(
    Guid ApproverUserId,
    Guid QualificationId,
    string Decision,
    string? Note
);

/// <summary>
/// Records the final approval of a Gate 2 PASS. Runs under the expert's lock, so it cannot interleave with
/// another decision on the same qualification.
/// </summary>
public sealed class DecideFinalApprovalHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IQualificationReviewDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<DecideFinalApprovalCommand, ReviewQualificationResponse>
{
    public async Task<ReviewQualificationResponse> HandleAsync(
        DecideFinalApprovalCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var applicantUserId =
            await qualifications.FindApplicantUserIdAsync(command.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        await locks.AcquireAsync(applicantUserId, ct);
        // Loaded after the lock so the status check sees the latest committed state
        var qualification =
            await qualifications.FindWithProfileAsync(command.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var decided = qualification.DecideFinalApproval(
            command.ApproverUserId,
            qualification.ExpertProfile.UserId,
            command.Decision.Trim().ToUpperInvariant(),
            command.Note,
            clock.GetUtcNow()
        );
        qualifications.AddEvent(decided);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await describer.DescribeAsync(qualification, ct);
    }
}
