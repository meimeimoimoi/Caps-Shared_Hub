namespace Caps.Expert.Application.Common;

/// <summary>Keeps the known-reviewer copy current from the caller's access token.</summary>
public interface IKnownReviewerRecorder
{
    /// <summary>Adds or refreshes the reviewer; the caller saves the changes.</summary>
    Task RecordAsync(Guid userId, string? email, DateTimeOffset now, CancellationToken ct);
}
