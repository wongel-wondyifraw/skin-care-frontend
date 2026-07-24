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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("adminUser");
      if (raw) {
        const user = JSON.parse(raw) as { name: string };
        setAdminName(user.name);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleSignOut() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    router.push("/admin/login");
  }

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

