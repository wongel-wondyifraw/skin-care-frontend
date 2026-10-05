"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShopPrice, ShopSaleBadge } from "@/components/shop/ShopPrice";
import { activeDiscountPercent } from "@/lib/shop-pricing";
import { flyImageToCart } from "@/lib/fly-to-cart";

export type ShopProduct = {
  id: string;
  name: string;
  brand?: string | null;
  description: string | null;
  image: string;
  category?: { id: string; name: string } | null;
  skinType?: { id: string; name: string } | null;
  skinTypes?: { id: string; name: string }[];
  stock: number;
  price: number;
  discountPercent?: number;
  discountEndsAt?: string | null;
};

function skinLabels(prod: ShopProduct) {
  if (prod.skinTypes?.length) return prod.skinTypes.map((s) => s.name).join(", ");
  return prod.skinType?.name ?? "All";
}

type ShopProductTileProps = {
  prod: ShopProduct;
  priority?: boolean;
  onAddToCart: (p: ShopProduct, sourceEl?: HTMLElement | null) => void;
  onOrderNow: (p: ShopProduct) => void;
};

function ShopProductTileComponent({
  prod,
  priority = false,
  onAddToCart,
  onOrderNow,
}: ShopProductTileProps) {
  const out = prod.stock <= 0;
  const salePct = activeDiscountPercent(
    prod.discountPercent,
    prod.discountEndsAt,
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md active:scale-[0.99]">
      <Link
        href={`/shop/${prod.id}`}
        className="relative block aspect-[3/4] overflow-hidden bg-muted no-underline"
        data-product-image={prod.id}
      >
        <Image
          src={prod.image}
          alt={prod.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, 33vw"
          priority={priority}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />
        <ShopSaleBadge percent={salePct} endsAt={prod.discountEndsAt} />
        {out && (
          <div className="absolute top-2 left-2 z-[1]">
            <Badge variant="destructive" className="text-[10px]">
              Out of stock
            </Badge>
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2">
          <ShopPrice item={prod} light hideBadge />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        {prod.brand?.trim() && (
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">
            {prod.brand.trim()}
          </p>
        )}
        <Link
          href={`/shop/${prod.id}`}
          className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 no-underline hover:text-primary"
        >
          {prod.name}
        </Link>
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {[prod.category?.name, skinLabels(prod)].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-[11px] px-1 gap-1"
            disabled={out}
            onClick={(e) => {
              const img = (e.currentTarget
                .closest("article")
                ?.querySelector(
                  `[data-product-image="${prod.id}"]`,
                ) as HTMLElement | null) ?? e.currentTarget;
              flyImageToCart(img, prod.image);
              onAddToCart(prod, img);
            }}
          >
            {!out && (
              <ShoppingCart
                className="size-3.5 shrink-0 text-current"
                strokeWidth={2.25}
                aria-hidden
              />
            )}
            {out ? "Unavailable" : "Add"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-[11px] px-1 gap-1"
            disabled={out}
            onClick={() => onOrderNow(prod)}
          >
            <ShoppingBag
              className="size-3.5 shrink-0 text-current"
              strokeWidth={2.25}
              aria-hidden
            />
            Order
          </Button>
        </div>
      </div>
    </article>
  );
}

export const ShopProductTile = memo(ShopProductTileComponent);
