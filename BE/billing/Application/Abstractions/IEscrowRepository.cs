using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Escrows, one per review case.</summary>
public interface IEscrowRepository
{
    /// <summary>Tracked and row-locked (FOR UPDATE) until the transaction ends; take it before the user lock.</summary>
    Task<Escrow?> LockByReviewCaseAsync(Guid reviewCaseId, CancellationToken ct);

    void Add(Escrow escrow);

    /// <summary>How many escrows there are, for paging.</summary>
    Task<int> CountAsync(CancellationToken ct);

    /// <summary>One page of escrows, newest first, untracked.</summary>
    Task<IReadOnlyList<Escrow>> ListAsync(int skip, int take, CancellationToken ct);
}
