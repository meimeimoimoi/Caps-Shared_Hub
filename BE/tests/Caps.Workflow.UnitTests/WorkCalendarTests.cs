using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class WorkCalendarTests
{
    private static readonly TimeSpan Vietnam = TimeSpan.FromHours(7);

    [Fact]
    public void A_weekday_moves_to_the_next_day_at_the_same_time_in_utc()
    {
        // Tuesday 15:00 Vietnam -> Wednesday 15:00 Vietnam, stored as UTC
        var due = WorkCalendar.WeekendsOnly.AddWorkingDays(new(2026, 10, 20, 15, 0, 0, Vietnam), 1);

        Assert.Equal(TimeSpan.Zero, due.Offset);
        Assert.Equal(new DateTimeOffset(2026, 10, 21, 8, 0, 0, TimeSpan.Zero), due);
    }

    [Theory]
    [InlineData(23)] // Friday -> Monday
    [InlineData(24)] // Saturday -> Monday
    [InlineData(25)] // Sunday -> Monday
    public void A_weekend_moves_to_monday(int day)
    {
        var due = WorkCalendar.WeekendsOnly.AddWorkingDays(
            new(2026, 10, day, 10, 0, 0, Vietnam),
            1
        );

        Assert.Equal(new DateTimeOffset(2026, 10, 26, 10, 0, 0, Vietnam), due);
    }

    [Theory]
    [InlineData(2026, 4, 29, 2026, 5, 4)] // 30/4 and 1/5 off, then the weekend: Wednesday -> Monday
    [InlineData(2027, 4, 29, 2027, 5, 3)] // same dates every year: Thursday 29/4 -> Monday 3/5
    public void A_fixed_holiday_is_skipped_every_year(int y, int m, int d, int dy, int dm, int dd)
    {
        var calendar = new WorkCalendar(["01-01", "04-30", "05-01", "09-02"]);

        var due = calendar.AddWorkingDays(new(y, m, d, 9, 0, 0, Vietnam), 1);

        Assert.Equal(new DateTimeOffset(dy, dm, dd, 9, 0, 0, Vietnam), due);
    }

    [Theory]
    [InlineData(23, 17, 24, 26, 17)] // Friday 17:00 + 24h skips the weekend: Monday 17:00
    [InlineData(22, 9, 24, 23, 9)] // Thursday 09:00 + 24h: Friday 09:00
    [InlineData(24, 10, 24, 27, 0)] // Saturday: counting starts Monday 00:00
    [InlineData(23, 17, 0, 23, 17)] // no late window: the deadline itself
    public void Late_hours_count_only_working_days(
        int day,
        int hour,
        int hours,
        int dueDay,
        int dueHour
    )
    {
        var due = WorkCalendar.WeekendsOnly.AddWorkingHours(
            new(2026, 10, day, hour, 0, 0, Vietnam),
            hours
        );

        Assert.Equal(TimeSpan.Zero, due.Offset);
        Assert.Equal(new DateTimeOffset(2026, 10, dueDay, dueHour, 0, 0, Vietnam), due);
    }

    [Fact]
    public void Late_hours_skip_a_fixed_holiday()
    {
        var calendar = new WorkCalendar(["04-30", "05-01"]);

        // Wednesday 29/4 18:00 + 24h: 6h on Wednesday, 30/4 + 1/5 + the weekend off, 18h on Monday 4/5
        var due = calendar.AddWorkingHours(new(2026, 4, 29, 18, 0, 0, Vietnam), 24);

        Assert.Equal(new DateTimeOffset(2026, 5, 4, 18, 0, 0, Vietnam), due);
    }

    [Fact]
    public void A_bad_holiday_fails_at_startup() =>
        Assert.Throws<FormatException>(() => new WorkCalendar(["2026-09-02"]));
}
