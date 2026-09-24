import { resolveApiBaseUrl } from "@/lib/api";

const SHOP_TOKEN_KEY = "shopCustomerToken";

export type ShopCustomer = {
  id: string;
  fullName: string;
  initials: string;
  phone?: string;
  address?: string | null;
  skinType?: { id: string; name: string } | null;
  telegramId?: number;
};

export type ShopOrderStatus =
  | "awaiting_payment"
  | "payment_submitted"
  | "pending"
  | "confirmed"
  | "delivered"
  | "cancelled";

export type FulfilmentType = "delivery" | "pickup";

export type PickupLocation = {
  id: string;
  name: string;
  address: string;
  enabled: boolean;
};

export type DeliveryZone = {
  name: string;
  fee: number;
  keywords: string[];
};

export type PaymentInfo = {
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  telebirr: {
    phoneNumber: string;
    accountName: string;
  };
};

export type ShopOrder = {
  id: string;
  status: ShopOrderStatus;
  cost: number;
  quantity: number;
  deliveryAddress?: string | null;
  fulfilmentType?: FulfilmentType;
  pickupLocationId?: string | null;
  pickupLocation?: PickupLocation | null;
  deliveryFee?: number;
  expectedDeliveryDate?: string | null;
  advancePaymentAmount?: number;
  paymentMethod?: string | null;
  paymentEvidence?: string | null;
  paymentSubmittedAt?: string | null;
  paymentVerifiedAt?: string | null;
  verifyEtStatus?: string | null;
  verifyEtRequestId?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    image?: string;
    brand?: string | null;
  } | null;
};

export class ShopApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ShopApiError";
    this.status = status;
  }
}

type CacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

const shopRequestCache = new Map<string, CacheEntry>();

function shopBaseUrl() {
  return resolveApiBaseUrl();
}

export function getShopToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SHOP_TOKEN_KEY);
}

export function setShopToken(token: string) {
  sessionStorage.setItem(SHOP_TOKEN_KEY, token);
}

export function clearShopToken() {
  sessionStorage.removeItem(SHOP_TOKEN_KEY);
  shopRequestCache.clear();
}

export function invalidateShopCache(pathPrefix?: string) {
  if (!pathPrefix) {
    shopRequestCache.clear();
    return;
  }
  for (const key of shopRequestCache.keys()) {
    if (key.startsWith(pathPrefix)) shopRequestCache.delete(key);
  }
}

export async function shopFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getShopToken();
  const headers: HeadersInit = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${shopBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body?.message === "string"
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(", ")
          : `Request failed (${res.status})`;
    throw new ShopApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined as T;
  return res.json() as Promise<T>;
}

/** In-memory GET cache for catalog navigation (stale-while TTL). */
export function shopFetchCached<T>(path: string, ttlMs = 45_000): Promise<T> {
  const now = Date.now();
  const cached = shopRequestCache.get(path);
  if (cached && cached.expiresAt > now) {
    return cached.promise as Promise<T>;
  }

  const promise = shopFetch<T>(path).catch((error) => {
    shopRequestCache.delete(path);
    throw error;
  });

  shopRequestCache.set(path, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}

export async function shopLoginWithTelegramId(telegramId: number) {
  const data = await shopFetch<{
    accessToken: string;
    customer: ShopCustomer;
  }>("/shop/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ telegramId }),
  });
  setShopToken(data.accessToken);
  return data.customer;
}

export async function shopFetchMe() {
  return shopFetch<ShopCustomer>("/shop/me");
}

export async function shopCreateOrders(body: {
  items: { productId: string; quantity: number }[];
  deliveryAddress?: string;
  fulfilmentType?: FulfilmentType;
  pickupLocationId?: string;
  deliveryFee?: number;
  paymentMethod?: string;
  paymentEvidence?: string;
}) {
  const orders = await shopFetch<ShopOrder[]>("/shop/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  invalidateShopCache("/shop/products");
  invalidateShopCache("/shop/orders");
  return orders;
}

export async function shopFetchOrders(params?: {
  page?: number;
  pageSize?: number;
  status?: ShopOrderStatus | "all";
}) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.status) search.set("status", params.status);
  const qs = search.toString();
  return shopFetch<{
    items: ShopOrder[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/shop/orders${qs ? `?${qs}` : ""}`);
}

export async function shopCancelOrder(orderId: string) {
  const order = await shopFetch<ShopOrder>(`/shop/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
  invalidateShopCache("/shop/orders");
  invalidateShopCache("/shop/products");
  return order;
}

export async function shopFetchCart() {
  return shopFetch<{
    customerId: string;
    items: { productId: string; quantity: number }[];
  }>("/shop/cart");
}

export async function shopSyncCart(
  items: { productId: string; quantity: number }[],
) {
  return shopFetch("/shop/cart", {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export async function shopClearCart() {
  return shopFetch("/shop/cart", {
    method: "DELETE",
  });
}

export async function shopFetchDeliveryZones() {
  return shopFetch<DeliveryZone[]>("/shop/delivery-zones");
}

export async function shopFetchDeliveryFee(address?: string) {
  const qs = address ? `?address=${encodeURIComponent(address)}` : "";
  return shopFetch<{ zone: string; fee: number }>(`/shop/delivery-fee${qs}`);
}

export async function shopFetchPickupLocations() {
  return shopFetch<PickupLocation[]>("/shop/pickup-locations");
}

export async function shopFetchPaymentInfo() {
  return shopFetch<PaymentInfo>("/shop/payment-info");
}

export async function shopSubmitPayment(
  orderId: string,
  body: { paymentMethod: "bank" | "telebirr"; paymentEvidence: string },
) {
  const order = await shopFetch<ShopOrder>(`/shop/orders/${orderId}/payment`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  invalidateShopCache("/shop/orders");
  return order;
}

export async function shopFetchSupportPhone() {
  return shopFetch<{ supportPhone: string }>("/shop/support-phone");
}

export async function shopUploadReceipt(file: File): Promise<string> {
  const token = getShopToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${shopBaseUrl()}/shop/upload-receipt`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ShopApiError(
      body?.message || "Failed to upload receipt",
      res.status,
    );
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

