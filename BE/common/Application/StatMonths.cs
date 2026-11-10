using System.Globalization;

namespace Caps.Common.Application;

/// <summary>One calendar month in Vietnam time, used to group admin statistics.</summary>
/// <param name="Start">First instant of the month (00:00 on day 1, UTC+7).</param>
/// <param name="End">First instant of the next month (exclusive).</param>
/// <param name="Partial">The month is still running, so it must not be compared with a full month.</param>
public sealed record StatMonth(DateTimeOffset Start, DateTimeOffset End, bool Partial)
{
    /// <summary>The first day of the month as yyyy-MM-dd, the period key the admin dashboard joins on.</summary>
    public string Key => Start.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}

/// <summary>
/// The last N calendar months in Vietnam time, oldest first, ending with the month that contains now.
/// Every service builds its admin statistics on the same months so the dashboard can merge them by key.
/// </summary>
public static class StatMonths
{
    public const int MaxCount = 36;

    public static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public static IReadOnlyList<StatMonth> Last(int count, DateTimeOffset now)
    {
        var local = now.ToOffset(VietnamOffset);
        var current = new DateTimeOffset(local.Year, local.Month, 1, 0, 0, 0, VietnamOffset);
        return Enumerable
            .Range(0, count)
            .Select(i => current.AddMonths(i - count + 1))
            .Select(start => new StatMonth(start, start.AddMonths(1), now < start.AddMonths(1)))
            .ToArray();
    }

    /// <summary>Index of the month that contains the instant, or -1 when it falls outside them.</summary>
    public static int IndexOf(IReadOnlyList<StatMonth> months, DateTimeOffset at)
    {
        for (var i = 0; i < months.Count; i++)
        {
            if (at >= months[i].Start && at < months[i].End)
                return i;
        }
        return -1;
    }
}
