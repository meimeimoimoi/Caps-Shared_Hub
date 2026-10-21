using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>Removes a file the applicant uploaded.</summary>
public sealed record RemoveEvidenceCommand(Applicant Applicant, Guid EvidenceId);

/// <summary>Removes a file that is not yet part of a submission, then deletes it from storage.</summary>
public sealed class RemoveEvidenceHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IExpertEvidenceRepository evidences,
    IObjectStorage storage,
    IApplicationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<RemoveEvidenceCommand, ExpertApplicationResponse>
{
    public async Task<ExpertApplicationResponse> HandleAsync(
        RemoveEvidenceCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(command.Applicant.UserId, ct);
        var (profile, application) = await loader.GetCurrentAsync(command.Applicant.UserId, ct);
        var evidence =
            await evidences.FindAsync(command.EvidenceId, application.Id, ct)
            ?? throw ExpertErrors.EvidenceNotFound();
        if (!application.CanRemove(evidence))
            throw ExpertErrors.EvidenceLocked();
        evidences.Remove(evidence);
        application.Touch(clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // Delete the file only once the row is gone, so a failure never leaves a row without its file
        if (!evidence.IsLink)
            await storage.DeleteQuietlyAsync(evidence.FileUrl);
        // Reviewers see new or removed evidence without reloading
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Applications,
            [command.Applicant.UserId],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(command.Applicant, profile, application, ct);
    }
}
