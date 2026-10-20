using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Opens a file of the application under review.</summary>
public sealed record OpenApplicationEvidenceQuery(Guid ApplicationId, Guid EvidenceId);

/// <summary>The file must belong to the given application; EVIDENCE_NOT_FOUND otherwise.</summary>
public sealed class OpenApplicationEvidenceHandler(
    IExpertEvidenceRepository evidences,
    IObjectStorage storage
) : IQueryHandler<OpenApplicationEvidenceQuery, ExpertEvidenceFile>
{
    public async Task<ExpertEvidenceFile> HandleAsync(
        OpenApplicationEvidenceQuery query,
        CancellationToken ct
    )
    {
        var evidence =
            await evidences.FindAsync(query.EvidenceId, query.ApplicationId, ct)
            ?? throw ExpertErrors.EvidenceNotFound();
        var content = await storage.OpenAsync(evidence.FileUrl, ct);
        return new(content, evidence.ContentType, evidence.FileName);
    }
}
