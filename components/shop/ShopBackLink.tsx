"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShopBackLinkProps = {
  href: string;
  label?: string;
  className?: string;
};

/** Consistent back control for Telegram shop subpages. */
export function ShopBackLink({
  href,
  label = "Back",
  className,
}: ShopBackLinkProps) {
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
