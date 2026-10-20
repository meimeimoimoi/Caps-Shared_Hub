using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for provider payments.</summary>
public sealed class PaymentTransactionRepository(BillingDbContext db)
    : IPaymentTransactionRepository
{
    public Task<PaymentTransaction?> LockByOrderCodeAsync(string orderCode, CancellationToken ct) =>
        db
            .PaymentTransactions.FromSqlInterpolated(
                $"SELECT * FROM billing.payment_transaction WHERE order_code = {orderCode} FOR UPDATE"
            )
            .SingleOrDefaultAsync(ct);

    public Task<PaymentTransaction?> FindAsync(Guid id, CancellationToken ct) =>
        db.PaymentTransactions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);

    public void Add(PaymentTransaction payment) => db.PaymentTransactions.Add(payment);
}
