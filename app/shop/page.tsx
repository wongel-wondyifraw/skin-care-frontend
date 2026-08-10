"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/PaginationBar";
import { useShopAuth } from "@/components/shop/ShopAuthProvider";
import {
  ShopProductFilters,
  type ShopSortMode,
  type ShopStockFilter,
} from "@/components/shop/ShopProductFilters";
import { ShopProductTile, type ShopProduct } from "@/components/shop/ShopProductTile";
import { shopFetch, ShopApiError } from "@/lib/shop-api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";

type RefItem = { id: string; name: string };

export default function ShopCatalogPage() {
  const { status, error: authError, retry, requestOrder } = useShopAuth();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<RefItem[]>([]);
  const [skinTypes, setSkinTypes] = useState<RefItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSkinType, setFilterSkinType] = useState("");
  const [filterStock, setFilterStock] = useState<ShopStockFilter>("all");
  const [sortMode, setSortMode] = useState<ShopSortMode>("name");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterSkinType, filterStock, sortMode]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    (async () => {
      try {
        const [c, s] = await Promise.all([
          shopFetch<RefItem[]>("/shop/categories"),
          shopFetch<RefItem[]>("/shop/skin-types"),
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
    const controller = new AbortController();
    setListLoading(true);
    setFetchError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: sortMode,
    });
    if (search.trim()) params.set("search", search.trim());
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterSkinType) params.set("skinTypeId", filterSkinType);
    if (filterStock !== "all") params.set("stock", filterStock);

    (async () => {
      try {
        const data = await shopFetch<PaginatedResponse<ShopProduct>>(
          `/shop/products?${params.toString()}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setProducts(data.items);
        setTotal(data.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        setFetchError(
          err instanceof ShopApiError
            ? err.message
            : "Failed to load products.",
        );
      } finally {
        if (!controller.signal.aborted) setListLoading(false);
      }
    })();

    return () => controller.abort();
  }, [
    status,
    page,
    search,
    filterCategory,
    filterSkinType,
    filterStock,
    sortMode,
  ]);

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
  const stockOptions = useMemo(
    () => [
      { value: "all", label: "All stock" },
      { value: "in_stock", label: "In stock" },
      { value: "low_stock", label: "Low stock" },
      { value: "out_of_stock", label: "Out of stock" },
    ],
    [],
  );
  const sortOptions = useMemo(
    () => [
      { value: "name", label: "Name" },
      { value: "recent", label: "Recent" },
    ],
    [],
  );

  function handleOrder(prod: ShopProduct) {
    setOrderingId(prod.id);
    try {
      requestOrder(prod.id);
    } finally {
      window.setTimeout(() => setOrderingId(null), 1500);
    }
  }

  if (status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
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
      <div className="mb-3">
        <h1 className="text-lg font-semibold tracking-tight">Products</h1>
        <p className="text-xs text-muted-foreground">
          Search and filter the catalog. Order continues in Telegram.
        </p>
      </div>

      <ShopProductFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filterCategory={filterCategory}
        onFilterCategoryChange={setFilterCategory}
        filterSkinType={filterSkinType}
        onFilterSkinTypeChange={setFilterSkinType}
        filterStock={filterStock}
        onFilterStockChange={setFilterStock}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        categoryOptions={categoryOptions}
        skinTypeOptions={skinTypeOptions}
        stockOptions={stockOptions}
        sortOptions={sortOptions}
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
                orderingId={orderingId}
                onOrder={handleOrder}
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
