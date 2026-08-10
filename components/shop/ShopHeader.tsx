"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";

export function ShopHeader() {
  const { customer, status } = useShopAuth();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <BrandLogo href="/shop" size="sm" stacked />
      <div className="flex min-w-0 items-center gap-2">
        {status === "ready" && customer ? (
          <>
            <span className="max-w-[110px] truncate text-xs font-medium text-foreground sm:max-w-[160px]">
              {customer.fullName}
            </span>
            <Avatar size="sm" className="size-8">
              <AvatarFallback className="bg-accent text-primary text-[11px] font-bold">
                {customer.initials}
              </AvatarFallback>
            </Avatar>
          </>
        ) : (
          <Avatar size="sm" className="size-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-[11px]">
              …
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}
