using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

/// <summary>
/// A valid offer for tests (1,000,000 VND, 20% platform fee, 48h turnaround, late rule 24h / 30% / 72h, client
/// silence 72h with 50% back and 30% to the expert), so a new rule on the offer changes one place, not every test.
/// </summary>
internal static class Offers
{
    public static ReviewOffer Sample(
        Guid expertProfileId,
        Guid expertUserId,
        long fee = 1_000_000,
        short platformFeePct = 20,
        int turnaroundHours = 48,
        int latePenaltyHours = 24,
        short latePenaltyPct = 30,
        int lateCancelHours = 72,
        int noResponseHours = 72,
        short noResponseRefundPct = 50,
        short noResponseExpertPct = 30
    ) =>
        new(
            expertProfileId,
            expertUserId,
            Guid.NewGuid(),
            fee,
            platformFeePct,
            turnaroundHours,
            latePenaltyHours,
            latePenaltyPct,
            lateCancelHours,
            noResponseHours,
            noResponseRefundPct,
            noResponseExpertPct
        );
}
