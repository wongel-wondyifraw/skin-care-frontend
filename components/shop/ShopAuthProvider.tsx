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
const TG_SCRIPT_SRC = "https://telegram.org/js/telegram-web-app.js";

export function useShopAuth() {
  const ctx = useContext(ShopAuthContext);
  if (!ctx) throw new Error("useShopAuth must be used within ShopAuthProvider");
  return ctx;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureTelegramScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Telegram?.WebApp) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${TG_SCRIPT_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve) => {
      if (window.Telegram?.WebApp) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      // Script may already have loaded before we attached the listener
      window.setTimeout(() => resolve(), 300);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TG_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Telegram WebApp SDK"));
    document.head.appendChild(script);
  });
}

async function waitForWebApp(timeoutMs = 8000): Promise<TelegramWebApp | null> {
  await ensureTelegramScript().catch(() => undefined);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const tg = window.Telegram?.WebApp;
    if (tg) return tg;
    await sleep(50);
  }
  return window.Telegram?.WebApp ?? null;
}

async function waitForInitData(
  webApp: TelegramWebApp,
  timeoutMs = 8000,
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
    await sleep(50);
  }
  return webApp.initData?.trim() ?? "";
}

async function authenticate(): Promise<{
  customer: ShopCustomer;
  webApp: TelegramWebApp | null;
}> {
  const webApp = await waitForWebApp();

  if (webApp) {
    const initData = await waitForInitData(webApp);
    if (initData) {
      const customer = await shopLoginWithInitData(initData);
      return { customer, webApp };
    }
  }

  if (getShopToken()) {
    const customer = await shopFetchMe();
    return { customer, webApp };
  }

  if (!webApp) {
    throw new ShopApiError(
      "Telegram WebApp did not load. Open Products from the Medaf bot (not a browser tab).",
      401,
    );
  }

  throw new ShopApiError(
    "No Telegram login data. Tap Products on the bot keyboard (the button that opens the app), then try again.",
    401,
  );
}

export function ShopAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setError(null);
      try {
        const result = await authenticate();
        if (cancelled) return;
        setWebApp(result.webApp);
        setCustomer(result.customer);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        clearShopToken();
        setCustomer(null);
        setWebApp(window.Telegram?.WebApp ?? null);
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Could not sign you in from Telegram.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const requestOrder = useCallback(
    (productId: string) => {
      const payload = JSON.stringify({ action: "order", productId });
      const tg = webApp ?? window.Telegram?.WebApp ?? null;
      if (tg?.initData && tg.sendData) {
        tg.sendData(payload);
        tg.close?.();
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
    <ShopAuthContext.Provider value={value}>{children}</ShopAuthContext.Provider>
  );
}
