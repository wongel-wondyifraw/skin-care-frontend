"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Layers,
  ShoppingBag,
  Users,
  ClipboardList,
  ScanFace,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/BrandLogo";
import ConfirmModal from "./ConfirmModal";

export const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/categories", label: "Categories & Skin", icon: Layers },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/scans", label: "Skin Scans", icon: ScanFace },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Bottom nav on mobile — Settings lives in the top bar instead */
export const mobileNavItems = navItems.filter(
  (item) => item.href !== "/admin/settings",
);

export default function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  const pathname = usePathname();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col w-56 min-w-[224px] bg-card border-r border-border sticky top-0 h-screen">
        <div className="px-4 pt-6 pb-4">
          <BrandLogo href="/admin/dashboard" size="md" stacked className="w-full" />
        </div>

        <Separator />

        <nav className="flex flex-col gap-0.5 py-3 px-2 flex-1" aria-label="Sidebar navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm no-underline transition-colors",
                  active
                    ? "bg-accent text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <Separator />

        <div className="px-2 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={() => setShowLogout(true)}
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </aside>

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
    </>
  );
}
