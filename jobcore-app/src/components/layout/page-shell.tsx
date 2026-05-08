import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ title, description, action, children, className }: PageShellProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-4 py-3 md:px-6 md:py-4">
        <div>
          <h1 className="text-base font-semibold text-[#0a0a0a] leading-snug">{title}</h1>
          {description && (
            <p className="mt-0.5 text-xs text-[#6b7280]">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 ml-4">{action}</div>}
      </div>

      {/* Page body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
    </div>
  );
}

export function ComingSoonPage({ title, description }: { title: string; description?: string }) {
  return (
    <PageShell title={title}>
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3f4f6] mb-3">
          <svg className="h-5 w-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-[#0a0a0a]">Coming Soon</h2>
        <p className="mt-1 text-xs text-[#6b7280] max-w-xs">
          {description ?? `${title} will be available in a future update.`}
        </p>
      </div>
    </PageShell>
  );
}
