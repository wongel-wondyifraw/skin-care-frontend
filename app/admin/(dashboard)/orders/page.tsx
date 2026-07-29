"use client";

import { useEffect, useState } from "react";
import { apiFetch, invalidateApiCache } from "@/lib/api";
import { Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select as CustomSelect } from "@/components/ui/select-custom";
import { useNetwork } from "@/components/NetworkProvider";
import { useToast } from "@/components/ToastProvider";
import { isNetworkError } from "@/lib/errors";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type OrderStatus = "pending" | "delivered" | "cancelled";

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

type PaginatedResponse<T> = { items: T[]; total: number; page: number; pageSize: number };
type StatusFilter = "all" | OrderStatus;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: number) {
  return `${amount.toFixed(2)} ETB`;
}

function unitCost(cost: number | string) {
  const n = typeof cost === "number" ? cost : Number(cost);
  return Number.isNaN(n) ? 0 : n;
}

function lineTotal(order: Order) {
  return unitCost(order.cost) * (order.quantity || 1);
}

function StatusBadge({ status }: { status: OrderStatus }) {
  if (status === "delivered") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 text-[11px]">
        Delivered
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-0 text-[11px]">
        Cancelled
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[11px]">
      Pending
    </Badge>
  );
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function updateStatus(order: Order, status: "delivered" | "cancelled") {
    setUpdatingId(order.id);
    try {
      await apiFetch(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      invalidateApiCache("/orders");
      invalidateApiCache("/products");
      toast.success(
        status === "delivered"
          ? "Order marked as delivered — stock updated"
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

  function PendingActions({ order }: { order: Order }) {
    const busy = updatingId === order.id;
    return (
      <div className="flex flex-wrap items-center gap-1">
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
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
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
                  <TableHead className="w-52">Actions</TableHead>
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
                    <TableCell className="text-muted-foreground max-w-[180px] truncate">
                      {o.deliveryAddress || <span className="opacity-50">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDateTime(o.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell>
                      {o.status === "pending" ? (
                        <PendingActions order={o} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
                  <StatusBadge status={o.status} />
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
                {o.status === "pending" && (
                  <div className="mt-3">
                    <PendingActions order={o} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {orders.length === 0 ? 0 : (page - 1) * pageSize + 1}
              {" "}to {Math.min(page * pageSize, total)} of {total} orders
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
