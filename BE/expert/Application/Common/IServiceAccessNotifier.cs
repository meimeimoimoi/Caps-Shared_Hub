using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Tells the expert that a System Admin changed whether they may offer a service.</summary>
public interface IServiceAccessNotifier
{
    /// <summary>Adds the message to the outbox; saved with the caller's unit of work. Profiles without an email are skipped.</summary>
    /// <param name="change">APPROVED, RETURNED_FOR_REVIEW, SUSPENDED or REINSTATED.</param>
    Task EnqueueAsync(
        ExpertServiceQualification qualification,
        QualificationEvent changed,
        string change,
        CancellationToken ct
    );
}
