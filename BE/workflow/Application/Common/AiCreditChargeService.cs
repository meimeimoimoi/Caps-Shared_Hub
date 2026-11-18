using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Common;

/// <summary>Payment mode resolved for an AI operation before calling the AI service.</summary>
public enum AiChargeMode
{
    Free,
    Quota,
    Credit,
}

/// <summary>Tracks the quota row and any held billing credit reserved for a single AI operation.</summary>
public sealed class AiCreditReservation
{
    internal AiCreditReservation(AiChargeMode mode, AiQuota quota, Guid aiUsageId, long creditCost)
    {
        Mode = mode;
        Quota = quota;
        AiUsageId = aiUsageId;
        CreditCost = creditCost;
    }

    public AiChargeMode Mode { get; }
    public AiQuota Quota { get; }
    public Guid AiUsageId { get; }
    public long CreditCost { get; }
    public bool Settled { get; private set; }
    public int RemainingQuota => Quota.Balance;

    internal void MarkSettled() => Settled = true;
}

/// <summary>
/// Coordinates free mode, free AI quota consumption, and billing wallet credit fallback
/// across AI chat and draft generation handlers.
/// </summary>
public sealed class AiCreditChargeService(
    IAiQuotaRepository aiQuotaRepository,
    IAiUsageRepository aiUsageRepository,
    IAiCredits aiCredits,
    AiBillingSettings settings
)
{
    public async Task<AiCreditReservation> ReserveAsync(
        Guid userId,
        long creditCost,
        string holdNote,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var quota = await aiQuotaRepository.GetByUserIdAsync(userId, ct);
        if (quota is null)
        {
            quota = AiQuota.Create(userId, settings.InitialFreeQuota, now);
            await aiQuotaRepository.AddAsync(quota, ct);
        }

        if (!settings.Enabled)
        {
            return new AiCreditReservation(AiChargeMode.Free, quota, Guid.Empty, 0);
        }

        if (quota.HasAvailableQuota())
        {
            return new AiCreditReservation(AiChargeMode.Quota, quota, Guid.Empty, 0);
        }

        if (creditCost <= 0)
        {
            return new AiCreditReservation(AiChargeMode.Free, quota, Guid.Empty, 0);
        }

        var aiUsageId = UuidV7.NewGuid();
        await aiCredits.HoldAsync(userId, aiUsageId, creditCost, holdNote, ct);
        return new AiCreditReservation(AiChargeMode.Credit, quota, aiUsageId, creditCost);
    }

    public async Task RecordCapturedUsageAsync(
        AiCreditReservation reservation,
        Guid userId,
        Guid? conversationId,
        Guid? questionId,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var paidWith = reservation.Mode switch
        {
            AiChargeMode.Quota => AiUsagePaidWith.Quota,
            AiChargeMode.Credit => AiUsagePaidWith.Credit,
            _ => AiUsagePaidWith.Free,
        };

        if (reservation.Mode == AiChargeMode.Quota)
        {
            reservation.Quota.Deduct(1, now);
        }

        var usage = AiUsage.Create(
            userId,
            conversationId,
            questionId,
            paidWith,
            reservation.Mode == AiChargeMode.Credit ? reservation.CreditCost : 0,
            AiUsageState.Captured,
            now,
            reservation.Mode == AiChargeMode.Credit ? reservation.AiUsageId : null
        );
        await aiUsageRepository.AddAsync(usage, ct);
    }

    public async Task RecordRefundedCreditUsageAsync(
        AiCreditReservation reservation,
        Guid userId,
        Guid? conversationId,
        Guid? questionId,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        if (reservation.Mode != AiChargeMode.Credit)
        {
            return;
        }

        var usage = AiUsage.Create(
            userId,
            conversationId,
            questionId,
            AiUsagePaidWith.Credit,
            reservation.CreditCost,
            AiUsageState.Refunded,
            now,
            reservation.AiUsageId
        );
        await aiUsageRepository.AddAsync(usage, ct);
    }

    public async Task CaptureHeldCreditAsync(
        AiCreditReservation reservation,
        Guid? documentVersionId,
        string? note,
        CancellationToken ct
    )
    {
        if (reservation.Mode != AiChargeMode.Credit || reservation.Settled)
        {
            return;
        }

        await aiCredits.CaptureAsync(reservation.AiUsageId, documentVersionId, note, ct);
        reservation.MarkSettled();
    }

    public async Task ReleaseHeldCreditAsync(
        AiCreditReservation reservation,
        string? note,
        CancellationToken ct
    )
    {
        if (reservation.Mode != AiChargeMode.Credit || reservation.Settled)
        {
            return;
        }

        await aiCredits.ReleaseAsync(reservation.AiUsageId, note, ct);
        reservation.MarkSettled();
    }

    public async Task ReleaseOnErrorAsync(AiCreditReservation reservation, string? note)
    {
        if (reservation.Mode != AiChargeMode.Credit || reservation.Settled)
        {
            return;
        }

        try
        {
            await aiCredits.ReleaseAsync(reservation.AiUsageId, note, CancellationToken.None);
            reservation.MarkSettled();
        }
        catch
        {
            // Best-effort rollback: never mask the primary AI or persistence exception.
        }
    }
}
