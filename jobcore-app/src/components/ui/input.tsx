import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-1 text-sm text-[#0a0a0a] placeholder:text-[#9ca3af] transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
