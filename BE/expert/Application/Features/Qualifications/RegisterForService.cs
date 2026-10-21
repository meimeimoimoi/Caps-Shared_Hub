using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>Registers the signed-in expert for one catalog service (Gate 2).</summary>
public sealed record RegisterForServiceCommand(Applicant Applicant, string ServiceCode);

/// <summary>
/// Opens a qualification in competency review. Runs under the applicant's lock, so two requests cannot
/// open the same service twice.
/// </summary>
public sealed class RegisterForServiceHandler(
    IApplicantLock locks,
    IExpertProfileRepository profiles,
    IExpertApplicationRepository applications,
    IQualificationRepository qualifications,
    IServiceCatalogRepository catalog,
    IQualificationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<RegisterForServiceCommand, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        RegisterForServiceCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        var code = command.ServiceCode.Trim().ToUpperInvariant();
        var service = await catalog.FindAsync(code, ct);
        if (service is not { IsActive: true })
            throw ExpertErrors.ServiceNotFound();
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var profile =
            await profiles.FindByUserAsync(applicant.UserId, ct)
            ?? throw ExpertErrors.EligibilityRequired();
        var eligibility =
            await applications.FindLatestAsync(profile.Id, ct)
            ?? throw ExpertErrors.EligibilityRequired();
        var previous = await qualifications.FindLatestAsync(profile.Id, code, ct);
        var (qualification, opened) = ExpertServiceQualification.Register(
            eligibility,
            code,
            previous,
            applicant.UserId,
            clock.GetUtcNow()
        );
        qualifications.Add(qualification);
        qualifications.AddEvent(opened);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            [applicant.UserId],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(applicant, qualification, ct);
    }
}
