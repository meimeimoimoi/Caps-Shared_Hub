using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>A System Admin opens one evidence file of an excuse request.</summary>
public sealed record OpenExcuseFileQuery(Guid ExpertProfileId, Guid ReviewCaseId, Guid FileId);

/// <summary>Reads the file back from private storage; a file of another case reads as not found.</summary>
public sealed class OpenExcuseFileHandler(IExpertViolations violations, IObjectStorage storage)
    : IQueryHandler<OpenExcuseFileQuery, ExpertEvidenceFile>
{
    public async Task<ExpertEvidenceFile> HandleAsync(
        OpenExcuseFileQuery query,
        CancellationToken ct
    )
    {
        var violation =
            await violations.FindAsync(query.ExpertProfileId, query.ReviewCaseId, ct)
            ?? throw ExpertErrors.ViolationNotFound();
        var file =
            violation.ExcuseFiles.FirstOrDefault(f => f.Id == query.FileId)
            ?? throw ExpertErrors.ViolationFileNotFound();
        return new(await storage.OpenAsync(file.StorageKey, ct), file.ContentType, file.FileName);
    }
}
