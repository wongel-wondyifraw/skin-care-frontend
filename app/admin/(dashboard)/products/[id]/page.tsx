"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Tag,
  Layers,
  Droplets,
  Calendar,
  Banknote,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { useNetwork } from "@/components/NetworkProvider";
import { isNetworkError } from "@/lib/errors";

type Category = { id: string; name: string };
type SkinType = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  brand?: string | null;
  description: string | null;
  image: string;
  categoryId?: string | null;
  category?: Category | null;
  skinTypeId?: string | null;
  skinType?: SkinType | null;
  skinTypes?: SkinType[];
  stock: number;
  price: number;
  createdAt: string;
};

function skinLabels(prod: Product): string[] {
  if (prod.skinTypes?.length) return prod.skinTypes.map((s) => s.name);
  if (prod.skinType?.name) return [prod.skinType.name];
  return ["All"];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
  if (stock < 10) {
    return (
      <Badge variant="outline" className="border-primary/40 text-primary">
        {stock} — Low stock
      </Badge>
    );
  }
  return <Badge variant="secondary">{stock} in stock</Badge>;
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Tag;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-0">
      <div className="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await apiFetch<Product>(`/products/${id}`, {
          toastOnError: false,
        });
        if (cancelled) return;
        setProduct(data);
        clearNetworkError();
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load product.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, reconnectKey, clearNetworkError, reportNetworkError]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm text-destructive" role="alert">
          {error ?? "Product not found."}
        </p>
        <Button variant="outline" onClick={() => router.push("/admin/products")}>
          <ArrowLeft className="size-4" />
          Back to products
        </Button>
      </div>
    );
  }

  const skins = skinLabels(product);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/admin/products">
          <ArrowLeft className="size-4" />
          Products
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        <div>
          <ProductImagePreview
            src={product.image}
            alt={product.name}
            variant="hero"
          />
          <p className="mt-2 text-xs text-muted-foreground md:hidden">
            Tap the image to view it full screen.
          </p>
        </div>

        <div className="min-w-0">
          <div className="mb-5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground text-balance">
              {product.name}
            </h1>
            {product.brand?.trim() && (
              <p className="mt-1 text-sm text-muted-foreground">
                by{" "}
                <span className="text-foreground font-medium">
                  {product.brand.trim()}
                </span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StockBadge stock={product.stock} />
              <span className="text-lg font-semibold text-foreground">
                {product.price != null
                  ? `${Number(product.price).toFixed(2)} ETB`
                  : "Price not set"}
              </span>
            </div>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-5">
              <InfoRow icon={Banknote} label="Price">
                {product.price != null
                  ? `${Number(product.price).toFixed(2)} ETB`
                  : "—"}
              </InfoRow>
              <InfoRow icon={Package} label="Stock">
                {product.stock} units
              </InfoRow>
              <InfoRow icon={Tag} label="Brand">
                {product.brand?.trim() || (
                  <span className="text-muted-foreground">Not specified</span>
                )}
              </InfoRow>
              <InfoRow icon={Layers} label="Category">
                {product.category?.name ?? (
                  <span className="text-muted-foreground">Uncategorized</span>
                )}
              </InfoRow>
              <InfoRow icon={Droplets} label="Skin types">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {skins.map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="text-[11px] font-normal"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </InfoRow>
              <InfoRow icon={Calendar} label="Added">
                {formatDate(product.createdAt)}
              </InfoRow>
            </CardContent>
          </Card>

          <div className="mt-5">
            <h2 className="text-sm font-semibold text-foreground mb-2">
              Description
            </h2>
            {product.description?.trim() ? (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {product.description.trim()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description provided.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
