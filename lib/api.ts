import { ApiError, isAbortError, isNetworkError, sanitizeErrorMessage } from "@/lib/errors";
import { getToast } from "@/components/ToastProvider";
import { notifyNetworkLoss } from "@/components/NetworkProvider";
import { clearAdminSession } from "@/lib/session";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const requestCache = new Map<string, CacheEntry<unknown>>();

let redirectingToLogin = false;

function cacheKey(path: string) {
  return `GET:${path}`;
}

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/admin/login")) return;
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  clearAdminSession();
  requestCache.clear();
  const from = encodeURIComponent(path + window.location.search);
  window.location.assign(`/admin/login?from=${from}`);
}

type ApiFetchOptions = RequestInit & {
  /** When true (default for mutations), show a toast on failure. */
  toastOnError?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { toastOnError, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const shouldToast =
    toastOnError ?? (method !== "GET" && method !== "HEAD");

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const err = new ApiError(
      "Connection lost. Trying to reconnect…",
      0,
      "NETWORK",
    );
    notifyNetworkLoss();
    throw err;
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(fetchOptions.headers ?? {}),
      },
    });
  } catch (cause) {
    if (isAbortError(cause) || fetchOptions.signal?.aborted) {
      throw cause instanceof Error
        ? cause
        : new DOMException("Aborted", "AbortError");
    }
    const err = new ApiError(
      "Connection lost. Trying to reconnect…",
      0,
      "NETWORK",
    );
    notifyNetworkLoss();
    // Never toast raw "Failed to fetch" — reconnecting UI handles this.
    if (shouldToast && !isNetworkError(cause) && !isNetworkError(err)) {
      getToast()?.error(err);
    }
    throw err;
  }

  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
    }
    const body = await res.json().catch(() => ({}));
    const safe = sanitizeErrorMessage(body?.message ?? body, res.status);
    const err = new ApiError(safe, res.status, body?.error);
    // Avoid toast spam when redirecting to login
    if (shouldToast && res.status !== 401) getToast()?.error(err);
    throw err;
  }

  if (
    res.status === 204 ||
    res.headers.get("content-length") === "0" ||
    !res.headers.get("content-type")?.includes("application/json")
  ) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function invalidateApiCache(pathPrefix?: string) {
  if (!pathPrefix) {
    requestCache.clear();
    return;
  }

  const prefix = cacheKey(pathPrefix);
  for (const key of requestCache.keys()) {
    if (key.startsWith(prefix)) {
      requestCache.delete(key);
    }
  }
}

export function apiFetchCached<T>(path: string, ttlMs = 30_000): Promise<T> {
  const key = cacheKey(path);
  const now = Date.now();
  const cached = requestCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.promise as Promise<T>;
  }

  const promise = apiFetch<T>(path, { toastOnError: false }).catch((error) => {
    requestCache.delete(key);
    throw error;
  });

  requestCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}
