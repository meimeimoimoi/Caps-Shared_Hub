using System.Globalization;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Payouts;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

public sealed class PayoutTransferTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 26, 9, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Staff = Guid.NewGuid();

    [Fact]
    public async Task An_accepted_transfer_is_committed_as_processing_before_payos_is_called()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);

        var result = await store.Transfer();

        var order = Assert.Single(store.Gateway.Orders);
        Assert.Equal(PayoutStatus.Processing, store.StatusAtSubmit);
        Assert.Equal(1, store.CommitsAtSubmit);
        Assert.Equal($"{store.Payout.Id:N}-1", order.Reference);
        Assert.Equal(
            ("970422", "0123456789", 450_000L),
            (order.BankBin, order.AccountNumber, order.Amount)
        );
        Assert.Equal(
            ("PROCESSING", "po_1", 1),
            (result.Status, result.ProviderRef, result.AttemptCount)
        );
    }

    [Fact]
    public async Task A_refused_transfer_fails_and_a_retry_is_a_new_reference()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(null, "429: Vượt quá hạn mức");

        var failed = await store.Transfer();
        Assert.Equal(("FAILED", "429: Vượt quá hạn mức"), (failed.Status, failed.LastError));

        store.Gateway.Next = new(new("po_2", PayoutStatus.Succeeded, null), null);
        var paid = await store.Transfer();

        Assert.Equal($"{store.Payout.Id:N}-2", store.Gateway.Orders[1].Reference);
        Assert.Equal(("SUCCEEDED", null, 2), (paid.Status, paid.LastError, paid.AttemptCount));
        Assert.Equal(Now, paid.CompletedAt);
    }

    [Fact]
    public async Task A_processing_or_paid_payout_cannot_be_sent_again()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);
        await store.Transfer();

        var error = await Assert.ThrowsAsync<AppException>(store.Transfer);

        Assert.Equal("PAYOUT_NOT_TRANSFERABLE", error.Code);
        Assert.Single(store.Gateway.Orders);
    }

    [Fact]
    public async Task A_payout_without_an_account_takes_the_current_default_or_is_refused()
    {
        var other = Account(isDefault: false, last4: "1111");
        var fallback = Account(isDefault: true, last4: "2222");
        var store = new Store(null, other, fallback);
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);

        await store.Transfer();
        Assert.Equal(fallback.Id, store.Payout.BankAccountId);
        Assert.Equal("2222", store.Payout.SnapAccountLast4);

        var empty = new Store(null);
        Assert.Equal(
            "PAYOUT_NO_BANK_ACCOUNT",
            (await Assert.ThrowsAsync<AppException>(empty.Transfer)).Code
        );
        Assert.Equal(PayoutStatus.Pending, empty.Payout.Status);
    }

    [Fact]
    public async Task Money_only_goes_to_a_verified_account()
    {
        var unverified = new Store(Account(isDefault: true, verified: false));
        Assert.Equal(
            "PAYOUT_ACCOUNT_NOT_VERIFIED",
            (await Assert.ThrowsAsync<AppException>(unverified.Transfer)).Code
        );
        Assert.Equal(PayoutStatus.Pending, unverified.Payout.Status);
        Assert.Empty(unverified.Gateway.Orders);

        // The snapshot account is still unverified, but the expert's new default is verified
        var fallback = Account(isDefault: true, last4: "2222");
        var store = new Store(Account(isDefault: false, verified: false), fallback);
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);

        await store.Transfer();

        Assert.Equal(fallback.Id, store.Payout.BankAccountId);
    }

    [Fact]
    public async Task A_lost_answer_stays_processing_until_payos_reports_or_never_received_it()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Throw = true;
        await Assert.ThrowsAsync<AppException>(store.Transfer);
        Assert.Equal(PayoutStatus.Processing, store.Payout.Status);

        // Not found yet, but PayOS may still be receiving it
        store.Gateway.Throw = false;
        store.Gateway.Found = null;
        store.Clock.Now = Now.AddMinutes(2);
        Assert.Equal("PROCESSING", (await store.Refresh()).Status);
        Assert.Equal(store.Payout.Reference, store.Gateway.LookedUp);

        store.Clock.Now = Now.AddMinutes(10);
        var failed = await store.Refresh();
        Assert.Equal(("FAILED", "NOT_RECEIVED"), (failed.Status, failed.LastError));
    }

    [Fact]
    public async Task Refresh_applies_the_reported_outcome_once()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);
        await store.Transfer();

        store.Gateway.Found = new("po_1", PayoutStatus.Failed, "Tài khoản không tồn tại");
        var failed = await store.Refresh();
        Assert.Equal(("FAILED", "Tài khoản không tồn tại"), (failed.Status, failed.LastError));

        store.Gateway.Found = new("po_1", PayoutStatus.Succeeded, null);
        Assert.Equal("FAILED", (await store.Refresh()).Status);
    }

    [Fact]
    public async Task Nothing_is_started_when_the_payout_keys_are_missing()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Available = false;

        Assert.Equal(
            "PAYMENT_UNAVAILABLE",
            (await Assert.ThrowsAsync<AppException>(store.Transfer)).Code
        );
        Assert.Equal(PayoutStatus.Pending, store.Payout.Status);
    }

    // Audit trail: every status change is added once, with who started the attempt and to which account
    [Fact]
    public async Task Each_status_change_is_kept_with_who_sent_it_and_where()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);
        await store.Transfer();
        store.Gateway.Found = new("po_1", PayoutStatus.Processing, null);
        await store.Refresh();
        store.Gateway.Found = new("po_1", PayoutStatus.Succeeded, null);

        var paid = await store.Refresh();

        Assert.Equal(
            [
                ("PENDING", 0, (string?)null, (string?)null),
                ("PROCESSING", 1, Staff.ToString(), (string?)null),
                ("PROCESSING", 1, null, "po_1"),
                ("SUCCEEDED", 1, null, "po_1"),
            ],
            paid.History.Select(h => (h.Status, h.AttemptNo, h.ActorUserId, h.Note))
        );
        Assert.All(paid.History.Skip(1), h => Assert.Equal("6789", h.AccountLast4));
    }

    // Staff have 2 working days after the hold; reminded 1 working day before (advisor 2026-11-28)
    [Theory]
    // Settled Saturday 28/11 10:00: hold ends Saturday 05/12, reminder Monday 07/12, deadline Tuesday 08/12
    [InlineData(
        "2026-11-28T10:00:00+07:00",
        "2026-12-07T10:00:00+07:00",
        "2026-12-08T10:00:00+07:00"
    )]
    // Hold ends Tuesday 01/09: 02/09 is a public holiday, so reminder Thursday 03/09 and deadline Friday 04/09
    [InlineData(
        "2026-08-25T10:00:00+07:00",
        "2026-09-03T10:00:00+07:00",
        "2026-09-04T10:00:00+07:00"
    )]
    public void The_deadline_counts_working_days_after_the_hold(
        string settled,
        string remind,
        string due
    )
    {
        var at = DateTimeOffset.Parse(settled, CultureInfo.InvariantCulture);
        var escrow = Escrow.Hold(Guid.NewGuid(), Guid.NewGuid(), 500_000, at);
        // The account was verified before settlement, so the deadline runs from the hold end
        var account = PayoutTestAccounts.Account(Expert, at.AddDays(-30), verified: true);
        var payout = PayoutTransaction
            .ToExpert(Settlement.ForRelease(escrow, 10, at), Expert, null, account, at)
            .WithAccount(account);
        var calendar = new WorkCalendar(["09-02"]);

        Assert.Equal(
            DateTimeOffset.Parse(remind, CultureInfo.InvariantCulture),
            payout.RemindAt(calendar)
        );
        Assert.Equal(
            DateTimeOffset.Parse(due, CultureInfo.InvariantCulture),
            payout.DueAt(calendar)
        );
    }

    // The expert hears of a payout once per change that matters: paid, failed, or a new account needed
    [Fact]
    public async Task The_expert_is_told_once_per_outcome()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);
        await store.Transfer();
        store.Gateway.Found = new("po_1", PayoutStatus.Processing, null);
        await store.Refresh();
        store.Gateway.Found = new("po_1", PayoutStatus.Succeeded, null);
        await store.Refresh();
        await store.Refresh();

        var paid = Assert.Single(store.Outbox.Sent);
        Assert.Equal(
            ("SUCCEEDED", store.Payout.Id, 450_000L),
            (paid.Change, paid.PayoutId, paid.Amount)
        );

        var failing = new Store(Account(isDefault: true));
        failing.Gateway.Next = new(null, "Sai số tài khoản");
        for (var i = 0; i < PayoutTransaction.MaxAttempts; i++)
            await failing.Transfer();

        Assert.Equal(
            ["FAILED", "FAILED", "FAILED", "ACCOUNT_NEEDED"],
            failing.Outbox.Sent.Select(x => x.Change)
        );
    }

    // Advisor 2026-11-28: check the payout balance first; a shortfall does not use up a retry
    [Fact]
    public async Task A_short_balance_is_refused_without_using_an_attempt()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Balance = 100_000;

        var error = await Assert.ThrowsAsync<AppException>(store.Transfer);

        Assert.Equal("PAYOUT_INSUFFICIENT_BALANCE", error.Code);
        Assert.Equal((PayoutStatus.Pending, 0), (store.Payout.Status, store.Payout.AttemptCount));
        Assert.Empty(store.Gateway.Orders);

        // An unknown balance does not block: PayOS refuses a real shortfall itself
        store.Gateway.Balance = null;
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);
        Assert.Equal("PROCESSING", (await store.Transfer()).Status);
    }

    // Advisor 2026-11-28: a hold needs a reason and a review date, and the payout cannot be sent while held
    [Fact]
    public async Task A_held_payout_cannot_be_sent_until_released()
    {
        var store = new Store(Account(isDefault: true));
        Assert.Equal(
            "PAYOUT_HOLD_INVALID",
            Assert
                .Throws<AppException>(() => store.Payout.Hold(Guid.NewGuid(), "nghi ngo", 7, Now))
                .Code
        );
        await store.Hold(release: false, "Nghi dùng tài khoản của người khác");

        var error = await Assert.ThrowsAsync<AppException>(store.Transfer);
        Assert.Equal("PAYOUT_HELD", error.Code);
        Assert.Empty(store.Gateway.Orders);

        await store.Hold(release: true, "Đã xác minh chủ tài khoản");
        store.Gateway.Next = new(new("po_1", PayoutStatus.Succeeded, null), null);
        var paid = await store.Transfer();

        // The platform pays the transfer fee; the history keeps who held and released it, and why
        Assert.Equal(("SUCCEEDED", 3_300L, 450_000L), (paid.Status, paid.TransferFee, paid.Amount));
        var hold = Assert.Single(paid.History, h => h.Status == "ON_HOLD");
        Assert.Equal("Nghi dùng tài khoản của người khác", hold.Note);
        Assert.Single(paid.History, h => h.Status == "RELEASED");
        Assert.Equal(["HELD", "RELEASED", "SUCCEEDED"], store.Outbox.Sent.Select(x => x.Change));
    }

    // Held for 7 calendar days after settlement (agreed with the advisor on 2026-11-28)
    [Fact]
    public async Task A_payout_cannot_be_sent_before_the_hold_ends()
    {
        var store = new Store(Account(isDefault: true));
        store.Clock.Now = store.Payout.TransferableFrom.AddMinutes(-1);

        var error = await Assert.ThrowsAsync<AppException>(store.Transfer);

        Assert.Equal("PAYOUT_ON_HOLD", error.Code);
        Assert.Equal(PayoutStatus.Pending, store.Payout.Status);
        Assert.Empty(store.Gateway.Orders);
    }

    // The first send and three retries; after that only another verified account is tried
    [Fact]
    public async Task After_the_last_failed_attempt_only_a_new_account_is_tried()
    {
        var first = Account(isDefault: true);
        var store = new Store(first);
        store.Gateway.Next = new(null, "Sai số tài khoản");
        for (var i = 0; i < PayoutTransaction.MaxAttempts; i++)
            await store.Transfer();

        var error = await Assert.ThrowsAsync<AppException>(store.Transfer);
        Assert.Equal("PAYOUT_ATTEMPTS_EXHAUSTED", error.Code);
        Assert.True(PayoutResponse.From(store.Payout, WorkCalendar.WeekendsOnly).AttemptsExhausted);
        Assert.Equal(PayoutTransaction.MaxAttempts, store.Gateway.Orders.Count);

        // The expert removes the wrong account and links a new one, which staff verify
        first.Delete(Now);
        var second = Account(isDefault: true, last4: "2222");
        store.Add(second);
        store.Gateway.Next = new(new("po_5", PayoutStatus.Processing, null), null);

        var sent = await store.Transfer();

        Assert.Equal(("PROCESSING", "2222"), (sent.Status, sent.AccountLast4));
        Assert.Equal(second.Id, store.Payout.BankAccountId);
    }

    private static BankAccount Account(bool isDefault, string last4 = "6789", bool verified = true)
    {
        var account = BankAccount.Register(
            Expert,
            new("970422", "Vietcombank", "NGUYEN VAN A"),
            new("enc:0123456789", "hash-" + last4, last4),
            isDefault,
            Now
        );
        if (verified)
            account.Verify(Guid.NewGuid(), Now);
        return account;
    }

    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = PayoutTransferTests.Now;

        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Gateway : IPayoutGateway
    {
        public bool Available { get; set; } = true;
        public bool Throw { get; set; }
        public PayoutSubmission Next { get; set; } = new(null, "unset");
        public PayoutReport? Found { get; set; }
        public long? Balance { get; set; }

        public Task<long?> GetBalanceAsync(CancellationToken ct) => Task.FromResult(Balance);

        public string? LookedUp { get; private set; }
        public List<PayoutOrder> Orders { get; } = [];
        public Action? OnSubmit { get; set; }

        public bool IsAvailable => Available;

        public Task<PayoutSubmission> SubmitAsync(PayoutOrder order, CancellationToken ct)
        {
            OnSubmit?.Invoke();
            Orders.Add(order);
            return Throw ? throw BillingErrors.PaymentUnavailable() : Task.FromResult(Next);
        }

        public Task<PayoutReport?> FindAsync(
            string? providerRef,
            string reference,
            CancellationToken ct
        )
        {
            LookedUp = reference;
            return Task.FromResult(Found);
        }
    }

    [Fact]
    public async Task Manual_info_reveals_the_verified_account_and_a_matchable_description()
    {
        var store = new Store(Account(isDefault: true));

        var info = await store.ManualInfo();

        Assert.Equal(
            ("970422", "0123456789", 450_000L),
            (info.BankBin, info.AccountNumber, info.Amount)
        );
        Assert.Equal($"CAPS {store.Payout.Id:N}", info.Description);
        Assert.Equal(PayoutStatus.Pending, store.Payout.Status);
    }

    [Fact]
    public async Task A_confirmed_manual_transfer_is_paid_with_fee_ref_and_the_confirming_staff()
    {
        var store = new Store(Account(isDefault: true)) { Gateway = { Available = false } };
        var sentAt = Now.AddHours(-1);

        var paid = await store.ConfirmManual(" FT2611ABC ", 450_000, sentAt);

        Assert.Equal(
            ("SUCCEEDED", "FT2611ABC", 1, sentAt, 3_300L),
            (paid.Status, paid.ProviderRef, paid.AttemptCount, paid.CompletedAt, paid.TransferFee)
        );
        Assert.Equal(Staff, store.Payout.History[^1].ActorUserId);
        Assert.Equal("SUCCEEDED", Assert.Single(store.Outbox.Sent).Change);
        Assert.Equal(
            "PAYOUT_NOT_TRANSFERABLE",
            (
                await Assert.ThrowsAsync<AppException>(() =>
                    store.ConfirmManual("FT2", 450_000, sentAt)
                )
            ).Code
        );
    }

    [Fact]
    public async Task A_manual_confirmation_is_refused_on_a_wrong_amount_used_ref_or_live_channel()
    {
        var store = new Store(Account(isDefault: true)) { Gateway = { Available = false } };
        store.UsedRefs.Add("FT_USED");

        async Task<string> Code(Func<Task> act) =>
            (await Assert.ThrowsAsync<AppException>(act)).Code;

        Assert.Equal(
            "PAYOUT_AMOUNT_MISMATCH",
            await Code(() => store.ConfirmManual("FT1", 450_001, Now))
        );
        Assert.Equal(
            "PAYOUT_BANK_REF_USED",
            await Code(() => store.ConfirmManual("FT_USED", 450_000, Now))
        );
        Assert.Equal(
            "PAYOUT_MANUAL_INVALID",
            await Code(() => store.ConfirmManual("FT1", 450_000, Now.AddHours(1)))
        );
        store.Gateway.Available = true;
        Assert.Equal(
            "PAYOUT_CHANNEL_AVAILABLE",
            await Code(() => store.ConfirmManual("FT1", 450_000, Now))
        );
        Assert.Equal((PayoutStatus.Pending, 0), (store.Payout.Status, store.Payout.AttemptCount));
    }

    [Fact]
    public async Task A_manual_transfer_waits_for_the_hold_period_like_payos()
    {
        var store = new Store(Account(isDefault: true)) { Gateway = { Available = false } };
        store.Clock.Now = Now.AddDays(-1);

        var error = await Assert.ThrowsAsync<AppException>(() =>
            store.ConfirmManual("FT1", 450_000, store.Clock.Now)
        );

        Assert.Equal("PAYOUT_ON_HOLD", error.Code);
    }

    [Fact]
    public async Task Each_reported_manual_failure_uses_an_attempt_until_another_account_is_needed()
    {
        var store = new Store(Account(isDefault: true)) { Gateway = { Available = false } };

        for (var i = 0; i < PayoutTransaction.MaxAttempts; i++)
        {
            var failed = await store.FailManual("Sai tên chủ tài khoản");
            Assert.Equal(("FAILED", i + 1), (failed.Status, failed.AttemptCount));
        }

        Assert.True(store.Payout.AttemptsExhausted);
        Assert.Equal(
            "PAYOUT_ATTEMPTS_EXHAUSTED",
            (await Assert.ThrowsAsync<AppException>(() => store.FailManual("again"))).Code
        );
    }

    [Fact]
    public async Task The_export_lists_paid_payouts_in_range_with_ref_fee_vietnam_time_and_confirmer()
    {
        var store = new Store(Account(isDefault: true)) { Gateway = { Available = false } };
        var sentAt = new DateTimeOffset(2026, 11, 26, 2, 30, 0, TimeSpan.Zero);
        await store.ConfirmManual("FT2611ABC", 450_000, sentAt);

        var csv = await store.Export(Now.AddDays(-1), Now.AddDays(1));

        Assert.StartsWith("\uFEFFpayout_id,case_id,", csv);
        var lines = csv.Split(Crlf);
        var row = lines[1].Split(',');
        Assert.Equal(store.Payout.Id.ToString(), row[0]);
        Assert.Equal(store.Payout.Settlement.ReviewCaseId.ToString(), row[1]);
        Assert.Equal(
            ("450000", "3300", "FT2611ABC", "2026-11-26 09:30:00", Staff.ToString()),
            (row[6], row[7], row[8], row[9], row[10])
        );
        // Header, one row, then the empty tail after the last line break
        Assert.Equal(3, lines.Length);
        Assert.Equal(2, (await store.Export(Now.AddDays(1), Now.AddDays(2))).Split(Crlf).Length);
    }

    private const string Crlf = "\r\n";

    [Theory]
    [InlineData("=HYPERLINK(1)", "'=HYPERLINK(1)")]
    [InlineData("Nguyen, Van \"A\"", "\"Nguyen, Van \"\"A\"\"\"")]
    [InlineData("VCB", "VCB")]
    public void Csv_cells_are_quoted_and_formulas_defused(string value, string expected) =>
        Assert.Equal(expected, ExportPaidPayoutsHandler.Cell(value));

    [Fact]
    public async Task The_export_range_must_be_forward_and_at_most_a_year()
    {
        var store = new Store(Account(isDefault: true));
        foreach (var (from, to) in new[] { (Now, Now), (Now, Now.AddDays(367)) })
        {
            var error = await Assert.ThrowsAsync<AppException>(() => store.Export(from, to));
            Assert.Equal("PAYOUT_EXPORT_RANGE_INVALID", error.Code);
        }
    }

    private static async Task<string> CodeOf(Func<Task> act) =>
        (await Assert.ThrowsAsync<AppException>(act)).Code;

    [Fact]
    public async Task A_held_payout_cannot_be_confirmed_or_failed_by_hand()
    {
        var store = new Store(Account(isDefault: true)) { Gateway = { Available = false } };
        await store.Hold(false, "Nghi ngờ gian lận, cần xác minh");

        Assert.Equal("PAYOUT_HELD", await CodeOf(() => store.ConfirmManual("FT1", 450_000, Now)));
        Assert.Equal("PAYOUT_HELD", await CodeOf(() => store.FailManual("Sai tên")));
        Assert.Equal((PayoutStatus.Pending, 0), (store.Payout.Status, store.Payout.AttemptCount));
    }

    [Fact]
    public async Task Manual_transfers_need_a_verified_account()
    {
        var unverified = new Store(Account(isDefault: true, verified: false))
        {
            Gateway = { Available = false },
        };
        Assert.Equal("PAYOUT_ACCOUNT_NOT_VERIFIED", await CodeOf(unverified.ManualInfo));
        Assert.Equal(
            "PAYOUT_ACCOUNT_NOT_VERIFIED",
            await CodeOf(() => unverified.ConfirmManual("FT1", 450_000, Now))
        );
        Assert.Equal(
            "PAYOUT_ACCOUNT_NOT_VERIFIED",
            await CodeOf(() => unverified.FailManual("Sai tên"))
        );

        var none = new Store(null) { Gateway = { Available = false } };
        Assert.Equal("PAYOUT_NO_BANK_ACCOUNT", await CodeOf(none.ManualInfo));
        Assert.Equal(
            "PAYOUT_NO_BANK_ACCOUNT",
            await CodeOf(() => none.ConfirmManual("FT1", 450_000, Now))
        );
        Assert.Equal((PayoutStatus.Pending, 0), (none.Payout.Status, none.Payout.AttemptCount));
    }

    [Fact]
    public async Task An_unknown_payout_is_not_found_for_every_manual_action()
    {
        var store = new Store(Account(isDefault: true)) { Gateway = { Available = false } };
        var missing = Guid.NewGuid();

        Assert.Equal(
            "PAYOUT_NOT_FOUND",
            await CodeOf(() =>
                new GetPayoutTransferInfoHandler(store, store, store).HandleAsync(
                    new(missing),
                    default
                )
            )
        );
        Assert.Equal(
            "PAYOUT_NOT_FOUND",
            await CodeOf(() =>
                new ConfirmManualPayoutHandler(
                    store,
                    store,
                    store.Gateway,
                    store,
                    store.Clock,
                    WorkCalendar.WeekendsOnly,
                    store.Outbox,
                    store.Fees
                ).HandleAsync(new(missing, Staff, "FT1", 450_000, Now), default)
            )
        );
        Assert.Equal(
            "PAYOUT_NOT_FOUND",
            await CodeOf(() =>
                new FailManualPayoutHandler(
                    store,
                    store,
                    store.Gateway,
                    store,
                    store.Clock,
                    WorkCalendar.WeekendsOnly,
                    store.Outbox
                ).HandleAsync(new(missing, Staff, "Sai tên"), default)
            )
        );
    }

    [Fact]
    public async Task A_failure_cannot_be_reported_while_payos_is_live_or_after_payment()
    {
        var live = new Store(Account(isDefault: true));
        Assert.Equal("PAYOUT_CHANNEL_AVAILABLE", await CodeOf(() => live.FailManual("Sai tên")));
        Assert.Equal(0, live.Payout.AttemptCount);

        var paid = new Store(Account(isDefault: true)) { Gateway = { Available = false } };
        await paid.ConfirmManual("FT1", 450_000, Now);
        Assert.Equal("PAYOUT_NOT_TRANSFERABLE", await CodeOf(() => paid.FailManual("Sai tên")));
        Assert.Equal(PayoutStatus.Succeeded, paid.Payout.Status);
        Assert.Equal("PAYOUT_NOT_TRANSFERABLE", await CodeOf(paid.ManualInfo));
    }

    [Fact]
    public async Task After_all_attempts_fail_a_new_verified_account_can_be_paid_by_hand()
    {
        var old = Account(isDefault: true, last4: "1111");
        var store = new Store(old) { Gateway = { Available = false } };
        for (var i = 0; i < PayoutTransaction.MaxAttempts; i++)
            await store.FailManual("Sai tên chủ tài khoản");
        Assert.True(store.Payout.AttemptsExhausted);

        // The expert removes the wrong account and links a new one that staff verify
        old.Delete(Now);
        store.Add(Account(isDefault: true, last4: "2222"));

        var info = await store.ManualInfo();
        Assert.Equal("Vietcombank", info.BankName);
        var paid = await store.ConfirmManual("FT_NEW", 450_000, Now);

        Assert.Equal(("SUCCEEDED", "2222"), (paid.Status, store.Payout.SnapAccountLast4));
        Assert.Equal(PayoutTransaction.MaxAttempts + 1, paid.AttemptCount);
    }

    private sealed class Store
        : IPayoutRepository,
            IBankAccountRepository,
            IAccountNumberProtector,
            IUnitOfWork,
            ITransaction
    {
        private readonly List<BankAccount> accounts;
        private int commits;

        public Store(BankAccount? snapshot, params BankAccount[] others)
        {
            accounts = [.. others];
            if (snapshot != null)
                accounts.Add(snapshot);
            var escrow = Escrow.Hold(Guid.NewGuid(), Guid.NewGuid(), 500_000, Now);
            var settlement = Settlement.ForRelease(escrow, 10, Now);
            // Settled a full hold ago, so the payout may be sent at Now
            Payout = PayoutTransaction.ToExpert(
                settlement,
                Expert,
                null,
                snapshot,
                Now.AddDays(-PayoutTransaction.HoldDays)
            );
            Gateway.OnSubmit = () =>
            {
                StatusAtSubmit = Payout.Status;
                CommitsAtSubmit = commits;
            };
        }

        public PayoutTransaction Payout { get; }
        public Gateway Gateway { get; } = new();
        public Clock Clock { get; } = new();
        public FakeNotificationOutbox Outbox { get; } = new();
        public PayoutFeePolicy Fees { get; } = new(3_300);

        public Task<PayoutResponse> Hold(bool release, string reason) =>
            new HoldPayoutHandler(this, Outbox, this, Clock, WorkCalendar.WeekendsOnly).HandleAsync(
                new(Payout.Id, Guid.NewGuid(), release, reason),
                default
            );

        public string? StatusAtSubmit { get; private set; }
        public int CommitsAtSubmit { get; private set; }

        public Task<PayoutResponse> Transfer() =>
            new TransferPayoutHandler(
                this,
                this,
                this,
                Gateway,
                this,
                Clock,
                WorkCalendar.WeekendsOnly,
                Outbox,
                Fees
            ).HandleAsync(new(Payout.Id, Staff), default);

        public Task<PayoutTransferInfoResponse> ManualInfo() =>
            new GetPayoutTransferInfoHandler(this, this, this).HandleAsync(new(Payout.Id), default);

        public Task<PayoutResponse> ConfirmManual(string bankRef, long amount, DateTimeOffset at) =>
            new ConfirmManualPayoutHandler(
                this,
                this,
                Gateway,
                this,
                Clock,
                WorkCalendar.WeekendsOnly,
                Outbox,
                Fees
            ).HandleAsync(new(Payout.Id, Staff, bankRef, amount, at), default);

        public Task<PayoutResponse> FailManual(string reason) =>
            new FailManualPayoutHandler(
                this,
                this,
                Gateway,
                this,
                Clock,
                WorkCalendar.WeekendsOnly,
                Outbox
            ).HandleAsync(new(Payout.Id, Staff, reason), default);

        public Task<PayoutResponse> Refresh() =>
            new RefreshPayoutHandler(
                this,
                Gateway,
                this,
                Clock,
                WorkCalendar.WeekendsOnly,
                Outbox,
                Fees
            ).HandleAsync(new(Payout.Id), default);

        public Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<PayoutTransaction?>(Payout.Id == id ? Payout : null);

        public Task<PayoutTransaction?> GetAsync(Guid id, CancellationToken ct) =>
            LockAsync(id, ct);

        public HashSet<string> UsedRefs { get; } = [];

        public Task<bool> ProviderRefExistsAsync(string providerRef, CancellationToken ct) =>
            Task.FromResult(UsedRefs.Contains(providerRef));

        public Task<IReadOnlyList<PayoutTransaction>> ListPaidAsync(
            DateTimeOffset from,
            DateTimeOffset to,
            CancellationToken ct
        ) =>
            Task.FromResult<IReadOnlyList<PayoutTransaction>>(
                Payout.Status == PayoutStatus.Succeeded
                && Payout.CompletedAt >= from
                && Payout.CompletedAt < to
                    ? [Payout]
                    : []
            );

        public async Task<string> Export(DateTimeOffset from, DateTimeOffset to)
        {
            var file = await new ExportPaidPayoutsHandler(this).HandleAsync(new(from, to), default);
            return System.Text.Encoding.UTF8.GetString(file.Content);
        }

        public Task<IReadOnlyList<PayoutTransaction>> ListAsync(
            PayoutFilter filter,
            int skip,
            int take,
            CancellationToken ct,
            string sortBy = "due",
            bool descending = true
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentForAsync(
            Guid recipientUserId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<int> CountAsync(PayoutFilter filter, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<BankAccount>> ListAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<BankAccount>>(
                accounts.Where(x => x.UserId == userId && !x.IsDeleted).ToList()
            );

        public Task<IReadOnlyList<BankAccount>> ListForUpdateAsync(
            Guid userId,
            CancellationToken ct
        ) => ListAsync(userId, ct);

        public void Add(BankAccount account) => accounts.Add(account);

        public Task<BankAccount?> FindAsync(Guid id, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<BankAccount>> ListByStatusAsync(
            string? status,
            int skip,
            int take,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<int> CountByStatusAsync(string? status, CancellationToken ct) =>
            throw new NotSupportedException();

        public ProtectedAccountNumber Protect(string normalizedNumber) =>
            throw new NotSupportedException();

        public string Reveal(string encrypted) => encrypted["enc:".Length..];

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct)
        {
            commits++;
            return Task.CompletedTask;
        }

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
