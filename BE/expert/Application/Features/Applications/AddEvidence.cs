using System.Security.Cryptography;
using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>Uploads one evidence file to the applicant's open application.</summary>
/// <param name="Code">CV, EV-01…EV-05, or SUPPLEMENT while more information is requested.</param>
public sealed record AddEvidenceCommand(
    Applicant Applicant,
    string Code,
    string FileName,
    byte[] Content
);

/// <summary>Validates an upload by its content, stores it and records it on the application.</summary>
public sealed class AddEvidenceHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IExpertEvidenceRepository evidences,
    IObjectStorage storage,
    IApplicationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<AddEvidenceCommand, ExpertApplicationResponse>
{
    public async Task<ExpertApplicationResponse> HandleAsync(
        AddEvidenceCommand command,
        CancellationToken ct
    )
    {
        // Reject a bad file before touching the database
        var contentType = ApplicationRules.ValidateFile(command.Code, command.Content);
        var supplement = command.Code == ApplicationRules.SupplementCode;

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(command.Applicant.UserId, ct);
        var (profile, application) = await loader.OpenOrCreateAsync(command.Applicant, ct);
        application.EnsureAcceptsFile(supplement);
        if (command.Code == ApplicationRules.CvCode)
        {
            // Check stored bytes, not names, under the applicant lock to serialize repeated uploads.
            var contentHash = SHA256.HashData(command.Content);
            var existingFiles = await evidences.ListAsync(application.Id, ct);
            foreach (
                var existing in existingFiles.Where(x =>
                    x.EvidenceType == ApplicationRules.CvCode
                    && x.SizeBytes == command.Content.Length
                )
            )
            {
                await using var stream = await storage.OpenAsync(existing.FileUrl, ct);
                var existingHash = await SHA256.HashDataAsync(stream, ct);
                if (contentHash.AsSpan().SequenceEqual(existingHash))
                    throw ExpertErrors.EvidenceDuplicate();
            }
        }
        ApplicationRules.EnsureRoomForFile(
            await evidences.CountAsync(application.Id, ct),
            command.Applicant.EmailVerified
        );

        var now = clock.GetUtcNow();
        var evidence = ExpertEvidence.Create(
            application,
            command.Applicant.UserId,
            command.Code,
            command.FileName,
            contentType,
            command.Content.Length,
            now
        );
        await storage.PutAsync(evidence.FileUrl, command.Content, contentType, ct);
        evidences.Add(evidence);
        application.Touch(now);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            // The row was not saved, so the stored file would never be reachable
            await storage.DeleteQuietlyAsync(evidence.FileUrl);
            throw;
        }
        return await describer.DescribeAsync(command.Applicant, profile, application, ct);
    }
}
