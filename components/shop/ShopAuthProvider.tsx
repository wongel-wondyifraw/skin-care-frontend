"use client";

import {
  createContext,
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
  BackButton?: {
    isVisible?: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton?: {
    text: string;
    setText?: (text: string) => void;
    show?: () => void;
    hide?: () => void;
    onClick?: (cb: () => void) => void;
    offClick?: (cb: () => void) => void;
    setParams?: (params: Record<string, unknown>) => void;
  };
  SecondaryButton?: {
    text: string;
    setText?: (text: string) => void;
    show?: () => void;
    hide?: () => void;
    onClick?: (cb: () => void) => void;
    offClick?: (cb: () => void) => void;
    setParams?: (params: Record<string, unknown>) => void;
  };
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  themeParams?: {
    bg_color?: string;
    secondary_bg_color?: string;
  };
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

function readTelegramUserId(webApp: TelegramWebApp | null): number | null {
  if (!webApp) return null;

  const unsafeId = Number(webApp.initDataUnsafe?.user?.id);
  if (Number.isFinite(unsafeId) && unsafeId > 0) return unsafeId;

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

function readQueryTelegramId(): number | null {
  if (typeof window === "undefined") return null;
  const fromQuery = Number(
    new URLSearchParams(window.location.search).get("telegramId"),
  );
  return Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : null;
}

/**
 * Root layout already loads telegram-web-app.js beforeInteractive.
 * Wait briefly for it; do not inject a second copy of the script.
 */
async function waitForWebApp(timeoutMs = 2500): Promise<TelegramWebApp | null> {
  if (typeof window === "undefined") return null;
  const existing = window.Telegram?.WebApp;
  if (existing) return existing;

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const tg = window.Telegram?.WebApp;
    if (tg) return tg;
    await sleep(25);
  }
  return window.Telegram?.WebApp ?? null;
}

async function resolveTelegramId(
  webApp: TelegramWebApp | null,
): Promise<number | null> {
  const fromQuery = readQueryTelegramId();
  if (fromQuery) return fromQuery;

  if (!webApp) return null;

  try {
    webApp.ready();
    webApp.expand();
  } catch {
    // ignore
  }

  const immediate = readTelegramUserId(webApp);
  if (immediate) return immediate;

  // Short poll only — initDataUnsafe is usually ready instantly in Mini Apps
  const started = Date.now();
  while (Date.now() - started < 1500) {
    const id = readTelegramUserId(webApp);
    if (id) return id;
    await sleep(25);
  }
  return readTelegramUserId(webApp);
}

async function authenticate(): Promise<{
  customer: ShopCustomer;
  webApp: TelegramWebApp | null;
}> {
  // Prefer existing session first so catalog can start sooner on reopen
  if (getShopToken()) {
    try {
      const customer = await shopFetchMe();
      const webApp = window.Telegram?.WebApp ?? (await waitForWebApp(800));
      if (webApp) {
        try {
          webApp.ready();
          webApp.expand();
        } catch {
          // ignore
        }
      }
      return { customer, webApp };
    } catch {
      clearShopToken();
    }
  }

  const webApp = await waitForWebApp();
  if (webApp) {
    try {
      webApp.ready();
      webApp.expand();
    } catch {
      // ignore
    }
  }

  const telegramId = await resolveTelegramId(webApp);
  if (telegramId) {
    const customer = await shopLoginWithTelegramId(telegramId);
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

  const value = useMemo<ShopAuthState>(
    () => ({
      status,
      customer,
      error,
      webApp,
      retry: () => setAttempt((n) => n + 1),
    }),
    [status, customer, error, webApp],
  );

  return (
    <ShopAuthContext.Provider value={value}>{children}</ShopAuthContext.Provider>
  );
}
