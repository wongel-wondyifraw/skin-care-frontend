"use client";

import { useEffect, useState } from "react";
import { shopFetchSupportPhone } from "@/lib/shop-api";

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
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors ${className}`}
      >
        <span>📞</span>
        <span>Need help? Call {phone}</span>
      </a>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-lg text-emerald-700 font-bold shrink-0">
          📞
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-950">
            Customer Support
          </p>
          <p className="text-xs text-emerald-800/80">
            Questions about your order, products, or payment?
          </p>
        </div>
      </div>
      <a
        href={`tel:${phone}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors shrink-0"
      >
        <span>Call {phone}</span>
      </a>
    </div>
  );
}
