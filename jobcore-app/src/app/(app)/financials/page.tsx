import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

type FeatureCard = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: true;
};

const FEATURES: FeatureCard[] = [
  {
    title: "Expenses",
    description: "Record and track business expenses, attach receipts, and filter by category or date range.",
    href: "/financials/expenses",
  },
  {
    title: "Reports",
    description: "View total revenue, outstanding invoices, expenses, and estimated net profit from real data.",
    href: "/financials/reports",
  },
  {
    title: "Tax Documents",
    description: "Organize tax forms, 1099s, and year-end documents.",
    comingSoon: true,
  },
  {
    title: "Bills",
    description: "Track recurring bills and vendor payments due.",
    comingSoon: true,
  },
  {
    title: "Budget",
    description: "Set spending budgets by category and monitor actuals.",
    comingSoon: true,
  },
  {
    title: "Payroll",
    description: "Manage team pay runs, hours, and payroll history.",
    comingSoon: true,
  },
];

export default function FinancialsPage() {
  return (
    <PageShell title="Financials" description="Financial tools for your business">
      <div className="max-w-3xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((card) => {
            if (card.comingSoon) {
              return (
                <div
                  key={card.title}
                  className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-5 opacity-60 cursor-default"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-[#374151]">{card.title}</h3>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-[#f3f4f6] border border-[#e5e7eb] text-[#9ca3af] px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-[#9ca3af] leading-relaxed">{card.description}</p>
                </div>
              );
            }

            return (
              <Link
                key={card.title}
                href={card.href!}
                className="rounded-xl border border-[#e5e7eb] bg-white p-5 hover:border-[#9ca3af] hover:shadow-sm transition-all group"
              >
                <h3 className="text-sm font-semibold text-[#0a0a0a] mb-2 group-hover:underline">
                  {card.title} →
                </h3>
                <p className="text-xs text-[#6b7280] leading-relaxed">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
