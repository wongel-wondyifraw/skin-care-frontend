"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShopPrice } from "@/components/shop/ShopPrice";
import { Money } from "@/components/Money";
import { ShopSupportContact } from "@/components/shop/ShopSupportContact";
import {
  shopCreateOrders,
  shopFetchDeliveryFee,
  shopFetchPickupLocations,
  shopFetchPaymentInfo,
  shopUploadReceipt,
  ShopApiError,
  type FulfilmentType,
  type PickupLocation,
  type PaymentInfo,
} from "@/lib/shop-api";
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
}: ShopCheckoutFormProps) {
  const router = useRouter();

  // Fulfilment state
  const [fulfilmentType, setFulfilmentType] =
    useState<FulfilmentType>("delivery");
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [deliveryFee, setDeliveryFee] = useState<number>(350);
  const [deliveryZone, setDeliveryZone] = useState<string>("Standard");
  const [calculatingFee, setCalculatingFee] = useState(false);

  // Pickup locations state
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupId, setSelectedPickupId] = useState<string>("");
  const [loadingPickups, setLoadingPickups] = useState(false);

  // Payment details state
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "telebirr">(
    "bank",
  );
  const [paymentEvidenceText, setPaymentEvidenceText] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedTelebirr, setCopiedTelebirr] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCompleted, setOrderCompleted] = useState(false);

  // Load payment info & pickup locations on mount
  useEffect(() => {
    shopFetchPaymentInfo()
      .then((data) => setPaymentInfo(data))
      .catch(() => {});

    setLoadingPickups(true);
    shopFetchPickupLocations()
      .then((locs) => {
        setPickupLocations(locs);
        if (locs.length > 0) {
          setSelectedPickupId(locs[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPickups(false));
  }, []);

  // Sync default address
  useEffect(() => {
    if (defaultAddress) {
      setAddress(defaultAddress);
    }
  }, [defaultAddress]);

  // Recalculate delivery fee when address changes (debounced)
  useEffect(() => {
    if (fulfilmentType !== "delivery") {
      setDeliveryFee(0);
      return;
    }

    const timer = setTimeout(() => {
      setCalculatingFee(true);
      shopFetchDeliveryFee(address)
        .then((res) => {
          setDeliveryFee(res.fee);
          setDeliveryZone(res.zone);
        })
        .catch(() => {
          setDeliveryFee(350);
        })
        .finally(() => setCalculatingFee(false));
    }, 600);

    return () => clearTimeout(timer);
  }, [address, fulfilmentType]);

  // Handle screenshot upload preview
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEvidenceFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setEvidencePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Copy helpers
  function copyToClipboard(text: string, type: "bank" | "telebirr") {
    navigator.clipboard.writeText(text);
    if (type === "bank") {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else {
      setCopiedTelebirr(true);
      setTimeout(() => setCopiedTelebirr(false), 2000);
    }
  }

  const subtotal = lines.reduce(
    (sum, line) => sum + shopSalePrice(line) * line.quantity,
    0,
  );
  const activeDeliveryFee = fulfilmentType === "pickup" ? 0 : deliveryFee;
  const grandTotal = subtotal + activeDeliveryFee;
  const advanceAmount = Math.round(grandTotal * 0.5 * 100) / 100;
  const remainingAmount = grandTotal - advanceAmount;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formattedExpectedDate = tomorrow.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;

    if (fulfilmentType === "delivery" && !address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    if (fulfilmentType === "pickup" && !selectedPickupId) {
      setError("Please select a pickup location.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let evidenceUrl = paymentEvidenceText.trim();

      // If an image was selected, upload it first
      if (evidenceFile) {
        try {
          evidenceUrl = await shopUploadReceipt(evidenceFile);
        } catch {
          // If upload fails, still record payment evidence if text exists
          if (!evidenceUrl) {
            evidenceUrl = "Receipt screenshot uploaded via client";
          }
        }
      }

      await shopCreateOrders({
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        deliveryAddress:
          fulfilmentType === "delivery" ? address.trim() : undefined,
        fulfilmentType,
        pickupLocationId:
          fulfilmentType === "pickup" ? selectedPickupId : undefined,
        deliveryFee: activeDeliveryFee,
        paymentMethod,
        paymentEvidence: evidenceUrl || undefined,
      });

      setOrderCompleted(true);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof ShopApiError
          ? err.message
          : "Could not place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (orderCompleted) {
    return (
      <div className="rounded-3xl border border-emerald-200/80 bg-linear-to-b from-emerald-50/60 to-white p-6 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
        <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
          🎉
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-emerald-950">Order Placed!</h3>
          <p className="text-sm text-emerald-800/90">
            Your 50% advance payment has been submitted and is currently being
            verified.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-4 text-left text-xs space-y-2.5 shadow-2xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Fulfilment</span>
            <span className="font-semibold text-foreground capitalize">
              {fulfilmentType}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Expected Date</span>
            <span className="font-semibold text-emerald-700">
              {formattedExpectedDate}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>50% Advance Submitted</span>
            <span className="font-semibold text-foreground">
              {advanceAmount.toFixed(2)} ETB
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground border-t border-border/40 pt-2">
            <span>Remaining on Delivery</span>
            <span className="font-semibold text-foreground">
              {remainingAmount.toFixed(2)} ETB
            </span>
          </div>
        </div>

        <ShopSupportContact compact={false} />

        <Button
          onClick={() => router.push("/shop/orders")}
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl h-11"
        >
          View My Orders
        </Button>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <p className="text-sm text-muted-foreground">Nothing to order yet.</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Section 1: How would you like to receive? ── */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          1. Delivery Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFulfilmentType("delivery")}
            className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border text-sm font-medium transition-all ${
              fulfilmentType === "delivery"
                ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-600"
                : "border-border bg-background hover:bg-muted/40 text-foreground"
            }`}
          >
            <span className="text-2xl">🚚</span>
            <span>Delivery</span>
            <span className="text-[11px] text-muted-foreground">
              To your door
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFulfilmentType("pickup")}
            className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border text-sm font-medium transition-all ${
              fulfilmentType === "pickup"
                ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-600"
                : "border-border bg-background hover:bg-muted/40 text-foreground"
            }`}
          >
            <span className="text-2xl">📍</span>
            <span>Store Pickup</span>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Free Pickup
            </span>
          </button>
        </div>

        {/* Delivery Address fields */}
        {fulfilmentType === "delivery" ? (
          <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Delivery Address in Addis Ababa
              </span>
              <span className="text-emerald-700 font-medium">
                {calculatingFee ? "Calculating fee…" : `${deliveryZone} Zone`}
              </span>
            </div>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="E.g., Bole Medhanialem, Near Edna Mall, House #402"
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>📅 Expected Delivery:</span>
              <span className="font-semibold text-foreground">
                {formattedExpectedDate}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>🚚 Delivery Fee:</span>
              <span className="font-semibold text-emerald-800">
                {deliveryFee.toFixed(2)} ETB
              </span>
            </div>
          </div>
        ) : (
          /* Pickup Location options */
          <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
            <span className="text-xs font-medium text-foreground block">
              Choose Pickup Branch
            </span>
            {loadingPickups ? (
              <p className="text-xs text-muted-foreground">
                Loading pickup locations…
              </p>
            ) : pickupLocations.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Medaf Store — Bole Road, Addis Ababa
              </p>
            ) : (
              <div className="space-y-2">
                {pickupLocations.map((loc) => (
                  <label
                    key={loc.id}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedPickupId === loc.id
                        ? "border-emerald-600 bg-emerald-50/70"
                        : "border-border/60 bg-background hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pickupLocation"
                      checked={selectedPickupId === loc.id}
                      onChange={() => setSelectedPickupId(loc.id)}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {loc.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {loc.address}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>📅 Ready for Pickup:</span>
              <span className="font-semibold text-foreground">
                {formattedExpectedDate}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Order Summary ── */}
      <div className="space-y-2.5 border-t border-border pt-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          2. Order Summary
        </label>
        <ul className="space-y-2 text-sm">
          {lines.map((line) => {
            const unit = shopSalePrice(line);
            return (
              <li
                key={line.productId}
                className="flex items-start justify-between gap-3 text-xs"
              >
                <span className="min-w-0">
                  <span className="font-medium text-foreground line-clamp-1">
                    {line.name}
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    <ShopPrice item={line} /> · Qty {line.quantity}
                  </span>
                </span>
                <Money
                  amount={unit * line.quantity}
                  size="sm"
                  className="shrink-0 font-medium"
                />
              </li>
            );
          })}
        </ul>

        <div className="space-y-1.5 border-t border-border/60 pt-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{subtotal.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery Fee</span>
            <span>
              {activeDeliveryFee === 0
                ? "FREE"
                : `${activeDeliveryFee.toFixed(2)} ETB`}
            </span>
          </div>
          <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t border-border/40">
            <span>Total Amount</span>
            <span>{grandTotal.toFixed(2)} ETB</span>
          </div>
        </div>

        {/* 50% Advance Highlight Banner */}
        <div className="rounded-2xl bg-linear-to-r from-emerald-600 to-teal-700 p-3.5 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider opacity-90 block font-semibold">
                Required Now (50% Advance)
              </span>
              <span className="text-lg font-extrabold tracking-tight">
                {advanceAmount.toFixed(2)} ETB
              </span>
            </div>
            <div className="text-right text-[11px] opacity-90">
              <span>Remaining at delivery:</span>
              <span className="block font-bold text-xs">
                {remainingAmount.toFixed(2)} ETB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: 50% Payment Details ── */}
      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          3. Pay 50% Advance ({advanceAmount.toFixed(2)} ETB)
        </label>

        {/* Method selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("bank")}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
              paymentMethod === "bank"
                ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600"
                : "border-border bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            🏦 Bank Transfer (CBE)
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("telebirr")}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
              paymentMethod === "telebirr"
                ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600"
                : "border-border bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            📱 Telebirr
          </button>
        </div>

        {/* Account information card */}
        {paymentMethod === "bank" ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-3 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Bank Name:</span>
              <span className="font-semibold text-foreground">
                {paymentInfo?.bankAccount?.bankName ||
                  "Commercial Bank of Ethiopia"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account Number:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                <span>
                  {paymentInfo?.bankAccount?.accountNumber || "1000XXXXXXXX"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      paymentInfo?.bankAccount?.accountNumber || "1000XXXXXXXX",
                      "bank",
                    )
                  }
                  className="text-emerald-700 hover:text-emerald-900 text-[11px] font-sans underline"
                >
                  {copiedBank ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account Name:</span>
              <span className="font-semibold text-foreground">
                {paymentInfo?.bankAccount?.accountName || "Medaf Skin Care"}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-muted/30 p-3 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Telebirr Number:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                <span>
                  {paymentInfo?.telebirr?.phoneNumber || "09XXXXXXXX"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      paymentInfo?.telebirr?.phoneNumber || "09XXXXXXXX",
                      "telebirr",
                    )
                  }
                  className="text-emerald-700 hover:text-emerald-900 text-[11px] font-sans underline"
                >
                  {copiedTelebirr ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account Name:</span>
              <span className="font-semibold text-foreground">
                {paymentInfo?.telebirr?.accountName || "Medaf Skin Care"}
              </span>
            </div>
          </div>
        )}

        {/* Payment evidence input */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-foreground block">
            Payment Evidence (Screenshot or Transaction Reference)
          </span>

          <div className="flex flex-col gap-2">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-emerald-500 rounded-2xl p-3 text-center cursor-pointer transition-colors bg-background">
              <span className="text-xl">📸</span>
              <span className="text-xs font-semibold text-foreground mt-1">
                {evidenceFile
                  ? evidenceFile.name
                  : "Upload Payment Screenshot"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                PNG, JPG or WEBP up to 5MB
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {evidencePreview && (
              <div className="relative rounded-xl overflow-hidden border border-border max-h-32 w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={evidencePreview}
                  alt="Receipt Preview"
                  className="object-contain max-h-32 rounded-lg"
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px bg-border flex-1" />
              <span>or enter transaction reference</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <input
              type="text"
              value={paymentEvidenceText}
              onChange={(e) => setPaymentEvidenceText(e.target.value)}
              placeholder="E.g., CBE/FT2409... or Telebirr SMS ref"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Support number reminder */}
      <ShopSupportContact compact={true} />

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-2xl text-sm shadow-md transition-all active:scale-[0.99]"
        disabled={submitting}
      >
        {submitting
          ? "Processing Order…"
          : `✅ I Have Paid ${advanceAmount.toFixed(2)} ETB — Place Order`}
      </Button>
    </form>
  );
}
