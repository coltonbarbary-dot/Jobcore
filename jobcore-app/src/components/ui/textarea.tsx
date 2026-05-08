import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#0a0a0a] placeholder:text-[#9ca3af] transition-colors",
        "focus:outline-none focus:outline-2 focus:outline-offset-0 focus:outline-[#0a0a0a] focus:border-[#0a0a0a]",
        "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
