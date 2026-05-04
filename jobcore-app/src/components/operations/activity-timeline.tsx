import { type ActivityLog } from "@prisma/client";
import { formatRelativeTime } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  "customer.created": "Customer created",
  "customer.updated": "Customer updated",
  "customer.deleted": "Customer deleted",
  "lead.created": "Lead created",
  "lead.updated": "Lead updated",
  "lead.status_changed": "Status changed",
  "lead.converted": "Lead converted",
  "lead.deleted": "Lead deleted",
  "job.created": "Job created",
  "job.updated": "Job updated",
  "job.status_changed": "Status changed",
  "job.scheduled": "Job scheduled",
  "job.deleted": "Job deleted",
  "invoice.created": "Invoice created",
  "invoice.sent": "Invoice sent",
  "payment.received": "Payment received",
  "file.uploaded": "File uploaded",
  "file.renamed": "File renamed",
  "file.deleted": "File deleted",
};

function getActionDetail(log: ActivityLog): string | null {
  const meta = log.metadata as Record<string, unknown> | null;
  if (!meta) return null;

  if (log.action === "lead.status_changed" || log.action === "job.status_changed") {
    return `${String(meta.from)} → ${String(meta.to)}`;
  }
  if (log.action === "lead.converted" && meta.customerName) {
    return `Customer: ${String(meta.customerName)}${meta.jobTitle ? ` · Job: ${String(meta.jobTitle)}` : ""}`;
  }
  return null;
}

interface ActivityTimelineProps {
  logs: ActivityLog[];
}

export function ActivityTimeline({ logs }: ActivityTimelineProps) {
  if (logs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#9ca3af]">No activity recorded yet.</p>
    );
  }

  return (
    <ol className="relative border-l border-[#e5e7eb] ml-3 space-y-6">
      {logs.map((log) => {
        const label = ACTION_LABELS[log.action] ?? log.action;
        const detail = getActionDetail(log);
        const actorLabel = log.actorType === "jojo" ? "JoJo" : log.actorType === "system" ? "System" : "You";

        return (
          <li key={log.id} className="ml-4">
            <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#d1d5db]" />
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">{label}</p>
              {detail && <p className="text-xs text-[#6b7280] mt-0.5">{detail}</p>}
              <p className="text-xs text-[#9ca3af] mt-0.5">
                {actorLabel} · {formatRelativeTime(log.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
