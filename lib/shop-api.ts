import { resolveApiBaseUrl } from "@/lib/api";

const SHOP_TOKEN_KEY = "shopCustomerToken";

export type ShopCustomer = {
  id: string;
  fullName: string;
  initials: string;
  phone?: string;
  skinType?: { id: string; name: string } | null;
  telegramId?: number;
};

export class ShopApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ShopApiError";
    this.status = status;
  }
}

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
