import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutRoutePage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
    >
      <CheckoutClient />
    </Suspense>
  );
}
