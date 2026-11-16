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

    [Fact]
    public void A_listed_holiday_is_skipped()
    {
        // 2026-04-30 and 2026-05-01 are holidays: Wednesday 29/4 -> Monday 4/5
        var calendar = new WorkCalendar([new(2026, 4, 30), new(2026, 5, 1)]);

        var due = calendar.AddWorkingDays(new(2026, 4, 29, 9, 0, 0, Vietnam), 1);

        Assert.Equal(new DateTimeOffset(2026, 5, 4, 9, 0, 0, Vietnam), due);
    }
}
