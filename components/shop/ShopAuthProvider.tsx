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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Telegram sometimes exposes WebApp before initData is filled — poll briefly. */
async function waitForInitData(
  webApp: TelegramWebApp,
  timeoutMs = 5000,
): Promise<string> {
  try {
    webApp.ready();
    webApp.expand();
  } catch {
    // ignore
  }

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const data = webApp.initData?.trim() ?? "";
    if (data.length > 0) return data;
    await sleep(100);
  }
  return webApp.initData?.trim() ?? "";
}

async function authenticate(webApp: TelegramWebApp | null): Promise<ShopCustomer> {
  if (webApp) {
    const initData = await waitForInitData(webApp);
    if (initData) {
      return shopLoginWithInitData(initData);
    }
  }

  if (getShopToken()) {
    return shopFetchMe();
  }

  throw new ShopApiError(
    "Open Products in the Medaf Telegram bot to browse the catalog.",
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
    let cancelled = false;
    let tries = 0;

    const tick = () => {
      if (cancelled) return;
      if (window.Telegram?.WebApp) {
        setScriptReady(true);
        return;
      }
      tries += 1;
      if (tries < 50) {
        window.setTimeout(tick, 100);
      } else {
        // Give auth a chance to fall back / show error
        setScriptReady(true);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
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
            : "Could not sign you in. Open Products from the Telegram bot.",
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
      if (webApp?.initData && webApp.sendData) {
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
      {children}
    </ShopAuthContext.Provider>
  );
}
