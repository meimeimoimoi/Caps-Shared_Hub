using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Abstractions;

/// <summary>
/// Platform fee history; the rate in force of a service is its latest row that took effect and was not
/// cancelled, and a pending rate is one announced for a later day.
/// </summary>
public interface IPlatformFeeRepository
{
    Task<PlatformFee?> FindCurrentAsync(
        string serviceCode,
        DateTimeOffset now,
        CancellationToken ct
    );

    Task<IReadOnlyList<PlatformFee>> ListCurrentAsync(DateTimeOffset now, CancellationToken ct);

    /// <summary>Pending rates of the service, tracked for changes (normally at most one).</summary>
    Task<IReadOnlyList<PlatformFee>> ListPendingAsync(
        string serviceCode,
        DateTimeOffset now,
        CancellationToken ct
    );

    /// <summary>Pending rates of every service, untracked.</summary>
    Task<IReadOnlyList<PlatformFee>> ListAllPendingAsync(DateTimeOffset now, CancellationToken ct);

    void Add(PlatformFee fee);
}
