import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f9fafb] text-center p-6">
      <p className="text-5xl font-bold text-[#e5e7eb] mb-4">404</p>
      <h1 className="text-base font-semibold text-[#0a0a0a] mb-1">Page not found</h1>
      <p className="text-sm text-[#6b7280] mb-6">This page doesn&apos;t exist or has been moved.</p>
      <Button asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
