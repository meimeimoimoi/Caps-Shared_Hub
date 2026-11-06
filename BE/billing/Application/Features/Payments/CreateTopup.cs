using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Payments;

/// <summary>Starts buying the credit package <paramref name="PackageId"/>.</summary>
public sealed record CreateTopupCommand(Guid UserId, Guid PackageId);

/// <summary>
/// Saves the payment before calling the provider, so a notification can always find it. If the link cannot be
/// created the payment is marked FAILED and the error is returned.
/// </summary>
public sealed class CreateTopupHandler(
    ICreditPackageRepository packages,
    IPaymentTransactionRepository payments,
    IPaymentGateway gateway,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<CreateTopupCommand, TopupResponse>
{
    public async Task<TopupResponse> HandleAsync(CreateTopupCommand command, CancellationToken ct)
    {
        var package =
            await packages.FindAsync(command.PackageId, ct)
            ?? throw BillingErrors.CreditPackageNotFound();
        var now = clock.GetUtcNow();
        var orderCode = NewOrderCode(now);
        var payment = PaymentTransaction.StartTopup(command.UserId, package, orderCode, now);
        payments.Add(payment);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Two top-ups drew the same order code in the same millisecond
            throw BillingErrors.PaymentConflict();
        }

        var expiresAt = now + PaymentRules.LinkLifetime;
        PaymentLink link;
        try
        {
            link = await gateway.CreateLinkAsync(
                new PaymentLinkRequest(
                    orderCode,
                    payment.Amount,
                    PaymentRules.TopupDescription,
                    expiresAt
                ),
                ct
            );
        }
        catch
        {
            payment.MarkFailed();
            await unitOfWork.SaveChangesAsync(CancellationToken.None);
            throw;
        }
        return new TopupResponse(
            payment.Id.ToString(),
            orderCode,
            payment.Amount,
            link.CheckoutUrl,
            link.QrCode,
            expiresAt,
            link.Beneficiary?.BankBin,
            link.Beneficiary?.AccountNumber,
            link.Beneficiary?.AccountName,
            link.Beneficiary?.Description
        );
    }

    // PayOS needs a positive integer below 2^53 (JavaScript safe integer); milliseconds * 1000 stays below it
    // until the year 2255, and the unique index on order_code catches the rare same-millisecond clash.
    private static long NewOrderCode(DateTimeOffset now) =>
        (now.ToUnixTimeMilliseconds() * 1000) + Random.Shared.Next(1000);
}
