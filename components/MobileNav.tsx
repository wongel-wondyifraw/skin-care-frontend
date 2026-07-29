"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./Sidebar";
import { isNavActive } from "../lib/nav";

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#d0c5af] z-50 pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom navigation"
    >
      {navItems.map(({ href, label, icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center flex-1 gap-1 no-underline transition-colors duration-200 ${
              active ? "text-[#735c00]" : "text-[#7f7663]"
            }`}
          >
            {icon(active)}
            <span
              className={`text-[10px] tracking-[0.06em] uppercase ${
                active ? "font-semibold" : "font-normal"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
