/**
 * ISO 8601 week helpers (weeks start Monday, week 1 is the week containing the year's first Thursday).
 * All dates are plain `YYYY-MM-DD` strings, parsed as UTC to avoid local-timezone drift.
 */

function parseUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`)
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Monday of the ISO week containing `dateStr`. */
export function mondayOf(dateStr: string): string {
  const d = parseUTC(dateStr)
  const day = d.getUTCDay() // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return toDateStr(d)
}

/** Sunday of the ISO week containing `dateStr`. */
export function sundayOf(dateStr: string): string {
  const d = parseUTC(mondayOf(dateStr))
  d.setUTCDate(d.getUTCDate() + 6)
  return toDateStr(d)
}

/** `YYYY-Www` key for the ISO week containing `dateStr` — matches `<input type="week">`. */
export function isoWeekKey(dateStr: string): string {
  const d = parseUTC(dateStr)
  const dayNum = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // nearest Thursday
  const isoYear = d.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

/** Week key shifted by `delta` ISO weeks (negative moves backward). */
export function shiftWeek(weekKey: string, delta: number): string {
  const d = parseUTC(isoWeekKeyToMonday(weekKey))
  d.setUTCDate(d.getUTCDate() + delta * 7)
  return isoWeekKey(toDateStr(d))
}

/** Monday date for a `YYYY-Www` week key. */
export function isoWeekKeyToMonday(weekKey: string): string {
  const [yearStr, weekStr] = weekKey.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = (jan4.getUTCDay() + 6) % 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day)
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return toDateStr(monday)
}

/** First/last calendar day of a `YYYY-MM` month. */
export function monthRange(monthKey: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) // 1-indexed
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0)) // day 0 of next month = last day of this month
  return { start: toDateStr(start), end: toDateStr(end) }
}

/** Every distinct ISO week (as Monday dates) that overlaps at least one day of the month. */
export function weeksOverlappingMonth(monthKey: string): string[] {
  const { start, end } = monthRange(monthKey)
  const weeks: string[] = []
  let cursor = mondayOf(start)
  const lastWeekMonday = mondayOf(end)
  while (cursor <= lastWeekMonday) {
    weeks.push(cursor)
    const d = parseUTC(cursor)
    d.setUTCDate(d.getUTCDate() + 7)
    cursor = toDateStr(d)
  }
  return weeks
}

/** `YYYY-MM` for a `YYYY-MM-DD` date string. */
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** First/last calendar day of a `YYYY` year. */
export function yearRange(yearKey: string): { start: string; end: string } {
  const year = Number(yearKey)
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

/** The 12 `YYYY-MM` month keys of a calendar year. */
export function monthsInYear(yearKey: string): string[] {
  const year = Number(yearKey)
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
}

/** Every date in `[start, end]` (inclusive) whose day-of-week is in `weekdays` (0=Sun..6=Sat). */
export function weekdaysInRange(start: string, end: string, weekdays: number[]): string[] {
  if (weekdays.length === 0) return []
  const wanted = new Set(weekdays)
  const dates: string[] = []
  let cursor = parseUTC(start)
  const endDate = parseUTC(end)
  while (cursor <= endDate) {
    if (wanted.has(cursor.getUTCDay())) dates.push(toDateStr(cursor))
    cursor = new Date(cursor.getTime() + 24 * 3600 * 1000)
  }
  return dates
}

/** True if `dateStr` falls within any of the given `[startDate, endDate]` break ranges. */
export function isDateInBreaks(dateStr: string, breaks: { startDate: string; endDate: string }[]): boolean {
  return breaks.some((b) => dateStr >= b.startDate && dateStr <= b.endDate)
}
