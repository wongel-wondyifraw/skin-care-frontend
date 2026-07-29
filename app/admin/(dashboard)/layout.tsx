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
        <div className="hidden lg:block w-56 border-r border-border bg-card" />
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-border bg-card" />
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
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
