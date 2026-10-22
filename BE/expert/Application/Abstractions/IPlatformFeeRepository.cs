using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Platform fee history; the current rate of a service is its latest effective row.</summary>
public interface IPlatformFeeRepository
{
    Task<PlatformFee?> FindCurrentAsync(string serviceCode, CancellationToken ct);
    Task<IReadOnlyList<PlatformFee>> ListCurrentAsync(CancellationToken ct);
    void Add(PlatformFee fee);
}
