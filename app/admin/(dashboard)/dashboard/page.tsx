"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ClipboardList,
  Banknote,
  Users,
  ShieldCheck,
  BadgePercent,
  CircleDollarSign,
  Wallet,
} from "lucide-react";
import { apiFetchCached } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OrderStatusIndicator,
  type OrderStatus,
  type PaymentStage,
} from "@/components/OrderStatusIndicator";
import { useNetwork } from "@/components/NetworkProvider";
import { isNetworkError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { Money } from "@/components/Money";

type RecentOrder = {
  id: string;
  cost: number | string;
  quantity: number;
  status: OrderStatus;
  paymentMethod?: string | null;
  paymentStage?: PaymentStage | null;
  createdAt: string;
  customer?: { fullName: string; phone?: string } | null;
  product?: { name: string } | null;
};

type DashboardSummary = {
  products: number;
  categories: number;
  skinTypes: number;
  customers: number;
  orders: number;
  sales: number;
  halfPaymentVerifiedOrders?: number;
  fullPaymentVerifiedOrders?: number;
  halfPaymentCollected?: number;
  revenueCollected?: number;
  outstandingRemaining?: number;
  deliveredSales?: number;
  recentOrders: RecentOrder[];
};

function lineTotal(order: RecentOrder) {
  const unit = typeof order.cost === "number" ? order.cost : Number(order.cost);
  return (Number.isNaN(unit) ? 0 : unit) * (order.quantity || 1);
}

export default function DashboardPage() {
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();
  const [counts, setCounts] = useState<DashboardSummary>({
    products: 0,
    categories: 0,
    skinTypes: 0,
    customers: 0,
    orders: 0,
    sales: 0,
    halfPaymentVerifiedOrders: 0,
    fullPaymentVerifiedOrders: 0,
    halfPaymentCollected: 0,
    revenueCollected: 0,
    outstandingRemaining: 0,
    deliveredSales: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const summary = await apiFetchCached<DashboardSummary>(
          "/dashboard-summary",
          30_000,
        );
        if (cancelled) return;
        setCounts({
          ...summary,
          orders: summary.orders ?? 0,
          sales: summary.sales ?? 0,
          halfPaymentVerifiedOrders: summary.halfPaymentVerifiedOrders ?? 0,
          fullPaymentVerifiedOrders: summary.fullPaymentVerifiedOrders ?? 0,
          halfPaymentCollected: summary.halfPaymentCollected ?? 0,
          revenueCollected: summary.revenueCollected ?? summary.sales ?? 0,
          outstandingRemaining: summary.outstandingRemaining ?? 0,
          deliveredSales: summary.deliveredSales ?? summary.sales ?? 0,
          recentOrders: summary.recentOrders ?? [],
        });
        clearNetworkError();
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setError("Could not retrieve some live counts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reconnectKey, clearNetworkError, reportNetworkError]);

  const kpis = [
    {
      title: "Orders",
      value: counts.orders,
      href: "/admin/orders",
      icon: ClipboardList,
      format: "number" as const,
    },
    {
      title: "Half verified",
      value: counts.halfPaymentVerifiedOrders ?? 0,
      href: "/admin/orders?status=confirmed",
      icon: BadgePercent,
      format: "number" as const,
    },
    {
      title: "Half collected",
      value: counts.halfPaymentCollected ?? 0,
      href: "/admin/orders",
      icon: Wallet,
      format: "money" as const,
    },
    {
      title: "Fully paid orders",
      value: counts.fullPaymentVerifiedOrders ?? 0,
      href: "/admin/orders",
      icon: ShieldCheck,
      format: "number" as const,
    },
    {
      title: "Revenue collected",
      value: counts.revenueCollected ?? 0,
      href: "/admin/orders",
      icon: CircleDollarSign,
      format: "money" as const,
    },
    {
      title: "Outstanding",
      value: counts.outstandingRemaining ?? 0,
      href: "/admin/orders",
      icon: Banknote,
      format: "money" as const,
    },
    {
      title: "Products",
      value: counts.products,
      href: "/admin/products",
      icon: ShoppingBag,
      format: "number" as const,
    },
    {
      title: "Customers",
      value: counts.customers,
      href: "/admin/customers",
      icon: Users,
      format: "number" as const,
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Orders, half vs full payment, revenue collected, and recent activity.
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href} className="no-underline">
            <Card className="hover:border-primary/30 transition-colors h-full">
              <CardContent className="flex items-center justify-between p-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {kpi.title}
                  </p>
                  {loading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : kpi.format === "money" ? (
                    <Money
                      amount={Number(kpi.value)}
                      size="lg"
                      className="text-xl sm:text-2xl truncate"
                    />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
                      {kpi.value}
                    </p>
                  )}
                </div>
                <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <kpi.icon className="size-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Recent orders
            </h3>
            <Link
              href="/admin/orders"
              className="text-xs text-primary no-underline hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                  <Skeleton className="size-7 rounded-full" />
                </div>
              ))}
            </div>
          ) : counts.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
              No orders yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {counts.recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {order.product?.name ?? "Product"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.customer?.fullName ?? "Customer"}
                      {" · "}
                      Qty {order.quantity ?? 1}
                      {" · "}
                      <Money amount={lineTotal(order)} size="xs" />
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <OrderStatusIndicator
                    status={order.status}
                    paymentMethod={order.paymentMethod}
                    paymentStage={order.paymentStage}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
