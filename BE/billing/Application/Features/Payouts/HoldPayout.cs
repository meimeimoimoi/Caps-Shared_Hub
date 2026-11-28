using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Staff hold a payout for review, or lift the hold (Release = true).</summary>
public sealed record HoldPayoutCommand(
    Guid PayoutId,
    Guid StaffId,
    bool Release,
    string? Reason,
    int ReviewDays = 7
);

/// <summary>
/// Holds or releases one unsent payout under its row lock and tells the expert in neutral words (advisor
/// 2026-11-28: a hold needs a reason, an approver and a review date, and never lasts indefinitely).
/// </summary>
public sealed class HoldPayoutHandler(
    IPayoutRepository payouts,
    IBillingNotificationOutbox outbox,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    WorkCalendar calendar
) : ICommandHandler<HoldPayoutCommand, PayoutResponse>
{
    public async Task<PayoutResponse> HandleAsync(HoldPayoutCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var payout =
            await payouts.LockAsync(command.PayoutId, ct) ?? throw BillingErrors.PayoutNotFound();
        var now = clock.GetUtcNow();
        if (command.Release)
        {
            payout.Release(command.StaffId, command.Reason, now);
        }
        else
        {
            payout.Hold(command.StaffId, command.Reason, command.ReviewDays, now);
        }
        PayoutNotices.Enqueue(outbox, payout, now, command.Release ? "RELEASED" : "HELD");
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayoutResponse.From(payout, calendar);
    }
}
