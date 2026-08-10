export function clampDiscountPercent(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

export function isDiscountExpired(
  discountEndsAt: unknown,
  now = Date.now(),
): boolean {
  if (discountEndsAt == null || discountEndsAt === "") return false;
  const end = new Date(discountEndsAt as string | Date).getTime();
  if (!Number.isFinite(end)) return false;
  return end <= now;
}

export function activeDiscountPercent(
  discountPercent: unknown,
  discountEndsAt?: unknown,
  now = Date.now(),
): number {
  if (isDiscountExpired(discountEndsAt, now)) return 0;
  return clampDiscountPercent(discountPercent);
}

export function effectiveUnitPrice(
  listPrice: number,
  discountPercent: unknown,
  discountEndsAt?: unknown,
): number {
  const price = Number(listPrice) || 0;
  const pct = activeDiscountPercent(discountPercent, discountEndsAt);
  if (pct <= 0) return Math.round(price * 100) / 100;
  return Math.round(price * (1 - pct / 100) * 100) / 100;
}

export type PricedItem = {
  price: number;
  discountPercent?: number | null;
  discountEndsAt?: string | Date | null;
};

export function shopSalePrice(item: PricedItem): number {
  return effectiveUnitPrice(item.price, item.discountPercent, item.discountEndsAt);
}

export function hasShopDiscount(item: PricedItem): boolean {
  return activeDiscountPercent(item.discountPercent, item.discountEndsAt) > 0;
}

export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "0:00";
  const totalSec = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
