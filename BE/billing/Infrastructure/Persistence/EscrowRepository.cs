using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for escrows (unique per review case).</summary>
public sealed class EscrowRepository(BillingDbContext db) : IEscrowRepository
{
    public Task<Escrow?> LockByReviewCaseAsync(Guid reviewCaseId, CancellationToken ct) =>
        db
            .Escrows.FromSqlInterpolated(
                $"SELECT * FROM billing.escrow WHERE review_case_id = {reviewCaseId} FOR UPDATE"
            )
            .SingleOrDefaultAsync(ct);

    public void Add(Escrow escrow) => db.Escrows.Add(escrow);
}
