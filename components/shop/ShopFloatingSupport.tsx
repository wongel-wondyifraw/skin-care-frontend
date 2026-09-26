"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, X } from "lucide-react";
import { shopFetchSupportPhone } from "@/lib/shop-api";
import { cn } from "@/lib/utils";

const POS_KEY = "shop-support-fab-pos";
/** Deep brown — matches cart fly-dot */
const FAB_BROWN = "#3d2314";
const DRAG_THRESHOLD_PX = 10;

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
  const startPtr = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      shopFetchSupportPhone()
        .then((res) => {
          const p = res?.supportPhone?.trim();
          if (!cancelled && p && p !== "66XXXXXXXX") {
            setPhone(p);
          } else if (!cancelled && p) {
            setPhone(p);
          }
        })
        .catch(() => {});
    }
    load();
    // Retry once after auth/session may be ready
    const t = window.setTimeout(load, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
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
    setPos(clampPos(window.innerWidth - 64, window.innerHeight - 80));
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
      e.stopPropagation();
      dragging.current = true;
      moved.current = false;
      startPtr.current = { x: e.clientX, y: e.clientY };
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      btnRef.current?.setPointerCapture?.(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dist = Math.hypot(
      e.clientX - startPtr.current.x,
      e.clientY - startPtr.current.y,
    );
    if (dist >= DRAG_THRESHOLD_PX) {
      moved.current = true;
    }
    if (!moved.current) return;
    e.preventDefault();
    const next = clampPos(
      e.clientX - offset.current.x,
      e.clientY - offset.current.y,
    );
    setPos(next);
  }, []);

  const endPointer = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      btnRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    if (!moved.current) {
      setOpen((prev) => !prev);
    } else {
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
    }
    moved.current = false;
  }, []);

  if (!pos) return null;

  const popupAbove = pos.y > window.innerHeight / 2;

  return (
    <div
      ref={containerRef}
      className="fixed z-[80] flex flex-col items-end"
      style={{ left: pos.x, top: pos.y, width: 48 }}
    >
      {open && (
        <div
          className={cn(
            "absolute right-0 w-72 sm:w-80 rounded-2xl border border-border bg-card p-4 shadow-2xl space-y-3 animate-in fade-in duration-200",
            popupAbove
              ? "bottom-14 slide-in-from-bottom-2"
              : "top-14 slide-in-from-top-2",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="size-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                style={{ backgroundColor: FAB_BROWN }}
              >
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
            Questions about your order, products, or payment? Our support team
            is here to assist you.
          </p>

          <a
            href={`tel:${phone}`}
            className="w-full h-9 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-opacity hover:opacity-90"
            style={{ backgroundColor: FAB_BROWN }}
          >
            <Phone className="size-3.5" />
            <span>Call {phone}</span>
          </a>
        </div>
      )}

      <button
        ref={btnRef}
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className={cn(
          "size-12 rounded-full flex items-center justify-center shadow-lg transition-opacity cursor-grab active:cursor-grabbing select-none",
          "text-white hover:opacity-95 active:opacity-90",
          open && "outline outline-2 outline-offset-2 outline-[#3d2314]",
        )}
        style={{
          backgroundColor: FAB_BROWN,
          touchAction: "none",
        }}
        aria-label="Contact Customer Support"
        title="Drag to move · tap to open"
      >
        {open ? <X className="size-5" /> : <Phone className="size-5" />}
      </button>
    </div>
  );
}
