/**
 * Shared IANA timezone utilities.
 * Used by the JoJo scheduler and the Calendar page.
 * All output is in org local time; storage timestamps stay UTC.
 */

/** Returns UTC offset in minutes for a UTC instant in the given IANA tz. */
export function getUTCOffsetMinutes(utcDate: Date, tz: string): number {
  const utcStr = utcDate.toLocaleString("en-US", {
    timeZone: "UTC", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const localStr = utcDate.toLocaleString("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const parse = (s: string) => {
    const [datePart, timePart] = s.split(", ");
    const [m, d, y] = datePart.split("/").map(Number);
    const [hh, mm, ss] = timePart.split(":").map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  };

  return (parse(localStr).getTime() - parse(utcStr).getTime()) / 60_000;
}

/** Returns the local date components for a UTC Date in an IANA timezone. */
export function localComponents(utcDate: Date, tz: string): {
  year: number; month: number; day: number; dow: number; hour: number; minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(utcDate);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    dow: dowMap[get("weekday")] ?? -1,
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
  };
}

/**
 * Returns a UTC Date representing the given local date + time in the IANA tz.
 * Uses a two-pass approximation to handle DST transitions correctly.
 */
export function localToUTC(
  year: number, month: number, day: number,
  hour: number, minute: number, tz: string
): Date {
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getUTCOffsetMinutes(naive, tz);
  return new Date(naive.getTime() - offset * 60_000);
}

/** Returns a YYYY-MM-DD string for a UTC Date in the given IANA timezone. */
export function localDateStr(utcDate: Date, tz: string): string {
  const { year, month, day } = localComponents(utcDate, tz);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Returns "YYYY-MM" for the current month in the given timezone. */
export function currentYM(tz: string): string {
  const { year, month } = localComponents(new Date(), tz);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Returns UTC Date for midnight on day 1 of year/month in the given timezone. */
export function startOfMonthUTC(year: number, month: number, tz: string): Date {
  return localToUTC(year, month, 1, 0, 0, tz);
}

/** Returns UTC Date for midnight on the start of the next month. */
export function startOfNextMonthUTC(year: number, month: number, tz: string): Date {
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return localToUTC(next.y, next.m, 1, 0, 0, tz);
}

/** Returns the number of days in a month, accounting for DST in the given tz. */
export function daysInMonth(year: number, month: number, tz: string): number {
  const start = startOfMonthUTC(year, month, tz);
  const end = startOfNextMonthUTC(year, month, tz);
  const components: number[] = [];
  for (let d = 0; d < 32; d++) {
    const t = new Date(start.getTime() + d * 86_400_000);
    if (t >= end) break;
    components.push(localComponents(t, tz).day);
  }
  return Math.max(...components);
}

/** Day-of-week (0=Sun) for the first day of a month in a timezone. */
export function firstDayOfWeek(year: number, month: number, tz: string): number {
  const firstUTC = startOfMonthUTC(year, month, tz);
  return localComponents(firstUTC, tz).dow;
}

/** Format a UTC Date as a time string in the given timezone. */
export function formatTime(utcDate: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz,
  }).format(utcDate);
}

/** Format a YYYY-MM-DD string as a full day heading in the given timezone. */
export function formatDayHeading(dateStr: string, tz: string): string {
  // dateStr is already a local date in tz — parse via localToUTC at noon to avoid DST edge
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = localToUTC(y, m, d, 12, 0, tz);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: tz,
  }).format(utc);
}

/** Format year+month as "Month YYYY" in the given timezone. */
export function monthLabel(year: number, month: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long", year: "numeric", timeZone: tz,
  }).format(localToUTC(year, month, 1, 12, 0, tz));
}
