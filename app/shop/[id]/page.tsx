"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StockBadge } from "@/components/StockBadge";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import type { ShopProduct } from "@/components/shop/ShopProductTile";
import { shopFetch, ShopApiError } from "@/lib/shop-api";
import { formatMoney } from "@/lib/format";

export default function ShopProductDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { status, error: authError, retry, requestOrder } = useShopAuth();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (status !== "ready" || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await shopFetch<ShopProduct>(`/shop/products/${id}`);
        if (!cancelled) setProduct(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ShopApiError ? err.message : "Failed to load product.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, id]);

  function handleOrder() {
    if (!product) return;
    setOrdering(true);
    requestOrder(product.id);
    window.setTimeout(() => setOrdering(false), 1500);
  }

  if (status === "loading" || (status === "ready" && loading)) {
    return (
      <div className="mx-auto max-w-lg space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-3">
        <h1 className="text-lg font-semibold">Sign in required</h1>
        <p className="text-sm text-muted-foreground">{authError}</p>
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center">
        <p className="text-sm text-destructive">{error || "Product not found."}</p>
        <Button asChild variant="outline">
          <Link href="/shop">Back to catalog</Link>
        </Button>
      </div>
    );
  }

  const skins =
    product.skinTypes?.length
      ? product.skinTypes.map((s) => s.name)
      : product.skinType?.name
        ? [product.skinType.name]
        : ["All"];

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
        <Link href="/shop">
          <ArrowLeft className="size-3.5" />
          Catalog
        </Link>
      </Button>

      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 512px"
          priority
        />
        <div className="absolute top-3 left-3">
          <StockBadge stock={product.stock} />
        </div>
      </div>

      <div className="space-y-2">
        {product.brand?.trim() && (
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {product.brand.trim()}
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
        <p className="text-lg font-semibold text-primary">
          {formatMoney(Number(product.price))}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {product.category?.name && (
            <Badge variant="secondary">{product.category.name}</Badge>
          )}
          {skins.map((name) => (
            <Badge key={name} variant="outline">
              {name}
            </Badge>
          ))}
        </div>
        {product.description?.trim() && (
          <p className="text-sm text-muted-foreground leading-relaxed pt-1">
            {product.description.trim()}
          </p>
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={product.stock <= 0 || ordering}
        onClick={handleOrder}
      >
        {product.stock <= 0
          ? "Out of stock"
          : ordering
            ? "Opening Telegram…"
            : "Order in Telegram"}
      </Button>
    </div>
  );
}
