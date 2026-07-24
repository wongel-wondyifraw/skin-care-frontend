"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "20px", height: "20px" }}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "20px", height: "20px" }}
        aria-hidden="true"
      >
        <path d="M4 6h16M4 10h16M4 14h10M4 18h6" />
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "20px", height: "20px" }}
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "20px", height: "20px" }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f9f9f9" }}>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col"
        style={{
          width: "240px",
          minWidth: "240px",
          backgroundColor: "#ffffff",
          borderRight: "1px solid #d0c5af",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: "32px 24px 28px",
            borderBottom: "1px solid #d0c5af",
          }}
        >
          <span
            className="uppercase"
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "#735c00",
              letterSpacing: "0.2em",
            }}
          >
            Meadf Skin Care
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col" style={{ padding: "16px 0", flex: 1 }} aria-label="Sidebar navigation">
          {navItems.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 24px",
                  textDecoration: "none",
                  color: active ? "#735c00" : "#4d4635",
                  backgroundColor: active ? "#fff8e7" : "transparent",
                  borderLeft: active ? "2px solid #735c00" : "2px solid transparent",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.02em",
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
                {icon(active)}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid #d0c5af",
          }}
        >
          <Link
            href="/admin/login"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "#7f7663",
              fontSize: "13px",
              letterSpacing: "0.04em",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#ba1a1a")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#7f7663")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ width: "18px", height: "18px" }} aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </Link>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Desktop top bar */}
        <header
          className="hidden lg:flex items-center justify-between"
          style={{
            padding: "0 32px",
            height: "64px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #d0c5af",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <span
            className="uppercase"
            style={{ fontSize: "11px", letterSpacing: "0.15em", fontWeight: 600, color: "#7f7663" }}
          >
            {navItems.find((n) => n.href === pathname)?.label ?? "Admin"}
          </span>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#fff8e7",
              border: "1px solid #d0c5af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Admin user"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="#735c00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ width: "18px", height: "18px" }} aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </header>

        {/* Mobile top bar */}
        <header
          className="flex lg:hidden items-center justify-between"
          style={{
            padding: "0 20px",
            height: "56px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #d0c5af",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <span
            className="uppercase"
            style={{ fontSize: "15px", fontWeight: 500, color: "#735c00", letterSpacing: "0.2em" }}
          >
            Meadf Skin Care
          </span>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#fff8e7",
              border: "1px solid #d0c5af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Admin user"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="#735c00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ width: "16px", height: "16px" }} aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile to clear the fixed bottom nav */}
        <main className="flex-1 lg:pb-8 pb-24" style={{ padding: "32px 20px", overflowY: "auto" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {children}
          </div>
        </main>

        {/* ── Mobile Bottom Nav ── */}
        <nav
          className="flex lg:hidden"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "64px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #d0c5af",
            zIndex: 50,
          }}
          aria-label="Bottom navigation"
        >
          {navItems.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center flex-1 gap-1"
                style={{
                  textDecoration: "none",
                  color: active ? "#735c00" : "#7f7663",
                  transition: "color 0.2s ease",
                }}
              >
                {icon(active)}
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: active ? 600 : 400,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
