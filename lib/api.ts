export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const requestCache = new Map<string, CacheEntry<unknown>>();

function cacheKey(path: string) {
  return `GET:${path}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg: string =
      Array.isArray(body?.message)
        ? body.message.join(", ")
        : (body?.message ?? `Request failed (${res.status})`);
    throw new Error(msg);
  }

  // No body — 204 No Content or empty 200
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

  const promise = apiFetch<T>(path).catch((error) => {
    requestCache.delete(key);
    throw error;
  });

  requestCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}
