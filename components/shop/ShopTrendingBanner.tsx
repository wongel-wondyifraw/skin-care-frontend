"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ShopProduct } from "@/components/shop/ShopProductTile";
import { ShopPrice } from "@/components/shop/ShopPrice";

function productPitch(product: ShopProduct): string {
  const description = product.description?.trim();
  if (description) {
    return description.length > 90
      ? `${description.slice(0, 87).trim()}…`
      : description;
  }

  const category = product.category?.name?.trim();
  const skin =
    product.skinTypes?.map((s) => s.name).join(", ") ||
    product.skinType?.name ||
    null;

  if (category && skin) {
    return `${category} for ${skin.toLowerCase()} skin — gentle everyday care.`;
  }
  if (category) {
    return `Trending ${category.toLowerCase()} for a calm, consistent routine.`;
  }
  if (skin) {
    return `A favorite for ${skin.toLowerCase()} skin.`;
  }
  return "A Medaf pick for your everyday skin ritual.";
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
  const slides = useMemo(
    () => products.filter((p) => p.stock > 0 && p.image).slice(0, 5),
    [products],
  );

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
        className={`h-[132px] animate-pulse rounded-2xl bg-muted sm:h-[148px] ${className}`}
      />
    );
  }

  if (!slides.length) return null;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl ${className}`}
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
            className="relative h-[132px] w-full shrink-0 sm:h-[148px]"
            aria-hidden={slideIndex !== index}
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority={slideIndex === 0}
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 640px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/15" />

            <div className="absolute inset-0 flex flex-col justify-end gap-1.5 p-3 sm:p-3.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75">
                Trending
              </p>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold leading-tight text-white line-clamp-1">
                  {product.name}
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-white/80 line-clamp-2 max-w-[85%]">
                  {productPitch(product)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <ShopPrice item={product} light />
                <Button
                  asChild
                  size="sm"
                  className="h-7 rounded-full bg-white px-3 text-[11px] text-foreground hover:bg-white/90"
                >
                  <Link href={`/shop/${product.id}`}>View</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full border-white/50 bg-transparent px-3 text-[11px] text-white hover:bg-white/15 hover:text-white"
                >
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
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show ${slide.name}`}
              aria-current={i === index}
              className={`h-1 rounded-full transition-all ${
                i === index ? "w-3.5 bg-white" : "w-1 bg-white/45 hover:bg-white/70"
              }`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
