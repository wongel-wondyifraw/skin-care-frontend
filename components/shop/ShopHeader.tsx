"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, ShoppingCart } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { useShopCart } from "@/components/shop/ShopCartProvider";
import { ShopSupportContact } from "@/components/shop/ShopSupportContact";
import { cn } from "@/lib/utils";

export function ShopHeader() {
  const pathname = usePathname();
  const { customer, status } = useShopAuth();
  const { itemCount } = useShopCart();

  const ordersActive =
    pathname === "/shop/orders" || pathname.startsWith("/shop/orders/");
  const checkoutActive =
    pathname === "/shop/cart" ||
    pathname.startsWith("/shop/cart/") ||
    pathname === "/shop/checkout" ||
    pathname.startsWith("/shop/checkout/");

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card px-3 py-2.5">
      <BrandLogo href="/shop" size="sm" stacked priority />
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <ShopSupportContact
          compact
          className="hidden md:inline-flex mr-1 text-[11px]"
        />
        {status === "ready" && (
          <>
            <Link
              href="/shop/orders"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full no-underline transition-colors",
                ordersActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted",
              )}
              aria-label="My orders"
              aria-current={ordersActive ? "page" : undefined}
              title="My orders"
            >
              <ClipboardList className="size-4" />
            </Link>
            <Link
              href="/shop/cart"
              data-cart-icon
              className={cn(
                "relative inline-flex size-9 items-center justify-center rounded-full no-underline transition-colors cart-icon-target",
                checkoutActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted",
              )}
              aria-label={`Cart${itemCount ? `, ${itemCount} items` : ""}`}
              aria-current={checkoutActive ? "page" : undefined}
              title="Checkout"
            >
              <ShoppingCart className="size-4" />
              {itemCount > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                    checkoutActive
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </>
        )}
        {status === "ready" && customer ? (
          <>
            <span className="hidden max-w-[110px] truncate text-xs font-medium text-foreground sm:inline sm:max-w-[140px]">
              {customer.fullName}
            </span>
            <Avatar size="sm" className="size-8">
              <AvatarFallback className="bg-accent text-primary text-[11px] font-bold">
                {customer.initials}
              </AvatarFallback>
            </Avatar>
          </>
        ) : (
          <Skeleton className="size-8 shrink-0 rounded-full" aria-hidden />
        )}
      </div>
    </header>
  );
}
