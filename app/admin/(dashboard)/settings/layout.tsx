"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive } from "../../../../lib/nav";

const settingsTabs = [
  { href: "/admin/settings/profile", label: "Profile" },
  { href: "/admin/settings/add-admin", label: "Add Admin" },
  { href: "/admin/settings/skin-types", label: "Skin Types" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="lg:w-56 flex-shrink-0 border-b border-outline-variant pb-4 lg:border-b-0 lg:pb-0">
        <nav
          className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible"
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
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
