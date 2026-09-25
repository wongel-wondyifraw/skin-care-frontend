"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTelegramBackButtonActive } from "@/components/shop/ShopTelegramChrome";

type ShopBackLinkProps = {
  href: string;
  label?: string;
  className?: string;
};

/**
 * In-app back control for browser / non-Telegram.
 * Inside Telegram Mini App, the native header BackButton handles this
 * (so people use Telegram’s back instead of the stock close/X).
 */
export function ShopBackLink({
  href,
  label = "Back",
  className,
}: ShopBackLinkProps) {
  const telegramBack = useTelegramBackButtonActive();
  if (telegramBack) return null;

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn("-ml-2 gap-1.5 text-muted-foreground", className)}
    >
      <Link href={href}>
        <ArrowLeft className="size-3.5" />
        {label}
      </Link>
    </Button>
  );
}
