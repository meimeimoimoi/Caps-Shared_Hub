using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Applications;

public sealed record RemoveEvidenceCommand(Applicant Applicant, Guid EvidenceId);

public sealed class RemoveEvidenceHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IExpertEvidenceRepository evidences,
    IObjectStorage storage,
    IApplicationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
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
        await storage.DeleteQuietlyAsync(evidence.FileUrl);
        return await describer.DescribeAsync(command.Applicant, profile, application, ct);
    }
}
