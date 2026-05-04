import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ title, description, action, children, className }: PageShellProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-[#0a0a0a]">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-[#6b7280]">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

export function ComingSoonPage({ title, description }: { title: string; description?: string }) {
  return (
    <PageShell title={title}>
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f4f6] mb-4">
          <svg className="h-6 w-6 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-[#0a0a0a]">Coming Soon</h2>
        <p className="mt-1 text-sm text-[#6b7280] max-w-sm">
          {description ?? `${title} will be available in a future update.`}
        </p>
      </div>
    </PageShell>
  );
}
