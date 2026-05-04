import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listCustomers } from "@/lib/services/customers";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/operations/empty-state";
import { formatDate } from "@/lib/utils";

export default async function CustomersPage() {
  const { org } = await requireOrg();
  const customers = await listCustomers(org.id);

  return (
    <PageShell
      title="Customers"
      description={customers.length > 0 ? `${customers.length} customer${customers.length !== 1 ? "s" : ""}` : undefined}
      action={
        <Button size="sm" asChild>
          <Link href="/operations/customers/new">+ New Customer</Link>
        </Button>
      }
    >
      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start tracking jobs, estimates, and invoices."
          actionLabel="New Customer"
          actionHref="/operations/customers/new"
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Jobs</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/operations/customers/${c.id}`} className="font-medium text-[#0a0a0a] hover:underline">
                      {c.fullName}
                    </Link>
                    {c.companyName && (
                      <p className="text-xs text-[#9ca3af] mt-0.5">{c.companyName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[#6b7280] hidden md:table-cell">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="text-xs font-medium text-[#374151] bg-[#f3f4f6] rounded-full px-2 py-0.5">
                      {c._count.jobs}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#9ca3af] hidden lg:table-cell">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
