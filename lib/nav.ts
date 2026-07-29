/** True when pathname matches href exactly or is a nested child route. */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

const SETTINGS_TITLES: Record<string, string> = {
  "/admin/settings/profile": "Profile",
  "/admin/settings/add-admin": "Add Admin",
  "/admin/settings/skin-types": "Skin Types",
  "/admin/settings": "Settings",
};

/** Resolve the TopBar page title for the current path. */
export function pageTitleForPath(
  pathname: string,
  navItems: { href: string; label: string }[],
): string {
  if (pathname.startsWith("/admin/settings")) {
    return SETTINGS_TITLES[pathname] ?? "Settings";
  }
  const match = navItems.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );
  return match?.label ?? "Admin";
}
