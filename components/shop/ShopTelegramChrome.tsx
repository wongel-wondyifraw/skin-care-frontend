"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";

type TgBackButton = {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
};

function getBackButton(webApp: unknown): TgBackButton | null {
  const bb = (webApp as { BackButton?: TgBackButton } | null)?.BackButton;
  return bb && typeof bb.show === "function" ? bb : null;
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
 * - Native header BackButton on nested pages
 * - Closing confirmation on cart/checkout
 */
export function ShopTelegramChrome() {
  const pathname = usePathname() || "/shop";
  const router = useRouter();
  const { webApp } = useShopAuth();

  useEffect(() => {
    if (!webApp) return;

    const back = getBackButton(webApp);
    const home = isShopHome(pathname);

    const onBack = () => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/shop");
      }
    };

    if (back) {
      back.onClick(onBack);
      if (home) back.hide();
      else back.show();
    }

    // Ensure Telegram bottom buttons stay hidden (nav lives in the app header)
    try {
      const wa = webApp as {
        MainButton?: { hide?: () => void; setParams?: (p: Record<string, unknown>) => void };
        SecondaryButton?: {
          hide?: () => void;
          setParams?: (p: Record<string, unknown>) => void;
        };
        enableClosingConfirmation?: () => void;
        disableClosingConfirmation?: () => void;
        setHeaderColor?: (c: string) => void;
        themeParams?: { bg_color?: string; secondary_bg_color?: string };
      };
      wa.MainButton?.setParams?.({ is_visible: false });
      wa.SecondaryButton?.setParams?.({ is_visible: false });
      wa.MainButton?.hide?.();
      wa.SecondaryButton?.hide?.();

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
        (webApp as { disableClosingConfirmation?: () => void })
          .disableClosingConfirmation?.();
      } catch {
        // ignore
      }
    };
  }, [webApp, pathname, router]);

  return null;
}

/** True when Telegram can show its native BackButton (hide duplicate in-app back). */
export function useTelegramBackButtonActive() {
  const { webApp } = useShopAuth();
  const pathname = usePathname() || "/shop";
  return Boolean(getBackButton(webApp) && !isShopHome(pathname));
}
