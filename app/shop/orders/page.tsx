"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusIndicator } from "@/components/OrderStatusIndicator";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import {
  shopFetchOrders,
  ShopApiError,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/lib/shop-api";
import { formatMoney } from "@/lib/format";

const FILTERS: { value: ShopOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function ShopOrdersPage() {
  const { status, error: authError, retry } = useShopAuth();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [filter, setFilter] = useState<ShopOrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await shopFetchOrders({
          page: 1,
          pageSize: 50,
          status: filter,
        });
        if (!cancelled) setOrders(data.items);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ShopApiError
              ? err.message
              : "Failed to load your orders.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, filter]);

  if (status === "loading") {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
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

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">My orders</h1>
        <p className="text-xs text-muted-foreground">
          Track status for every order you placed in the shop.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No orders yet.</p>
          <Button asChild>
            <Link href="/shop">Browse products</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {order.product?.image ? (
                  <Image
                    src={order.product.image}
                    alt={order.product.name ?? "Product"}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold line-clamp-2">
                    {order.product?.name ?? "Product"}
                  </p>
                  <OrderStatusIndicator status={order.status} showLabel />
                </div>
                <p className="text-xs text-muted-foreground">
                  Qty {order.quantity} · {formatMoney(Number(order.cost) * order.quantity)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(order.createdAt)}
                </p>
                {order.deliveryAddress?.trim() && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {order.deliveryAddress.trim()}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
