"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusIndicator } from "@/components/OrderStatusIndicator";
import { Money } from "@/components/Money";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { ShopBackLink } from "@/components/shop/ShopBackLink";
import {
  shopCancelOrder,
  shopFetchOrders,
  ShopApiError,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/lib/shop-api";

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
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  async function handleCancel(order: ShopOrder) {
    if (order.status !== "pending") return;
    const ok = window.confirm(
      `Cancel order for ${order.product?.name ?? "this product"}?`,
    );
    if (!ok) return;

    setCancellingId(order.id);
    setError(null);
    try {
      const updated = await shopCancelOrder(order.id);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o)),
      );
      if (filter !== "all" && filter !== "cancelled") {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      }
    } catch (err) {
      setError(
        err instanceof ShopApiError
          ? err.message
          : "Could not cancel this order.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-lg space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-24" />
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
      <ShopBackLink href="/shop" label="Catalog" />
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
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold line-clamp-2">
                    {order.product?.name ?? "Product"}
                  </p>
                  <OrderStatusIndicator status={order.status} showLabel />
                </div>
                <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span>Qty {order.quantity}</span>
                  <span aria-hidden>·</span>
                  <Money
                    amount={Number(order.cost) * order.quantity}
                    size="sm"
                  />
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(order.createdAt)}
                </p>
                {order.deliveryAddress?.trim() && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {order.deliveryAddress.trim()}
                  </p>
                )}
                {order.status === "pending" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-1 h-8 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={cancellingId === order.id}
                    onClick={() => void handleCancel(order)}
                  >
                    {cancellingId === order.id ? "Cancelling…" : "Cancel order"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
