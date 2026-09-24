"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Truck,
  Store,
  MapPin,
  Calendar,
  CreditCard,
  UploadCloud,
  Check,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Copy,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShopPrice } from "@/components/shop/ShopPrice";
import { Money } from "@/components/Money";
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
  type ShopOrder,
} from "@/lib/shop-api";
import { shopSalePrice } from "@/lib/shop-pricing";
import { cn } from "@/lib/utils";
import { LocationSearch, type LocationSuggestion } from "@/components/location/LocationSearch";
import { DeliveryRouteMap } from "@/components/location/DeliveryRouteMap";

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
  defaultLat?: number | null;
  defaultLon?: number | null;
  onSuccess?: () => void;
  submitLabel?: string;
};

export function ShopCheckoutForm({
  lines,
  defaultAddress = "",
  defaultLat,
  defaultLon,
  onSuccess,
}: ShopCheckoutFormProps) {
  const router = useRouter();

  // Fulfilment state
  const [fulfilmentType, setFulfilmentType] =
    useState<FulfilmentType>("delivery");
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [isEditingAddress, setIsEditingAddress] = useState(
    !defaultAddress || !defaultAddress.trim() || !defaultLat || !defaultLon,
  );
  const [customerLat, setCustomerLat] = useState<number | undefined>(defaultLat ?? undefined);
  const [customerLon, setCustomerLon] = useState<number | undefined>(defaultLon ?? undefined);
  const [deliveryFee, setDeliveryFee] = useState<number>(350);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | undefined>();
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [outOfBounds, setOutOfBounds] = useState(false);

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
  const [createdOrders, setCreatedOrders] = useState<ShopOrder[]>([]);

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

  // Sync default address when provided
  useEffect(() => {
    if (defaultAddress && defaultAddress.trim() && defaultLat && defaultLon) {
      setAddress(defaultAddress.trim());
      setCustomerLat(defaultLat);
      setCustomerLon(defaultLon);
      setIsEditingAddress(false);
    } else {
      setIsEditingAddress(true);
    }
  }, [defaultAddress, defaultLat, defaultLon]);

  // Recalculate delivery fee when address changes
  useEffect(() => {
    if (fulfilmentType !== "delivery") {
      setDeliveryFee(0);
      setOutOfBounds(false);
      return;
    }

    if (!customerLat || !customerLon) {
      setDeliveryFee(350);
      setOutOfBounds(false);
      return;
    }

    const timer = setTimeout(() => {
      setCalculatingFee(true);
      shopFetchDeliveryFee(customerLat, customerLon)
        .then((res) => {
          setDeliveryFee(res.fee);
          setDeliveryDistanceKm(res.distanceKm);
          setOutOfBounds(!res.withinRadius);
        })
        .catch(() => {
          setDeliveryFee(350);
        })
        .finally(() => setCalculatingFee(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [customerLat, customerLon, fulfilmentType]);

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

  const hasProfileAddress = Boolean(defaultAddress && defaultAddress.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;

    if (fulfilmentType === "delivery" && (!customerLat || !customerLon)) {
      setError("Please search and select your delivery location to continue.");
      setIsEditingAddress(true);
      return;
    }

    if (fulfilmentType === "delivery" && outOfBounds) {
      setError("This location is outside our delivery area. Please choose Store Pickup or a closer address.");
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
          if (!evidenceUrl) {
            evidenceUrl = "Receipt screenshot uploaded via client";
          }
        }
      }

      const orders = await shopCreateOrders({
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        deliveryAddress:
          fulfilmentType === "delivery" ? address.trim() : undefined,
        deliveryLat:
          fulfilmentType === "delivery" ? customerLat : undefined,
        deliveryLon:
          fulfilmentType === "delivery" ? customerLon : undefined,
        deliveryDistanceKm:
          fulfilmentType === "delivery" ? deliveryDistanceKm : undefined,
        fulfilmentType,
        pickupLocationId:
          fulfilmentType === "pickup" ? selectedPickupId : undefined,
        deliveryFee: activeDeliveryFee,
        paymentMethod,
        paymentEvidence: evidenceUrl || undefined,
      });

      setCreatedOrders(orders);
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
    const firstOrder = createdOrders[0];
    const verifyStatus = firstOrder?.verifyEtStatus;

    let TitleIcon = CheckCircle2;
    let titleText = "Order Placed Successfully!";
    let subtitleText =
      "Your 50% advance payment has been submitted and is currently awaiting verification by our team.";
    let iconClass = "text-primary bg-primary/10";

    if (verifyStatus === "verified") {
      TitleIcon = CheckCircle2;
      titleText = "Payment Verified! Order Confirmed";
      subtitleText =
        "Your advance payment was verified automatically. We are preparing your order!";
      iconClass = "text-green-500 bg-green-500/10";
    } else if (verifyStatus === "queued") {
      TitleIcon = Loader2;
      titleText = "Payment Verification In Progress…";
      subtitleText =
        "We are checking your payment with the bank. We'll notify you on Telegram once confirmed.";
      iconClass = "text-blue-500 bg-blue-500/10 animate-pulse";
    } else if (verifyStatus && verifyStatus !== "skipped") {
      TitleIcon = AlertCircle;
      titleText = "Order Placed — Awaiting Manual Verification";
      subtitleText =
        "Your order was placed, but auto-verification failed. Our team will review it manually.";
      iconClass = "text-amber-500 bg-amber-500/10";
    }

    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-5 shadow-xs animate-in fade-in duration-200">
        <div
          className={cn(
            "mx-auto size-14 rounded-full flex items-center justify-center",
            iconClass
          )}
        >
          <TitleIcon className={cn("size-8", verifyStatus === "queued" && "animate-spin")} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            {titleText}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {subtitleText}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-left text-xs space-y-2.5">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Fulfilment Method</span>
            <span className="font-semibold text-foreground capitalize">
              {fulfilmentType === "delivery" ? "Doorstep Delivery" : "Store Pickup"}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Expected Date</span>
            <span className="font-semibold text-primary">
              {formattedExpectedDate}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>50% Advance Submitted</span>
            <span className="font-semibold text-foreground">
              {advanceAmount.toFixed(2)} ETB
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground border-t border-border pt-2">
            <span>Remaining Balance Due</span>
            <span className="font-semibold text-foreground">
              {remainingAmount.toFixed(2)} ETB
            </span>
          </div>
        </div>

        <Button
          onClick={() => router.push("/shop/orders")}
          className="w-full h-11 rounded-xl"
        >
          View My Orders
        </Button>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <p className="text-sm text-muted-foreground">Nothing in cart to order.</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Section 1: Delivery Method ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1. Delivery Method
          </label>
          <span className="text-xs text-muted-foreground">Choose one</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Delivery Option */}
          <button
            type="button"
            onClick={() => setFulfilmentType("delivery")}
            className={cn(
              "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
              fulfilmentType === "delivery"
                ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary shadow-2xs"
                : "border-border bg-card hover:bg-muted/40 text-muted-foreground",
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-lg shrink-0",
                fulfilmentType === "delivery"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Truck className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-foreground leading-tight">
                Delivery
              </span>
              <span className="block text-[10px] text-muted-foreground leading-tight">
                Doorstep
              </span>
            </div>
          </button>

          {/* Store Pickup Option */}
          <button
            type="button"
            onClick={() => setFulfilmentType("pickup")}
            className={cn(
              "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
              fulfilmentType === "pickup"
                ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary shadow-2xs"
                : "border-border bg-card hover:bg-muted/40 text-muted-foreground",
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-lg shrink-0",
                fulfilmentType === "pickup"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Store className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-foreground leading-tight">
                Store Pickup
              </span>
              <span className="block text-[10px] font-semibold text-primary leading-tight">
                Free
              </span>
            </div>
          </button>
        </div>

        {/* ── Delivery Address Details ── */}
        {fulfilmentType === "delivery" ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-2xs">
            {hasProfileAddress && !isEditingAddress ? (
              /* Verified profile address display */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-primary/10 text-primary">
                      <MapPin className="size-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Delivery Location
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      From Profile
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsEditingAddress(true)}
                  >
                    <Pencil className="size-3" />
                    Change
                  </Button>
                </div>
                
                <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-xl border border-border/60">
                  {address}
                </p>

                {customerLat && customerLon && (
                  <DeliveryRouteMap customerLat={customerLat} customerLon={customerLon} />
                )}
              </div>
            ) : (
              /* Prompt user for address */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <MapPin className="size-4 text-primary" />
                    <span>Search Delivery Location</span>
                  </div>
                  {hasProfileAddress && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-muted-foreground"
                      onClick={() => {
                        setAddress(defaultAddress!.trim());
                        setCustomerLat(defaultLat!);
                        setCustomerLon(defaultLon!);
                        setIsEditingAddress(false);
                      }}
                    >
                      Use saved location
                    </Button>
                  )}
                </div>

                {!hasProfileAddress && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-900 dark:text-amber-200 mb-2">
                    <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-tight">
                      No saved location found on your profile. Please search and select your exact delivery location.
                    </p>
                  </div>
                )}

                <LocationSearch
                  defaultValue={address}
                  placeholder="E.g., Bole Medhanialem..."
                  onSelect={(loc) => {
                    setAddress(loc.display_name);
                    setCustomerLat(parseFloat(loc.lat));
                    setCustomerLon(parseFloat(loc.lon));
                  }}
                />

                {customerLat && customerLon && (
                  <div className="mt-4">
                    <DeliveryRouteMap customerLat={customerLat} customerLon={customerLon} />
                  </div>
                )}
              </div>
            )}

            {/* Delivery fee & timing summary */}
            <div className="border-t border-border/60 pt-2.5 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Expected Delivery:
                </span>
                <span className="font-semibold text-foreground">
                  {formattedExpectedDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="size-3.5" /> Delivery Fee:
                </span>
                <span className="font-semibold text-primary">
                  {calculatingFee
                    ? "Calculating…"
                    : outOfBounds
                    ? "Out of Delivery Zone"
                    : `${deliveryFee.toFixed(2)} ETB`}
                </span>
              </div>
              {deliveryDistanceKm && (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5" /> Distance:
                  </span>
                  <span className="font-medium text-foreground">
                    {deliveryDistanceKm} km
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Store Pickup Branch Selection ── */
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Store className="size-4 text-primary" />
                Select 1 Pickup Location
              </span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Free
              </span>
            </div>

            {loadingPickups ? (
              <p className="text-xs text-muted-foreground py-2">
                Loading pickup locations…
              </p>
            ) : pickupLocations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Medaf Store — Bole Road, Addis Ababa
              </p>
            ) : (
              <div className="space-y-2">
                {pickupLocations.map((loc) => {
                  const isSelected = selectedPickupId === loc.id;
                  return (
                    <button
                      type="button"
                      key={loc.id}
                      onClick={() => setSelectedPickupId(loc.id)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-2xs"
                          : "border-border bg-background hover:bg-muted/40",
                      )}
                    >
                      <div className="mt-0.5">
                        <div
                          className={cn(
                            "size-4 rounded-full border flex items-center justify-center transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-background",
                          )}
                        >
                          {isSelected && <Check className="size-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {loc.name}
                          </p>
                          <span className="text-[10px] font-medium text-primary">
                            Free
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {loc.address}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2.5">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Ready for Pickup:
              </span>
              <span className="font-semibold text-foreground">
                {formattedExpectedDate}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Order Breakdown ── */}
      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          2. Order Summary
        </label>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-2xs">
          <ul className="space-y-2 divide-y divide-border/40">
            {lines.map((line) => {
              const unit = shopSalePrice(line);
              return (
                <li
                  key={line.productId}
                  className="flex items-start justify-between gap-3 text-xs pt-2 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground line-clamp-1">
                      {line.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <ShopPrice item={line} /> · Qty {line.quantity}
                    </p>
                  </div>
                  <Money
                    amount={unit * line.quantity}
                    size="sm"
                    className="shrink-0 font-semibold"
                  />
                </li>
              );
            })}
          </ul>

          <div className="space-y-1.5 border-t border-border pt-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Items Subtotal</span>
              <span>{subtotal.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery Charge</span>
              <span className="font-medium text-foreground">
                {activeDeliveryFee === 0
                  ? "FREE"
                  : `${activeDeliveryFee.toFixed(2)} ETB`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-foreground text-sm pt-2 border-t border-border">
              <span>Total Order Value</span>
              <span>{grandTotal.toFixed(2)} ETB</span>
            </div>
          </div>

          {/* 50% Advance Requirement Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                Required Now (50% Advance)
              </span>
              <span className="text-base font-extrabold text-foreground tracking-tight">
                {advanceAmount.toFixed(2)} ETB
              </span>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <span>Remaining at handover:</span>
              <span className="block font-bold text-xs text-foreground">
                {remainingAmount.toFixed(2)} ETB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Payment Method & Evidence ── */}
      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          3. Pay 50% Advance ({advanceAmount.toFixed(2)} ETB)
        </label>

        {/* Bank / Telebirr Buttons with Logos and Official Colors */}
        <div className="grid grid-cols-2 gap-3">
          {/* CBE Button */}
          <button
            type="button"
            onClick={() => setPaymentMethod("bank")}
            className={cn(
              "flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer",
              paymentMethod === "bank"
                ? "border-[#6b1d7d] bg-[#6b1d7d]/5 ring-1 ring-[#6b1d7d] shadow-2xs"
                : "border-border bg-card hover:bg-muted/40",
            )}
          >
            <div className="relative size-9 shrink-0 rounded-xl overflow-hidden bg-white border border-border/80 p-0.5 flex items-center justify-center">
              <Image
                src="/cbe.png"
                alt="Commercial Bank of Ethiopia"
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

          {/* Telebirr Button */}
          <button
            type="button"
            onClick={() => setPaymentMethod("telebirr")}
            className={cn(
              "flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer",
              paymentMethod === "telebirr"
                ? "border-[#0072bc] bg-[#0072bc]/5 ring-1 ring-[#0072bc] shadow-2xs"
                : "border-border bg-card hover:bg-muted/40",
            )}
          >
            <div className="relative size-9 shrink-0 rounded-xl overflow-hidden bg-white border border-border/80 p-0.5 flex items-center justify-center">
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

        {/* Account Information Card */}
        {paymentMethod === "bank" ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-xs space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <div className="relative size-5 rounded overflow-hidden">
                  <Image src="/cbe.png" alt="CBE" fill className="object-contain" />
                </div>
                <span className="font-semibold text-foreground">
                  {paymentInfo?.bankAccount?.bankName ||
                    "Commercial Bank of Ethiopia"}
                </span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b1d7d] bg-[#6b1d7d]/10 px-2 py-0.5 rounded-full">
                CBE
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">
                  {paymentInfo?.bankAccount?.accountNumber || "1000XXXXXXXX"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() =>
                    copyToClipboard(
                      paymentInfo?.bankAccount?.accountNumber || "1000XXXXXXXX",
                      "bank",
                    )
                  }
                >
                  {copiedBank ? (
                    <>
                      <Check className="size-3 text-primary" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account Holder:</span>
              <span className="font-semibold text-foreground">
                {paymentInfo?.bankAccount?.accountName || "Medaf Skin Care"}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 text-xs space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <div className="relative size-5 rounded overflow-hidden">
                  <Image
                    src="/telebirr.png"
                    alt="Telebirr"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-semibold text-foreground">
                  Telebirr Account
                </span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0072bc] bg-[#0072bc]/10 px-2 py-0.5 rounded-full">
                Telebirr
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Phone Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">
                  {paymentInfo?.telebirr?.phoneNumber || "09XXXXXXXX"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() =>
                    copyToClipboard(
                      paymentInfo?.telebirr?.phoneNumber || "09XXXXXXXX",
                      "telebirr",
                    )
                  }
                >
                  {copiedTelebirr ? (
                    <>
                      <Check className="size-3 text-primary" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
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

        {/* Payment Evidence Input */}
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-semibold text-foreground block">
            Payment Evidence (Screenshot or Reference)
          </span>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary rounded-xl p-3.5 text-center cursor-pointer transition-colors bg-background">
            <UploadCloud className="size-6 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground mt-1">
              {evidenceFile ? evidenceFile.name : "Upload Receipt Screenshot"}
            </span>
            <span className="text-[10px] text-muted-foreground">
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

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <div className="h-px bg-border flex-1" />
            <span className="text-[11px]">or enter transaction ID</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <input
            type="text"
            value={paymentEvidenceText}
            onChange={(e) => setPaymentEvidenceText(e.target.value)}
            placeholder="E.g., CBE/FT2409... or Telebirr SMS ref"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Final Action Button */}
      <Button
        type="submit"
        className="w-full h-12 text-sm font-semibold rounded-2xl shadow-sm gap-2"
        disabled={submitting}
      >
        <ShieldCheck className="size-4" />
        {submitting ? "Placing Order…" : "Place Order"}
      </Button>
    </form>
  );
}
