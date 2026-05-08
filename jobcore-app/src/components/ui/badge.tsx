import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "border border-[#0a0a0a] text-[#0a0a0a]",
        filled:      "bg-[#0a0a0a] text-white",
        secondary:   "border border-[#e5e7eb] text-[#374151]",
        success:     "border border-[#bbf7d0] text-[#16a34a] bg-[#f0fdf4]",
        warning:     "border border-[#fde68a] text-[#d97706] bg-[#fffbeb]",
        danger:      "border border-[#fecaca] text-[#dc2626] bg-[#fef2f2]",
        info:        "border border-[#bfdbfe] text-[#2563eb] bg-[#eff6ff]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
