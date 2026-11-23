using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Opens a file of the qualification under review.</summary>
public sealed record OpenQualificationEvidenceQuery(Guid QualificationId, Guid EvidenceId);

/// <summary>The file must be one the qualification can rely on; EVIDENCE_NOT_FOUND otherwise.</summary>
public sealed class OpenQualificationEvidenceHandler(
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository evidences,
    IObjectStorage storage
) : IQueryHandler<OpenQualificationEvidenceQuery, ExpertEvidenceFile>
{
    public async Task<ExpertEvidenceFile> HandleAsync(
        OpenQualificationEvidenceQuery query,
        CancellationToken ct
    )
    {
        var qualification =
            await qualifications.FindWithProfileAsync(query.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var evidence =
            await evidences.FindAsync(query.EvidenceId, qualification, ct)
            ?? throw ExpertErrors.EvidenceNotFound();
        if (evidence.IsLink)
            throw ExpertErrors.EvidenceNotFound();
        var content = await storage.OpenAsync(evidence.FileUrl, ct);
        return new(content, evidence.ContentType, evidence.FileName);
    }
}
