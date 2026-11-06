using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Escrows, one per review case.</summary>
public interface IEscrowRepository
{
    /// <summary>Tracked and row-locked (FOR UPDATE) until the transaction ends; take it before the user lock.</summary>
    Task<Escrow?> LockByReviewCaseAsync(Guid reviewCaseId, CancellationToken ct);

    /// <summary>Escrows newest first, untracked; a null status means every status.</summary>
    Task<IReadOnlyList<Escrow>> ListAsync(string? status, int skip, int take, CancellationToken ct);

    Task<int> CountAsync(string? status, CancellationToken ct);

    void Add(Escrow escrow);
}
