using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Payout and refund transfers, read newest first; a null status means every status.</summary>
public interface IPayoutRepository
{
    Task<IReadOnlyList<PayoutTransaction>> ListAsync(
        string? status,
        int skip,
        int take,
        CancellationToken ct
    );

    Task<int> CountAsync(string? status, CancellationToken ct);
}
