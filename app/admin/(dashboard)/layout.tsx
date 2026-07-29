"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "../../../components/Sidebar";
import TopBar from "../../../components/TopBar";
import MobileNav from "../../../components/MobileNav";
import { AdminProvider, useAdmin } from "../../../lib/admin-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    let name = "";
    try {
      const raw = localStorage.getItem("adminUser");
      if (raw) name = (JSON.parse(raw) as { name: string }).name ?? "";
    } catch {
      // ignore malformed data
    }

    // Defer state updates so the effect stays async-friendly for the linter
    queueMicrotask(() => {
      setAdminName(name);
      setReady(true);
    });
  }, [router]);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    document.cookie = "adminToken=; path=/; max-age=0; SameSite=Strict";
    router.push("/admin/login");
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen bg-background" aria-busy="true">
        <div className="hidden lg:block w-60 border-r border-outline-variant bg-white" />
        <div className="flex-1 flex flex-col">
          <div className="h-14 lg:h-16 border-b border-outline-variant bg-white" />
          <div className="p-8 space-y-4">
            <div className="h-8 w-48 bg-[#e8e8e8] rounded-lg animate-pulse" />
            <div className="h-24 bg-[#e8e8e8] rounded-2xl animate-pulse" />
            <div className="h-24 bg-[#e8e8e8] rounded-2xl animate-pulse" />
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
        <main className="flex-1 lg:pb-8 pb-24 py-8 px-5 overflow-y-auto no-scrollbar">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
