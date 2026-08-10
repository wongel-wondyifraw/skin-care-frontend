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
import Script from "next/script";
import {
  clearShopToken,
  getShopToken,
  shopFetchMe,
  shopLoginWithInitData,
  type ShopCustomer,
  ShopApiError,
} from "@/lib/shop-api";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  themeParams?: Record<string, string>;
  colorScheme?: "light" | "dark";
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

type ShopAuthState = {
  status: "loading" | "ready" | "error";
  customer: ShopCustomer | null;
  error: string | null;
  webApp: TelegramWebApp | null;
  requestOrder: (productId: string) => void;
  retry: () => void;
};

const ShopAuthContext = createContext<ShopAuthState | null>(null);

export function useShopAuth() {
  const ctx = useContext(ShopAuthContext);
  if (!ctx) throw new Error("useShopAuth must be used within ShopAuthProvider");
  return ctx;
}

async function authenticate(webApp: TelegramWebApp | null): Promise<ShopCustomer> {
  const initData = webApp?.initData?.trim() ?? "";
  if (initData) {
    return shopLoginWithInitData(initData);
  }

  // Dev convenience: reuse an existing session token if already logged in via Telegram earlier.
  if (getShopToken()) {
    return shopFetchMe();
  }

  throw new ShopApiError(
    "Open this catalog from the Medaf Telegram bot (Products → Open Catalog).",
    401,
  );
}

export function ShopAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      setScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptReady) return;
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setError(null);
      const tg = window.Telegram?.WebApp ?? null;
      setWebApp(tg);
      try {
        tg?.ready();
        tg?.expand();
        const profile = await authenticate(tg);
        if (cancelled) return;
        setCustomer(profile);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        clearShopToken();
        setCustomer(null);
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Could not sign you in. Open the catalog from Telegram.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scriptReady, attempt]);

  const requestOrder = useCallback(
    (productId: string) => {
      const payload = JSON.stringify({ action: "order", productId });
      if (webApp?.sendData) {
        webApp.sendData(payload);
        webApp.close?.();
        return;
      }
      setError("Ordering is only available inside the Telegram Mini App.");
    },
    [webApp],
  );

  const value = useMemo<ShopAuthState>(
    () => ({
      status,
      customer,
      error,
      webApp,
      requestOrder,
      retry: () => setAttempt((n) => n + 1),
    }),
    [status, customer, error, webApp, requestOrder],
  );

  return (
    <ShopAuthContext.Provider value={value}>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => {
          setScriptReady(true);
          setStatus("error");
          setError("Could not load Telegram WebApp SDK.");
        }}
      />
      {children}
    </ShopAuthContext.Provider>
  );
}
