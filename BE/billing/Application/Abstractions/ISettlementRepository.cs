using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Settlements, one per review case; their payouts are saved with them.</summary>
public interface ISettlementRepository
{
    void Add(Settlement settlement);
}
