"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isNetworkError } from "@/lib/errors";
import { invalidateApiCache } from "@/lib/api";

type NetworkContextValue = {
  offline: boolean;
  reconnecting: boolean;
  /** Increments whenever connectivity is restored — use as a fetch dependency. */
  reconnectKey: number;
  reportNetworkError: (error?: unknown) => void;
  clearNetworkError: () => void;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

let reportNetworkLoss: (() => void) | null = null;

/** Called from apiFetch when a request fails due to connectivity. */
export function notifyNetworkLoss() {
  reportNetworkLoss?.();
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [browserOffline, setBrowserOffline] = useState(false);
  const [requestOffline, setRequestOffline] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);

  const offline = browserOffline || requestOffline;

  const reportNetworkError = useCallback((error?: unknown) => {
    if (error !== undefined && !isNetworkError(error)) return;
    setRequestOffline(true);
  }, []);

  const clearNetworkError = useCallback(() => {
    setRequestOffline(false);
  }, []);

  useEffect(() => {
    reportNetworkLoss = () => setRequestOffline(true);
    return () => {
      reportNetworkLoss = null;
    };
  }, []);

  useEffect(() => {
    function handleOnline() {
      setBrowserOffline(false);
      setRequestOffline(false);
      invalidateApiCache();
      setReconnectKey((k) => k + 1);
    }
    function handleOffline() {
      setBrowserOffline(true);
    }

    setBrowserOffline(typeof navigator !== "undefined" && !navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // While offline, periodically probe so we recover even if the online event is missed
  useEffect(() => {
    if (!offline) return;
    const id = window.setInterval(() => {
      if (navigator.onLine) {
        setBrowserOffline(false);
        setRequestOffline(false);
        invalidateApiCache();
        setReconnectKey((k) => k + 1);
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [offline]);

  const value = useMemo(
    () => ({
      offline,
      reconnecting: offline,
      reconnectKey,
      reportNetworkError,
      clearNetworkError,
    }),
    [offline, reconnectKey, reportNetworkError, clearNetworkError],
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
      {offline && <ReconnectingOverlay />}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    return {
      offline: false,
      reconnecting: false,
      reconnectKey: 0,
      reportNetworkError: () => {},
      clearNetworkError: () => {},
    };
  }
  return ctx;
}

function ReconnectingOverlay() {
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-background/95 backdrop-blur-[1px]"
      aria-busy="true"
      role="status"
      aria-live="polite"
    >
      <div className="hidden lg:flex lg:flex-col w-56 border-r border-border bg-card p-4 gap-6 shrink-0 absolute left-0 top-0 bottom-0">
        <Skeleton className="h-6 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:pl-56">
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="size-8 rounded-full" />
        </div>

        <div className="flex-1 p-6 lg:px-8 space-y-4 w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <WifiOff className="size-4 animate-pulse" />
            <p className="text-sm font-medium">Connection lost. Trying to reconnect…</p>
          </div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
