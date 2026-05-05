import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { updateJob, getJob } from "@/lib/services/jobs";
import { logActivity } from "@/lib/services/activity";
import { checkSlotConflict } from "@/lib/jojo-scheduler";

export async function POST(req: NextRequest) {
  const { user, org } = await requireOrg();

  let body: { jobId: string; scheduledStart: string; scheduledEnd: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { jobId, scheduledStart: startStr, scheduledEnd: endStr } = body;

  if (!jobId || !startStr || !endStr) {
    return NextResponse.json(
      { error: "jobId, scheduledStart, and scheduledEnd are required" },
      { status: 400 }
    );
  }

  const scheduledStart = new Date(startStr);
  const scheduledEnd = new Date(endStr);

  if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  if (scheduledEnd <= scheduledStart) {
    return NextResponse.json(
      { error: "scheduledEnd must be after scheduledStart" },
      { status: 400 }
    );
  }

  // Verify the job belongs to this org
  const existing = await getJob(org.id, jobId);
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // ── Conflict re-check ──────────────────────────────────────────────────────
  // Another job may have been scheduled into this slot since the suggestion
  // was generated. Reject stale approvals so we never double-book.
  const conflict = await checkSlotConflict(org.id, jobId, scheduledStart, scheduledEnd);
  if (conflict) {
    return NextResponse.json(
      {
        error: `Scheduling conflict: ${conflict}. This slot was taken after JoJo suggested it. Please ask JoJo for a new suggestion.`,
        code: "SLOT_CONFLICT",
      },
      { status: 409 }
    );
  }

  const job = await updateJob(org.id, user.id, jobId, {
    scheduledStart,
    scheduledEnd,
    status: existing.status === "draft" ? "scheduled" : existing.status,
  });

  await logActivity({
    organizationId: org.id,
    actorId: user.id,
    action: "job.scheduled",
    entityType: "job",
    entityId: jobId,
    metadata: {
      scheduledStart: job.scheduledStart,
      scheduledEnd: job.scheduledEnd,
      via: "jojo_suggestion",
    },
  });

  return NextResponse.json({
    id: job.id,
    title: job.title,
    scheduledStart: job.scheduledStart,
    scheduledEnd: job.scheduledEnd,
    status: job.status,
  });
}
