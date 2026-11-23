using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for settlements; payouts in the collection are inserted with them.</summary>
public sealed class SettlementRepository(BillingDbContext db) : ISettlementRepository
{
    public void Add(Settlement settlement) => db.Settlements.Add(settlement);
}
