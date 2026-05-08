import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionLabelProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function SectionLabel({ className, children, ...props }: SectionLabelProps) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
