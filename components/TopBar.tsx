"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { navItems } from "./Sidebar";
import { pageTitleForPath } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ConfirmModal from "./ConfirmModal";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

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
  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const settingsActive = pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");

  return (
    <>
      {/* Desktop */}
      <header className="hidden lg:flex items-center justify-between px-6 h-14 bg-card border-b border-border sticky top-0 z-10">
        <span className="text-sm font-medium text-muted-foreground tracking-wide">
          {title}
        </span>
        <div className="flex items-center gap-3">
          {adminName && (
            <span className="text-sm text-foreground">{adminName}</span>
          )}
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-primary text-xs font-medium">
              {initials || <User className="size-4" />}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Mobile */}
      <header className="flex lg:hidden items-center justify-between px-4 h-12 bg-card border-b border-border sticky top-0 z-10">
        <BrandLogo href="/admin/dashboard" size="sm" />
        <div className="flex items-center gap-1.5">
          {adminName && (
            <span className="text-xs text-muted-foreground max-w-[72px] truncate">
              {adminName}
            </span>
          )}
          <Button
            asChild
            variant="ghost"
            size="icon-xs"
            className={cn(
              "text-muted-foreground",
              settingsActive && "text-primary",
            )}
          >
            <Link href="/admin/settings" aria-label="Settings" aria-current={settingsActive ? "page" : undefined}>
              <Settings className="size-3.5" />
            </Link>
          </Button>
          {onSignOut && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowLogout(true)}
              aria-label="Sign out"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-3.5" />
            </Button>
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
