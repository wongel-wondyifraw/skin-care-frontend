"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/StockBadge";
import { formatMoney } from "@/lib/format";

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
};

function skinLabels(prod: ShopProduct) {
  if (prod.skinTypes?.length) return prod.skinTypes.map((s) => s.name).join(", ");
  return prod.skinType?.name ?? "All";
}

type ShopProductTileProps = {
  prod: ShopProduct;
  priority?: boolean;
  orderingId: string | null;
  onOrder: (p: ShopProduct) => void;
};

export function ShopProductTile({
  prod,
  priority = false,
  orderingId,
  onOrder,
}: ShopProductTileProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md active:scale-[0.99]">
      <Link
        href={`/shop/${prod.id}`}
        className="relative block aspect-[3/4] overflow-hidden bg-muted no-underline"
      >
        <Image
          src={prod.image}
          alt={prod.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, 33vw"
          priority={priority}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute top-2 left-2 right-2">
          <StockBadge stock={prod.stock} />
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[11px] font-semibold text-white drop-shadow-sm line-clamp-1">
            {prod.price != null ? formatMoney(Number(prod.price)) : ""}
          </p>
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

        <Button
          type="button"
          size="sm"
          className="mt-auto h-8 w-full text-xs"
          disabled={prod.stock <= 0 || orderingId === prod.id}
          onClick={() => onOrder(prod)}
        >
          {prod.stock <= 0 ? "Out of stock" : orderingId === prod.id ? "Opening…" : "Order"}
        </Button>
      </div>
    </article>
  );
}
