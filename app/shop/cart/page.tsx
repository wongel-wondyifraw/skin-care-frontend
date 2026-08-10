"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { useShopCart } from "@/components/shop/ShopCartProvider";
import { ShopCheckoutForm } from "@/components/shop/ShopCheckoutForm";
import { ShopPrice } from "@/components/shop/ShopPrice";
import { formatMoney } from "@/lib/format";
import { shopSalePrice } from "@/lib/shop-pricing";

export default function ShopCartPage() {
  const { status, error: authError, retry, customer } = useShopAuth();
  const { items, setQuantity, removeItem, clear, subtotal } = useShopCart();

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
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

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center py-10">
        <h1 className="text-lg font-semibold">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">
          Add products from the catalog, then place one order for everything.
        </p>
        <Button asChild>
          <Link href="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Cart</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} product{items.length === 1 ? "" : "s"} ·{" "}
            {formatMoney(subtotal)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex gap-3 rounded-2xl border border-border bg-card p-2.5"
          >
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
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
                  <p className="text-sm font-semibold line-clamp-2">{item.name}</p>
                  <ShopPrice item={item} />
                  <p className="text-[10px] text-muted-foreground">
                    Line {formatMoney(shopSalePrice(item) * item.quantity)}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.productId)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="size-7"
                  disabled={item.quantity <= 1}
                  onClick={() =>
                    setQuantity(item.productId, item.quantity - 1)
                  }
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="size-7"
                  disabled={item.quantity >= item.stock}
                  onClick={() =>
                    setQuantity(item.productId, item.quantity + 1)
                  }
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Place order</h2>
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
