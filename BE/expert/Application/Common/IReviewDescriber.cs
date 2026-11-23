using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the reviewer's view of an application.</summary>
public interface IReviewDescriber
{
    /// <summary>Details, files, history and latest Gate 1 results; the profile must be loaded.</summary>
    Task<ReviewApplicationResponse> DescribeAsync(
        ExpertApplication application,
        CancellationToken ct
    );
}
