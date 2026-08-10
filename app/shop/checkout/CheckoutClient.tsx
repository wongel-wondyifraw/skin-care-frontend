"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { ShopCheckoutForm } from "@/components/shop/ShopCheckoutForm";
import type { ShopProduct } from "@/components/shop/ShopProductTile";
import { shopFetch, ShopApiError } from "@/lib/shop-api";

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId") ?? "";
  const qtyParam = Number(searchParams.get("qty") ?? "1");
  const quantity =
    Number.isFinite(qtyParam) && qtyParam > 0 ? Math.floor(qtyParam) : 1;

  const { status, error: authError, retry, customer } = useShopAuth();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ready" || !productId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await shopFetch<ShopProduct>(
          `/shop/products/${productId}`,
        );
        if (!cancelled) setProduct(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ShopApiError
              ? err.message
              : "Failed to load product.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, productId]);

  if (status === "loading" || (status === "ready" && loading)) {
    return (
      <div className="mx-auto max-w-lg space-y-3" aria-busy="true">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
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

  if (!productId || error || !product) {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center">
        <p className="text-sm text-destructive">
          {error || "Choose a product to order."}
        </p>
        <Button asChild variant="outline">
          <Link href="/shop">Back to catalog</Link>
        </Button>
      </div>
    );
  }

  if (product.stock <= 0) {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          This product is out of stock.
        </p>
        <Button asChild variant="outline">
          <Link href="/shop">Back to catalog</Link>
        </Button>
      </div>
    );
  }

  const qty = Math.min(quantity, product.stock);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Order</h1>
        <p className="text-xs text-muted-foreground">
          Place this item here in the shop. Use the cart for multiple products.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <ShopCheckoutForm
          lines={[
            {
              productId: product.id,
              name: product.name,
              quantity: qty,
              price: Number(product.price) || 0,
            },
          ]}
          defaultAddress={customer?.address}
          submitLabel="Place order"
        />
      </div>

      <Button asChild variant="ghost" className="w-full">
        <Link href="/shop/cart">Go to cart instead</Link>
      </Button>
    </div>
  );
}
