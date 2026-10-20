using Caps.Billing.Domain;

namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>Credits held for a review case.</summary>
public sealed record EscrowResponse(
    string Id,
    string ReviewCaseId,
    string UserId,
    long Amount,
    string Status,
    DateTimeOffset UpdatedAt
)
{
    public static EscrowResponse From(Escrow x) =>
        new(
            x.Id.ToString(),
            x.ReviewCaseId.ToString(),
            x.UserId.ToString(),
            x.Amount,
            x.Status,
            x.UpdatedAt
        );
}

/// <summary>How a closed escrow was split; <paramref name="Payout"/> is the expert's transfer, if any.</summary>
public sealed record SettlementResponse(
    string Id,
    EscrowResponse Escrow,
    string Reason,
    long UserRefundAmount,
    long ExpertPayoutAmount,
    long PlatformFeeAmount,
    DateTimeOffset SettledAt,
    PayoutResponse? Payout
)
{
    public static SettlementResponse From(Settlement x, Escrow escrow, PayoutTransaction? payout) =>
        new(
            x.Id.ToString(),
            EscrowResponse.From(escrow),
            x.Reason,
            x.UserRefundAmount,
            x.ExpertPayoutAmount,
            x.PlatformFeeAmount,
            x.SettledAt,
            payout == null ? null : PayoutResponse.From(payout)
        );
}
