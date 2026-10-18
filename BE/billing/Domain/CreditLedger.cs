using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>Append-only movement of a credit wallet; the idempotency key stops the same movement twice.</summary>
public sealed class CreditLedger
{
    private CreditLedger() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid UserId { get; private set; }
    public string EntryType { get; private set; } = default!;

    /// <summary>Positive for credits, negative for debits.</summary>
    public long Amount { get; private set; }
    public long BalanceAfter { get; private set; }
    public string IdempotencyKey { get; private set; } = default!;
    public Guid? RefPaymentId { get; private set; }
    public PaymentTransaction? PaymentTransaction { get; }

    // Set by the AI usage and document flows, which are not built yet
    public Guid? RefAiUsageId { get; }
    public Guid? RefDocumentVersionId { get; }
    public string? Note { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>
    /// Credits bought through a payment. One entry per payment: the key is derived from the order code,
    /// so a repeated provider notification can never add the credits twice.
    /// </summary>
    public static CreditLedger Topup(
        CreditWallet wallet,
        PaymentTransaction payment,
        DateTimeOffset now
    ) =>
        new()
        {
            UserId = wallet.UserId,
            EntryType = LedgerEntryType.Topup,
            Amount = payment.Amount,
            BalanceAfter = wallet.Balance,
            IdempotencyKey = $"{payment.Provider.ToLowerInvariant()}:{payment.OrderCode}",
            RefPaymentId = payment.Id,
            Note = "Credit top-up",
            CreatedAt = now,
        };
}

/// <summary>Kinds of wallet movement.</summary>
public static class LedgerEntryType
{
    public const string Topup = "TOPUP";
}
