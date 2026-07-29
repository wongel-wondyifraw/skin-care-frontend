"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const adminTabs = [
  { href: "/admin/settings/profile", label: "Profile" },
  { href: "/admin/settings/add-admin", label: "Add Admin" },
];

const skinDefTabs = [
  { href: "/admin/settings/skin-types", label: "Skin Definitions" },
];

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = isNavActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block px-3 py-2 rounded-md text-sm no-underline transition-colors",
        active
          ? "bg-accent text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="lg:w-48 flex-shrink-0 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Admin
          </p>
          <nav className="flex flex-col gap-0.5" aria-label="Settings navigation">
            {adminTabs.map((t) => (
              <NavLink key={t.href} {...t} pathname={pathname} />
            ))}
          </nav>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Skin Definitions
          </p>
          <nav aria-label="Skin definitions navigation">
            {skinDefTabs.map((t) => (
              <NavLink key={t.href} {...t} pathname={pathname} />
            ))}
          </nav>
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
