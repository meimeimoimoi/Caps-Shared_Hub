using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Linked bank accounts; deleted ones are never returned.</summary>
public interface IBankAccountRepository
{
    /// <summary>Read-only list for display.</summary>
    Task<IReadOnlyList<BankAccount>> ListAsync(Guid userId, CancellationToken ct);

    /// <summary>Tracked list for a change; call after <see cref="IBillingUserLock.AcquireAsync"/>.</summary>
    Task<IReadOnlyList<BankAccount>> ListForUpdateAsync(Guid userId, CancellationToken ct);

    void Add(BankAccount account);

    /// <summary>Read-only account by id; null when unknown or deleted.</summary>
    Task<BankAccount?> FindAsync(Guid id, CancellationToken ct);

    /// <summary>Read-only staff review page, newest first; a null status means every status.</summary>
    Task<IReadOnlyList<BankAccount>> ListByStatusAsync(
        string? status,
        int skip,
        int take,
        CancellationToken ct
    );

    Task<int> CountByStatusAsync(string? status, CancellationToken ct);
}
