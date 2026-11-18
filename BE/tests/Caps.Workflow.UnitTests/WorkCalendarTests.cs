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

    [Fact]
    public void A_bad_holiday_fails_at_startup() =>
        Assert.Throws<FormatException>(() => new WorkCalendar(["2026-09-02"]));
}
