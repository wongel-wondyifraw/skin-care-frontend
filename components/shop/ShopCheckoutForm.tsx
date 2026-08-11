"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShopPrice } from "@/components/shop/ShopPrice";
import { Money } from "@/components/Money";
import { shopCreateOrders, ShopApiError } from "@/lib/shop-api";
import { shopSalePrice } from "@/lib/shop-pricing";

type CheckoutLine = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discountPercent?: number;
  discountEndsAt?: string | null;
};

type ShopCheckoutFormProps = {
  lines: CheckoutLine[];
  defaultAddress?: string | null;
  onSuccess?: () => void;
  submitLabel?: string;
};

export function ShopCheckoutForm({
  lines,
  defaultAddress = "",
  onSuccess,
  submitLabel = "Place order",
}: ShopCheckoutFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAddress(defaultAddress ?? "");
  }, [defaultAddress]);

  const total = lines.reduce(
    (sum, line) => sum + shopSalePrice(line) * line.quantity,
    0,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;
    setSubmitting(true);
    setError(null);
    try {
      await shopCreateOrders({
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        deliveryAddress: address.trim() || undefined,
      });
      onSuccess?.();
      router.push("/shop/orders");
    } catch (err) {
      setError(
        err instanceof ShopApiError
          ? err.message
          : "Could not place your order. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!lines.length) {
    return (
      <p className="text-sm text-muted-foreground">Nothing to order yet.</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ul className="space-y-1.5 text-sm">
        {lines.map((line) => {
          const unit = shopSalePrice(line);
          return (
            <li
              key={line.productId}
              className="flex items-start justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="font-medium text-foreground line-clamp-1">
                  {line.name}
                </span>
                <span className="mt-0.5 block">
                  <ShopPrice item={line} />
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    · Qty {line.quantity}
                  </span>
                </span>
              </span>
              <Money
                amount={unit * line.quantity}
                size="sm"
                className="shrink-0"
              />
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
        <span>Total</span>
        <Money amount={total} size="md" />
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-foreground">
          Delivery address
        </span>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          placeholder="Where should we deliver?"
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Placing order…" : submitLabel}
      </Button>
    </form>
  );
}
