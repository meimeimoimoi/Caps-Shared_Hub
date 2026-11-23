using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.Features.Payments;
using Caps.Billing.Domain;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Buys credits; one VND buys one credit.</summary>
/// <param name="Amount">VND, from 10,000 to 50,000,000.</param>
public sealed record CreateTopupRequest(
    [Range(PaymentRules.MinTopupAmount, PaymentRules.MaxTopupAmount)] long Amount
)
{
    public CreateTopupCommand ToCommand(Guid userId) => new(userId, Amount);
}
