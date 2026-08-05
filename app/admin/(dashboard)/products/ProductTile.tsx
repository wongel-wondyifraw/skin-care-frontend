import Image from "next/image";
import Link from "next/link";
import { Pencil, Trash2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/StockBadge";
import { formatMoney } from "@/lib/format";
import type { Product } from "./types";
import { productSkinLabels } from "./types";

type ProductTileProps = {
  prod: Product;
  deletingId: string | null;
  priority?: boolean;
  onRestock: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
};

export function ProductTile({
  prod,
  deletingId,
  priority = false,
  onRestock,
  onEdit,
  onDelete,
}: ProductTileProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md active:scale-[0.99]">
      <Link
        href={`/admin/products/${prod.id}`}
        className="relative block aspect-[3/4] sm:aspect-[4/5] overflow-hidden bg-muted no-underline"
      >
        <Image
          src={prod.image}
          alt={prod.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
          <StockBadge stock={prod.stock} />
        </div>
        <div className="absolute bottom-2 left-2 right-2 sm:hidden">
          <p className="text-[11px] font-semibold text-white drop-shadow-sm line-clamp-1">
            {prod.price != null ? formatMoney(Number(prod.price)) : ""}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-3.5">
        {prod.brand?.trim() && (
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-muted-foreground truncate">
            {prod.brand.trim()}
          </p>
        )}
        <Link
          href={`/admin/products/${prod.id}`}
          className="text-[13px] sm:text-sm font-semibold text-foreground leading-snug line-clamp-2 no-underline hover:text-primary"
        >
          {prod.name}
        </Link>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">
          {[prod.category?.name, productSkinLabels(prod)].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-auto pt-0.5 hidden sm:flex items-end justify-between gap-2">
          <p className="text-base font-semibold tracking-tight">
            {prod.price != null ? formatMoney(Number(prod.price)) : "—"}
          </p>
        </div>

        <div className="flex items-center gap-1 pt-1.5 border-t border-border/80">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-[11px] sm:text-xs px-2"
            onClick={() => onRestock(prod)}
            aria-label={`Restock ${prod.name}`}
          >
            <PackagePlus className="size-3.5" />
            <span className="sm:inline">Restock</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-8"
            onClick={() => onEdit(prod)}
            aria-label={`Edit ${prod.name}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(prod)}
            disabled={deletingId === prod.id}
            aria-label={`Delete ${prod.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
