using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>Reads one of the signed-in expert's qualifications.</summary>
public sealed record GetMyQualificationQuery(Applicant Applicant, Guid QualificationId);

/// <summary>Owner only; other people's qualifications return 404.</summary>
public sealed class GetMyQualificationHandler(
    IQualificationRepository qualifications,
    IQualificationDescriber describer
) : IQueryHandler<GetMyQualificationQuery, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        GetMyQualificationQuery query,
        CancellationToken ct
    )
    {
        var qualification =
            await qualifications.FindOwnedAsync(query.QualificationId, query.Applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        return await describer.DescribeAsync(query.Applicant, qualification, ct);
    }
}
