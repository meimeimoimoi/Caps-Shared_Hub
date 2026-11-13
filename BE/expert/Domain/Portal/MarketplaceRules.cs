using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Domain.Portal;

/// <summary>The facts that decide whether one Expert–Service can be listed and booked (BR-M01).</summary>
/// <param name="AccountActive">The expert's account is ACTIVE (kept in sync from auth events).</param>
/// <param name="ServiceActive">The catalog service is ACTIVE.</param>
/// <param name="PriceInEffect">An approved Pricing Version applies today.</param>
/// <param name="AcceptingRequests">The expert turned on new requests for this service.</param>
/// <param name="CapacitySet">The expert set how many cases they run at once (a full expert stays listed).</param>
public sealed record ListingFacts(
    string QualificationStatus,
    bool AccountActive,
    bool ServiceActive,
    bool PriceInEffect,
    bool AcceptingRequests,
    bool CapacitySet
);

/// <summary>Marketplace eligibility (BR-M01, POL-MKT-01).</summary>
public static class MarketplaceRules
{
    public static bool IsListed(ListingFacts f) =>
        f.QualificationStatus == QualificationStatus.ApprovedForService
        && f.AccountActive
        && f.ServiceActive
        && f.PriceInEffect
        && f.AcceptingRequests
        && f.CapacitySet;

    /// <summary>
    /// Why an approved service is not listed yet, in the order the expert fixes them: PRICING_PENDING,
    /// REQUESTS_TURNED_OFF, CAPACITY_NOT_SET or ACCOUNT_INACTIVE; empty when listed.
    /// </summary>
    public static string[] Missing(ListingFacts f)
    {
        if (!f.PriceInEffect)
            return ["PRICING_PENDING"];
        if (!f.AcceptingRequests)
            return ["REQUESTS_TURNED_OFF"];
        if (!f.CapacitySet)
            return ["CAPACITY_NOT_SET"];
        if (!f.AccountActive)
            return ["ACCOUNT_INACTIVE"];
        return [];
    }
}
