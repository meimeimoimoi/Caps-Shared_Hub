using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>Every field may be empty; required fields are only checked on submit.</summary>
public sealed record SaveDraftCommand(
    Applicant Applicant,
    string? DisplayName,
    string? Phone,
    DateOnly? BirthDate,
    string? Title,
    string? Company,
    string? Location,
    string? Bio,
    int? YearsExperience,
    string[]? Fields,
    string? Highlights
);

public sealed class SaveDraftHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IApplicationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SaveDraftCommand, ExpertApplicationResponse>
{
    public async Task<ExpertApplicationResponse> HandleAsync(
        SaveDraftCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var fields = ApplicationRules.NormalizeFields(command.Fields);
        ApplicationRules.ValidateBirthDate(command.BirthDate, now);

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(command.Applicant.UserId, ct);
        var (profile, application) = await loader.OpenOrCreateAsync(command.Applicant, ct);
        application.EnsureEditable();
        var details = new ProfileDetails(
            command.DisplayName,
            command.Phone,
            command.BirthDate,
            command.Title,
            command.Company,
            command.Location,
            command.Bio,
            command.YearsExperience,
            fields,
            command.Highlights
        );
        profile.UpdateDetails(details, now);
        application.Touch(now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await describer.DescribeAsync(command.Applicant, profile, application, ct);
    }
}
