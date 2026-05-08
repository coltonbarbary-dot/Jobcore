import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      {icon && (
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#f3f4f6] mb-4 text-[#9ca3af]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#0a0a0a]">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[#6b7280] max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
}
