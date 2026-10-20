import type { ReviewTrendPoint } from '../types/index.ts'

export function projectReviewTrend(
  daily: ReviewTrendPoint[],
  period: 7 | 28,
  timezone = 'UTC'
) {
  let chartTimezone = timezone
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone }).format()
  } catch {
    chartTimezone = 'UTC'
  }
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: chartTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const calendarDay = (date: string) => {
    const parts = formatter.formatToParts(new Date(date))
    const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value)
    return Date.UTC(get('year'), get('month') - 1, get('day'))
  }
  const valid = daily.filter(
    (point) =>
      Number.isFinite(Date.parse(point.date)) &&
      Number.isInteger(point.received) &&
      point.received >= 0 &&
      Number.isInteger(point.completed) &&
      point.completed >= 0
  )
  // Each record is a daily aggregate, not an event. Keep the latest daily
  // snapshot instead of summing duplicates and double-counting the same day.
  const byDay = new Map<number, ReviewTrendPoint>()
  for (const point of valid.toSorted(
    (a, b) => Date.parse(a.date) - Date.parse(b.date)
  ))
    byDay.set(calendarDay(point.date), point)
  const days = [...byDay.keys()].toSorted((a, b) => a - b)
  const end = days.at(-1) ?? 0
  const start = end - (period - 1) * 86_400_000
  const visibleDays = days.filter((day) => day >= start)
  const points = visibleDays.map((day) => byDay.get(day)!)
  const dayOffsets = visibleDays.map((day) => (day - start) / 86_400_000)
  return {
    points,
    dayOffsets,
    chartTimezone,
    duplicateCount: valid.length - byDay.size,
    missingDays:
      visibleDays.length > 0
        ? (end - visibleDays[0]) / 86_400_000 + 1 - visibleDays.length
        : 0,
    excludedCount: daily.length - valid.length,
    totalReceived: points.reduce((sum, point) => sum + point.received, 0),
    totalCompleted: points.reduce((sum, point) => sum + point.completed, 0),
    ceiling:
      Math.ceil(
        Math.max(
          4,
          ...points.flatMap((point) => [point.received, point.completed])
        ) / 4
      ) * 4,
  }
}
