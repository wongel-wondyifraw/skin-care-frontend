"use client";

import { formatMoney } from "@/lib/format";
import {
  clampDiscountPercent,
  hasShopDiscount,
  shopSalePrice,
  type PricedItem,
} from "@/lib/shop-pricing";
import { cn } from "@/lib/utils";

type ShopPriceProps = {
  item: PricedItem;
  className?: string;
  size?: "sm" | "md";
  light?: boolean;
  /** Hide the −% chip when a separate corner badge is shown */
  hideBadge?: boolean;
};

/** Bold corner sale mark for product images. */
export function ShopSaleBadge({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const pct = clampDiscountPercent(percent);
  if (pct <= 0) return null;

  return (
    <span
      className={cn(
        "pointer-events-none absolute top-0 right-0 z-[1] flex min-w-[2.75rem] flex-col items-center justify-center rounded-bl-xl bg-rose-600 px-2 py-1.5 text-center shadow-md",
        className,
      )}
      aria-label={`${pct}% off`}
    >
      <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-rose-50/90">
        Sale
      </span>
      <span className="text-[13px] font-extrabold leading-none text-white tabular-nums">
        −{pct}%
      </span>
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
  const pct = clampDiscountPercent(item.discountPercent);
  const sale = shopSalePrice(item);
  const onSale = hasShopDiscount(item);

  if (!onSale) {
    return (
      <span
        className={cn(
          "font-semibold",
          size === "md" ? "text-lg" : "text-[11px]",
          light ? "text-white" : "text-foreground",
          className,
        )}
      >
        {formatMoney(sale)}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5", className)}
    >
      <span
        className={cn(
          "font-extrabold tabular-nums",
          size === "md" ? "text-lg" : "text-[12px]",
          light ? "text-white" : "text-rose-700",
        )}
      >
        {formatMoney(sale)}
      </span>
      <span
        className={cn(
          "line-through decoration-2 opacity-80",
          size === "md" ? "text-sm" : "text-[10px]",
          light ? "text-white/75" : "text-muted-foreground",
        )}
      >
        {formatMoney(Number(item.price) || 0)}
      </span>
      {!hideBadge && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-extrabold uppercase tracking-wide",
            size === "md" ? "text-[11px]" : "text-[9px]",
            light
              ? "bg-rose-500 text-white"
              : "bg-rose-600 text-white",
          )}
        >
          −{pct}%
        </span>
      )}
    </span>
  );
}
