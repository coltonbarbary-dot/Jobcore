import * as React from "react";
import { cn } from "@/lib/utils";

interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  divider?: boolean;
  children: React.ReactNode;
}

export function ListRow({ leading, trailing, divider = true, children, className, ...props }: ListRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 min-h-[56px] px-4 bg-white",
        divider && "border-b border-[#e5e7eb] last:border-b-0",
        className
      )}
      {...props}
    >
      {leading && (
        <div className="shrink-0 text-[#6b7280]">{leading}</div>
      )}
      <div className="flex-1 min-w-0">{children}</div>
      {trailing && (
        <div className="shrink-0 text-[#9ca3af]">{trailing}</div>
      )}
    </div>
  );
}

interface ListRowLabelProps {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}

export function ListRowLabel({ primary, secondary }: ListRowLabelProps) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-[#0a0a0a] truncate">{primary}</p>
      {secondary && (
        <p className="text-xs text-[#6b7280] truncate">{secondary}</p>
      )}
    </div>
  );
}
