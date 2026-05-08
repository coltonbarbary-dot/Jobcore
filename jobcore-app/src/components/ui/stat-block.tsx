import * as React from "react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

interface StatBlockProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatBlock({ stats, columns = 2, className }: StatBlockProps) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid divide-x divide-y divide-[#e5e7eb] border border-[#e5e7eb] rounded-lg overflow-hidden", colClass, className)}>
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col gap-0.5 bg-white px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#9ca3af]">
            {stat.label}
          </p>
          <p className="text-xl font-semibold text-[#0a0a0a] leading-tight tabular-nums">
            {stat.value}
          </p>
          {stat.sub && (
            <p className="text-xs text-[#6b7280]">{stat.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
