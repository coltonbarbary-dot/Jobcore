/**
 * JoJo scheduling algorithm.
 * Finds the next available slot in business hours (Mon-Fri 8am-5pm UTC)
 * that doesn't conflict with existing scheduled jobs.
 */

import { db } from "./db";

export const BUSINESS_HOURS_START = 8;  // 8 AM
export const BUSINESS_HOURS_END = 17;   // 5 PM
export const DEFAULT_DURATION_MINUTES = 120; // 2 hours
const LOOK_AHEAD_DAYS = 30;

export type ScheduleSlot = {
  scheduledStart: string; // ISO 8601
  scheduledEnd: string;   // ISO 8601
  reason: string;
};

export type ScheduleSuggestion = {
  jobId: string;
  jobTitle: string;
  customerId: string | null;
  customerName: string | null;
  slot: ScheduleSlot;
  alternatives: ScheduleSlot[];
};

type BusyBlock = { start: Date; end: Date; title: string };

function isoToMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function utcDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTimeUTC(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

function formatDayUTC(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Returns true for Saturday or Sunday in UTC */
function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

/**
 * Find the first available slot(s) in the next LOOK_AHEAD_DAYS days.
 * Returns up to 3 alternatives in addition to the best slot.
 */
export async function suggestSchedule(
  organizationId: string,
  durationMinutes: number,
  preferredDate: Date | null,
  excludeJobId: string | null
): Promise<ScheduleSlot[]> {
  // Load all scheduled jobs in the look-ahead window
  const windowStart = new Date();
  windowStart.setUTCHours(0, 0, 0, 0);

  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + LOOK_AHEAD_DAYS);

  const existingJobs = await db.job.findMany({
    where: {
      organizationId,
      scheduledStart: { gte: windowStart, lt: windowEnd },
      ...(excludeJobId ? { id: { not: excludeJobId } } : {}),
    },
    select: { id: true, title: true, scheduledStart: true, scheduledEnd: true },
    orderBy: { scheduledStart: "asc" },
  });

  // Group busy blocks by UTC date string
  const busyByDate = new Map<string, BusyBlock[]>();
  for (const j of existingJobs) {
    if (!j.scheduledStart) continue;
    const start = j.scheduledStart;
    // If no end time, assume DEFAULT_DURATION_MINUTES
    const end = j.scheduledEnd
      ? j.scheduledEnd
      : new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60_000);
    const key = utcDateStr(start);
    if (!busyByDate.has(key)) busyByDate.set(key, []);
    busyByDate.get(key)!.push({ start, end, title: j.title });
  }

  // Iterate days and find free slots
  const results: ScheduleSlot[] = [];
  const startDay = preferredDate
    ? new Date(Date.UTC(preferredDate.getUTCFullYear(), preferredDate.getUTCMonth(), preferredDate.getUTCDate()))
    : new Date(windowStart);

  // Ensure we don't start in the past
  if (startDay < windowStart) {
    startDay.setUTCFullYear(windowStart.getUTCFullYear());
    startDay.setUTCMonth(windowStart.getUTCMonth());
    startDay.setUTCDate(windowStart.getUTCDate());
  }

  for (let d = 0; d < LOOK_AHEAD_DAYS && results.length < 4; d++) {
    const day = new Date(startDay);
    day.setUTCDate(day.getUTCDate() + d);

    if (isWeekend(day)) continue;

    const dateKey = utcDateStr(day);
    const busy = (busyByDate.get(dateKey) ?? []).sort((a, b) => a.start.getTime() - b.start.getTime());

    // Build candidate windows within business hours
    const bhs = new Date(day);
    bhs.setUTCHours(BUSINESS_HOURS_START, 0, 0, 0);
    const bhe = new Date(day);
    bhe.setUTCHours(BUSINESS_HOURS_END, 0, 0, 0);

    // Windows: gaps between busy blocks
    const boundaries: Array<{ time: Date; label: string }> = [
      { time: bhs, label: "start of business" },
    ];
    for (const b of busy) {
      boundaries.push({ time: b.end, label: `after "${b.title}"` });
    }

    let prevEnd = bhs;
    let prevLabel = "start of business";

    for (const b of busy) {
      const gapEnd = b.start < bhe ? b.start : bhe;
      const gapMinutes = (gapEnd.getTime() - prevEnd.getTime()) / 60_000;

      if (gapMinutes >= durationMinutes && prevEnd < bhe) {
        const slotEnd = new Date(prevEnd.getTime() + durationMinutes * 60_000);
        const reason = busy.length === 0
          ? `No jobs scheduled on ${formatDayUTC(day)}`
          : prevLabel === "start of business"
            ? `Open window before "${b.title}" (${formatTimeUTC(b.start)})`
            : `Open window between "${prevEnd}" and "${b.title}"`;

        results.push({
          scheduledStart: prevEnd.toISOString(),
          scheduledEnd: slotEnd.toISOString(),
          reason: buildReason(day, prevEnd, slotEnd, busy, "before", b.title),
        });

        if (results.length >= 4) break;
      }

      prevEnd = prevEnd < b.end ? b.end : prevEnd;
      prevLabel = `after "${b.title}"`;
    }

    // Check time after last job to end of business
    if (results.length < 4) {
      const remainingMinutes = (bhe.getTime() - prevEnd.getTime()) / 60_000;
      if (remainingMinutes >= durationMinutes && prevEnd < bhe) {
        const slotEnd = new Date(prevEnd.getTime() + durationMinutes * 60_000);
        results.push({
          scheduledStart: prevEnd.toISOString(),
          scheduledEnd: slotEnd.toISOString(),
          reason: buildReason(day, prevEnd, slotEnd, busy, "after", null),
        });
      }
    }
  }

  return results;
}

