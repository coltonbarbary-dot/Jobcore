import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const accentCardVariants = cva(
  "rounded-lg border bg-white border-l-4 p-4",
  {
    variants: {
      intent: {
        default: "border-[#e5e7eb] border-l-[#0a0a0a]",
        success: "border-[#bbf7d0] border-l-[#16a34a] bg-[#f0fdf4]",
        warning: "border-[#fde68a] border-l-[#d97706] bg-[#fffbeb]",
        danger:  "border-[#fecaca] border-l-[#dc2626] bg-[#fef2f2]",
        info:    "border-[#bfdbfe] border-l-[#2563eb] bg-[#eff6ff]",
      },
    },
    defaultVariants: {
      intent: "default",
    },
  }
);

export interface AccentCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof accentCardVariants> {}

export function AccentCard({ className, intent, ...props }: AccentCardProps) {
  return (
    <div className={cn(accentCardVariants({ intent }), className)} {...props} />
  );
}
