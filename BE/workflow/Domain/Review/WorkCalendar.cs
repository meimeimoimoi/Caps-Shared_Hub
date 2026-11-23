namespace Caps.Workflow.Domain.Review;

/// <summary>
/// Working days for the case deadlines (meeting of 2026-11-11): Saturdays, Sundays and the fixed solar public
/// holidays (the same day every year, written MM-dd) do not count, so a deadline that would fall on one moves to
/// the next working day.
/// </summary>
/// <remarks>ponytail: lunar holidays (Tết, Hùng Kings) and substitute days off are out of scope.</remarks>
public sealed class WorkCalendar(IEnumerable<string> holidays)
{
    private static readonly TimeSpan LocalOffset = TimeSpan.FromHours(7);
    private readonly HashSet<(int Month, int Day)> holidays = [.. holidays.Select(Parse)];

    /// <summary>No public holidays: for tests and before the holidays are configured.</summary>
    public static readonly WorkCalendar WeekendsOnly = new([]);

    public bool IsWorkingDay(DateOnly day) =>
        day.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday)
        && !holidays.Contains((day.Month, day.Day));

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

    // "09-02" -> (9, 2); a leap year accepts 02-29 as a day
    private static (int Month, int Day) Parse(string monthDay)
    {
        var day = DateOnly.ParseExact($"2000-{monthDay.Trim()}", "yyyy-MM-dd");
        return (day.Month, day.Day);
    }
}
