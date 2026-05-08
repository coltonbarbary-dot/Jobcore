import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  narrow?: boolean;
}

export function PageContainer({ children, narrow = false, className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto px-4 md:px-6",
        narrow ? "max-w-3xl" : "max-w-6xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
