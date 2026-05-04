import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#0a0a0a] text-white",
        secondary: "bg-[#f3f4f6] text-[#374151]",
        success: "bg-[#f0fdf4] text-[#16a34a]",
        warning: "bg-[#fffbeb] text-[#d97706]",
        danger: "bg-[#fef2f2] text-[#dc2626]",
        info: "bg-[#eff6ff] text-[#2563eb]",
        outline: "border border-[#e5e7eb] text-[#374151]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
