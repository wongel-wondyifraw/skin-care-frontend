"use client";

import { usePathname } from "next/navigation";
import { navItems } from "./Sidebar";

export default function TopBar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden lg:flex items-center justify-between px-8 h-16 bg-white border-b border-[#d0c5af] sticky top-0 z-10">
        <span className="uppercase text-[11px] tracking-[0.15em] font-semibold text-[#7f7663]">
          {navItems.find((n) => n.href === pathname)?.label ?? "Admin"}
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
            <span className="text-[12px] text-[#4d4635] tracking-[0.02em] max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
              {adminName}
            </span>
          )}
          <div
            className="w-8 h-8 rounded-full bg-[#fff8e7] border border-[#d0c5af] flex items-center justify-center shrink-0"
            aria-label={adminName || "Admin user"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="#735c00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="w-4 h-4" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </header>
    </>
  );
}
