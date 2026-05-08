import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#0a0a0a] placeholder:text-[#9ca3af] transition-colors",
          "focus:outline-none focus:outline-2 focus:outline-offset-0 focus:outline-[#0a0a0a] focus:border-[#0a0a0a]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#f9fafb]",
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
