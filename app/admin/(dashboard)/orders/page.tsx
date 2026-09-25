"use client";

import { useEffect, useState } from "react";
import { apiFetch, invalidateApiCache } from "@/lib/api";
import {
  Search,
  Check,
  X,
  Trash2,
  ShieldCheck,
  Eye,
  CreditCard,
  MapPin,
  Truck,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select as CustomSelect } from "@/components/ui/select-custom";
import {
  OrderStatusIndicator,
  type OrderStatus,
} from "@/components/OrderStatusIndicator";
import { PaginationBar } from "@/components/PaginationBar";
import { useNetwork } from "@/components/NetworkProvider";
import { useToast } from "@/components/ToastProvider";
import { isAbortError, isNetworkError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { Money } from "@/components/Money";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  fulfilmentType?: "delivery" | "pickup";
  pickupLocationId?: string | null;
  pickupLocation?: { id: string; name: string; address: string } | null;
  deliveryFee?: number | string;
  expectedDeliveryDate?: string | null;
  advancePaymentAmount?: number | string;
  amountPaid?: number | string;
  paymentStage?: "unpaid" | "partial" | "full";
  paymentMethod?: string | null;
  paymentEvidence?: string | null;
  paymentSubmittedAt?: string | null;
  paymentVerifiedAt?: string | null;
  balancePaymentEvidence?: string | null;
  balancePaymentMethod?: string | null;
  verifyEtStatus?: string | null;
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

function lineTotal(order: Order) {
  const unit = typeof order.cost === "number" ? order.cost : Number(order.cost);
  const fee = Number(order.deliveryFee) || 0;
  return (Number.isNaN(unit) ? 0 : unit) * (order.quantity || 1) + fee;
}

function paymentMethodLabel(method?: string | null) {
  if (method === "telebirr") return "Telebirr";
  if (method === "bank") return "CBE";
  return method || null;
}

type StatusFilter = "all" | OrderStatus;

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

  // Evidence viewing modal
  const [evidenceTarget, setEvidenceTarget] = useState<Order | null>(null);

  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setTimeout(() => setPage(1), 0);
  }, [search, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    
    const loadData = async () => {
      setLoading(true);
      setFetchError(null);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      try {
        const data = await apiFetch<PaginatedResponse<Order>>(
          `/orders?${params.toString()}`,
          {
            toastOnError: false,
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) return;
        setOrders(data.items);
        setTotal(data.total);
        clearNetworkError();
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(
          err instanceof Error ? err.message : "Failed to load orders.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadData();

    return () => {
      controller.abort();
    };
  }, [
    page,
    search,
    statusFilter,
    refreshKey,
    reconnectKey,
    clearNetworkError,
    reportNetworkError,
  ]);

  async function updateStatus(order: Order, status: OrderStatus) {
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
          : status === "confirmed"
            ? "Payment verified & order confirmed"
            : "Order status updated",
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

  async function verifyPayment(order: Order) {
    setUpdatingId(order.id);
    try {
      await apiFetch(`/orders/${order.id}/verify-payment`, {
        method: "PATCH",
      });
      invalidateApiCache("/orders");
      invalidateApiCache("/dashboard-summary");
      toast.success(
        "Payment verified",
        `Order for ${order.customer?.fullName ?? "customer"} is now confirmed.`,
      );
      setEvidenceTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkError(err);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function rejectPayment(order: Order) {
    setUpdatingId(order.id);
    try {
      await apiFetch(`/orders/${order.id}/reject-payment`, {
        method: "PATCH",
      });
      invalidateApiCache("/orders");
      toast.info("Payment rejected", "Order reverted to awaiting payment.");
      setEvidenceTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkError(err);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function markFullyPaid(order: Order) {
    setUpdatingId(order.id);
    try {
      await apiFetch(`/orders/${order.id}/mark-fully-paid`, {
        method: "PATCH",
      });
      invalidateApiCache("/orders");
      invalidateApiCache("/dashboard-summary");
      toast.success(
        "Marked fully paid",
        `Remaining balance for ${order.customer?.fullName ?? "customer"} recorded.`,
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (isNetworkError(err)) {
        reportNetworkError(err);
      } else if (err instanceof Error) {
        toast.error("Could not mark fully paid", err.message);
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
      invalidateApiCache("/products");
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
    const stage = order.paymentStage;
    const canMarkFull =
      (order.status === "confirmed" || order.status === "delivered") &&
      stage !== "full" &&
      (stage === "partial" || Boolean(order.paymentVerifiedAt));

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Payment verification action */}
        {order.status === "payment_submitted" && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1"
              disabled={busy}
              onClick={() => verifyPayment(order)}
            >
              <ShieldCheck className="size-3.5" />
              Verify
            </Button>
          </div>
        )}

        {canMarkFull && (
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs gap-1 bg-teal-700 hover:bg-teal-800 text-white"
            disabled={busy}
            onClick={() => markFullyPaid(order)}
            title="Mark remaining balance as paid"
          >
            <Banknote className="size-3.5" />
            Mark fully paid
          </Button>
        )}

        {/* View Receipt action */}
        {(order.paymentEvidence || order.balancePaymentEvidence) && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setEvidenceTarget(order)}
          >
            <Eye className="size-3.5" />
            Evidence
          </Button>
        )}

        {/* Confirmed / Pending -> Mark Delivered */}
        {(order.status === "confirmed" || order.status === "pending") && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            disabled={busy}
            onClick={() => updateStatus(order, "delivered")}
          >
            <Check className="size-3.5" />
            Delivered
          </Button>
        )}

        {/* Cancel option */}
        {order.status !== "delivered" && order.status !== "cancelled" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={busy}
            onClick={() => updateStatus(order, "cancelled")}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
        )}

        {/* Delete order */}
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={busy || deleting}
          onClick={() => setDeleteTarget(order)}
          aria-label="Delete order"
          className="size-7 text-muted-foreground hover:text-destructive"
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
            Manage customer orders, verify payments (CBE / Telebirr), and mark half-paid orders as fully paid.
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
            { value: "awaiting_payment", label: "Awaiting Payment" },
            { value: "payment_submitted", label: "Payment Submitted" },
            { value: "confirmed", label: "Half / Full confirmed" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          size="sm"
          className="sm:w-48"
        />
      </div>

      {fetchError && (
        <div
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {fetchError}
        </div>
      )}

      {loading && (
        <div className="hidden md:block border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Fulfilment</TableHead>
                <TableHead>Payment (50%)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-56">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-36" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
          <div className="hidden md:block border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product & Total</TableHead>
                  <TableHead>Fulfilment</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-56 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const isPickup = o.fulfilmentType === "pickup";
                  const totalAmt = lineTotal(o);
                  const advance =
                    o.advancePaymentAmount != null
                      ? Number(o.advancePaymentAmount)
                      : totalAmt * 0.5;

                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {o.customer?.fullName ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {o.customer?.phone ?? ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {o.product?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qty {o.quantity ?? 1} ·{" "}
                            <Money amount={totalAmt} size="xs" />
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5 max-w-[200px]">
                          {isPickup ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <MapPin className="size-3" />
                              {o.pickupLocation?.name || "Store Pickup"}
                            </span>
                          ) : (
                            <div className="text-muted-foreground">
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <Truck className="size-3" /> Delivery
                              </span>
                              <p className="text-[11px] truncate">
                                {o.deliveryAddress || "Address on file"}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <span className="font-semibold text-foreground">
                            {o.paymentStage === "full"
                              ? `Full ${totalAmt.toFixed(2)} ETB`
                              : `Advance ${advance.toFixed(2)} ETB`}
                          </span>
                          {paymentMethodLabel(o.paymentMethod) && (
                            <p className="text-[11px] text-muted-foreground">
                              via {paymentMethodLabel(o.paymentMethod)}
                            </p>
                          )}
                          {!o.paymentMethod && o.paymentStage === "partial" && (
                            <p className="text-[11px] text-amber-700">
                              Half confirmed
                            </p>
                          )}
                          {!o.paymentMethod && o.paymentStage === "full" && (
                            <p className="text-[11px] text-emerald-700">
                              Full confirmed
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDateTime(o.createdAt)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusIndicator
                          status={o.status}
                          showLabel
                          paymentMethod={
                            o.balancePaymentMethod || o.paymentMethod
                          }
                          paymentStage={o.paymentStage}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <OrderActions order={o} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex md:hidden flex-col gap-2.5">
            {orders.map((o) => {
              const totalAmt = lineTotal(o);
              const advance =
                o.advancePaymentAmount != null
                  ? Number(o.advancePaymentAmount)
                  : totalAmt * 0.5;

              return (
                <div
                  key={o.id}
                  className="p-3.5 bg-card border border-border rounded-2xl space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">
                        {o.product?.name ?? "Product"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.customer?.fullName ?? "Customer"} ·{" "}
                        {o.customer?.phone}
                      </p>
                    </div>
                    <OrderStatusIndicator
                      status={o.status}
                      showLabel
                      paymentMethod={
                        o.balancePaymentMethod || o.paymentMethod
                      }
                      paymentStage={o.paymentStage}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">
                        Order Total:
                      </span>
                      <span className="font-semibold text-foreground">
                        {totalAmt.toFixed(2)} ETB (Qty {o.quantity})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">
                        50% Advance:
                      </span>
                      <span className="font-semibold text-emerald-800">
                        {advance.toFixed(2)} ETB
                      </span>
                    </div>
                    <div className="col-span-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {o.fulfilmentType === "pickup" ? (
                        <>
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span>Pickup: {o.pickupLocation?.name || "Store"}</span>
                        </>
                      ) : (
                        <>
                          <Truck className="size-3 text-primary shrink-0" />
                          <span className="truncate">Delivery: {o.deliveryAddress || "On file"}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatDateTime(o.createdAt)}</span>
                  </div>

                  <div className="pt-1">
                    <OrderActions order={o} />
                  </div>
                </div>
              );
            })}
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

      {/* Payment Evidence Modal */}
      <Dialog
        open={Boolean(evidenceTarget)}
        onOpenChange={() => setEvidenceTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              Payment Evidence
            </DialogTitle>
          </DialogHeader>

          {evidenceTarget && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1">
                <p>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  <b>{evidenceTarget.customer?.fullName}</b> (
                  {evidenceTarget.customer?.phone})
                </p>
                <p>
                  <span className="text-muted-foreground">Product:</span>{" "}
                  <b>{evidenceTarget.product?.name}</b> ×{" "}
                  {evidenceTarget.quantity}
                </p>
                <p>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <b>{lineTotal(evidenceTarget).toFixed(2)} ETB</b> · 50%
                  Advance:{" "}
                  <b className="text-emerald-700">
                    {(
                      Number(evidenceTarget.advancePaymentAmount) ||
                      lineTotal(evidenceTarget) * 0.5
                    ).toFixed(2)}{" "}
                    ETB
                  </b>
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <OrderStatusIndicator
                    status={evidenceTarget.status}
                    showLabel
                    paymentMethod={
                      evidenceTarget.balancePaymentMethod ||
                      evidenceTarget.paymentMethod
                    }
                    paymentStage={evidenceTarget.paymentStage}
                  />
                </p>
                <p>
                  <span className="text-muted-foreground">Method:</span>{" "}
                  <b className="capitalize font-mono">
                    {paymentMethodLabel(
                      evidenceTarget.balancePaymentMethod ||
                        evidenceTarget.paymentMethod,
                    ) ||
                      evidenceTarget.paymentMethod ||
                      "Direct Submission"}
                  </b>
                </p>
              </div>

              {/* Preview image or text */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  Submitted Evidence:
                </span>
                {evidenceTarget.paymentEvidence?.startsWith("http") ? (
                  <div className="rounded-xl overflow-hidden border border-border bg-black/5 max-h-72 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={evidenceTarget.paymentEvidence}
                      alt="Receipt Screenshot"
                      className="object-contain max-h-72 w-full"
                    />
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-border bg-background font-mono text-xs break-words">
                    {evidenceTarget.paymentEvidence ||
                      "No evidence text recorded"}
                  </div>
                )}
                {evidenceTarget.balancePaymentEvidence && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold text-foreground block">
                      Remaining payment evidence:
                    </span>
                    {evidenceTarget.balancePaymentEvidence.startsWith(
                      "http",
                    ) ? (
                      <div className="rounded-xl overflow-hidden border border-border bg-black/5 max-h-72 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={evidenceTarget.balancePaymentEvidence}
                          alt="Balance receipt"
                          className="object-contain max-h-72 w-full"
                        />
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl border border-border bg-background font-mono text-xs break-words">
                        {evidenceTarget.balancePaymentEvidence}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {evidenceTarget.status === "payment_submitted" && (
                <DialogFooter className="flex-row sm:justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => rejectPayment(evidenceTarget)}
                    className="text-destructive hover:text-destructive"
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    onClick={() => verifyPayment(evidenceTarget)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                  >
                    <ShieldCheck className="size-4" />
                    Verify & Confirm Order
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete Order"}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
