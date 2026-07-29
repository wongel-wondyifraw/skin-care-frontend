/** True when pathname matches href exactly or is a nested child route. */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Resolve the TopBar page title for the current path. */
export function pageTitleForPath(
  pathname: string,
  navItems: { href: string; label: string }[],
): string {
  const match = navItems.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );
  return match?.label ?? "Admin";
}
