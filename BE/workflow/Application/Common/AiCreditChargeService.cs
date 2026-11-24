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

/// <summary>Tracks any held billing credit or free quota reserved for a single AI operation.</summary>
public sealed class AiCreditReservation
{
    internal AiCreditReservation(AiChargeMode mode, Guid userId, Guid aiUsageId, long creditCost)
    {
        Mode = mode;
        UserId = userId;
        AiUsageId = aiUsageId;
        CreditCost = creditCost;
    }

    public AiChargeMode Mode { get; }
    public Guid UserId { get; }
    public Guid AiUsageId { get; }
    public long CreditCost { get; }
    public bool Settled { get; private set; }

    internal void MarkSettled() => Settled = true;
}

/// <summary>
/// Coordinates free mode, optional initial chat quota, and billing wallet credit charging
/// across AI chat and draft generation handlers.
/// </summary>
public sealed class AiCreditChargeService(
    IAiUsageRepository aiUsageRepository,
    IAiQuotaRepository aiQuotaRepository,
    IAiCredits aiCredits,
    AiBillingSettings settings,
    TimeProvider clock
)
{
    public async Task<AiCreditReservation> ReserveAsync(
        Guid userId,
        long creditCost,
        string holdNote,
        DateTimeOffset now,
        CancellationToken ct,
        bool allowFreeQuota = false
    )
    {
        if (!settings.Enabled)
        {
            return new AiCreditReservation(AiChargeMode.Free, userId, Guid.Empty, 0);
        }

        if (
            allowFreeQuota
            && settings.FreeQuotaEnabled
            && settings.InitialFreeQuota > 0
            && await aiQuotaRepository.TryReserveOneAsync(
                userId,
                settings.InitialFreeQuota,
                now,
                ct
            )
        )
        {
            return new AiCreditReservation(AiChargeMode.Quota, userId, Guid.Empty, 0);
        }

        if (creditCost <= 0)
        {
            return new AiCreditReservation(AiChargeMode.Free, userId, Guid.Empty, 0);
        }

        var aiUsageId = UuidV7.NewGuid();
        await aiCredits.HoldAsync(userId, aiUsageId, creditCost, holdNote, ct);
        return new AiCreditReservation(AiChargeMode.Credit, userId, aiUsageId, creditCost);
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
            AiChargeMode.Credit => AiUsagePaidWith.Credit,
            AiChargeMode.Quota => AiUsagePaidWith.Quota,
            _ => AiUsagePaidWith.Free,
        };

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
        if (reservation.Settled)
        {
            return;
        }

        if (reservation.Mode == AiChargeMode.Quota)
        {
            await aiQuotaRepository.RefundOneAsync(reservation.UserId, clock.GetUtcNow(), ct);
            reservation.MarkSettled();
            return;
        }

        if (reservation.Mode != AiChargeMode.Credit)
        {
            return;
        }

        await aiCredits.ReleaseAsync(reservation.AiUsageId, note, ct);
        reservation.MarkSettled();
    }

    /// <summary>
    /// Releases any still-reserved credit or quota holds linked to a question closing as INSUFFICIENT_INFORMATION,
    /// while leaving already-captured usages intact.
    /// </summary>
    public async Task ReleaseReservedUsagesForQuestionAsync(
        IReadOnlyCollection<Guid> questionIds,
        string note,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        if (questionIds.Count == 0)
        {
            return;
        }

        var usages = await aiUsageRepository.FindByQuestionIdsAsync(questionIds, ct);
        foreach (var usage in usages)
        {
            if (usage.State != AiUsageState.Reserved)
            {
                // Captured usages remain captured; refunded usages are already settled.
                continue;
            }

            if (settings.Enabled)
            {
                if (usage.PaidWith == AiUsagePaidWith.Credit)
                {
                    await aiCredits.ReleaseAsync(usage.Id, note, ct);
                }
                else if (usage.PaidWith == AiUsagePaidWith.Quota)
                {
                    await aiQuotaRepository.RefundOneAsync(usage.UserId, now, ct);
                }
            }

            usage.TransitionState(AiUsageState.Refunded, now);
        }
    }

    public async Task ReleaseOnErrorAsync(AiCreditReservation reservation, string? note)
    {
        if (reservation.Settled)
        {
            return;
        }

        try
        {
            if (reservation.Mode == AiChargeMode.Quota)
            {
                await aiQuotaRepository.RefundOneAsync(
                    reservation.UserId,
                    clock.GetUtcNow(),
                    CancellationToken.None
                );
                reservation.MarkSettled();
                return;
            }

            if (reservation.Mode == AiChargeMode.Credit)
            {
                await aiCredits.ReleaseAsync(reservation.AiUsageId, note, CancellationToken.None);
                reservation.MarkSettled();
            }
        }
        catch
        {
            // Best-effort rollback: never mask the primary AI or persistence exception.
        }
    }
}
