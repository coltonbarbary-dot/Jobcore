"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 text-center p-6">
      <h2 className="text-sm font-semibold text-[#0a0a0a] mb-1">Something went wrong</h2>
      <p className="text-xs text-[#6b7280] mb-4 max-w-sm">
        An unexpected error occurred. The error has been logged.
      </p>
      <Button variant="secondary" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
