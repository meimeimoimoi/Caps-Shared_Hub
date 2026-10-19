using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Platform fee history; the current rate of a service is its latest effective row.</summary>
public interface IPlatformFeeRepository
{
    Task<PlatformFee?> FindCurrentAsync(
        string serviceType,
        DateTimeOffset now,
        CancellationToken ct
    );
    Task<IReadOnlyList<PlatformFee>> ListCurrentAsync(DateTimeOffset now, CancellationToken ct);
    void Add(PlatformFee fee);
}
