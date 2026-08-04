"use client";

import { useEffect, useState } from "react";
import { apiFetch, invalidateApiCache } from "@/lib/api";
import { Search, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select as CustomSelect } from "@/components/ui/select-custom";
import { OrderStatusIndicator, type OrderStatus } from "@/components/OrderStatusIndicator";
import { PaginationBar } from "@/components/PaginationBar";
import { useNetwork } from "@/components/NetworkProvider";
import { useToast } from "@/components/ToastProvider";
import { isNetworkError } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Order = {
  id: string;
  customerId: string;
  productId: string;
  cost: number | string;
  quantity: number;
  deliveryAddress: string | null;
  status: OrderStatus;
  createdAt: string;
  customer?: {
    id: string;
    fullName: string;
    phone: string;
  } | null;
  product?: {
    id: string;
    name: string;
  } | null;
};

type StatusFilter = "all" | OrderStatus;

function unitCost(cost: number | string) {
  const n = typeof cost === "number" ? cost : Number(cost);
  return Number.isNaN(n) ? 0 : n;
}

function lineTotal(order: Order) {
  return unitCost(order.cost) * (order.quantity || 1);
}

export default function OrdersPage() {
  const toast = useToast();
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);

    (async () => {
      try {
        const data = await apiFetch<PaginatedResponse<Order>>(`/orders?${params.toString()}`, {
          toastOnError: false,
        });
        if (!cancelled) {
          setOrders(data.items);
          setTotal(data.total);
          clearNetworkError();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, search, statusFilter, refreshKey, reconnectKey, clearNetworkError, reportNetworkError]);

  async function updateStatus(order: Order, status: "delivered" | "cancelled") {
    setUpdatingId(order.id);
    try {
      await apiFetch(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      invalidateApiCache("/orders");
      invalidateApiCache("/products");
      invalidateApiCache("/dashboard-summary");
      toast.success(
        status === "delivered"
          ? "Order marked as delivered — customer notified"
          : "Order cancelled",
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkError(err);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/orders/${deleteTarget.id}`, { method: "DELETE" });
      invalidateApiCache("/orders");
      invalidateApiCache("/dashboard-summary");
      toast.success("Order deleted");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkError(err);
      }
    } finally {
      setDeleting(false);
    }
  }

  function OrderActions({ order }: { order: Order }) {
    const busy = updatingId === order.id;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {order.status === "pending" && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => updateStatus(order, "delivered")}
            >
              <Check className="size-3.5" />
              Mark delivered
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => updateStatus(order, "cancelled")}
              className="text-destructive hover:text-destructive"
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={busy || deleting}
          onClick={() => setDeleteTarget(order)}
          aria-label="Delete order"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customer orders from the Telegram bot
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer, product, or address…"
            className="pl-9"
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: "all", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          size="sm"
          className="sm:w-44"
        />
      </div>

      {fetchError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {fetchError}
        </div>
      )}

      {loading && (
        <>
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-36" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex md:hidden flex-col gap-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-card border border-border rounded-lg space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !fetchError && total === 0 && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p>No orders found.</p>
          {(search.trim() || statusFilter !== "all") && (
            <p className="text-xs mt-1">Try clearing your filters.</p>
          )}
        </div>
      )}

      {!loading && !fetchError && orders.length > 0 && (
        <>
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Delivery address</TableHead>
                  <TableHead>Date & time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-56">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{o.customer?.fullName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{o.customer?.phone ?? ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{o.product?.name ?? "—"}</TableCell>
                    <TableCell>{o.quantity ?? 1}</TableCell>
                    <TableCell>
                      <div>
                        <p>{formatMoney(lineTotal(o))}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {o.quantity ?? 1} × {formatMoney(unitCost(o.cost))}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[280px] truncate">
                      {o.deliveryAddress || <span className="opacity-50">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDateTime(o.createdAt)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusIndicator status={o.status} showLabel />
                    </TableCell>
                    <TableCell>
                      <OrderActions order={o} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex md:hidden flex-col gap-2">
            {orders.map((o) => (
              <div key={o.id} className="p-3 bg-card border border-border rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{o.product?.name ?? "Product"}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.customer?.fullName ?? "Customer"} · {o.customer?.phone}
                    </p>
                  </div>
                  <OrderStatusIndicator status={o.status} showLabel />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Qty {o.quantity ?? 1}</span>
                  <span>{formatMoney(lineTotal(o))}</span>
                  <span>{formatDateTime(o.createdAt)}</span>
                </div>
                {o.deliveryAddress && (
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    📍 {o.deliveryAddress}
                  </p>
                )}
                <div className="mt-3">
                  <OrderActions order={o} />
                </div>
              </div>
            ))}
          </div>

          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            itemCount={orders.length}
            loading={loading}
            itemLabel="orders"
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Order"
        message={`Delete order for "${deleteTarget?.product?.name ?? "this product"}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
