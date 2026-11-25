using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>The signed-in expert opens one evidence file they sent with an excuse request.</summary>
public sealed record OpenMyExcuseFileQuery(Guid UserId, Guid ReviewCaseId, Guid FileId);

/// <summary>The admin's file lookup, scoped to the expert's own profile so no one opens another expert's file.</summary>
public sealed class OpenMyExcuseFileHandler(
    IExpertProfileRepository profiles,
    IQueryHandler<OpenExcuseFileQuery, ExpertEvidenceFile> open
) : IQueryHandler<OpenMyExcuseFileQuery, ExpertEvidenceFile>
{
    public async Task<ExpertEvidenceFile> HandleAsync(
        OpenMyExcuseFileQuery query,
        CancellationToken ct
    )
    {
        var profile =
            await profiles.FindByUserAsync(query.UserId, ct)
            ?? throw ExpertErrors.ViolationNotFound();
        return await open.HandleAsync(new(profile.Id, query.ReviewCaseId, query.FileId), ct);
    }
}
