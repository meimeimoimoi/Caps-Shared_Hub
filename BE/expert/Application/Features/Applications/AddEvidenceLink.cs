using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>Adds a public CV or supporting evidence link to the open application.</summary>
public sealed record AddEvidenceLinkCommand(Applicant Applicant, string Code, string? SourceUrl);

/// <summary>Records a link under the same lock, status rules and limits as file uploads.</summary>
public sealed class AddEvidenceLinkHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IExpertEvidenceRepository evidences,
    IApplicationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<AddEvidenceLinkCommand, ExpertApplicationResponse>
{
    public async Task<ExpertApplicationResponse> HandleAsync(
        AddEvidenceLinkCommand command,
        CancellationToken ct
    )
    {
        var url = ApplicationRules.ValidateUrl(command.SourceUrl);
        if (
            command.Code != ApplicationRules.SupplementCode
            && !ApplicationRules.EvidenceCodes.Contains(command.Code)
        )
        {
            throw ExpertErrors.InvalidEvidenceCode();
        }

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(command.Applicant.UserId, ct);
        var (profile, application) = await loader.OpenOrCreateAsync(command.Applicant, ct);
        application.EnsureAcceptsFile(command.Code == ApplicationRules.SupplementCode);
        var existing = await evidences.ListAsync(application.Id, ct);
        if (existing.Any(x => x.EvidenceType == command.Code && x.SourceUrl == url))
            throw ExpertErrors.EvidenceDuplicate();
        ApplicationRules.EnsureRoomForFile(existing.Count, command.Applicant.EmailVerified);

        var now = clock.GetUtcNow();
        var evidence = ExpertEvidence.CreateFromUrl(
            application,
            command.Applicant.UserId,
            command.Code,
            url,
            now
        );
        evidences.Add(evidence);
        application.Touch(now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
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
