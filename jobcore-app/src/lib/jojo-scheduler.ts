/**
 * JoJo scheduling algorithm — timezone-aware, conflict-safe.
 *
 * All date logic uses the organization's IANA timezone.
 * Dates stored in Postgres are UTC; we convert to/from org timezone for
 * business-hours calculations only. The ISO strings returned in ScheduleSlot
 * are always UTC so they can be stored directly.
 */

import { db } from "./db";
import {
  localComponents,
  localToUTC,
  localDateStr,
  formatTime as tzFormatTime,
} from "./tz";

// ─── Business hours constants (configurable per org in a future phase) ────────

export const BUSINESS_DAYS = [1, 2, 3, 4, 5] as const; // Mon–Fri (0=Sun)
export const BUSINESS_START_HOUR = 8;  // 8:00 AM local time
export const BUSINESS_END_HOUR = 17;   // 5:00 PM local time
export const DEFAULT_DURATION_MINUTES = 120; // 2 hours
export const LOOK_AHEAD_DAYS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScheduleSlot = {
  scheduledStart: string;       // UTC ISO 8601
  scheduledEnd: string;         // UTC ISO 8601
  reason: string;
  durationMinutes: number;
  durationAssumed: boolean;     // true when caller did not supply duration
};

export type ScheduleSuggestion = {
  jobId: string;
  jobTitle: string;
  customerId: string | null;
  customerName: string | null;
  timezone: string;
  durationMinutes: number;
  durationAssumed: boolean;
  slot: ScheduleSlot;
  alternatives: ScheduleSlot[];
};

type BusyBlock = { start: Date; end: Date; title: string };

// Aliases for clarity inside this module
const formatLocalDay = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz }).format(d);
const formatLocalTime = (d: Date, tz: string) => tzFormatTime(d, tz);

// ─── Core algorithm ───────────────────────────────────────────────────────────

/**
 * Find up to 4 available slots in the next LOOK_AHEAD_DAYS business days.
 * All times are computed in `orgTimezone`; returned slots carry UTC ISO strings
 * so they can be stored directly as scheduledStart/scheduledEnd.
 */
export async function suggestSchedule(
  organizationId: string,
  orgTimezone: string,
  durationMinutes: number,
  preferredDate: Date | null,
  excludeJobId: string | null
): Promise<ScheduleSlot[]> {
  const nowUTC = new Date();

  // Load all scheduled jobs in the look-ahead window (in UTC)
  const windowStart = new Date(nowUTC);
  windowStart.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + LOOK_AHEAD_DAYS + 1);

  const existingJobs = await db.job.findMany({
    where: {
      organizationId,
      scheduledStart: { gte: windowStart, lt: windowEnd },
      ...(excludeJobId ? { id: { not: excludeJobId } } : {}),
    },
    select: { id: true, title: true, scheduledStart: true, scheduledEnd: true },
    orderBy: { scheduledStart: "asc" },
  });

  // Group busy blocks by LOCAL date string in org timezone
  const busyByLocalDate = new Map<string, BusyBlock[]>();
  for (const j of existingJobs) {
    if (!j.scheduledStart) continue;
    const start = j.scheduledStart;
    const end = j.scheduledEnd
      ? j.scheduledEnd
      : new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60_000);
    const key = localDateStr(start, orgTimezone);
    if (!busyByLocalDate.has(key)) busyByLocalDate.set(key, []);
    busyByLocalDate.get(key)!.push({ start, end, title: j.title });
  }

  // Determine start date (preferred or today) in local terms
  const referenceDate = preferredDate ?? nowUTC;
  const ref = localComponents(referenceDate, orgTimezone);

  const results: ScheduleSlot[] = [];

  for (let d = 0; d < LOOK_AHEAD_DAYS && results.length < 4; d++) {
    // Compute the local date we're checking
    const candidateUTC = localToUTC(ref.year, ref.month, ref.day + d, 12, 0, orgTimezone);
    const { year, month, day, dow } = localComponents(candidateUTC, orgTimezone);

    // Skip weekends
    if (!(BUSINESS_DAYS as readonly number[]).includes(dow)) continue;

    // Skip if entirely in the past (in local time)
    const dayEndUTC = localToUTC(year, month, day, BUSINESS_END_HOUR, 0, orgTimezone);
    if (dayEndUTC <= nowUTC) continue;

    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const busy = (busyByLocalDate.get(dateKey) ?? []).sort((a, b) => a.start.getTime() - b.start.getTime());

    // Business window in UTC
    const bhs = localToUTC(year, month, day, BUSINESS_START_HOUR, 0, orgTimezone);
    const bhe = localToUTC(year, month, day, BUSINESS_END_HOUR, 0, orgTimezone);

    // Effective start: no earlier than now (can't suggest past slots)
    const effectiveStart = bhs < nowUTC ? nowUTC : bhs;

    // Scan for free windows
    let cursor = effectiveStart;
    let prevJobTitle: string | null = null;

    for (const block of busy) {
      // Skip blocks that end before our cursor
      if (block.end <= cursor) continue;

      // Gap before this block
      const gapEnd = block.start < bhe ? block.start : bhe;
      const gapMs = gapEnd.getTime() - cursor.getTime();
      const gapMin = gapMs / 60_000;

      if (gapMin >= durationMinutes && cursor < bhe) {
        const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
        results.push({
          scheduledStart: cursor.toISOString(),
          scheduledEnd: slotEnd.toISOString(),
          reason: buildReason(cursor, slotEnd, busy, prevJobTitle, block.title, orgTimezone),
          durationMinutes,
          durationAssumed: false, // caller sets this
        });
        if (results.length >= 4) break;
      }

      prevJobTitle = block.title;
      if (block.end > cursor) cursor = block.end;
    }

    // Gap after last job to end of business
    if (results.length < 4 && cursor < bhe) {
      const remainingMin = (bhe.getTime() - cursor.getTime()) / 60_000;
      if (remainingMin >= durationMinutes) {
        const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
        results.push({
          scheduledStart: cursor.toISOString(),
          scheduledEnd: slotEnd.toISOString(),
          reason: buildReason(cursor, slotEnd, busy, prevJobTitle, null, orgTimezone),
          durationMinutes,
          durationAssumed: false,
        });
      }
    }
  }

  return results;
}

