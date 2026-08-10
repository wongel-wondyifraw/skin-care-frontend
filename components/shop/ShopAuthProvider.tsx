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
  shopLoginWithTelegramId,
  type ShopCustomer,
  ShopApiError,
} from "@/lib/shop-api";

type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
    query_id?: string;
    auth_date?: number;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
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

function readTelegramUserId(webApp: TelegramWebApp | null): number | null {
  if (!webApp) return null;

  const unsafeId = Number(webApp.initDataUnsafe?.user?.id);
  if (Number.isFinite(unsafeId) && unsafeId > 0) return unsafeId;

  // Fallback: parse user from initData query string if present
  const raw = webApp.initData?.trim();
  if (!raw) return null;
  try {
    const params = new URLSearchParams(raw);
    const userRaw = params.get("user");
    if (!userRaw) return null;
    const user = JSON.parse(userRaw) as { id?: number };
    const id = Number(user?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

async function waitForTelegramUserId(
  webApp: TelegramWebApp,
  timeoutMs = 8000,
): Promise<number | null> {
  try {
    webApp.ready();
    webApp.expand();
  } catch {
    // ignore
  }

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const id = readTelegramUserId(webApp);
    if (id) return id;
    await sleep(50);
  }
  return readTelegramUserId(webApp);
}

async function authenticate(): Promise<{
  customer: ShopCustomer;
  webApp: TelegramWebApp | null;
}> {
  const webApp = await waitForWebApp();
  if (webApp) {
    try {
      webApp.ready();
      webApp.expand();
    } catch {
      // ignore
    }
  }

  // 1) Telegram WebApp user id
  // 2) ?telegramId= from the bot Products button URL
  // 3) existing session token
  let telegramId = webApp ? await waitForTelegramUserId(webApp) : null;

  if (!telegramId && typeof window !== "undefined") {
    const fromQuery = Number(
      new URLSearchParams(window.location.search).get("telegramId"),
    );
    if (Number.isFinite(fromQuery) && fromQuery > 0) telegramId = fromQuery;
  }

  if (telegramId) {
    const customer = await shopLoginWithTelegramId(telegramId);
    return { customer, webApp };
  }

  if (getShopToken()) {
    const customer = await shopFetchMe();
    return { customer, webApp };
  }

  if (!webApp) {
    throw new ShopApiError(
      "Open Products from the Medaf Telegram bot to browse the catalog.",
      401,
    );
  }

  throw new ShopApiError(
    "Could not read your Telegram user. Open Products from the bot keyboard, then try again.",
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
      if (tg?.sendData) {
        try {
          tg.sendData(payload);
          tg.close?.();
          return;
        } catch {
          // fall through
        }
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
