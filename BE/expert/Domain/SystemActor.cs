namespace Caps.Expert.Domain;

/// <summary>
/// Actor recorded for changes the system makes on its own (for example registering the only service after
/// Gate 1), so history shows "System" instead of a person who did not act.
/// </summary>
public static class SystemActor
{
    public static readonly Guid UserId = Guid.Empty;
}
