using System.Globalization;
using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>A transfer to an expert after settlement; bank details are copied at that moment.</summary>
public sealed class PayoutTransaction
{
    private PayoutTransaction() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid SettlementId { get; private set; }
    public Settlement Settlement { get; private set; } = default!;

    public string PayoutType { get; private set; } = default!;
    public Guid RecipientUserId { get; private set; }

    /// <summary>The expert's contact email from the review case, for notices; null when unknown.</summary>
    public string? RecipientEmail { get; private set; }
    public long Amount { get; private set; }
    public Guid? BankAccountId { get; private set; }
    public BankAccount? BankAccount { get; }
    public string? SnapBankBin { get; private set; }
    public string? SnapBankName { get; private set; }
    public string? SnapAccountLast4 { get; private set; }
    public string? SnapHolderName { get; private set; }
    public string Provider { get; } = PaymentProvider.PayOs;

    /// <summary>The provider's payout id of the current attempt; null until the provider accepted it.</summary>
    public string? ProviderRef { get; private set; }
    public string Status { get; private set; } = PayoutStatus.Pending;
    public int AttemptCount { get; private set; }
    public string? LastError { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }

    /// <summary>Why staff hold the payout for review (fraud, dispute, violation); null when it is not held.</summary>
    public string? HoldReason { get; private set; }
    public Guid? HeldBy { get; private set; }
    public DateTimeOffset? HeldAt { get; private set; }

    /// <summary>Staff must review a hold by then: no payout stays held indefinitely (advisor 2026-11-28).</summary>
    public DateTimeOffset? HoldReviewBy { get; private set; }

    /// <summary>When the last hold was lifted; the deadline restarts from then.</summary>
    public DateTimeOffset? ReleasedAt { get; private set; }

    /// <summary>What the transfer cost the platform (PayOS fee, borne by the platform); set once it succeeded.</summary>
    public long? TransferFee { get; private set; }

    private readonly List<PayoutStatusHistory> history = [];

    /// <summary>Status changes, added and never edited; only the rows loaded or added in this unit of work.</summary>
    public IReadOnlyList<PayoutStatusHistory> History => history;

    /// <summary>Calendar days a payout waits after settlement before it may be sent (agreed with the advisor).</summary>
    public const int HoldDays = 7;

    /// <summary>The first send and up to three retries; after that staff sort it out with the expert.</summary>
    public const int MaxAttempts = 4;

    /// <summary>The payout is created at settlement, so the hold runs from then, weekends and holidays included.</summary>
    public DateTimeOffset TransferableFrom => CreatedAt.AddDays(HoldDays);

    /// <summary>Every allowed attempt failed: no more retries to the same account.</summary>
    public bool AttemptsExhausted => Status == PayoutStatus.Failed && AttemptCount >= MaxAttempts;

    /// <summary>Working days staff have after the hold to send it (agreed with the advisor 2026-11-28).</summary>
    public const int DueWorkingDays = 2;
    public const int MaxHoldReviewDays = 30;
    public const int MinHoldReasonLength = 10;

    public bool IsHeld => HoldReason != null;

    /// <summary>
    /// When the payout could first be sent: the hold end, or later when the expert's account was verified after
    /// it, or when a hold was lifted after both; null while held or without a verified account, so the deadline
    /// waits (advisor 2026-11-28).
    /// </summary>
    public DateTimeOffset? ReadyAt
    {
        get
        {
            if (IsHeld || BankAccount is not { IsVerified: true, VerifiedAt: { } verifiedAt })
                return null;
            var ready = verifiedAt > TransferableFrom ? verifiedAt : TransferableFrom;
            return ReleasedAt is { } released && released > ready ? released : ready;
        }
    }

    /// <summary>The deadline: 2 working days after ReadyAt, at the same Vietnam clock time.</summary>
    public DateTimeOffset? DueAt(WorkCalendar calendar) =>
        ReadyAt is { } ready ? calendar.AddWorkingDays(ready, DueWorkingDays) : null;

