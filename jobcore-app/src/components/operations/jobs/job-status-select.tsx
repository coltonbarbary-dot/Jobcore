"use client";

import { useState, useTransition } from "react";
import { updateJobStatusAction } from "@/app/(app)/operations/jobs/actions";
import type { JobStatus } from "@prisma/client";

const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface JobStatusSelectProps {
  jobId: string;
  currentStatus: JobStatus;
}

export function JobStatusSelect({ jobId, currentStatus }: JobStatusSelectProps) {
  const [status, setStatus] = useState<JobStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as JobStatus;
    setError(null);
    startTransition(async () => {
      const result = await updateJobStatusAction(jobId, newStatus);
      if (result?.error) {
        setError(result.error);
      } else {
        setStatus(newStatus);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={isPending}
        className="text-sm border border-[#e5e7eb] rounded-md px-3 py-1.5 bg-white text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-transparent disabled:opacity-50"
      >
        {JOB_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
    </div>
  );
}
