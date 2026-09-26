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
import { Money } from "@/components/Money";
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
  { value: "confirmed", label: "Verified" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function orderLineTotal(order: ShopOrder) {
  const unit = Number(order.cost) || 0;
  const qty = Math.max(1, order.quantity || 1);
  const fee = Number(order.deliveryFee) || 0;
  return Math.round((unit * qty + fee) * 100) / 100;
}

function orderPaidAmount(order: ShopOrder) {
  const paid = Number(order.amountPaid) || 0;
  if (paid > 0) return paid;
  if (
    order.paymentStage === "partial" ||
    order.paymentStage === "full" ||
    order.paymentVerifiedAt ||
    order.status === "confirmed" ||
    order.status === "delivered"
  ) {
    return Number(order.advancePaymentAmount) || 0;
  }
  return 0;
}

function orderRemaining(order: ShopOrder) {
  if (order.paymentStage === "full") return 0;
  return Math.max(0, Math.round((orderLineTotal(order) - orderPaidAmount(order)) * 100) / 100);
}

function canPayRemaining(order: ShopOrder) {
  return (
    (order.status === "confirmed" || order.status === "delivered") &&
    order.paymentStage !== "full" &&
    orderRemaining(order) > 0.01
  );
}

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
  const [payingMode, setPayingMode] = useState<"advance" | "balance">("advance");
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [payMethod, setPayMethod] = useState<"bank" | "telebirr" | null>(null);
  const [payEvidenceText, setPayEvidenceText] = useState("");
  const [payEvidenceFile, setPayEvidenceFile] = useState<File | null>(null);
  const [payEvidencePreview, setPayEvidencePreview] = useState<string | null>(
    null,
  );
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

    if (!payMethod) {
      setPaymentModalError("Select CBE Bank or Telebirr first.");
      return;
    }

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
          "Please upload a screenshot or enter your transaction number.",
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
      setPayMethod(null);
      setPayEvidenceFile(null);
      setPayEvidencePreview(null);
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
          Prepayment, expected date, and location for each order.
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
            const total = orderLineTotal(order);
            const advance =
              order.advancePaymentAmount != null
                ? Number(order.advancePaymentAmount)
                : total * 0.5;
            const paid = orderPaidAmount(order);
            const remaining = orderRemaining(order);
            const paidPct =
              total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            const showProgress =
              order.paymentStage === "partial" ||
              order.paymentStage === "full" ||
              (Boolean(order.paymentVerifiedAt) &&
                (order.status === "confirmed" || order.status === "delivered"));

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
                      {(order.paymentMethod === "bank" ||
                        order.paymentMethod === "telebirr" ||
                        order.balancePaymentMethod) && (
                        <span
                          className="relative size-7 shrink-0 rounded-md overflow-hidden bg-white border border-border/80"
                          title={
                            (order.balancePaymentMethod ||
                              order.paymentMethod) === "telebirr"
                              ? "Telebirr"
                              : "CBE"
                          }
                          aria-label={
                            (order.balancePaymentMethod ||
                              order.paymentMethod) === "telebirr"
                              ? "Paid via Telebirr"
                              : "Paid via CBE"
                          }
                        >
                          <Image
                            src={
                              (order.balancePaymentMethod ||
                                order.paymentMethod) === "telebirr"
                                ? "/telebirr.png"
                                : "/cbe.png"
                            }
                            alt=""
                            fill
                            className="object-contain p-0.5"
                          />
                        </span>
                      )}
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

                <div className="rounded-xl bg-muted/40 p-2.5 text-[11px] space-y-1.5 text-muted-foreground border border-border/60">
                  <div className="flex justify-between items-center gap-2">
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <MapPin className="size-3" /> Location
                    </span>
                    <span className="font-medium text-foreground truncate max-w-[200px] text-right">
                      {isPickup
                        ? order.pickupLocation?.name || "Store pickup"
                        : order.deliveryAddress?.trim() || "Delivery"}
                    </span>
                  </div>
                  {isPickup && order.pickupLocation?.description?.trim() && (
                    <p className="text-[11px] text-foreground/80 leading-snug">
                      {order.pickupLocation.description.trim()}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" /> Expected
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatExpected(order.expectedDeliveryDate)}
                    </span>
                  </div>
                  {showProgress ? (
                    <div className="border-t border-border/40 pt-2 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="inline-flex items-center gap-1">
                          <CreditCard className="size-3" /> Payment
                        </span>
                        <span className="font-semibold text-foreground">
                          {paid.toFixed(2)} / {total.toFixed(2)} ETB
                        </span>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={paidPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Paid ${paidPct}%`}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            order.paymentStage === "full"
                              ? "bg-emerald-600"
                              : "bg-primary",
                          )}
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {order.paymentStage === "full"
                          ? "Fully paid"
                          : `Remaining ${remaining.toFixed(2)} ETB`}
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center border-t border-border/40 pt-1.5">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="size-3" /> Prepayment
                      </span>
                      <span className="font-semibold text-primary">
                        {advance.toFixed(2)} ETB
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
                      onClick={() => {
                        setPayingMode("advance");
                        setPayingOrder(order);
                      }}
                    >
                      <CreditCard className="size-3.5" />
                      Pay 50% Advance ({advance.toFixed(2)} ETB)
                    </Button>
                  )}

                  {canPayRemaining(order) && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs font-semibold rounded-xl flex-1 gap-1.5"
                      onClick={() => {
                        setPayingMode("balance");
                        setPayingOrder(order);
                      }}
                    >
                      <CreditCard className="size-3.5" />
                      Pay remaining ({remaining.toFixed(2)} ETB)
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

      {/* Pay advance / remaining modal */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {payingMode === "balance"
                    ? "Pay remaining balance"
                    : "Submit 50% Payment Evidence"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {payingOrder.product?.name} ·{" "}
                  {payingMode === "balance" ? "Remaining" : "Advance"}:{" "}
                  <span className="font-semibold text-emerald-700">
                    {(payingMode === "balance"
                      ? orderRemaining(payingOrder)
                      : Number(payingOrder.advancePaymentAmount) ||
                        orderLineTotal(payingOrder) * 0.5
                    ).toFixed(2)}{" "}
                    ETB
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Use a transfer made within the last{" "}
                  <span className="font-semibold text-foreground">48 hours</span>
                  . Older receipts are rejected.
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

              {/* Account details — after method selected */}
              {payMethod === "bank" && (
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
              )}

              {payMethod === "telebirr" && (
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

              {/* Evidence inputs — after method selected */}
              {payMethod && (
              <div className="space-y-2 text-xs">
                <label className="font-semibold text-foreground block">
                  Payment Evidence (Screenshot or Transaction Number)
                </label>
                <p className="text-[10px] text-muted-foreground -mt-0.5">
                  If uploading a photo, use{" "}
                  <span className="font-semibold text-foreground">
                    natural light
                  </span>{" "}
                  so the receipt is clear and readable.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPayEvidenceFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () =>
                        setPayEvidencePreview(String(reader.result || ""));
                      reader.readAsDataURL(file);
                    } else {
                      setPayEvidencePreview(null);
                    }
                  }}
                  className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                {payEvidencePreview && (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={payEvidencePreview}
                      alt="Receipt"
                      className="max-h-28 rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 size-6 rounded-full bg-background border border-border text-xs font-bold"
                      onClick={() => {
                        setPayEvidenceFile(null);
                        setPayEvidencePreview(null);
                      }}
                      aria-label="Remove screenshot"
                    >
                      ×
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  value={payEvidenceText}
                  onChange={(e) => setPayEvidenceText(e.target.value)}
                  placeholder="Or enter transaction number"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              )}

              {paymentModalError && (
                <p className="text-xs text-destructive">{paymentModalError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setPayingOrder(null);
                    setPayMethod(null);
                    setPayEvidenceFile(null);
                    setPayEvidencePreview(null);
                    setPayEvidenceText("");
                  }}
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
