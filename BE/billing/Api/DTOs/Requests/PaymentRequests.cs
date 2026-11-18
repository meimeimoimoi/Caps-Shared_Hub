using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.Features.Payments;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Buys a credit package; its price and credits are read on the server.</summary>
/// <param name="PackageId">A package that is on sale and has a price.</param>
public sealed record CreateTopupRequest([Required] Guid? PackageId)
{
    public CreateTopupCommand ToCommand(Guid userId) => new(userId, PackageId!.Value);
}
