"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/PaginationBar";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import { useShopCart } from "@/components/shop/ShopCartProvider";
import { ShopProductFilters } from "@/components/shop/ShopProductFilters";
import { ShopTrendingBanner } from "@/components/shop/ShopTrendingBanner";
import { ShopProductTile, type ShopProduct } from "@/components/shop/ShopProductTile";
import { shopFetchCached, ShopApiError } from "@/lib/shop-api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";

type RefItem = { id: string; name: string };

export default function ShopCatalogPage() {
  const router = useRouter();
  const { status, error: authError, retry } = useShopAuth();
  const { addItem } = useShopCart();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [trendingPool, setTrendingPool] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<RefItem[]>([]);
  const [skinTypes, setSkinTypes] = useState<RefItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cartFlashId, setCartFlashId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSkinType, setFilterSkinType] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterSkinType]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    (async () => {
      try {
        const [c, s] = await Promise.all([
          shopFetchCached<RefItem[]>("/shop/categories", 120_000),
          shopFetchCached<RefItem[]>("/shop/skin-types", 120_000),
        ]);
        if (cancelled) return;
        setCategories(c);
        setSkinTypes(s);
      } catch {
        // filters can still work without refs
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    setTrendingLoading(true);
    (async () => {
      try {
        const data = await shopFetchCached<PaginatedResponse<ShopProduct>>(
          "/shop/products?page=1&pageSize=24&sort=recent&stock=in_stock",
          60_000,
        );
        if (!cancelled) setTrendingPool(data.items);
      } catch {
        if (!cancelled) setTrendingPool([]);
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    setListLoading(true);
    setFetchError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: "recent",
    });
    if (search.trim()) params.set("search", search.trim());
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterSkinType) params.set("skinTypeId", filterSkinType);

    (async () => {
      try {
        const data = await shopFetchCached<PaginatedResponse<ShopProduct>>(
          `/shop/products?${params.toString()}`,
          30_000,
        );
        if (cancelled) return;
        setProducts(data.items);
        setTotal(data.total);
      } catch (err) {
        if (cancelled) return;
        setFetchError(
          err instanceof ShopApiError
            ? err.message
            : "Failed to load products.",
        );
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, page, search, filterCategory, filterSkinType]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );
  const skinTypeOptions = useMemo(
    () => [
      { value: "", label: "All skin types" },
      ...skinTypes.map((s) => ({ value: s.id, label: s.name })),
    ],
    [skinTypes],
  );

  const handleAddToCart = useCallback(
    (prod: ShopProduct) => {
      addItem({
        productId: prod.id,
        name: prod.name,
        brand: prod.brand,
        image: prod.image,
        price: Number(prod.price) || 0,
        stock: prod.stock,
      });
      setCartFlashId(prod.id);
      window.setTimeout(() => setCartFlashId(null), 1200);
    },
    [addItem],
  );

  const handleOrderNow = useCallback(
    (prod: ShopProduct) => {
      router.push(
        `/shop/checkout?productId=${encodeURIComponent(prod.id)}&qty=1`,
      );
    },
    [router],
  );

  if (status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-[210px] w-full rounded-2xl" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-3">
        <h1 className="text-lg font-semibold text-foreground">Sign in required</h1>
        <p className="text-sm text-muted-foreground">
          {authError ||
            "Open Products from the Medaf Telegram bot to sign in."}
        </p>
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ShopTrendingBanner products={trendingPool} loading={trendingLoading} />

      <div className="mb-3">
        <h1 className="text-lg font-semibold tracking-tight">Shop</h1>
        <p className="text-xs text-muted-foreground">
          Browse by category or skin type. Order one item, or fill your cart.
        </p>
        {cartFlashId && (
          <p className="mt-1 text-xs font-medium text-primary">Added to cart</p>
        )}
      </div>

      <ShopProductFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filterCategory={filterCategory}
        onFilterCategoryChange={setFilterCategory}
        filterSkinType={filterSkinType}
        onFilterSkinTypeChange={setFilterSkinType}
        categoryOptions={categoryOptions}
        skinTypeOptions={skinTypeOptions}
      />

      {fetchError && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {fetchError}
        </p>
      )}

      {listLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No products match your filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {products.map((prod, index) => (
              <ShopProductTile
                key={prod.id}
                prod={prod}
                priority={index < 4}
                onAddToCart={handleAddToCart}
                onOrderNow={handleOrderNow}
              />
            ))}
          </div>
          <div className="mt-4">
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              itemCount={products.length}
              loading={listLoading}
              itemLabel="products"
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
