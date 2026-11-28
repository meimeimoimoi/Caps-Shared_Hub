using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Payout and refund transfers, read newest first; a null status means every status.</summary>
public interface IPayoutRepository
{
    Task<IReadOnlyList<PayoutTransaction>> ListAsync(
        PayoutFilter filter,
        int skip,
        int take,
        CancellationToken ct,
        string sortBy = "due",
        bool descending = true
    );

    Task<int> CountAsync(PayoutFilter filter, CancellationToken ct);

    /// <summary>Tracked and locked (FOR UPDATE) until the transaction ends; null when it does not exist.</summary>
    Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct);

    /// <summary>Read-only with its history; null when it does not exist.</summary>
    Task<PayoutTransaction?> GetAsync(Guid id, CancellationToken ct);

    /// <summary>Whether a payout already carries this provider or bank transaction id.</summary>
    Task<bool> ProviderRefExistsAsync(string providerRef, CancellationToken ct);

    /// <summary>SUCCEEDED payouts completed in [paidFrom, paidTo), oldest first, read-only with settlement and history.</summary>
    Task<IReadOnlyList<PayoutTransaction>> ListPaidAsync(
        DateTimeOffset paidFrom,
        DateTimeOffset paidTo,
        CancellationToken ct
    );

    /// <summary>Every PENDING or FAILED payout with its account, read-only, for the daily reminders.</summary>
    Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct);

    /// <summary>The recipient's PENDING or FAILED payouts with their account, tracked for an update.</summary>
    Task<IReadOnlyList<PayoutTransaction>> ListUnsentForAsync(
        Guid recipientUserId,
        CancellationToken ct
    );
}
