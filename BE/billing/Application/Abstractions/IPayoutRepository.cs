using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Payout and refund transfers, read newest first; a null status means every status.</summary>
public interface IPayoutRepository
{
    Task<IReadOnlyList<PayoutTransaction>> ListAsync(
        string? status,
        int skip,
        int take,
        CancellationToken ct,
        string sortBy = "createdAt",
        bool descending = true
    );

    Task<int> CountAsync(string? status, CancellationToken ct);

    /// <summary>Tracked and locked (FOR UPDATE) until the transaction ends; null when it does not exist.</summary>
    Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct);

    /// <summary>Every PENDING or FAILED payout with its account, read-only, for the daily reminders.</summary>
    Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct);

    /// <summary>The recipient's PENDING or FAILED payouts with their account, tracked for an update.</summary>
    Task<IReadOnlyList<PayoutTransaction>> ListUnsentForAsync(
        Guid recipientUserId,
        CancellationToken ct
    );
}
