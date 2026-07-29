export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
