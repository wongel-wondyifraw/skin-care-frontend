"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import { AdminProvider, useAdmin } from "@/lib/admin-context";
import { apiFetch, apiFetchCached, invalidateApiCache } from "@/lib/api";
import { isNetworkError } from "@/lib/errors";
import { clearAdminSession } from "@/lib/session";
import { NetworkProvider, useNetwork } from "@/components/NetworkProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { WifiOff } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NetworkProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </NetworkProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { reconnectKey, offline, reportNetworkError } = useNetwork();
  const [adminName, setAdminName] = useState("");
  const [ready, setReady] = useState(false);
  const [authOffline, setAuthOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetchCached<{ id: string; name: string; email: string }>(
          "/auth/me",
          60_000,
        );
        if (cancelled) return;
        setAdminName(data.name);
        setAuthOffline(false);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          setAuthOffline(true);
          return;
        }
        clearAdminSession();
        router.replace("/admin/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, reconnectKey, reportNetworkError]);

  const handleSignOut = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST", toastOnError: false });
    } catch {
      // proceed even if logout API fails
    }
    clearAdminSession();
    invalidateApiCache();
    router.push("/admin/login");
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen bg-background" aria-busy="true">
        <div className="hidden lg:flex lg:flex-col w-56 border-r border-border bg-card p-4 gap-6">
          <Skeleton className="h-6 w-28" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="size-8 rounded-full" />
          </div>
          <div className="p-6 space-y-4">
            {(authOffline || offline) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <WifiOff className="size-4 animate-pulse" />
                <p className="text-sm font-medium">Connection lost. Trying to reconnect…</p>
              </div>
            )}
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          <div className="lg:hidden fixed bottom-0 inset-x-0 h-14 border-t border-border bg-card flex items-center justify-around px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-6 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider initialName={adminName} onSignOut={handleSignOut}>
      <DashboardShell>{children}</DashboardShell>
    </AdminProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { adminName, signOut } = useAdmin();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onSignOut={signOut} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar adminName={adminName} onSignOut={signOut} />
        <main className="flex-1 lg:pb-8 pb-20 py-6 px-4 sm:px-5 lg:px-8 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-[1600px] mx-auto">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