    /// <summary>One working day before the deadline, when staff are reminded.</summary>
    public DateTimeOffset? RemindAt(WorkCalendar calendar) =>
        ReadyAt is { } ready ? calendar.AddWorkingDays(ready, DueWorkingDays - 1) : null;

    /// <summary>Not sent yet, or the last attempt failed: staff may (re)send it.</summary>
    public bool CanTransfer => Status is PayoutStatus.Pending or PayoutStatus.Failed;

    /// <summary>
    /// Reference and idempotency key of the current attempt: repeating one attempt never pays twice, a retry
    /// after a failure is a new transfer.
    /// </summary>
    public string Reference =>
        string.Create(CultureInfo.InvariantCulture, $"{Id:N}-{AttemptCount}");

    /// <summary>
    /// The expert's share of a settlement, waiting to be transferred. Without a bank account (the expert has
    /// no default one yet) the snapshot stays empty and is filled in when staff transfer it.
    /// </summary>
    public static PayoutTransaction ToExpert(
        Settlement settlement,
        Guid expertUserId,
        string? recipientEmail,
        BankAccount? account,
        DateTimeOffset now
    )
    {
        var payout = new PayoutTransaction
        {
            SettlementId = settlement.Id,
            Settlement = settlement,
            PayoutType = Domain.PayoutType.ExpertPayout,
            RecipientUserId = expertUserId,
            RecipientEmail = recipientEmail,
            Amount = settlement.ExpertPayoutAmount,
            CreatedAt = now,
            UpdatedAt = now,
        };
        if (account != null)
            payout.Snapshot(account);
        payout.Record(null, now);
        return payout;
    }

    /// <summary>Points a payout that is not being sent at another account of the recipient.</summary>
    public void UseAccount(BankAccount account, DateTimeOffset now)
    {
        if (!CanTransfer)
            throw BillingErrors.PayoutNotTransferable();
        if (account.UserId != RecipientUserId || account.IsDeleted)
            throw BillingErrors.PayoutNoBankAccount();
        Snapshot(account);
        UpdatedAt = now;
    }

    /// <summary>
    /// Opens a new attempt; it stays PROCESSING until the provider reports the outcome. Refused before the hold
    /// ends, and after MaxAttempts failures unless the money now goes to another account: a wrong account is
    /// fixed by the expert linking a new one, never by retrying.
    /// </summary>
    public void StartAttempt(Guid staffId, DateTimeOffset now, bool newAccount = false)
    {
        if (!CanTransfer)
            throw BillingErrors.PayoutNotTransferable();
        if (IsHeld)
        {
            throw BillingErrors.PayoutHeld(HoldReviewBy!.Value);
        }
        if (now < TransferableFrom)
        {
            throw BillingErrors.PayoutOnHold(TransferableFrom);
        }
        if (AttemptsExhausted && !newAccount)
        {
            throw BillingErrors.PayoutAttemptsExhausted(MaxAttempts);
        }
        if (BankAccountId == null)
            throw BillingErrors.PayoutNoBankAccount();
        AttemptCount++;
        Status = PayoutStatus.Processing;
        ProviderRef = null;
        LastError = null;
        UpdatedAt = now;
        Record(staffId, now);
    }

    /// <summary>Records what the provider reports for the current attempt; ignored once it is settled.</summary>
    public void Apply(
        string providerRef,
        string status,
        string? error,
        DateTimeOffset now,
        long feeOnSuccess = 0
    )
    {
        if (Status != PayoutStatus.Processing)
            return;
        var changed = status != Status || providerRef != ProviderRef;
        ProviderRef = providerRef;
        Status = status;
        LastError = status == PayoutStatus.Failed ? error ?? "FAILED" : null;
        if (status == PayoutStatus.Succeeded)
        {
            CompletedAt = now;
            TransferFee = feeOnSuccess;
        }
        UpdatedAt = now;
        if (changed)
        {
            Record(null, now);
        }
    }

