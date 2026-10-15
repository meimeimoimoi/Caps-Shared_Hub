using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>Opens one of the applicant's own files.</summary>
public sealed record OpenEvidenceQuery(Guid UserId, Guid EvidenceId);

/// <summary>Owner only; other people's files return 404 so their existence is not revealed.</summary>
public sealed class OpenEvidenceHandler(IExpertEvidenceRepository evidences, IObjectStorage storage)
    : IQueryHandler<OpenEvidenceQuery, ExpertEvidenceFile>
{
    public async Task<ExpertEvidenceFile> HandleAsync(OpenEvidenceQuery query, CancellationToken ct)
    {
        var evidence =
            await evidences.FindOwnedAsync(query.EvidenceId, query.UserId, ct)
            ?? throw ExpertErrors.EvidenceNotFound();
        var content = await storage.OpenAsync(evidence.FileUrl, ct);
        return new(content, evidence.ContentType, evidence.FileName);
    }
}
