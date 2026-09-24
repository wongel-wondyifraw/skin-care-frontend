"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, X } from "lucide-react";
import { shopFetchSupportPhone } from "@/lib/shop-api";
import { cn } from "@/lib/utils";

export function ShopFloatingSupport() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("66XXXXXXXX");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shopFetchSupportPhone()
      .then((res) => {
        if (res?.supportPhone) {
          setPhone(res.supportPhone);
        }
      })
      .catch(() => {});
  }, []);

  // Collapse on outside click
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

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-4 sm:right-6 z-50 flex flex-col items-end pointer-events-none"
    >
      {/* Expanded popup card */}
      {open && (
        <div className="pointer-events-auto mb-3 w-72 sm:w-80 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
            className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Phone className="size-3.5" />
            <span>Call {phone}</span>
          </a>
        </div>
      )}

      {/* Floating Action Button (Always visible) */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "pointer-events-auto size-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer",
          open
            ? "bg-muted text-foreground border border-border"
            : "bg-primary text-primary-foreground hover:bg-primary/90 ring-4 ring-primary/20",
        )}
        aria-label="Contact Customer Support"
        title="Contact Customer Support"
      >
        {open ? <X className="size-5" /> : <Phone className="size-5" />}
      </button>
    </div>
  );
}
