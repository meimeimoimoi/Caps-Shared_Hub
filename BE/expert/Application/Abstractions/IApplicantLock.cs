namespace Caps.Expert.Application.Abstractions;

/// <summary>
/// Serializes changes of one applicant (save draft, upload, submit) inside the current transaction,
/// including the very first save when no row exists yet to lock.
/// </summary>
public interface IApplicantLock
{
    Task AcquireAsync(Guid userId, CancellationToken ct);
}
