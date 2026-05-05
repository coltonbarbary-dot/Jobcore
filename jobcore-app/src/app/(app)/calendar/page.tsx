import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listScheduledJobs } from "@/lib/services/jobs";
import { PageShell } from "@/components/layout/page-shell";
import type { JobWithRelations } from "@/lib/services/jobs";
import type { JobStatus } from "@prisma/client";
import {
  localComponents,
  localDateStr,
  currentYM,
  startOfMonthUTC,
  startOfNextMonthUTC,
  daysInMonth,
  firstDayOfWeek,
  formatTime,
  formatDayHeading,
  monthLabel,
  localToUTC,
} from "@/lib/tz";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseYearMonth(
  raw: string | undefined,
  tz: string
): { year: number; month: number; ym: string } {
  const now = currentYM(tz);
  const [ny, nm] = now.split("-").map(Number);
  const fallback = { year: ny, month: nm, ym: now };

  if (!raw) return fallback;
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!match) return fallback;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) return fallback;
  return { year, month, ym: raw };
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = m - 1 + delta;
  const newYear = y + Math.floor(total / 12);
  const newMonth = ((total % 12) + 12) % 12 + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** Group jobs by their LOCAL date string in org timezone */
function groupByDate(
  jobs: JobWithRelations[],
  tz: string
): Map<string, JobWithRelations[]> {
  const map = new Map<string, JobWithRelations[]>();
  for (const job of jobs) {
    const key = localDateStr(job.scheduledStart!, tz);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(job);
  }
  return map;
}

const STATUS_CHIP: Record<JobStatus, string> = {
  draft:       "bg-[#f3f4f6] text-[#374151] border border-[#e5e7eb]",
  scheduled:   "bg-[#dbeafe] text-[#1e40af]",
  in_progress: "bg-[#ffedd5] text-[#c2410c]",
  on_hold:     "bg-[#fef9c3] text-[#854d0e]",
  completed:   "bg-[#dcfce7] text-[#15803d]",
  cancelled:   "bg-[#fee2e2] text-[#b91c1c]",
};

const STATUS_DOT: Record<JobStatus, string> = {
  draft:       "bg-[#9ca3af]",
  scheduled:   "bg-[#3b82f6]",
  in_progress: "bg-[#f97316]",
  on_hold:     "bg-[#eab308]",
  completed:   "bg-[#22c55e]",
  cancelled:   "bg-[#ef4444]",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  draft:       "Draft",
  scheduled:   "Scheduled",
  in_progress: "In Progress",
  on_hold:     "On Hold",
  completed:   "Completed",
  cancelled:   "Cancelled",
};

// ─── Job chip (month cell) ────────────────────────────────────────────────────

function JobChip({ job, tz }: { job: JobWithRelations; tz: string }) {
  return (
    <Link
      href={`/operations/jobs/${job.id}`}
      className={`block rounded px-1.5 py-0.5 text-[11px] font-medium leading-snug truncate hover:opacity-80 transition-opacity ${STATUS_CHIP[job.status]}`}
      title={`${job.title} — ${job.customer.fullName} (${STATUS_LABEL[job.status]})`}
    >
      {formatTime(job.scheduledStart!, tz)} {job.title}
    </Link>
  );
}

