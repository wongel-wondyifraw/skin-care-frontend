"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Package,
  PackageCheck,
  PackageX,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type AdminNotification = {
  id: string;
  type: "order_placed" | "order_cancelled" | "order_delivered";
  title: string;
  body: string;
  orderId: string | null;
  href: string;
  readAt: string | null;
  createdAt: string;
};

function iconFor(type: AdminNotification["type"]) {
  if (type === "order_cancelled") return PackageX;
  if (type === "order_delivered") return PackageCheck;
  return Package;
}

function toneFor(type: AdminNotification["type"]) {
  if (type === "order_cancelled") return "bg-destructive/10 text-destructive";
  if (type === "order_delivered") return "bg-emerald-500/10 text-emerald-700";
  return "bg-gold/15 text-gold";
}

export function AdminNotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{
        items: AdminNotification[];
        unreadCount: number;
      }>("/notifications?limit=25", { toastOnError: false });
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // keep prior state; bell is non-blocking
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 25_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function markAllRead() {
    setLoading(true);
    try {
      await apiFetch("/notifications/read-all", {
        method: "PATCH",
        toastOnError: false,
      });
      setItems((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  async function openNotification(n: AdminNotification) {
    setOpen(false);
    if (!n.readAt) {
      try {
        await apiFetch(`/notifications/${n.id}/read`, {
          method: "PATCH",
          toastOnError: false,
        });
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id
              ? { ...x, readAt: x.readAt ?? new Date().toISOString() }
              : x,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // navigate anyway
      }
    }
    router.push(n.href || "/admin/orders");
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            unreadCount
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-white shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-1.5rem,22rem)] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
            disabled={loading || unreadCount === 0}
            onClick={(e) => {
              e.preventDefault();
              void markAllRead();
            }}
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        </div>

        <div className="max-h-[min(70vh,22rem)] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto mb-2 size-5 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                New, cancelled, and delivered orders show here.
              </p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = iconFor(n.type);
              const unread = !n.readAt;
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={cn(
                    "cursor-pointer items-start gap-3 rounded-none border-b border-border/60 px-3 py-3 focus:bg-muted/70",
                    unread && "bg-gold/5",
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    void openNotification(n);
                  }}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                      toneFor(n.type),
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm leading-snug",
                          unread
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/90",
                        )}
                      >
                        {n.title}
                      </span>
                      {unread && (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-gold" />
                      )}
                    </span>
                    <span className="block text-xs leading-snug text-muted-foreground line-clamp-2">
                      {n.body}
                    </span>
                    <span className="block text-[10px] text-muted-foreground/80">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <Button
            asChild
            variant="ghost"
            className="h-9 w-full justify-center text-xs font-medium"
            onClick={() => setOpen(false)}
          >
            <Link href="/admin/orders">View all orders</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
