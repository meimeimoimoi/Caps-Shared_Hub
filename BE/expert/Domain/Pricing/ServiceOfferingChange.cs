using Caps.Common.Domain;

namespace Caps.Expert.Domain.Pricing;

/// <summary>
/// One saved price of an expert's offering, old and new values side by side. Rows are only ever added: the
/// database rejects updates and deletes, so the history can be trusted when prices are checked afterwards.
/// </summary>
public sealed class ServiceOfferingChange
{
    private ServiceOfferingChange() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid OfferingId { get; private set; }
    public Guid ExpertProfileId { get; private set; }
    public string ServiceCode { get; private set; } = default!;

    /// <summary>Price before this save; null for the first price.</summary>
    public long? OldFee { get; private set; }

    public long NewFee { get; private set; }

    /// <summary>Turnaround before this save; null for the first price.</summary>
    public int? OldTurnaroundHours { get; private set; }

    public int NewTurnaroundHours { get; private set; }
    public Guid ChangedBy { get; private set; }
    public DateTimeOffset ChangedAt { get; private set; }

    internal static ServiceOfferingChange Record(
        ServiceOffering offering,
        long? oldFee,
        int? oldTurnaroundHours,
        Guid actorUserId,
        DateTimeOffset now
    ) =>
        new()
        {
            OfferingId = offering.Id,
            ExpertProfileId = offering.ExpertProfileId,
            ServiceCode = offering.ServiceCode,
            OldFee = oldFee,
            NewFee = offering.Fee,
            OldTurnaroundHours = oldTurnaroundHours,
            NewTurnaroundHours = offering.TurnaroundHours,
            ChangedBy = actorUserId,
            ChangedAt = now,
        };
}
