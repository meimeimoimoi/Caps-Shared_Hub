using Caps.Billing.Domain;

namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>Credits held for a review case.</summary>
/// <param name="CreatedAt">When the client paid and the credits were held.</param>
public sealed record EscrowResponse(
    string Id,
    string ReviewCaseId,
    string UserId,
    long Amount,
    string Status,
    DateTimeOffset UpdatedAt,
    DateTimeOffset CreatedAt
)
{
    public static EscrowResponse From(Escrow x) =>
        new(
            x.Id.ToString(),
            x.ReviewCaseId.ToString(),
            x.UserId.ToString(),
            x.Amount,
            x.Status,
            x.UpdatedAt,
            x.CreatedAt
        );
}

/// <summary>One page of escrows with the total count, for the staff list.</summary>
public sealed record EscrowPageResponse(EscrowResponse[] Items, int Page, int PageSize, int Total);

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
    public static SettlementResponse From(Settlement x, Escrow escrow, PayoutResponse? payout) =>
        new(
            x.Id.ToString(),
            EscrowResponse.From(escrow),
            x.Reason,
            x.UserRefundAmount,
            x.ExpertPayoutAmount,
            x.PlatformFeeAmount,
            x.SettledAt,
            payout
        );
}
