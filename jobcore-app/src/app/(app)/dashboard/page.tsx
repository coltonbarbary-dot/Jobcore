import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSign,
  Briefcase,
  FileText,
  Users,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const { org } = await requireOrg();

  // Live KPI queries — no fake data
  const [
    activeJobs,
    totalCustomers,
    draftEstimates,
    outstandingInvoices,
  ] = await Promise.all([
    db.job.count({
      where: {
        organizationId: org.id,
        status: { in: ["scheduled", "in_progress"] },
      },
    }),
    db.customer.count({
      where: { organizationId: org.id },
    }),
    db.estimate.count({
      where: {
        organizationId: org.id,
        status: { in: ["draft", "sent"] },
      },
    }),
    db.invoice.aggregate({
      where: {
        organizationId: org.id,
        status: { in: ["sent", "partial", "overdue"] },
      },
      _sum: { amountDue: true },
    }),
  ]);

  const outstanding = Number(outstandingInvoices._sum.amountDue ?? 0);

  // Recent activity
  const recentActivity = await db.activityLog.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <PageShell title="Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <KpiCard
          title="Outstanding"
          value={outstanding > 0 ? `$${outstanding.toLocaleString()}` : "—"}
          icon={DollarSign}
          description="Unpaid invoices"
        />
        <KpiCard
          title="Active Jobs"
          value={activeJobs > 0 ? String(activeJobs) : "—"}
          icon={Briefcase}
          description="Scheduled or in progress"
        />
        <KpiCard
          title="Open Estimates"
          value={draftEstimates > 0 ? String(draftEstimates) : "—"}
          icon={FileText}
          description="Draft or awaiting approval"
        />
        <KpiCard
          title="Customers"
          value={totalCustomers > 0 ? String(totalCustomers) : "—"}
          icon={Users}
          description="Total customer records"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-[#0a0a0a] mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <QuickAction href="/operations/leads" label="New Lead" />
            <QuickAction href="/operations/customers" label="New Customer" />
            <QuickAction href="/operations/jobs" label="New Job" />
            <QuickAction href="/operations/estimates" label="New Estimate" />
            <QuickAction href="/operations/invoices" label="New Invoice" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-[#0a0a0a] mb-3">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-medium text-[#0a0a0a]">No activity yet</p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    Actions you take will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#f3f4f6]">
                  {recentActivity.map((log) => (
                    <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#9ca3af] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#0a0a0a] truncate">{log.action}</p>
                        <p className="text-xs text-[#9ca3af]">
                          {log.entityType} · {new Date(log.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-[#6b7280]">{title}</CardTitle>
          <Icon className="h-4 w-4 text-[#9ca3af]" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-2xl font-bold text-[#0a0a0a]">{value}</p>
        <p className="mt-0.5 text-xs text-[#9ca3af]">{description}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="secondary" className="w-full justify-between" asChild>
      <Link href={href}>
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Button>
  );
}
