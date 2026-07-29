"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { navItems } from "./Sidebar";
import { pageTitleForPath } from "../lib/nav";
import ConfirmModal from "./ConfirmModal";

export default function TopBar({
  adminName,
  onSignOut,
}: {
  adminName: string;
  onSignOut?: () => void;
}) {
  const pathname = usePathname();
  const title = pageTitleForPath(pathname, navItems);
  const [showLogout, setShowLogout] = useState(false);

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden lg:flex items-center justify-between px-8 h-16 bg-white border-b border-[#d0c5af] sticky top-0 z-10">
        <span className="uppercase text-[11px] tracking-[0.15em] font-semibold text-[#7f7663]">
          {title}
        </span>
        <div className="flex items-center gap-3">
          {adminName && (
            <span className="text-[13px] text-[#4d4635] tracking-[0.02em]">
              {adminName}
            </span>
          )}
          <div
            className="w-9 h-9 rounded-full bg-[#fff8e7] border border-[#d0c5af] flex items-center justify-center shrink-0"
            aria-label={adminName || "Admin user"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="#735c00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="w-[18px] h-[18px]" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="flex lg:hidden items-center justify-between px-5 h-14 bg-white border-b border-[#d0c5af] sticky top-0 z-10">
        <span className="uppercase text-[15px] font-medium text-[#735c00] tracking-[0.2em]">
          Medaf Skin Care
        </span>
        <div className="flex items-center gap-2">
          {adminName && (
            <span className="text-[12px] text-[#4d4635] tracking-[0.02em] max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap">
              {adminName}
            </span>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={() => setShowLogout(true)}
              className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#7f7663] hover:text-[#ba1a1a] bg-transparent border-none cursor-pointer p-1"
              aria-label="Sign out"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {onSignOut && (
        <ConfirmModal
          open={showLogout}
          title="Sign Out"
          message="Are you sure you want to sign out of your admin session?"
          confirmLabel="Sign Out"
          cancelLabel="Stay"
          variant="warning"
          onConfirm={() => {
            setShowLogout(false);
            onSignOut();
          }}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
  );
}