    /// <summary>The provider refused the current attempt or never received it: staff may retry.</summary>
    public void Fail(string error, DateTimeOffset now)
    {
        if (Status != PayoutStatus.Processing)
            return;
        Status = PayoutStatus.Failed;
        LastError = error;
        UpdatedAt = now;
        Record(null, now);
    }

    /// <summary>
    /// Staff paid it by hand from the platform bank account (no PayOS payout channel). Passes the same checks as
    /// a PayOS attempt; the bank transaction id becomes ProviderRef, which is unique, so one bank transfer can
    /// never confirm two payouts.
    /// </summary>
    public void ConfirmManual(
        Guid staffId,
        string bankRef,
        long amount,
        DateTimeOffset transferredAt,
        long fee,
        DateTimeOffset now,
        bool newAccount = false
    )
    {
        if (amount != Amount)
            throw BillingErrors.PayoutAmountMismatch(Amount);
        if (transferredAt > now)
            throw BillingErrors.PayoutManualInvalid();
        StartAttempt(staffId, now, newAccount);
        ProviderRef = bankRef.Trim();
        Status = PayoutStatus.Succeeded;
        CompletedAt = transferredAt;
        TransferFee = fee;
        history.Add(PayoutStatusHistory.Of(this, staffId, now, null, $"MANUAL {ProviderRef}"));
    }

    /// <summary>Staff report that a manual transfer bounced; it uses up one attempt like a PayOS failure.</summary>
    public void FailManual(Guid staffId, string reason, DateTimeOffset now, bool newAccount = false)
    {
        StartAttempt(staffId, now, newAccount);
        Status = PayoutStatus.Failed;
        LastError = reason.Trim();
        Record(staffId, now);
    }

    private void Snapshot(BankAccount account)
    {
        BankAccountId = account.Id;
        SnapBankBin = account.BankBin;
        SnapBankName = account.BankName;
        SnapAccountLast4 = account.AccountLast4;
        SnapHolderName = account.AccountHolderName;
    }

    /// <summary>Staff hold an unsent payout for review, with a reason and a review deadline (1 to 30 days).</summary>
    public void Hold(Guid staffId, string? reason, int reviewDays, DateTimeOffset now)
    {
        if (!CanTransfer)
            throw BillingErrors.PayoutNotTransferable();
        var text = reason?.Trim();
        if (
            IsHeld
            || text is not { Length: >= MinHoldReasonLength }
            || reviewDays is < 1 or > MaxHoldReviewDays
        )
        {
            throw BillingErrors.PayoutHoldInvalid(MaxHoldReviewDays);
        }
        HoldReason = text;
        HeldBy = staffId;
        HeldAt = now;
        HoldReviewBy = now.AddDays(reviewDays);
        UpdatedAt = now;
        history.Add(PayoutStatusHistory.Of(this, staffId, now, "ON_HOLD", text));
    }

    /// <summary>Staff lift the hold after review; the payout can be sent and its deadline restarts.</summary>
    public void Release(Guid staffId, string? note, DateTimeOffset now)
    {
        if (!IsHeld)
            throw BillingErrors.PayoutNotHeld();
        HoldReason = null;
        HeldBy = null;
        HeldAt = null;
        HoldReviewBy = null;
        ReleasedAt = now;
        UpdatedAt = now;
        history.Add(PayoutStatusHistory.Of(this, staffId, now, "RELEASED", note?.Trim()));
    }

    private void Record(Guid? actorUserId, DateTimeOffset now) =>
        history.Add(PayoutStatusHistory.Of(this, actorUserId, now));
}

/// <summary>Kinds of payout.</summary>
public static class PayoutType
{
    public const string ExpertPayout = "EXPERT_PAYOUT";
}

/// <summary>Payout states: PENDING, then PROCESSING, then SUCCEEDED or FAILED (FAILED may be retried).</summary>
public static class PayoutStatus
{
    public const string Pending = "PENDING";
    public const string Processing = "PROCESSING";
    public const string Succeeded = "SUCCEEDED";
    public const string Failed = "FAILED";
}
