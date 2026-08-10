"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ShopProduct } from "@/components/shop/ShopProductTile";
import { formatMoney } from "@/lib/format";

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function productPitch(product: ShopProduct): string {
  const description = product.description?.trim();
  if (description) {
    return description.length > 140
      ? `${description.slice(0, 137).trim()}…`
      : description;
  }

  const category = product.category?.name?.trim();
  const skin =
    product.skinTypes?.map((s) => s.name).join(", ") ||
    product.skinType?.name ||
    null;

  if (category && skin) {
    return `A ${category.toLowerCase()} pick for ${skin.toLowerCase()} skin — made to feel gentle in daily care.`;
  }
  if (category) {
    return `Trending ${category.toLowerCase()} from Medaf — chosen to support a calm, consistent routine.`;
  }
  if (skin) {
    return `Popular with ${skin.toLowerCase()} skin — a simple way to care for your glow.`;
  }
  return "A Medaf favorite right now — thoughtfully chosen to fit into your everyday skin ritual.";
}

type ShopTrendingBannerProps = {
  products: ShopProduct[];
  loading?: boolean;
  className?: string;
};

export function ShopTrendingBanner({
  products,
  loading = false,
  className = "",
}: ShopTrendingBannerProps) {
  const slides = useMemo(() => {
    const inStock = products.filter((p) => p.stock > 0 && p.image);
    if (!inStock.length) return [];

    const key = "shopTrendingIds";
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        const restored = ids
          .map((id) => inStock.find((p) => p.id === id))
          .filter((p): p is ShopProduct => Boolean(p));
        if (restored.length) return restored;
      }
    } catch {
      // ignore
    }

    const picked = shuffle(inStock).slice(0, 5);
    try {
      sessionStorage.setItem(key, JSON.stringify(picked.map((p) => p.id)));
    } catch {
      // ignore
    }
    return picked;
  }, [products]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [slides]);

  if (loading) {
    return (
      <div
        className={`h-[210px] animate-pulse rounded-2xl bg-muted sm:h-[230px] ${className}`}
      />
    );
  }

  if (!slides.length) return null;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-border bg-card ${className}`}
      aria-roledescription="carousel"
      aria-label="Trending products"
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((product, slideIndex) => (
          <div
            key={product.id}
            className="grid w-full shrink-0 min-h-[210px] sm:min-h-[230px] sm:grid-cols-[1.1fr_0.9fr]"
            aria-hidden={slideIndex !== index}
          >
            <div className="relative order-1 min-h-[140px] sm:order-2 sm:min-h-full">
              <Image
                src={product.image}
                alt={product.name}
                fill
                priority={slideIndex === 0}
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent sm:bg-gradient-to-l sm:from-black/25 sm:via-transparent" />
            </div>

            <div className="relative order-2 flex flex-col justify-center gap-2.5 px-4 py-4 sm:order-1 sm:px-5 sm:py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Trending now
              </p>
              <div className="space-y-1.5">
                {product.brand?.trim() && (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {product.brand.trim()}
                  </p>
                )}
                <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
                  {product.name}
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {productPitch(product)}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {formatMoney(Number(product.price))}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button asChild size="sm" className="h-8">
                  <Link href={`/shop/${product.id}`}>View product</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-8">
                  <Link
                    href={`/shop/checkout?productId=${encodeURIComponent(product.id)}&qty=1`}
                  >
                    Order
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/85 px-2 py-1.5 shadow-sm sm:bottom-4">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show ${slide.name}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-primary"
                  : "w-1.5 bg-border hover:bg-muted-foreground/40"
              }`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
