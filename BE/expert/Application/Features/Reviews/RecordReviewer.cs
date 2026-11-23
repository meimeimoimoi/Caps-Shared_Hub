using Caps.Common.Application;
using Caps.Expert.Application.Common;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>A reviewer opened the queue; keeps them in the list a System Admin can hand reviews to.</summary>
public sealed record RecordReviewerCommand(Guid ReviewerUserId, string? ReviewerEmail);

/// <summary>Adds or refreshes the known reviewer; at most one write a day per reviewer.</summary>
public sealed class RecordReviewerHandler(
    IKnownReviewerRecorder reviewers,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RecordReviewerCommand>
{
    public async Task HandleAsync(RecordReviewerCommand command, CancellationToken ct)
    {
        await reviewers.RecordAsync(
            command.ReviewerUserId,
            command.ReviewerEmail,
            clock.GetUtcNow(),
            ct
        );
        await unitOfWork.SaveChangesAsync(ct);
    }
}
