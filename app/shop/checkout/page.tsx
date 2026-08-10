import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
