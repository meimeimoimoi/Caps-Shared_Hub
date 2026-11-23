using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the applicant's view of an application.</summary>
public interface IApplicationDescriber
{
    /// <summary>Builds the applicant's view: details, files, history and what can be done next.</summary>
    Task<ExpertApplicationResponse> DescribeAsync(
        Applicant applicant,
        ExpertProfile profile,
        ExpertApplication application,
        CancellationToken ct
    );
}
