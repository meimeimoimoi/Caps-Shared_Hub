using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.CreditPackages;

/// <summary>Lists credit packages; <paramref name="OnSaleOnly"/> is the buyer's view.</summary>
public sealed record ListCreditPackagesQuery(bool OnSaleOnly);

/// <summary>Packages in display order.</summary>
public sealed class ListCreditPackagesHandler(ICreditPackageRepository packages)
    : IQueryHandler<ListCreditPackagesQuery, CreditPackageResponse[]>
{
    public async Task<CreditPackageResponse[]> HandleAsync(
        ListCreditPackagesQuery query,
        CancellationToken ct
    )
    {
        var list = await packages.ListAsync(query.OnSaleOnly, ct);
        return list.Select(CreditPackageResponse.From).ToArray();
    }
}
