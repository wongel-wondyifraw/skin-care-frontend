"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { useShopCart } from "@/components/shop/ShopCartProvider";
import type { ShopProduct } from "@/components/shop/ShopProductTile";
import { ShopPrice, ShopSaleBadge } from "@/components/shop/ShopPrice";
import { ShopBackLink } from "@/components/shop/ShopBackLink";
import { ShopProductDescription } from "@/components/shop/ShopProductDescription";
import { shopFetch, ShopApiError } from "@/lib/shop-api";
import { activeDiscountPercent } from "@/lib/shop-pricing";
import { flyImageToCart } from "@/lib/fly-to-cart";

export default function ShopProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { status, error: authError, retry } = useShopAuth();
  const { addItem } = useShopCart();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

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

  function handleAddToCart() {
    if (!product) return;
    const img = document.querySelector<HTMLElement>(
      `[data-detail-image="${product.id}"]`,
    );
    flyImageToCart(img, product.image);
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      price: Number(product.price) || 0,
      discountPercent: Number(product.discountPercent) || 0,
      discountEndsAt: product.discountEndsAt ?? null,
      stock: product.stock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  function handleOrderNow() {
    if (!product) return;
    router.push(
      `/shop/checkout?productId=${encodeURIComponent(product.id)}&qty=1`,
    );
  }

  if (status === "loading" || (status === "ready" && loading)) {
    return (
      <div className="mx-auto max-w-lg space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
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
  const out = product.stock <= 0;

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="space-y-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
        <ShopBackLink href="/shop" label="Catalog" />

        <div
          className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
          data-detail-image={product.id}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 512px"
            priority
          />
          {out && (
            <div className="absolute top-3 left-3 z-[1]">
              <Badge variant="destructive" className="text-[11px]">
                Out of stock
              </Badge>
            </div>
          )}
          <ShopSaleBadge
            percent={activeDiscountPercent(
              product.discountPercent,
              product.discountEndsAt,
            )}
            endsAt={product.discountEndsAt}
          />
        </div>

        <div className="space-y-2.5">
          {product.brand?.trim() && (
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {product.brand.trim()}
            </p>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-balance">
            {product.name}
          </h1>
          <ShopPrice item={product} size="md" hideBadge />
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
        </div>

        {product.description?.trim() && (
          <ShopProductDescription text={product.description} />
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto border-t border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
          <div className="mx-auto grid max-w-lg grid-cols-2 gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2"
              disabled={out}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="size-4" />
              {out ? "Unavailable" : added ? "Added" : "Add to cart"}
            </Button>
            <Button
              type="button"
              className="h-11 gap-2"
              disabled={out}
              onClick={handleOrderNow}
            >
              <ShoppingBag className="size-4" />
              Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
