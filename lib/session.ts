/** Client-side admin session helpers (localStorage + cookie mirror). */

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminName");
  document.cookie = "adminToken=; path=/; max-age=0";
}

/** Safe internal return path after login — only /admin/* except login itself. */
export function safeAdminReturnPath(from: string | null | undefined): string {
  if (!from) return "/admin/dashboard";
  if (!from.startsWith("/admin")) return "/admin/dashboard";
  if (from.startsWith("/admin/login")) return "/admin/dashboard";
  // Block protocol-relative / open redirects
  if (from.includes("://") || from.startsWith("//")) return "/admin/dashboard";
  return from;
}
