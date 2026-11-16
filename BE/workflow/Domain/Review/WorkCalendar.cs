namespace Caps.Workflow.Domain.Review;

/// <summary>
/// Working days for the case deadlines (meeting of 2026-11-11): Saturdays, Sundays and the listed public holidays
/// do not count, so a deadline that would fall on one moves to the next working day.
/// </summary>
public sealed class WorkCalendar(IEnumerable<DateOnly> holidays)
{
    private static readonly TimeSpan LocalOffset = TimeSpan.FromHours(7);
    private readonly HashSet<DateOnly> holidays = [.. holidays];

    /// <summary>No public holidays: for tests and before the holidays are configured.</summary>
    public static readonly WorkCalendar WeekendsOnly = new([]);

    public bool IsWorkingDay(DateOnly day) =>
        day.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday) && !holidays.Contains(day);

    /// <summary>The same Vietnam clock time `days` working days later, in UTC (timestamptz takes UTC only).</summary>
    public DateTimeOffset AddWorkingDays(DateTimeOffset from, int days)
    {
        var local = from.ToOffset(LocalOffset);
        var day = DateOnly.FromDateTime(local.DateTime);
        for (var left = days; left > 0; )
        {
            day = day.AddDays(1);
            if (IsWorkingDay(day))
            {
                left--;
            }
        }
        return new DateTimeOffset(
            day.ToDateTime(TimeOnly.FromDateTime(local.DateTime)),
            LocalOffset
        ).ToUniversalTime();
    }
}
