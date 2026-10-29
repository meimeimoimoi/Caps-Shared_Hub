namespace Caps.Expert.Domain.Profiles;

/// <summary>
/// One review case holding a slot of the expert's capacity, from acceptance until the case ends. The key is the
/// case, so taking or releasing it twice changes nothing; ExpertProfile.ActiveCases counts these rows.
/// </summary>
public sealed class ExpertCaseSlot
{
    private ExpertCaseSlot() { }

    public Guid ReviewCaseId { get; }
    public Guid ExpertProfileId { get; }
    public DateTimeOffset TakenAt { get; }
}
