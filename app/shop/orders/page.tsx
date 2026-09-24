"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Truck,
  Store,
  MapPin,
  Calendar,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusIndicator } from "@/components/OrderStatusIndicator";
import { Money } from "@/components/Money";
import { ShopSupportContact } from "@/components/shop/ShopSupportContact";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { ShopBackLink } from "@/components/shop/ShopBackLink";
import { cn } from "@/lib/utils";
import {
  shopCancelOrder,
  shopFetchOrders,
  shopSubmitPayment,
  shopUploadReceipt,
  shopFetchPaymentInfo,
  ShopApiError,
  type ShopOrder,
  type ShopOrderStatus,
  type PaymentInfo,
} from "@/lib/shop-api";

const FILTERS: { value: ShopOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "awaiting_payment", label: "Awaiting Pay" },
  { value: "payment_submitted", label: "Under Review" },
  { value: "confirmed", label: "Confirmed" },
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

function formatExpected(value?: string | null) {
  if (!value) return "Tomorrow";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Tomorrow";
  }
}

export default function ShopOrdersPage() {
  const { status, error: authError, retry } = useShopAuth();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [filter, setFilter] = useState<ShopOrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Payment modal state
  const [payingOrder, setPayingOrder] = useState<ShopOrder | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [payMethod, setPayMethod] = useState<"bank" | "telebirr">("bank");
  const [payEvidenceText, setPayEvidenceText] = useState("");
  const [payEvidenceFile, setPayEvidenceFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    shopFetchPaymentInfo()
      .then((p) => setPaymentInfo(p))
      .catch(() => {});
  }, []);

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
    const cancellable = ["pending", "awaiting_payment", "payment_submitted"];
    if (!cancellable.includes(order.status)) return;

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

  async function handlePayEvidenceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payingOrder) return;

    setSubmittingPayment(true);
    setPaymentModalError(null);

    try {
      let evidence = payEvidenceText.trim();
      if (payEvidenceFile) {
        try {
          evidence = await shopUploadReceipt(payEvidenceFile);
        } catch {
          if (!evidence) {
            evidence = "Receipt uploaded by customer";
          }
        }
      }

      if (!evidence) {
        setPaymentModalError(
          "Please upload a screenshot or enter your transaction reference number.",
        );
        setSubmittingPayment(false);
        return;
      }

      const updated = await shopSubmitPayment(payingOrder.id, {
        paymentMethod: payMethod,
        paymentEvidence: evidence,
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === payingOrder.id ? { ...o, ...updated } : o)),
      );
      setPayingOrder(null);
      setPayEvidenceFile(null);
      setPayEvidenceText("");
    } catch (err) {
      setPaymentModalError(
        err instanceof ShopApiError
          ? err.message
          : "Could not submit payment. Please try again.",
      );
    } finally {
      setSubmittingPayment(false);
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
          Track status and payment for every order you placed in the shop.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            className="h-7 rounded-full px-2.5 text-xs whitespace-nowrap"
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
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No orders found.</p>
          <Button asChild>
            <Link href="/shop">Browse products</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const cancellable = [
              "pending",
              "awaiting_payment",
              "payment_submitted",
            ];
            const isPickup = order.fulfilmentType === "pickup";
            const total = Number(order.cost) * order.quantity;
            const advance =
              order.advancePaymentAmount != null
                ? Number(order.advancePaymentAmount)
                : total * 0.5;

            return (
              <li
                key={order.id}
                className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3.5 shadow-2xs"
              >
                <div className="flex gap-3">
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
                      <p className="text-sm font-semibold line-clamp-1">
                        {order.product?.name ?? "Product"}
                      </p>
                      <OrderStatusIndicator status={order.status} showLabel />
                    </div>

                    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span>Qty {order.quantity}</span>
                      <span aria-hidden>·</span>
                      <Money amount={total} size="sm" />
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      Ordered: {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Fulfilment & Expected Date Details */}
                <div className="rounded-xl bg-muted/40 p-2.5 text-[11px] space-y-1.5 text-muted-foreground border border-border/60">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1">
                      {isPickup ? (
                        <>
                          <Store className="size-3 text-primary" /> Store Pickup
                        </>
                      ) : (
                        <>
                          <Truck className="size-3 text-primary" /> Delivery:
                        </>
                      )}
                    </span>
                    <span className="font-medium text-foreground truncate max-w-[200px]">
                      {isPickup
                        ? order.pickupLocation?.name || "Store Branch"
                        : order.deliveryAddress?.trim() || "Address on file"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" /> Expected:
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatExpected(order.expectedDeliveryDate)}
                    </span>
                  </div>
                  {order.advancePaymentAmount != null && (
                    <div className="flex justify-between items-center border-t border-border/40 pt-1.5">
                      <span>50% Advance:</span>
                      <span className="font-semibold text-primary">
                        {advance.toFixed(2)} ETB
                      </span>
                    </div>
                  )}
                  {order.paymentEvidence && (
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>Payment submitted via:</span>
                      <span className="font-mono capitalize font-semibold text-foreground">
                        {order.paymentMethod || "Direct"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-0.5">
                  {order.status === "awaiting_payment" && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs font-semibold rounded-xl flex-1 gap-1.5"
                      onClick={() => setPayingOrder(order)}
                    >
                      <CreditCard className="size-3.5" />
                      Pay 50% Advance ({advance.toFixed(2)} ETB)
                    </Button>
                  )}

                  {cancellable.includes(order.status) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs rounded-xl"
                      disabled={cancellingId === order.id}
                      onClick={() => void handleCancel(order)}
                    >
                      {cancellingId === order.id ? "Cancelling…" : "Cancel"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Support number reminder */}
      <ShopSupportContact className="mt-4" />

      {/* Pay 50% Modal */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Submit 50% Payment Evidence
                </h3>
                <p className="text-xs text-muted-foreground">
                  {payingOrder.product?.name} · Advance:{" "}
                  <span className="font-semibold text-emerald-700">
                    {(
                      Number(payingOrder.advancePaymentAmount) ||
                      Number(payingOrder.cost) * payingOrder.quantity * 0.5
                    ).toFixed(2)}{" "}
                    ETB
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePayEvidenceSubmit} className="space-y-4">
              {/* Method choice with official logos */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayMethod("bank")}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    payMethod === "bank"
                      ? "border-[#6b1d7d] bg-[#6b1d7d]/5 ring-1 ring-[#6b1d7d] shadow-2xs"
                      : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="relative size-8 shrink-0 rounded-lg overflow-hidden bg-white border border-border/80 p-0.5 flex items-center justify-center">
                    <Image
                      src="/cbe.png"
                      alt="CBE"
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold leading-tight text-[#6b1d7d]">
                      CBE Bank
                    </span>
                    <span className="block text-[10px] text-muted-foreground leading-tight">
                      Bank Transfer
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod("telebirr")}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    payMethod === "telebirr"
                      ? "border-[#0072bc] bg-[#0072bc]/5 ring-1 ring-[#0072bc] shadow-2xs"
                      : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="relative size-8 shrink-0 rounded-lg overflow-hidden bg-white border border-border/80 p-0.5 flex items-center justify-center">
                    <Image
                      src="/telebirr.png"
                      alt="Telebirr"
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold leading-tight text-[#0072bc]">
                      Telebirr
                    </span>
                    <span className="block text-[10px] text-muted-foreground leading-tight">
                      Mobile Wallet
                    </span>
                  </div>
                </button>
              </div>

              {/* Account details */}
              {payMethod === "bank" ? (
                <div className="rounded-xl border border-border bg-card p-3 text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <span className="font-semibold text-foreground">
                      {paymentInfo?.bankAccount.bankName || "Commercial Bank of Ethiopia"}
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-[#6b1d7d] bg-[#6b1d7d]/10 px-2 py-0.5 rounded-full">
                      CBE
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Account Number:</span>
                    <span className="font-mono font-bold text-foreground">
                      {paymentInfo?.bankAccount.accountNumber || "1000XXXXXXXX"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Account Name:</span>
                    <span className="font-semibold text-foreground">
                      {paymentInfo?.bankAccount.accountName || "Medaf Skin Care"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-3 text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <span className="font-semibold text-foreground">
                      Telebirr Account
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-[#0072bc] bg-[#0072bc]/10 px-2 py-0.5 rounded-full">
                      Telebirr
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Phone Number:</span>
                    <span className="font-mono font-bold text-foreground">
                      {paymentInfo?.telebirr.phoneNumber || "09XXXXXXXX"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Account Name:</span>
                    <span className="font-semibold text-foreground">
                      {paymentInfo?.telebirr.accountName || "Medaf Skin Care"}
                    </span>
                  </div>
                </div>
              )}

              {/* Evidence inputs */}
              <div className="space-y-2 text-xs">
                <label className="font-semibold text-foreground block">
                  Payment Evidence (Screenshot or Reference)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setPayEvidenceFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={payEvidenceText}
                  onChange={(e) => setPayEvidenceText(e.target.value)}
                  placeholder="Or enter transaction reference / SMS text"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              {paymentModalError && (
                <p className="text-xs text-destructive">{paymentModalError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setPayingOrder(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 rounded-xl font-semibold"
                >
                  {submittingPayment ? "Submitting…" : "I Have Paid"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
