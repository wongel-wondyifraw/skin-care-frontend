"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, X } from "lucide-react";
import { shopFetchSupportPhone } from "@/lib/shop-api";
import { cn } from "@/lib/utils";

const POS_KEY = "shop-support-fab-pos";

type Pos = { x: number; y: number };

function clampPos(x: number, y: number, size = 48): Pos {
  const pad = 8;
  const maxX = Math.max(pad, window.innerWidth - size - pad);
  const maxY = Math.max(pad, window.innerHeight - size - pad);
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  };
}

export function ShopFloatingSupport() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("66XXXXXXXX");
  const [pos, setPos] = useState<Pos | null>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shopFetchSupportPhone()
      .then((res) => {
        if (res?.supportPhone) setPhone(res.supportPhone);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Pos;
        setPos(clampPos(parsed.x, parsed.y));
        return;
      }
    } catch {
      // ignore
    }
    setPos(
      clampPos(window.innerWidth - 64, window.innerHeight - 80),
    );
  }, []);

  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clampPos(p.x, p.y) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!pos) return;
      dragging.current = true;
      moved.current = false;
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    moved.current = true;
    const next = clampPos(
      e.clientX - offset.current.x,
      e.clientY - offset.current.y,
    );
    setPos(next);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setPos((p) => {
      if (p) {
        try {
          sessionStorage.setItem(POS_KEY, JSON.stringify(p));
        } catch {
          // ignore
        }
      }
      return p;
    });
  }, []);

  if (!pos) return null;

  const popupAbove = pos.y > window.innerHeight / 2;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex flex-col items-end pointer-events-none"
      style={{ left: pos.x, top: pos.y, width: 48 }}
    >
      {open && (
        <div
          className={cn(
            "pointer-events-auto absolute right-0 w-72 sm:w-80 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-2xl space-y-3 animate-in fade-in duration-200",
            popupAbove ? "bottom-14 slide-in-from-bottom-2" : "top-14 slide-in-from-top-2",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Phone className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Customer Support
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {phone}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Questions about your order, products, or payment? Our support team is
            here to assist you.
          </p>

          <a
            href={`tel:${phone}`}
            className="w-full h-9 rounded-xl bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Phone className="size-3.5" />
            <span>Call {phone}</span>
          </a>
        </div>
      )}

      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => {
          onPointerUp();
          if (!moved.current) setOpen((prev) => !prev);
          try {
            (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
          } catch {
            // ignore
          }
        }}
        className={cn(
          "pointer-events-auto size-12 rounded-full flex items-center justify-center shadow-md transition-colors cursor-grab active:cursor-grabbing touch-none select-none",
          open
            ? "bg-muted text-foreground border border-border"
            : "bg-primary/20 text-primary ring-2 ring-primary/15 hover:bg-primary/30",
        )}
        aria-label="Contact Customer Support"
        title="Drag to move · tap to open"
      >
        {open ? <X className="size-5" /> : <Phone className="size-5" />}
      </button>
    </div>
  );
}
