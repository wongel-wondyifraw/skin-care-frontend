import Link from "next/link";
import { Pencil, Trash2, PackagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/StockBadge";
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { Money } from "@/components/Money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "./types";
import { productSkinLabels } from "./types";

type ProductTableProps = {
  products: Product[];
  deletingId: string | null;
  onRestock: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
};

export function ProductTable({
  products,
  deletingId,
  onRestock,
  onEdit,
  onDelete,
}: ProductTableProps) {
  return (
    <>
      <div className="hidden md:block border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Skin Types</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="w-48">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((prod) => (
              <TableRow key={prod.id} className="group/row">
                <TableCell>
                  <ProductImagePreview src={prod.image} alt={prod.name} size="sm" />
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/products/${prod.id}`}
                    className="text-foreground no-underline hover:text-primary hover:underline underline-offset-2"
                  >
                    {prod.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {prod.brand?.trim() || <em className="opacity-50">—</em>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {prod.category?.name ?? <em className="opacity-50">—</em>}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px]">
                  <span className="line-clamp-2">{productSkinLabels(prod)}</span>
                </TableCell>
                <TableCell className="font-medium">
                  {prod.price != null ? (
                    <Money amount={Number(prod.price)} size="sm" />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <StockBadge stock={prod.stock} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRestock(prod)}
                      aria-label={`Restock ${prod.name}`}
                    >
                      <PackagePlus className="size-3.5" /> Restock
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onEdit(prod)}
                      aria-label={`Edit ${prod.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDelete(prod)}
                      disabled={deletingId === prod.id}
                      aria-label={`Delete ${prod.name}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex md:hidden flex-col gap-2">
        {products.map((prod) => (
          <div key={prod.id} className="flex gap-3 p-3 bg-card border border-border rounded-xl">
            <ProductImagePreview src={prod.image} alt={prod.name} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/admin/products/${prod.id}`}
                  className="text-sm font-medium text-foreground no-underline hover:text-primary"
                >
                  {prod.name}
                </Link>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onRestock(prod)}
                    aria-label={`Restock ${prod.name}`}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(prod)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(prod)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {[prod.brand?.trim(), prod.category?.name ?? "Uncategorized", productSkinLabels(prod)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-sm font-medium">
                  {prod.price != null ? (
                    <Money amount={Number(prod.price)} size="sm" />
                  ) : (
                    "—"
                  )}
                </span>
                <StockBadge stock={prod.stock} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
