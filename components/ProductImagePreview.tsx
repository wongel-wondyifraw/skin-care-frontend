"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "size-10",
  md: "size-14",
  lg: "size-20",
};

const sizePx: Record<Size, string> = {
  sm: "40px",
  md: "56px",
  lg: "80px",
};

/**
 * Thumbnail with desktop hover enlarge + click-to-lightbox (mobile & desktop).
 * Use variant="hero" for a full-bleed square image on the detail page.
 */
export function ProductImagePreview({
  src,
  alt,
  size = "sm",
  variant = "thumb",
  className,
}: {
  src: string;
  alt: string;
  size?: Size;
  variant?: "thumb" | "hero";
  className?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const isHero = variant === "hero";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  function updateHoverPos() {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const preview = 208;
    const gap = 12;
    let left = rect.right + gap;
    let top = rect.top + rect.height / 2 - preview / 2;

    if (left + preview > window.innerWidth - 12) {
      left = rect.left - preview - gap;
    }
    if (left < 12) left = 12;
    if (top < 12) top = 12;
    if (top + preview > window.innerHeight - 12) {
      top = window.innerHeight - preview - 12;
    }

    setHoverPos({ top, left });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={cn(
          "relative overflow-hidden bg-muted cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isHero
            ? "aspect-square w-full rounded-xl border border-border"
            : cn("rounded-md shrink-0", sizeClass[size]),
          className,
        )}
        aria-label={`View larger image of ${alt}`}
        onMouseEnter={() => {
          if (isHero) return;
          updateHoverPos();
          setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLightbox(true);
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={isHero ? "(max-width: 1024px) 100vw, 50vw" : sizePx[size]}
          priority={isHero}
        />
      </button>

      {/* Desktop hover preview — portaled so table overflow doesn't clip it */}
      {mounted &&
        hovered &&
        !isHero &&
        hoverPos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[90] hidden md:block"
            style={{ top: hoverPos.top, left: hoverPos.left }}
            aria-hidden
          >
            <div className="relative size-52 rounded-lg overflow-hidden border border-border bg-card shadow-xl ring-1 ring-black/5">
              <Image src={src} alt="" fill className="object-cover" sizes="208px" />
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        lightbox &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${alt} — enlarged image`}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close"
              onClick={() => setLightbox(false)}
            >
              <X className="size-5" />
            </button>
            <div
              className="relative w-full max-w-2xl aspect-square max-h-[85vh] rounded-xl overflow-hidden bg-black/40 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 672px"
                priority
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
