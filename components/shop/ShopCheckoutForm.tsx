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
  LocateFixed,
  X,
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
  shopReverseGeocode,
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
import { LocationPinMap } from "@/components/location/LocationPinMap";
import { useToast } from "@/components/ToastProvider";

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
  const { toast } = useToast();

  // Fulfilment state
  const [fulfilmentType, setFulfilmentType] =
    useState<FulfilmentType>("delivery");
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [isEditingAddress, setIsEditingAddress] = useState(
    !defaultAddress || !defaultAddress.trim() || !defaultLat || !defaultLon,
  );
  const [customerLat, setCustomerLat] = useState<number | undefined>(defaultLat ?? undefined);
  const [customerLon, setCustomerLon] = useState<number | undefined>(defaultLon ?? undefined);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<
    number | undefined
  >();
  const [deliveryBandLabel, setDeliveryBandLabel] = useState<string | null>(
    null,
  );
  const [deliveryNotes, setDeliveryNotes] = useState<string | null>(null);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [outOfBounds, setOutOfBounds] = useState(false);

  // Pickup locations state
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupId, setSelectedPickupId] = useState<string>("");
  const [loadingPickups, setLoadingPickups] = useState(false);

  // Payment details state
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "telebirr" | null>(
    null,
  );
  const [paymentEvidenceText, setPaymentEvidenceText] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedTelebirr, setCopiedTelebirr] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationSubtitle, setLocationSubtitle] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<ShopOrder[]>([]);
  /** idle → verifying (API in flight) → confirmed (short success beat) → completed page */
  const [verifyPhase, setVerifyPhase] = useState<
    "idle" | "verifying" | "confirmed"
  >("idle");
  const [verifyHint, setVerifyHint] = useState(
    "Checking your payment with the bank…",
  );

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
      setDeliveryDistanceKm(undefined);
      setDeliveryBandLabel(null);
      setOutOfBounds(false);
      return;
    }

    if (!customerLat || !customerLon) {
      setDeliveryFee(0);
      setDeliveryDistanceKm(undefined);
      setDeliveryBandLabel(null);
      setOutOfBounds(false);
      return;
    }

    const timer = setTimeout(() => {
      setCalculatingFee(true);
      shopFetchDeliveryFee(customerLat, customerLon)
        .then((res) => {
          setDeliveryFee(Number(res.fee) || 0);
          setDeliveryDistanceKm(res.distanceKm);
          setDeliveryBandLabel(res.bandLabel ?? null);
          setOutOfBounds(!res.withinRadius);
          if (res.originDescription) {
            setDeliveryNotes(res.originDescription);
          }
        })
        .catch(() => {
          setDeliveryFee(0);
          setDeliveryBandLabel(null);
          setOutOfBounds(true);
        })
        .finally(() => setCalculatingFee(false));
    }, 400);

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

  function clearEvidenceFile() {
    setEvidenceFile(null);
    setEvidencePreview(null);
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

  // Rotate status hints while Verify.ET is running
  useEffect(() => {
    if (verifyPhase !== "verifying") return;
    const hints = [
      "Checking your payment with the bank…",
      "Confirming transaction details…",
      "Matching amount and account…",
      "Almost done — finalizing verification…",
    ];
    let i = 0;
    setVerifyHint(hints[0]);
    const id = setInterval(() => {
      i = (i + 1) % hints.length;
      setVerifyHint(hints[i]);
    }, 2800);
    return () => clearInterval(id);
  }, [verifyPhase]);

  async function handleMyLocation() {
    if (!navigator.geolocation) {
      toast({
        title: "Location unavailable",
        description: "Geolocation is not supported on this device.",
        variant: "error",
      });
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60_000,
        });
      });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setCustomerLat(lat);
      setCustomerLon(lon);
      setAddress("Your location");
      setLocationSubtitle(null);
      setIsEditingAddress(true);
      try {
        const rev = await shopReverseGeocode(lat, lon);
        if (rev?.displayName) {
          setLocationSubtitle(
            rev.displayName.split(",").slice(0, 2).join(",").trim(),
          );
        }
      } catch {
        // label stays "Your location"
      }
    } catch {
      toast({
        title: "Location access",
        description:
          "Could not read your location. Allow location access or search instead.",
        variant: "error",
      });
    } finally {
      setLocating(false);
    }
  }

  const hasProfileAddress = Boolean(defaultAddress && defaultAddress.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;

    if (fulfilmentType === "delivery" && (!customerLat || !customerLon)) {
      toast({
        title: "Delivery location",
        description:
          "Please search and select your delivery location to continue.",
        variant: "error",
      });
      setIsEditingAddress(true);
      return;
    }

    if (fulfilmentType === "delivery" && outOfBounds) {
      toast({
        title: "Outside delivery area",
        description:
          "This location is outside our delivery area. Please choose Store Pickup or a closer address.",
        variant: "error",
      });
      return;
    }

    if (fulfilmentType === "pickup" && !selectedPickupId) {
      toast({
        title: "Pickup location",
        description: "Please select a pickup location.",
        variant: "error",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment method",
        description: "Select CBE Bank or Telebirr first.",
        variant: "error",
      });
      return;
    }

    const evidenceUrlOrText = paymentEvidenceText.trim();
    if (!evidenceFile && !evidenceUrlOrText) {
      toast({
        title: "Payment evidence",
        description:
          "Paste your transaction number or upload a receipt screenshot so we can verify payment.",
        variant: "error",
      });
      return;
    }

    setSubmitting(true);
    setVerifyPhase("verifying");

    try {
      let evidencePayload = evidenceUrlOrText;

      if (evidenceFile) {
        evidencePayload = await shopUploadReceipt(evidenceFile);
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
        paymentEvidence: evidencePayload,
      });

      setCreatedOrders(orders);

      // Spot-only: backend only returns orders when payment is already verified
      const first = orders[0];
      if (
        !first ||
        first.status !== "confirmed" ||
        (first.verifyEtStatus &&
          first.verifyEtStatus !== "verified" &&
          first.verifyEtStatus !== "skipped")
      ) {
        throw new ShopApiError(
          "Payment was not verified. No order was placed. Please try again.",
          400,
        );
      }

      setVerifyPhase("confirmed");
      await new Promise((r) => setTimeout(r, 900));
      setOrderCompleted(true);
      onSuccess?.();
    } catch (err) {
      setVerifyPhase("idle");
      toast({
        title: "Order failed",
        description:
          err instanceof ShopApiError
            ? err.message
            : "Could not place your order. Please try again.",
        variant: "error",
        durationMs: 6000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (verifyPhase === "verifying" || verifyPhase === "confirmed") {
    const isDone = verifyPhase === "confirmed";
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-6 shadow-xs animate-in fade-in zoom-in-95 duration-300">
        <div className="relative mx-auto size-20">
          {/* Soft pulse ring while verifying */}
          {!isDone && (
            <>
              <span className="absolute inset-0 rounded-full bg-primary/15 animate-ping" />
              <span className="absolute inset-1 rounded-full border-2 border-primary/25 animate-pulse" />
            </>
          )}
          <div
            className={cn(
              "relative size-20 rounded-full flex items-center justify-center transition-all duration-500",
              isDone
                ? "bg-green-500/15 text-green-600 scale-105"
                : "bg-primary/10 text-primary",
            )}
          >
            {isDone ? (
              <CheckCircle2 className="size-10 animate-in zoom-in-50 duration-400" />
            ) : (
              <Loader2 className="size-10 animate-spin" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {isDone ? "Payment confirmed" : "Verifying payment"}
          </h3>
          <p
            key={isDone ? "done" : verifyHint}
            className="text-xs text-muted-foreground max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-1 duration-300"
          >
            {isDone
              ? "Your advance was verified. Preparing your order…"
              : verifyHint}
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <span
            className={cn(
              "h-1.5 w-10 rounded-full transition-colors duration-300",
              "bg-primary",
            )}
          />
          <span
            className={cn(
              "h-1.5 w-10 rounded-full transition-colors duration-500",
              isDone ? "bg-primary" : "bg-muted animate-pulse",
            )}
          />
          <span
            className={cn(
              "h-1.5 w-10 rounded-full transition-colors duration-500",
              isDone ? "bg-green-500" : "bg-muted",
            )}
          />
        </div>
      </div>
    );
  }

  if (orderCompleted) {
    const firstOrder = createdOrders[0];
    const verifyStatus = firstOrder?.verifyEtStatus;
    const isFullyVerified =
      firstOrder?.status === "confirmed" || verifyStatus === "verified";

    const titleText = isFullyVerified
      ? "Payment Verified! Order Confirmed"
      : "Order Placed — Verifying Payment";
    const subtitleText = isFullyVerified
      ? "Your advance payment was verified automatically. We are preparing your order!"
      : "Your order is in. We're still confirming payment with the bank — you'll be notified on Telegram when it's done.";

    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-400">
        <div className="relative mx-auto size-16">
          {isFullyVerified ? (
            <>
              <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping [animation-iteration-count:1] [animation-duration:900ms]" />
              <div className="relative size-16 rounded-full flex items-center justify-center text-green-500 bg-green-500/10 animate-in zoom-in-50 duration-400">
                <CheckCircle2 className="size-9" />
              </div>
            </>
          ) : (
            <div className="relative size-16 rounded-full flex items-center justify-center text-primary bg-primary/10">
              <Loader2 className="size-9 animate-spin" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            {titleText}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {subtitleText}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-left text-xs space-y-2.5 animate-in fade-in duration-500 delay-150">
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
            <span>
              {isFullyVerified ? "50% Advance Verified" : "50% Advance Submitted"}
            </span>
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
                  <DeliveryRouteMap
                    customerLat={customerLat}
                    customerLon={customerLon}
                    onPick={(lat, lon) => {
                      setCustomerLat(lat);
                      setCustomerLon(lon);
                      setAddress("Your location");
                      setLocationSubtitle(null);
                      void shopReverseGeocode(lat, lon)
                        .then((rev) => {
                          if (rev?.displayName) {
                            setLocationSubtitle(
                              rev.displayName
                                .split(",")
                                .slice(0, 2)
                                .join(",")
                                .trim(),
                            );
                          }
                        })
                        .catch(() => {});
                    }}
                  />
                )}
              </div>
            ) : (
              /* Prompt user for address */
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <MapPin className="size-4 text-primary" />
                    <span>Delivery location</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 rounded-lg"
                    disabled={locating}
                    onClick={() => void handleMyLocation()}
                  >
                    <LocateFixed className={cn("size-3.5", locating && "animate-pulse")} />
                    {locating ? "Locating…" : "My location"}
                  </Button>
                </div>

                {address === "Your location" && (
                  <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-xs">
                    <p className="font-semibold text-foreground">Your location</p>
                    {locationSubtitle && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {locationSubtitle}
                      </p>
                    )}
                  </div>
                )}

                <LocationSearch
                  defaultValue={address === "Your location" ? "" : address}
                  placeholder="Or search an address…"
                  onSelect={(loc: LocationSuggestion) => {
                    setAddress(loc.display_name);
                    setLocationSubtitle(null);
                    setCustomerLat(parseFloat(loc.lat));
                    setCustomerLon(parseFloat(loc.lon));
                  }}
                />

                {customerLat && customerLon ? (
                  <div className="mt-2">
                    <DeliveryRouteMap
                      customerLat={customerLat}
                      customerLon={customerLon}
                      heightClass="h-[180px] md:h-[300px]"
                      onPick={(lat, lon) => {
                        setCustomerLat(lat);
                        setCustomerLon(lon);
                        setAddress("Your location");
                        setLocationSubtitle(null);
                        void shopReverseGeocode(lat, lon)
                          .then((rev) => {
                            if (rev?.displayName) {
                              setLocationSubtitle(
                                rev.displayName
                                  .split(",")
                                  .slice(0, 2)
                                  .join(",")
                                  .trim(),
                              );
                            }
                          })
                          .catch(() => {});
                      }}
                    />
                  </div>
                ) : (
                  <div className="mt-2">
                    <LocationPinMap
                      heightClass="h-[180px] md:h-[300px]"
                      label="Delivery"
                      onPick={(lat, lon) => {
                        setCustomerLat(lat);
                        setCustomerLon(lon);
                        setAddress("Your location");
                        setLocationSubtitle(null);
                        void shopReverseGeocode(lat, lon)
                          .then((rev) => {
                            if (rev?.displayName) {
                              setLocationSubtitle(
                                rev.displayName
                                  .split(",")
                                  .slice(0, 2)
                                  .join(",")
                                  .trim(),
                              );
                            }
                          })
                          .catch(() => {});
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border/60 pt-2.5 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Expected</span>
                <span className="font-semibold text-foreground">
                  {formattedExpectedDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery fee</span>
                <span className="font-semibold text-primary">
                  {calculatingFee
                    ? "…"
                    : outOfBounds
                      ? "Out of range"
                      : `${deliveryFee.toFixed(2)} ETB`}
                </span>
              </div>
              {!calculatingFee &&
                !outOfBounds &&
                customerLat &&
                customerLon &&
                (deliveryDistanceKm != null || deliveryBandLabel) && (
                  <p className="text-[10px] text-muted-foreground">
                    {deliveryDistanceKm != null
                      ? `${deliveryDistanceKm.toFixed(1)} km`
                      : ""}
                    {deliveryBandLabel
                      ? `${deliveryDistanceKm != null ? " · " : ""}Band ${deliveryBandLabel}`
                      : ""}
                  </p>
                )}
              {deliveryNotes && (
                <p className="text-[11px] text-foreground/80 bg-muted/40 rounded-lg px-2.5 py-2 border border-border/50">
                  {deliveryNotes}
                </p>
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
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {loc.description?.trim() || "Store pickup"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {(() => {
              const selected = pickupLocations.find(
                (l) => l.id === selectedPickupId,
              );
              if (!selected?.description?.trim()) return null;
              return (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs space-y-1">
                  <p className="font-semibold text-foreground">
                    {selected.name}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {selected.description.trim()}
                  </p>
                </div>
              );
            })()}

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2.5">
              <span>Ready</span>
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
        <p className="text-[11px] text-muted-foreground leading-relaxed -mt-1">
          Transfer the advance{" "}
          <span className="font-semibold text-foreground">
            within 48 hours
          </span>{" "}
          of placing this order. Older receipts will be rejected — use a fresh
          CBE or Telebirr payment for this checkout.
        </p>

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

        {/* Account Information Card — only after method chosen */}
        {paymentMethod === "bank" && (
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
        )}

        {paymentMethod === "telebirr" && (
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

        {/* Payment Evidence — only after CBE / Telebirr selected */}
        {paymentMethod && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-semibold text-foreground block">
            Payment Evidence (required)
          </span>
          <p className="text-[10px] text-muted-foreground">
            We verify with the bank before placing your order. Prefer pasting the
            transaction number for fastest confirmation.
          </p>

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
              <button
                type="button"
                onClick={clearEvidenceFile}
                className="absolute top-1.5 right-1.5 size-7 rounded-full bg-background/95 border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                aria-label="Remove screenshot"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <div className="h-px bg-border flex-1" />
            <span className="text-[11px]">or enter transaction number</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <input
            type="text"
            value={paymentEvidenceText}
            onChange={(e) => setPaymentEvidenceText(e.target.value)}
            placeholder="E.g., FT2409… or Telebirr transaction number"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        )}
      </div>

      {/* Final Action Button */}
      <Button
        type="submit"
        className="w-full h-12 text-sm font-semibold rounded-2xl shadow-sm gap-2"
        disabled={submitting}
      >
        <ShieldCheck className="size-4" />
        {submitting ? "Verifying payment…" : "Place Order"}
      </Button>
    </form>
  );
}
