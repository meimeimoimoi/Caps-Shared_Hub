using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Payments;

/// <summary>Reads one of the signed-in user's top-ups, for polling after showing its QR code.</summary>
public sealed record GetTopupStatusQuery(Guid UserId, Guid PaymentId);

/// <summary>Another user's payment answers PAYMENT_NOT_FOUND, so ids of other payments are not revealed.</summary>
public sealed class GetTopupStatusHandler(IPaymentTransactionRepository payments)
    : IQueryHandler<GetTopupStatusQuery, TopupStatusResponse>
{
    public async Task<TopupStatusResponse> HandleAsync(
        GetTopupStatusQuery query,
        CancellationToken ct
    )
    {
        var payment = await payments.FindAsync(query.PaymentId, ct);
        if (payment == null || payment.UserId != query.UserId)
            throw BillingErrors.PaymentNotFound();
        return new TopupStatusResponse(
            payment.Id.ToString(),
            long.Parse(payment.OrderCode, System.Globalization.CultureInfo.InvariantCulture),
            payment.Amount,
            payment.Status,
            payment.CreatedAt + PaymentRules.LinkLifetime,
            payment.PaidAt
        );
    }
}
