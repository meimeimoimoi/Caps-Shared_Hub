using System.Globalization;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Payments;

/// <summary>Reads one of the signed-in user's top-ups, for polling after showing its QR code.</summary>
public sealed record GetTopupStatusQuery(Guid UserId, Guid PaymentId);

/// <summary>
/// Another user's payment answers PAYMENT_NOT_FOUND, so ids of other payments are not revealed. While the top-up
/// has not succeeded, the provider is asked as well: its webhook may be late, lost, or unable to reach the
/// server (local development), and a paid order is credited here exactly as the webhook would.
/// </summary>
public sealed class GetTopupStatusHandler(
    IPaymentTransactionRepository payments,
    IPaymentGateway gateway,
    ITopupCrediting crediting
) : IQueryHandler<GetTopupStatusQuery, TopupStatusResponse>
{
    public async Task<TopupStatusResponse> HandleAsync(
        GetTopupStatusQuery query,
        CancellationToken ct
    )
    {
        var payment = await payments.FindAsync(query.PaymentId, ct);
        if (payment == null || payment.UserId != query.UserId)
            throw BillingErrors.PaymentNotFound();

        if (!payment.IsSucceeded && payment.Purpose == PaymentPurpose.CreditTopup)
        {
            var orderCode = long.Parse(payment.OrderCode, CultureInfo.InvariantCulture);
            try
            {
                var notice = await gateway.FindPaymentAsync(orderCode, ct);
                if (notice.Paid)
                {
                    await crediting.CreditAsync(notice, ct);
                    payment = await payments.FindAsync(query.PaymentId, ct) ?? payment;
                }
            }
            catch (AppException e) when (e.Type == ErrorType.Unavailable)
            {
                // Keep the stored status; the webhook or the next poll catches up
            }
        }

        return new TopupStatusResponse(
            payment.Id.ToString(),
            long.Parse(payment.OrderCode, CultureInfo.InvariantCulture),
            payment.Amount,
            payment.Status,
            payment.CreatedAt + PaymentRules.LinkLifetime,
            payment.PaidAt
        );
    }
}
