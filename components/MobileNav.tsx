"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./Sidebar";
import { isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border z-50 pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom navigation"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-0.5 no-underline transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            <span
              className={cn(
                "text-[10px] tracking-wide",
                active ? "font-semibold" : "font-normal",
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
