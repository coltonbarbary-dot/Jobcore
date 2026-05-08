import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { SectionLabel } from "@/components/ui/section-label";
import Link from "next/link";
import {
  DollarSign,
  Briefcase,
  FileText,
  Users,
  TrendingUp,
  ChevronRight,
  ClipboardList,
  UserCheck,
  Receipt,
} from "lucide-react";

export default async function DashboardPage() {
  const { org } = await requireOrg();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeJobs,
    totalCustomers,
    openEstimates,
    outstandingInvoices,
    revenueMtd,
    recentActivity,
  ] = await Promise.all([
    db.job.count({
      where: { organizationId: org.id, status: { in: ["scheduled", "in_progress"] } },
    }),
    db.customer.count({ where: { organizationId: org.id } }),
    db.estimate.count({
      where: { organizationId: org.id, status: { in: ["draft", "sent", "viewed"] } },
    }),
    db.invoice.aggregate({
      where: { organizationId: org.id, status: { in: ["sent", "viewed", "partial", "overdue"] } },
      _sum: { amountDue: true },
    }),
    db.payment.aggregate({
      where: { organizationId: org.id, status: "succeeded", paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.activityLog.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const outstanding = Number(outstandingInvoices._sum.amountDue ?? 0);
  const revenue = Number(revenueMtd._sum.amount ?? 0);

  const fmt = (n: number) =>
    n > 0 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—";

  return (
    <PageShell title={`Good ${greeting()}, ${org.name.split(" ")[0]}`}>
      <div className="space-y-6 max-w-2xl mx-auto">

        {/* ── KPI grid — 2×2 hairline ── */}
        <section>
          <SectionLabel className="mb-3">This month</SectionLabel>
          <div className="grid grid-cols-2 divide-x divide-y divide-[#e5e7eb] border border-[#e5e7eb] rounded-xl overflow-hidden">
            <StatCell
              label="Revenue"
              value={fmt(revenue)}
              sub="MTD collected"
              icon={TrendingUp}
            />
            <StatCell
              label="Outstanding"
              value={fmt(outstanding)}
              sub="Unpaid invoices"
              icon={DollarSign}
            />
            <StatCell
              label="Active Jobs"
              value={activeJobs > 0 ? String(activeJobs) : "—"}
              sub="Scheduled · In Progress"
              icon={Briefcase}
            />
            <StatCell
              label="Open Estimates"
              value={openEstimates > 0 ? String(openEstimates) : "—"}
              sub="Draft · Sent · Viewed"
              icon={FileText}
            />
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <SectionLabel className="mb-3">Quick actions</SectionLabel>
          <Card>
            <CardContent className="p-0">
              {QUICK_ACTIONS.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 min-h-[52px] transition-colors hover:bg-[#f9fafb] active:bg-[#f3f4f6] ${
                    i < QUICK_ACTIONS.length - 1 ? "border-b border-[#f3f4f6]" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f4f6] shrink-0">
                    <item.icon className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-[#9ca3af] shrink-0" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* ── Recent Activity ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Recent activity</SectionLabel>
            <span className="text-[11px] text-[#9ca3af]">{totalCustomers} customer{totalCustomers !== 1 ? "s" : ""} total</span>
          </div>
          <Card>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="h-10 w-10 rounded-lg bg-[#f3f4f6] flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-[#9ca3af]" />
                  </div>
                  <p className="text-sm font-medium text-[#0a0a0a]">No activity yet</p>
                  <p className="mt-1 text-xs text-[#6b7280] max-w-xs">
                    Create a job, estimate, or customer to get started.
                  </p>
                </div>
              ) : (
                <ul>
                  {recentActivity.map((log, i) => (
                    <li
                      key={log.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        i < recentActivity.length - 1 ? "border-b border-[#f3f4f6]" : ""
                      }`}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-[#d1d5db] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#0a0a0a] truncate">{log.action}</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">
                          {capitalize(log.entityType)} · {relativeDate(log.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

      </div>
    </PageShell>
  );
}

/* ── Helpers ── */

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function relativeDate(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Sub-components ── */

const QUICK_ACTIONS = [
  { label: "New Lead",     href: "/operations/leads/new",     icon: UserCheck },
  { label: "New Job",      href: "/operations/jobs/new",      icon: Briefcase },
  { label: "New Estimate", href: "/operations/estimates/new", icon: FileText },
  { label: "New Invoice",  href: "/operations/invoices/new",  icon: Receipt },
  { label: "New Customer", href: "/operations/customers/new", icon: Users },
];

function StatCell({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-1 bg-white px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">{label}</p>
        <Icon className="h-3.5 w-3.5 text-[#d1d5db] shrink-0" />
      </div>
      <p className="text-2xl font-semibold text-[#0a0a0a] tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-[#9ca3af] leading-tight">{sub}</p>
    </div>
  );
}
