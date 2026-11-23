using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Common;

/// <summary>Adds a reviewer seen for the first time; otherwise refreshes the stored email at most daily.</summary>
public sealed class KnownReviewerRecorder(IKnownReviewerRepository reviewers)
    : IKnownReviewerRecorder
{
    public async Task RecordAsync(
        Guid userId,
        string? email,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var known = await reviewers.FindAsync(userId, ct);
        if (known == null)
            reviewers.Add(KnownReviewer.Record(userId, email, now));
        else
            known.Seen(email, now);
    }
}
