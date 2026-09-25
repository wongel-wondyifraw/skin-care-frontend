"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";

type TgBackButton = {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
};

type TgBottom = {
  hide?: () => void;
  setParams?: (p: Record<string, unknown>) => void;
  isVisible?: boolean;
  text?: string;
};

function getBackButton(webApp: unknown): TgBackButton | null {
  const bb = (webApp as { BackButton?: TgBackButton } | null)?.BackButton;
  return bb && typeof bb.show === "function" ? bb : null;
}

function hideBottomButtons(webApp: unknown) {
  const wa = webApp as {
    MainButton?: TgBottom;
    SecondaryButton?: TgBottom;
    BottomButton?: TgBottom;
  };
  for (const btn of [wa.MainButton, wa.SecondaryButton, wa.BottomButton]) {
    if (!btn) continue;
    try {
      btn.setParams?.({
        is_visible: false,
        isVisible: false,
        text: "",
      });
      btn.hide?.();
    } catch {
      // ignore
    }
  }
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
 * - Force-hide bottom My Orders / Cart Main+Secondary buttons
 * - Closing confirmation on cart/checkout
 */
export function ShopTelegramChrome() {
  const pathname = usePathname() || "/shop";
  const router = useRouter();
  const { webApp } = useShopAuth();
  const hideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

    hideBottomButtons(webApp);
    // Re-hide shortly after — Telegram sometimes re-shows cached MainButton
    hideTimer.current = setInterval(() => hideBottomButtons(webApp), 800);
    const stopSoon = window.setTimeout(() => {
      if (hideTimer.current) {
        clearInterval(hideTimer.current);
        hideTimer.current = null;
      }
    }, 5000);

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

    return () => {
      window.clearTimeout(stopSoon);
      if (hideTimer.current) clearInterval(hideTimer.current);
      if (back) {
        try {
          back.offClick(onBack);
          back.hide();
        } catch {
          // ignore
        }
      }
      hideBottomButtons(webApp);
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
