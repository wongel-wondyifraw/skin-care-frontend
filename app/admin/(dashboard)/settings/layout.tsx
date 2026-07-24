"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsTabs = [
  { href: "/admin/settings/profile", label: "Profile" },
  { href: "/admin/settings/add-admin", label: "Add Admin" },
  { href: "/admin/settings/skin-types", label: "Skin Types" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Sub-sidebar (tabs) */}
      <aside
        className="lg:w-56 flex-shrink-0"
        style={{
          borderBottom: "1px solid #d0c5af",
          paddingBottom: "16px",
        }}
      >
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible" aria-label="Settings navigation">
          {settingsTabs.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "block",
                  padding: "10px 16px",
                  borderRadius: "4px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  color: active ? "#735c00" : "#4d4635",
                  backgroundColor: active ? "#fff8e7" : "transparent",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f9f6ef";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#735c00";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#4d4635";
                  }
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
