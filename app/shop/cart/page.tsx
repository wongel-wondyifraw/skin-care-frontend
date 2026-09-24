"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { useShopCart } from "@/components/shop/ShopCartProvider";
import { ShopBackLink } from "@/components/shop/ShopBackLink";
import { ShopCheckoutForm } from "@/components/shop/ShopCheckoutForm";
import { ShopPrice } from "@/components/shop/ShopPrice";
import { Money } from "@/components/Money";
import { shopSalePrice } from "@/lib/shop-pricing";

export default function ShopCartPage() {
  const { status, error: authError, retry, customer } = useShopAuth();
  const { items, setQuantity, removeItem, clear, subtotal } = useShopCart();

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-16" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <Skeleton className="size-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2 py-0.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-7 w-28" />
            </div>
          </div>
        ))}
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-3 shadow-xs">
        <h1 className="text-base font-semibold text-foreground">
          Sign In Required
        </h1>
        <p className="text-xs text-muted-foreground">{authError}</p>
        <Button type="button" onClick={retry} size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <ShopBackLink href="/shop" label="Catalog" />
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-xs">
          <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="size-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">
              Your cart is empty
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Browse products from the catalog and add items to your cart to check
              out with 50% advance payment.
            </p>
          </div>
          <Button asChild className="rounded-xl">
            <Link href="/shop">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <ShopBackLink href="/shop" label="Catalog" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Cart
          </h1>
          <p className="text-xs text-muted-foreground">
            {items.length} product{items.length === 1 ? "" : "s"} ·{" "}
            <Money amount={subtotal} size="xs" className="font-semibold text-foreground" />
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
        >
          <Trash2 className="size-3.5" />
          Clear Cart
        </Button>
      </div>

      {/* Items list */}
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xs"
          >
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/40">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">
                    {item.name}
                  </p>
                  <ShopPrice item={item} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Line total:{" "}
                    <Money
                      amount={shopSalePrice(item) * item.quantity}
                      size="xs"
                      className="font-medium text-foreground"
                    />
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors cursor-pointer"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.productId)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {/* Quantity stepper */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="size-7 rounded-lg"
                  disabled={item.quantity <= 1}
                  onClick={() =>
                    setQuantity(item.productId, item.quantity - 1)
                  }
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-6 text-center text-xs font-semibold text-foreground">
                  {item.quantity}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="size-7 rounded-lg"
                  disabled={item.quantity >= item.stock}
                  onClick={() =>
                    setQuantity(item.productId, item.quantity + 1)
                  }
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Checkout Form Card */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <h2 className="text-base font-bold tracking-tight text-foreground border-b border-border pb-3">
          Checkout & Payment
        </h2>
        <ShopCheckoutForm
          lines={items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            discountPercent: item.discountPercent,
            discountEndsAt: item.discountEndsAt,
          }))}
          defaultAddress={customer?.address}
          onSuccess={clear}
          submitLabel="Place order for cart"
        />
      </div>
    </div>
  );
}
