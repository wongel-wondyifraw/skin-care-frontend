"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardError({
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
    <div className="flex flex-col items-start gap-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Page error</h1>
      <p className="max-w-lg text-sm text-muted-foreground">
        This page hit an unexpected error. Try again, or go back to the dashboard.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
