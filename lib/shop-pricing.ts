export function clampDiscountPercent(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

export function effectiveUnitPrice(
  listPrice: number,
  discountPercent: unknown,
): number {
  const price = Number(listPrice) || 0;
  const pct = clampDiscountPercent(discountPercent);
  if (pct <= 0) return Math.round(price * 100) / 100;
  return Math.round(price * (1 - pct / 100) * 100) / 100;
}

export type PricedItem = {
  price: number;
  discountPercent?: number | null;
};

export function shopSalePrice(item: PricedItem): number {
  return effectiveUnitPrice(item.price, item.discountPercent);
}

export function hasShopDiscount(item: PricedItem): boolean {
  return clampDiscountPercent(item.discountPercent) > 0;
}
