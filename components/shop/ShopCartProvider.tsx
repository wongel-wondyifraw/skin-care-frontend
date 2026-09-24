"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { shopSalePrice } from "@/lib/shop-pricing";
import {
  getShopToken,
  shopClearCart,
  shopFetchCart,
  shopSyncCart,
} from "@/lib/shop-api";

const CART_KEY = "shopCart";
const CART_UPDATED_KEY = "shopCartUpdatedAt";

export type CartItem = {
  productId: string;
  name: string;
  brand?: string | null;
  image: string;
  price: number;
  discountPercent?: number;
  discountEndsAt?: string | null;
  stock: number;
  quantity: number;
};

type ShopCartState = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const ShopCartContext = createContext<ShopCartState | null>(null);

export function useShopCart() {
  const ctx = useContext(ShopCartContext);
  if (!ctx) throw new Error("useShopCart must be used within ShopCartProvider");
  return ctx;
}

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    // One-time migration from sessionStorage if localStorage is empty
    let raw = localStorage.getItem(CART_KEY);
    if (!raw) {
      const sessionRaw = sessionStorage.getItem(CART_KEY);
      if (sessionRaw) {
        raw = sessionRaw;
        localStorage.setItem(CART_KEY, sessionRaw);
        sessionStorage.removeItem(CART_KEY);
      }
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.productId === "string" &&
        Number(item.quantity) >= 1,
    );
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    localStorage.setItem(CART_UPDATED_KEY, new Date().toISOString());
  } catch {
    // local storage quota or unavailable
  }
}

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initialItems = readCart();
    setItems(initialItems);
    setHydrated(true);

    // If customer is authenticated and local cart is empty, try to load server-side cart
    const token = getShopToken();
    if (token && initialItems.length === 0) {
      shopFetchCart()
        .then((res) => {
          if (res?.items?.length) {
            // Note: Server cart stores { productId, quantity }
            // The items will get hydrated when visiting cart or browsing
          }
        })
        .catch(() => {
          // ignore background sync errors
        });
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeCart(items);

    // Sync to backend if customer is authenticated (debounced)
    const token = getShopToken();
    if (!token) return;

    const timer = setTimeout(() => {
      const payload = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
      shopSyncCart(payload).catch(() => {
        // ignore background sync error
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      const qty = Math.max(1, Math.floor(quantity));
      setItems((prev) => {
        const existing = prev.find((p) => p.productId === item.productId);
        if (existing) {
          const nextQty = Math.min(item.stock, existing.quantity + qty);
          return prev.map((p) =>
            p.productId === item.productId
              ? { ...p, ...item, quantity: nextQty }
              : p,
          );
        }
        return [
          ...prev,
          {
            ...item,
            quantity: Math.min(item.stock, qty),
          },
        ];
      });
    },
    [],
  );

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const qty = Math.floor(quantity);
    setItems((prev) => {
      if (qty < 1) return prev.filter((p) => p.productId !== productId);
      return prev.map((p) =>
        p.productId === productId
          ? { ...p, quantity: Math.min(p.stock, qty) }
          : p,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    if (getShopToken()) {
      shopClearCart().catch(() => {});
    }
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + shopSalePrice(item) * item.quantity,
        0,
      ),
    [items],
  );

  const value = useMemo<ShopCartState>(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, itemCount, subtotal, addItem, setQuantity, removeItem, clear],
  );

  return (
    <ShopCartContext.Provider value={value}>{children}</ShopCartContext.Provider>
  );
}