function buildReason(
  slotStart: Date,
  slotEnd: Date,
  busyOnDay: BusyBlock[],
  prevJobTitle: string | null,
  nextJobTitle: string | null,
  tz: string
): string {
  const dayStr = formatLocalDay(slotStart, tz);
  const startStr = formatLocalTime(slotStart, tz);
  const endStr = formatLocalTime(slotEnd, tz);

  if (busyOnDay.length === 0) {
    return `No jobs scheduled on ${dayStr} — fits ${startStr}–${endStr}`;
  }
  if (!prevJobTitle && nextJobTitle) {
    return `${dayStr}: open before "${nextJobTitle}" starts — ${startStr}–${endStr}`;
  }
  if (prevJobTitle && !nextJobTitle) {
    return `${dayStr}: open after "${prevJobTitle}" finishes — ${startStr}–${endStr}`;
  }
  if (prevJobTitle && nextJobTitle) {
    return `${dayStr}: gap between "${prevJobTitle}" and "${nextJobTitle}" — ${startStr}–${endStr}`;
  }
  return `${dayStr} at ${startStr}–${endStr}`;
}

// ─── Job-specific wrapper ─────────────────────────────────────────────────────

/** Look up a job and org timezone, then run the algorithm. */
export async function suggestScheduleForJob(
  organizationId: string,
  jobId: string,
  providedDurationMinutes?: number,
  preferredDate?: Date
): Promise<ScheduleSuggestion | null> {
  const [job, org] = await Promise.all([
    db.job.findFirst({
      where: { id: jobId, organizationId },
      include: { customer: { select: { id: true, fullName: true } } },
    }),
    db.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } }),
  ]);

  if (!job || !org) return null;

  const orgTimezone = org.timezone ?? "America/New_York";

  // Determine duration — caller > existing job times > default
  let durationMinutes: number;
  let durationAssumed: boolean;

  if (providedDurationMinutes) {
    durationMinutes = providedDurationMinutes;
    durationAssumed = false;
  } else if (job.scheduledStart && job.scheduledEnd) {
    durationMinutes = Math.round((job.scheduledEnd.getTime() - job.scheduledStart.getTime()) / 60_000);
    durationAssumed = false;
  } else {
    durationMinutes = DEFAULT_DURATION_MINUTES;
    durationAssumed = true;
  }

  const slots = await suggestSchedule(
    organizationId,
    orgTimezone,
    durationMinutes,
    preferredDate ?? null,
    jobId
  );

  if (slots.length === 0) return null;

  // Stamp durationAssumed on each slot
  const stamped = slots.map((s) => ({ ...s, durationAssumed }));
  const [best, ...rest] = stamped;

  return {
    jobId: job.id,
    jobTitle: job.title,
    customerId: job.customerId,
    customerName: job.customer?.fullName ?? null,
    timezone: orgTimezone,
    durationMinutes,
    durationAssumed,
    slot: best,
    alternatives: rest.slice(0, 2),
  };
}

// ─── Conflict re-check ────────────────────────────────────────────────────────

/**
 * Verify that the proposed slot is still free at approval time.
 * Returns null if clear, or a conflict description string if blocked.
 */
export async function checkSlotConflict(
  organizationId: string,
  excludeJobId: string,
  scheduledStart: Date,
  scheduledEnd: Date
): Promise<string | null> {
  const conflicts = await db.job.findMany({
    where: {
      organizationId,
      id: { not: excludeJobId },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
    select: { title: true, scheduledStart: true, scheduledEnd: true },
    take: 1,
  });

  if (conflicts.length === 0) return null;

  const c = conflicts[0];
  return `"${c.title}" is already scheduled in that slot`;
}
