"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive } from "../../../../lib/nav";

const settingsTabs = [
  { href: "/admin/settings/profile", label: "Profile" },
  { href: "/admin/settings/add-admin", label: "Add Admin" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const skinDefTab = { href: "/admin/settings/skin-types", label: "Skin Definitions" };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="lg:w-56 flex-shrink-0">
        <div className="px-1 pt-2 pb-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-outline">
            Admin
          </p>
        </div>
        <nav
          className="flex flex-col gap-1 overflow-y-auto no-scrollbar max-h-[70vh]"
          aria-label="Settings navigation"
        >
          {settingsTabs.map(({ href, label }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block px-4 py-2.5 rounded-lg no-underline text-sm whitespace-nowrap transition-colors duration-200 ${
                  active
                    ? "font-semibold text-primary bg-[#fff8e7]"
                    : "font-normal text-[#4d4635] hover:bg-[#f9f6ef] hover:text-primary"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 px-1 pb-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-outline">
            Skin Definitions
          </p>
        </div>
        <nav aria-label="Skin definitions navigation">
          {(() => {
            const active = isNavActive(pathname, skinDefTab.href);
            return (
              <Link
                href={skinDefTab.href}
                aria-current={active ? "page" : undefined}
                className={`block px-4 py-2.5 rounded-lg no-underline text-sm transition-colors duration-200 ${
                  active
                    ? "font-semibold text-primary bg-[#fff8e7] border border-outline-variant"
                    : "font-normal text-[#4d4635] hover:bg-[#f9f6ef] hover:text-primary border border-transparent"
                }`}
              >
                {skinDefTab.label}
              </Link>
            );
          })()}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
