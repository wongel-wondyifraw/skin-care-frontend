"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { useShopCart } from "@/components/shop/ShopCartProvider";

type TgBackButton = {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
};

type TgBottomButton = {
  text: string;
  color?: string;
  textColor?: string;
  isVisible?: boolean;
  isActive?: boolean;
  setText?: (text: string) => void;
  show?: () => void;
  hide?: () => void;
  onClick?: (cb: () => void) => void;
  offClick?: (cb: () => void) => void;
  setParams?: (params: Record<string, unknown>) => void;
};

function getBackButton(webApp: unknown): TgBackButton | null {
  const bb = (webApp as { BackButton?: TgBackButton } | null)?.BackButton;
  return bb && typeof bb.show === "function" ? bb : null;
}

function getMainButton(webApp: unknown): TgBottomButton | null {
  const mb = (webApp as { MainButton?: TgBottomButton } | null)?.MainButton;
  return mb && typeof mb.setParams === "function" ? mb : null;
}

function getSecondaryButton(webApp: unknown): TgBottomButton | null {
  const sb = (webApp as { SecondaryButton?: TgBottomButton } | null)
    ?.SecondaryButton;
  return sb && typeof sb.setParams === "function" ? sb : null;
}

function isShopHome(pathname: string) {
  return pathname === "/shop" || pathname === "/shop/";
}

function isCheckoutFlow(pathname: string) {
  return (
    pathname.startsWith("/shop/cart") || pathname.startsWith("/shop/checkout")
  );
}

/**
 * Syncs Telegram Mini App chrome:
 * - Native header BackButton on nested pages (so users go back instead of hitting X)
 * - Bottom Orders + Cart buttons on the catalog (Telegram chrome, not in-page only)
 * - Closing confirmation on cart/checkout
 */
export function ShopTelegramChrome() {
  const pathname = usePathname() || "/shop";
  const router = useRouter();
  const { webApp } = useShopAuth();
  const { itemCount } = useShopCart();

  useEffect(() => {
    if (!webApp) return;

    const back = getBackButton(webApp);
    const main = getMainButton(webApp);
    const secondary = getSecondaryButton(webApp);
    const home = isShopHome(pathname);

    const onBack = () => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/shop");
      }
    };

    const onOrders = () => router.push("/shop/orders");
    const onCart = () => router.push("/shop/cart");

    if (back) {
      back.onClick(onBack);
      if (home) back.hide();
      else back.show();
    }

    try {
      const wa = webApp as {
        enableClosingConfirmation?: () => void;
        disableClosingConfirmation?: () => void;
        setHeaderColor?: (c: string) => void;
        themeParams?: { bg_color?: string; secondary_bg_color?: string };
      };
      if (isCheckoutFlow(pathname) && wa.enableClosingConfirmation) {
        wa.enableClosingConfirmation();
      } else if (wa.disableClosingConfirmation) {
        wa.disableClosingConfirmation();
      }
      const headerBg =
        wa.themeParams?.secondary_bg_color ||
        wa.themeParams?.bg_color ||
        "#ffffff";
      wa.setHeaderColor?.(headerBg);
    } catch {
      // older clients
    }

    if (home) {
      // Catalog: native bottom chrome for Orders + Cart (Telegram header stays clean)
      try {
        secondary?.setParams?.({
          text: "My Orders",
          is_visible: true,
          is_active: true,
          position: "left",
        });
        secondary?.onClick?.(onOrders);
      } catch {
        // ignore
      }
      try {
        const cartLabel = itemCount > 0 ? `Cart (${itemCount})` : "Checkout";
        main?.setParams?.({
          text: cartLabel,
          is_visible: true,
          is_active: true,
        });
        main?.onClick?.(onCart);
      } catch {
        // ignore
      }
    } else {
      try {
        main?.setParams?.({ is_visible: false });
        secondary?.setParams?.({ is_visible: false });
      } catch {
        main?.hide?.();
        secondary?.hide?.();
      }
    }

    return () => {
      if (back) {
        try {
          back.offClick(onBack);
          back.hide();
        } catch {
          // ignore
        }
      }
      try {
        main?.offClick?.(onCart);
        secondary?.offClick?.(onOrders);
        main?.setParams?.({ is_visible: false });
        secondary?.setParams?.({ is_visible: false });
      } catch {
        // ignore
      }
      try {
        (webApp as { disableClosingConfirmation?: () => void })
          .disableClosingConfirmation?.();
      } catch {
        // ignore
      }
    };
  }, [webApp, pathname, router, itemCount]);

  return null;
}

/** True when Telegram can show its native BackButton (hide duplicate in-app back). */
export function useTelegramBackButtonActive() {
  const { webApp } = useShopAuth();
  const pathname = usePathname() || "/shop";
  return Boolean(getBackButton(webApp) && !isShopHome(pathname));
}
