"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import { AdminProvider, useAdmin } from "@/lib/admin-context";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ id: string; name: string; email: string }>("/auth/me");
        if (cancelled) return;
        setAdminName(data.name);
        setReady(true);
      } catch {
        if (cancelled) return;
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        document.cookie = "adminToken=; path=/; max-age=0";
        router.replace("/admin/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSignOut = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // proceed even if logout API fails
    }
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    document.cookie = "adminToken=; path=/; max-age=0";
    router.push("/admin/login");
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen bg-background" aria-busy="true">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex lg:flex-col w-56 border-r border-border bg-card p-4 gap-6">
          <Skeleton className="h-6 w-28" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {/* TopBar skeleton */}
          <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="size-8 rounded-full" />
          </div>
          {/* Content skeleton */}
          <div className="p-6 space-y-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          {/* Mobile nav skeleton */}
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
        <main className="flex-1 lg:pb-8 pb-20 py-6 px-4 lg:px-6 overflow-y-auto no-scrollbar">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
