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
};

export function ShopPrice({
  item,
  className,
  size = "sm",
  light = false,
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
          light ? "text-white" : "text-primary",
          className,
        )}
      >
        {formatMoney(sale)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "font-semibold",
          size === "md" ? "text-lg" : "text-[11px]",
          light ? "text-white" : "text-primary",
        )}
      >
        {formatMoney(sale)}
      </span>
      <span
        className={cn(
          "line-through opacity-70",
          size === "md" ? "text-sm" : "text-[10px]",
          light ? "text-white/80" : "text-muted-foreground",
        )}
      >
        {formatMoney(Number(item.price) || 0)}
      </span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 font-semibold",
          size === "md" ? "text-[11px]" : "text-[9px]",
          light
            ? "bg-white/20 text-white"
            : "bg-primary/10 text-primary",
        )}
      >
        −{pct}%
      </span>
    </span>
  );
}