function buildReason(
  day: Date,
  slotStart: Date,
  slotEnd: Date,
  busyOnDay: BusyBlock[],
  position: "before" | "after",
  adjacentTitle: string | null
): string {
  const dayStr = formatDayUTC(day);
  const startStr = formatTimeUTC(slotStart);
  const endStr = formatTimeUTC(slotEnd);

  if (busyOnDay.length === 0) {
    return `No jobs scheduled on ${dayStr} — fits ${startStr}–${endStr}`;
  }
  if (position === "before" && adjacentTitle) {
    return `${dayStr} at ${startStr}: open before "${adjacentTitle}" starts`;
  }
  if (position === "after") {
    const last = busyOnDay[busyOnDay.length - 1];
    if (last) {
      return `${dayStr} at ${startStr}: open after "${last.title}" finishes`;
    }
  }
  return `${dayStr} at ${startStr}–${endStr}`;
}

/** Look up a job and run the scheduling algorithm for it. */
export async function suggestScheduleForJob(
  organizationId: string,
  jobId: string,
  durationMinutes?: number,
  preferredDate?: Date
): Promise<ScheduleSuggestion | null> {
  const job = await db.job.findFirst({
    where: { id: jobId, organizationId },
    include: {
      customer: { select: { id: true, fullName: true } },
    },
  });
  if (!job) return null;

  // Determine duration
  let duration = durationMinutes ?? DEFAULT_DURATION_MINUTES;
  if (job.scheduledStart && job.scheduledEnd) {
    duration = Math.round((job.scheduledEnd.getTime() - job.scheduledStart.getTime()) / 60_000);
  }

  const slots = await suggestSchedule(
    organizationId,
    duration,
    preferredDate ?? null,
    jobId
  );

  if (slots.length === 0) return null;

  const [best, ...rest] = slots;
  return {
    jobId: job.id,
    jobTitle: job.title,
    customerId: job.customerId,
    customerName: job.customer?.fullName ?? null,
    slot: best,
    alternatives: rest.slice(0, 2),
  };
}
