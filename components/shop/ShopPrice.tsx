"use client";

import { useEffect, useState } from "react";
import {
  activeDiscountPercent,
  formatCountdown,
  hasShopDiscount,
  shopSalePrice,
  type PricedItem,
} from "@/lib/shop-pricing";
import { Money } from "@/components/Money";
import { cn } from "@/lib/utils";

type ShopPriceProps = {
  item: PricedItem;
  className?: string;
  size?: "sm" | "md";
  light?: boolean;
  hideBadge?: boolean;
};

function useMsLeft(endsAt?: string | Date | null) {
  const [msLeft, setMsLeft] = useState(() => {
    if (!endsAt) return null;
    return Math.max(0, new Date(endsAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!endsAt) {
      setMsLeft(null);
      return;
    }
    const tick = () => {
      setMsLeft(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return msLeft;
}

/** Bold corner sale mark — shows countdown when time-bound. */
export function ShopSaleBadge({
  percent,
  endsAt,
  className,
}: {
  percent: number;
  endsAt?: string | Date | null;
  className?: string;
}) {
  const pct = activeDiscountPercent(percent, endsAt);
  const msLeft = useMsLeft(endsAt);
  if (pct <= 0) return null;

  const timed = endsAt != null && msLeft != null;

  return (
    <span
      className={cn(
        "pointer-events-none absolute top-0 right-0 z-[1] flex min-w-[3rem] flex-col items-center justify-center rounded-bl-xl bg-rose-600 px-2 py-1.5 text-center shadow-md",
        className,
      )}
      aria-label={
        timed
          ? `${pct}% off, ${formatCountdown(msLeft)} left`
          : `${pct}% off`
      }
    >
      <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-rose-50/90">
        Sale
      </span>
      <span className="text-[13px] font-extrabold leading-none text-white tabular-nums">
        −{pct}%
      </span>
      {timed && (
        <span className="mt-0.5 text-[9px] font-bold tabular-nums leading-none text-rose-50">
          {formatCountdown(msLeft)}
        </span>
      )}
    </span>
  );
}

export function ShopPrice({
  item,
  className,
  size = "sm",
  light = false,
  hideBadge = false,
}: ShopPriceProps) {
  const pct = activeDiscountPercent(item.discountPercent, item.discountEndsAt);
  const sale = shopSalePrice(item);
  const onSale = hasShopDiscount(item);

  if (!onSale) {
    return (
      <Money
        amount={sale}
        size={size === "md" ? "md" : "xs"}
        light={light}
        className={cn(size === "sm" && !light && "text-[12px]", className)}
      />
    );
  }

  return (
    <span
      className={cn("inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5", className)}
    >
      <Money amount={sale} size={size === "md" ? "md" : "sm"} light={light} />
      <Money
        amount={Number(item.price) || 0}
        size={size === "md" ? "sm" : "xs"}
        muted
        className={light ? "text-white/75 line-through" : undefined}
      />
      {!hideBadge && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-extrabold uppercase tracking-wide",
            size === "md" ? "text-[11px]" : "text-[9px]",
            light ? "bg-rose-500 text-white" : "bg-rose-600 text-white",
          )}
        >
          −{pct}%
        </span>
      )}
    </span>
  );
}
