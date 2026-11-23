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

    public Guid? RefAiUsageId { get; private set; }
    public Guid? RefDocumentVersionId { get; private set; }
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

    /// <summary>Credits moved from the balance to held for a review case.</summary>
    public static CreditLedger EscrowHold(CreditWallet wallet, Escrow escrow, DateTimeOffset now) =>
        ForEscrow(wallet, escrow, LedgerEntryType.EscrowHold, -escrow.Amount, "hold", now);

    /// <summary>
    /// Held credits paid out. The balance does not change (amount 0), but the movement is still recorded
    /// so every wallet change has its ledger entry.
    /// </summary>
    public static CreditLedger EscrowRelease(
        CreditWallet wallet,
        Escrow escrow,
        DateTimeOffset now
    ) => ForEscrow(wallet, escrow, LedgerEntryType.EscrowRelease, 0, "release", now);

    /// <summary>Held credits returned to the balance.</summary>
    public static CreditLedger EscrowRefund(
        CreditWallet wallet,
        Escrow escrow,
        DateTimeOffset now
    ) => ForEscrow(wallet, escrow, LedgerEntryType.EscrowRefund, escrow.Amount, "refund", now);

    /// <summary>Part of the held credits returned to the balance (a late delivery's refund).</summary>
    public static CreditLedger EscrowRefund(
        CreditWallet wallet,
        Escrow escrow,
        long amount,
        DateTimeOffset now
    ) => ForEscrow(wallet, escrow, LedgerEntryType.EscrowRefund, amount, "refund", now);

    // One entry per escrow and step: the key is derived from the review case
    private static CreditLedger ForEscrow(
        CreditWallet wallet,
        Escrow escrow,
        string entryType,
        long amount,
        string step,
        DateTimeOffset now
    ) =>
        new()
        {
            UserId = wallet.UserId,
            EntryType = entryType,
            Amount = amount,
            BalanceAfter = wallet.Balance,
            IdempotencyKey = $"escrow:{escrow.ReviewCaseId}:{step}",
            Note = $"Escrow {step} ({escrow.Amount} held for review case {escrow.ReviewCaseId})",
            CreatedAt = now,
        };

    public static string AiHoldKey(Guid aiUsageId) => $"ai:{aiUsageId}:hold";

    public static string AiCaptureKey(Guid aiUsageId) => $"ai:{aiUsageId}:capture";

    public static string AiReleaseKey(Guid aiUsageId) => $"ai:{aiUsageId}:release";

    /// <summary>Credits reserved from the spendable balance while an AI request is processed.</summary>
    public static CreditLedger AiHold(
        CreditWallet wallet,
        Guid aiUsageId,
        long amount,
        string? note,
        DateTimeOffset now
    ) =>
        ForAi(
            wallet,
            aiUsageId,
            documentVersionId: null,
            LedgerEntryType.Hold,
            -amount,
            "hold",
            amount,
            AiHoldKey(aiUsageId),
            note,
            now
        );

    /// <summary>Held AI credits captured after completion; the balance already changed at hold so Amount is 0.</summary>
    public static CreditLedger AiCapture(
        CreditWallet wallet,
        Guid aiUsageId,
        Guid? documentVersionId,
        long amount,
        string? note,
        DateTimeOffset now
    ) =>
        ForAi(
            wallet,
            aiUsageId,
            documentVersionId,
            LedgerEntryType.Capture,
            0,
            "capture",
            amount,
            AiCaptureKey(aiUsageId),
            note,
            now
        );

    /// <summary>Held AI credits returned to the spendable balance when the AI request is released.</summary>
    public static CreditLedger AiRelease(
        CreditWallet wallet,
        Guid aiUsageId,
        long amount,
        string? note,
        DateTimeOffset now
    ) =>
        ForAi(
            wallet,
            aiUsageId,
            documentVersionId: null,
            LedgerEntryType.Release,
            amount,
            "release",
            amount,
            AiReleaseKey(aiUsageId),
            note,
            now
        );

    private static CreditLedger ForAi(
        CreditWallet wallet,
        Guid aiUsageId,
        Guid? documentVersionId,
        string entryType,
        long amount,
        string step,
        long heldAmount,
        string idempotencyKey,
        string? note,
        DateTimeOffset now
    )
    {
        if (heldAmount <= 0)
        {
            throw BillingErrors.InvalidAmount();
        }

        return new()
        {
            UserId = wallet.UserId,
            EntryType = entryType,
            Amount = amount,
            BalanceAfter = wallet.Balance,
            IdempotencyKey = idempotencyKey,
            RefAiUsageId = aiUsageId,
            RefDocumentVersionId = documentVersionId,
            Note = string.IsNullOrWhiteSpace(note)
                ? $"AI credit {step} ({heldAmount} for usage {aiUsageId})"
                : note.Trim(),
            CreatedAt = now,
        };
    }
}

/// <summary>Kinds of wallet movement.</summary>
public static class LedgerEntryType
{
    public const string Topup = "TOPUP";
    public const string Hold = "HOLD";
    public const string Capture = "CAPTURE";
    public const string Release = "RELEASE";
    public const string EscrowHold = "ESCROW_HOLD";
    public const string EscrowRelease = "ESCROW_RELEASE";
    public const string EscrowRefund = "ESCROW_REFUND";
}
