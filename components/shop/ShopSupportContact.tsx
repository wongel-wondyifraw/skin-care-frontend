"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { shopFetchSupportPhone } from "@/lib/shop-api";
import { cn } from "@/lib/utils";

export function ShopSupportContact({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const [phone, setPhone] = useState("66XXXXXXXX");

  useEffect(() => {
    shopFetchSupportPhone()
      .then((res) => {
        if (res?.supportPhone) {
          setPhone(res.supportPhone);
        }
      })
      .catch(() => {});
  }, []);

  if (compact) {
    return (
      <a
        href={`tel:${phone}`}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors",
          className,
        )}
      >
        <Phone className="size-3.5 shrink-0" />
        <span>Need help? Call {phone}</span>
      </a>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 text-card-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Phone className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Customer Support
          </p>
          <p className="text-xs text-muted-foreground">
            Questions about your order, products, or payment?
          </p>
        </div>
      </div>
      <a
        href={`tel:${phone}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors shrink-0"
      >
        <Phone className="size-3.5" />
        <span>Call {phone}</span>
      </a>
    </div>
  );
}
