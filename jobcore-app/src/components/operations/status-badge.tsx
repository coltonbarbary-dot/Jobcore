import { Badge } from "@/components/ui/badge";
import { type LeadStatus, type JobStatus, type JobPriority } from "@prisma/client";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger" | "info" | "outline";

const LEAD_STATUS_MAP: Record<LeadStatus, { label: string; variant: BadgeVariant }> = {
  new: { label: "New", variant: "info" },
  contacted: { label: "Contacted", variant: "warning" },
  qualified: { label: "Qualified", variant: "success" },
  converted: { label: "Converted", variant: "default" },
  lost: { label: "Lost", variant: "danger" },
};

const JOB_STATUS_MAP: Record<JobStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "secondary" },
  scheduled: { label: "Scheduled", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  on_hold: { label: "On Hold", variant: "outline" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const JOB_PRIORITY_MAP: Record<JobPriority, { label: string; variant: BadgeVariant }> = {
  low: { label: "Low", variant: "secondary" },
  normal: { label: "Normal", variant: "outline" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "danger" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { label, variant } = LEAD_STATUS_MAP[status] ?? { label: status, variant: "secondary" as BadgeVariant };
  return <Badge variant={variant}>{label}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { label, variant } = JOB_STATUS_MAP[status] ?? { label: status, variant: "secondary" as BadgeVariant };
  return <Badge variant={variant}>{label}</Badge>;
}

export function JobPriorityBadge({ priority }: { priority: JobPriority }) {
  const { label, variant } = JOB_PRIORITY_MAP[priority] ?? { label: priority, variant: "secondary" as BadgeVariant };
  return <Badge variant={variant}>{label}</Badge>;
}
