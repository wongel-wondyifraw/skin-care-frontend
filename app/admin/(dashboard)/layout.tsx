"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "../../../components/Sidebar";
import TopBar from "../../../components/TopBar";
import MobileNav from "../../../components/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [adminName, setAdminName] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Client-side auth guard — catches the case where the cookie expired
    // or was cleared manually but localStorage still has stale data.
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    try {
      const raw = localStorage.getItem("adminUser");
      if (raw) {
        const user = JSON.parse(raw) as { name: string };
        setAdminName(user.name);
      }
    } catch {
      // ignore malformed data
    }

    setReady(true);
  }, [router]);

  function handleSignOut() {
    // Clear localStorage
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    // Expire the cookie so middleware blocks immediately on next navigation
    document.cookie = "adminToken=; path=/; max-age=0; SameSite=Strict";
    router.push("/admin/login");
  }

  // Render nothing until the auth check resolves — prevents a flash of
  // protected content before the redirect fires.
  if (!ready) return null;

  return (
    <div className="flex min-h-screen bg-[#f9f9f9]">
      {/* ── Desktop Sidebar ── */}
      <Sidebar onSignOut={handleSignOut} />

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <TopBar adminName={adminName} />

        {/* Page content */}
        <main className="flex-1 lg:pb-8 pb-24 py-8 px-5 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>

        {/* ── Mobile Bottom Nav ── */}
        <MobileNav />
      </div>
    </div>
  );
}