// ─── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  year,
  month,
  ym,
  jobs,
  tz,
}: {
  year: number;
  month: number;
  ym: string;
  jobs: JobWithRelations[];
  tz: string;
}) {
  const jobsByDate = groupByDate(jobs, tz);

  const numDays = daysInMonth(year, month, tz);
  const startOffset = firstDayOfWeek(year, month, tz);
  const totalCells = Math.ceil((startOffset + numDays) / 7) * 7;

  const todayLocalStr = localDateStr(new Date(), tz);
  const currentYMStr = currentYM(tz);
  const prev = shiftMonth(ym, -1);
  const next = shiftMonth(ym, +1);
  const isCurrentMonth = ym === currentYMStr;

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?view=month&month=${prev}`}
            className="px-2.5 py-1 text-sm text-[#6b7280] hover:text-[#0a0a0a] border border-[#e5e7eb] rounded transition-colors"
          >
            ←
          </Link>
          <h2 className="text-base font-semibold text-[#0a0a0a] min-w-[160px] text-center">
            {monthLabel(year, month, tz)}
          </h2>
          <Link
            href={`/calendar?view=month&month=${next}`}
            className="px-2.5 py-1 text-sm text-[#6b7280] hover:text-[#0a0a0a] border border-[#e5e7eb] rounded transition-colors"
          >
            →
          </Link>
        </div>
        {!isCurrentMonth && (
          <Link
            href="/calendar?view=month"
            className="text-sm text-[#6b7280] hover:text-[#0a0a0a] underline"
          >
            Today
          </Link>
        )}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DOW.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 border-l border-t border-[#e5e7eb] rounded-lg overflow-hidden">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= numDays;

          // Build the LOCAL date string for this cell
          const dateStr = inMonth
            ? `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
            : null;

          const dayJobs = dateStr ? (jobsByDate.get(dateStr) ?? []) : [];
          const isToday = dateStr === todayLocalStr;

          return (
            <div
              key={i}
              className={`border-r border-b border-[#e5e7eb] min-h-[96px] p-1 ${
                inMonth ? "bg-white" : "bg-[#f9fafb]"
              }`}
            >
              {inMonth && (
                <>
                  <div className="flex justify-end mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none ${
                        isToday ? "bg-[#0a0a0a] text-white" : "text-[#6b7280]"
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayJobs.slice(0, 3).map((job) => (
                      <JobChip key={job.id} job={job} tz={tz} />
                    ))}
                    {dayJobs.length > 3 && (
                      <p className="text-[11px] text-[#9ca3af] pl-1 font-medium">
                        +{dayJobs.length - 3} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <p className="text-center text-sm text-[#9ca3af] mt-6">
          No jobs scheduled in {monthLabel(year, month, tz)}.{" "}
          <Link href="/operations/jobs" className="text-[#2563eb] hover:underline">
            Schedule a job →
          </Link>
        </p>
      )}
    </div>
  );
}

// ─── List / schedule view ─────────────────────────────────────────────────────

function ListView({
  jobs,
  from,
  tz,
}: {
  jobs: JobWithRelations[];
  from: Date;
  tz: string;
}) {
  const jobsByDate = groupByDate(jobs, tz);
  const sortedDates = Array.from(jobsByDate.keys()).sort();
  const fromStr = localDateStr(from, tz);

  return (
    <div>
      <p className="text-xs text-[#9ca3af] mb-5">
        Showing jobs scheduled from {formatDayHeading(fromStr, tz)} — next 90 days
      </p>

      {sortedDates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-[#9ca3af]">No jobs scheduled in the next 90 days.</p>
          <Link
            href="/operations/jobs"
            className="text-sm text-[#2563eb] hover:underline mt-2 inline-block"
          >
            Schedule a job →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const dayJobs = jobsByDate.get(dateStr)!;
            return (
              <div key={dateStr}>
                <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2 pb-1.5 border-b border-[#f3f4f6]">
                  {formatDayHeading(dateStr, tz)}
                </h3>
                <div className="space-y-2">
                  {dayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/operations/jobs/${job.id}`}
                      className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] px-4 py-3 bg-white hover:bg-[#f9fafb] transition-colors group"
                    >
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[job.status]}`} />
                      <div className="w-24 shrink-0">
                        <p className="text-sm font-semibold text-[#374151] tabular-nums">
                          {formatTime(job.scheduledStart!, tz)}
                        </p>
                        {job.scheduledEnd && (
                          <p className="text-xs text-[#9ca3af] tabular-nums">
                            – {formatTime(job.scheduledEnd, tz)}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0a0a0a] truncate group-hover:underline">
                          {job.title}
                        </p>
                        <p className="text-xs text-[#6b7280] truncate">
                          {job.customer.fullName}
                          {job.jobType && (
                            <span className="text-[#9ca3af]"> · {job.jobType}</span>
                          )}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${STATUS_CHIP[job.status]}`}
                      >
                        {STATUS_LABEL[job.status]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const { view = "month", month: monthParam } = await searchParams;
  const { org } = await requireOrg();

  const tz = org.timezone ?? "America/New_York";
  const isListView = view === "list";
  const { year, month, ym } = parseYearMonth(monthParam, tz);

  let jobs: JobWithRelations[];
  let listFrom: Date;

  if (isListView) {
    // Start of today in org timezone
    const now = new Date();
    const { year: ty, month: tm, day: td } = localComponents(now, tz);
    listFrom = localToUTC(ty, tm, td, 0, 0, tz);
    const listTo = new Date(listFrom.getTime() + 90 * 86_400_000);
    jobs = await listScheduledJobs(org.id, { from: listFrom, to: listTo });
  } else {
    // Query the full month in org timezone — start/end are local-midnight in UTC
    listFrom = startOfMonthUTC(year, month, tz);
    const to = startOfNextMonthUTC(year, month, tz);
    jobs = await listScheduledJobs(org.id, { from: listFrom, to });
  }

  const viewToggle = (
    <div className="flex items-center rounded-md border border-[#e5e7eb] overflow-hidden text-sm">
      <Link
        href={`/calendar?view=month${monthParam ? `&month=${monthParam}` : ""}`}
        className={`px-3 py-1.5 transition-colors ${
          !isListView
            ? "bg-[#0a0a0a] text-white"
            : "text-[#6b7280] hover:text-[#0a0a0a] bg-white"
        }`}
      >
        Month
      </Link>
      <Link
        href="/calendar?view=list"
        className={`px-3 py-1.5 border-l border-[#e5e7eb] transition-colors ${
          isListView
            ? "bg-[#0a0a0a] text-white"
            : "text-[#6b7280] hover:text-[#0a0a0a] bg-white"
        }`}
      >
        List
      </Link>
    </div>
  );

  return (
    <PageShell
      title="Calendar"
      description={
        <span className="text-sm text-[#6b7280]">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </span>
      }
      action={viewToggle}
    >
      {isListView ? (
        <ListView jobs={jobs} from={listFrom} tz={tz} />
      ) : (
        <MonthGrid year={year} month={month} ym={ym} jobs={jobs} tz={tz} />
      )}
    </PageShell>
  );
}
