using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;

namespace Caps.Expert.Application.Features.ReviewCases;

/// <summary>The client rated a finished review case; workflow already checked who and when.</summary>
public sealed record RecordCaseRatingCommand(Guid ExpertProfileId, Guid ReviewCaseId, short Stars);

/// <summary>Counts the rating once per case, so workflow may retry.</summary>
public sealed class RecordCaseRatingHandler(IExpertCaseRatings ratings, TimeProvider clock)
    : ICommandHandler<RecordCaseRatingCommand>
{
    public Task HandleAsync(RecordCaseRatingCommand command, CancellationToken ct) =>
        ratings.AddAsync(
            command.ExpertProfileId,
            command.ReviewCaseId,
            command.Stars,
            clock.GetUtcNow(),
            ct
        );
}
