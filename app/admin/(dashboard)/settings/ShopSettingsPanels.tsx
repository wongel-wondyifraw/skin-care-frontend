"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { apiFetch, invalidateApiCache } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { formatMoney } from "@/lib/format";

type ProductOption = {
  id: string;
  name: string;
  image: string;
  price: number;
  discountPercent?: number;
  stock: number;
};

const MAX_TRENDING = 5;

export function ShopBannerSettingsCard() {
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, ProductOption>>(
    {},
  );
  const [catalog, setCatalog] = useState<ProductOption[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shop, products] = await Promise.all([
        apiFetch<{ trendingProductIds: string[] }>("/settings/shop"),
        apiFetch<PaginatedResponse<ProductOption>>(
          "/products?page=1&pageSize=50&sort=name",
        ),
      ]);
      const ids = shop.trendingProductIds ?? [];
      setSelectedIds(ids);
      const known = new Map(products.items.map((p) => [p.id, p]));
      const missing = ids.filter((id) => !known.has(id));
      if (missing.length) {
        const extras = await Promise.all(
          missing.map((id) =>
            apiFetch<ProductOption>(`/products/${id}`).catch(() => null),
          ),
        );
        for (const p of extras) {
          if (p) known.set(p.id, p);
        }
      }
      const map: Record<string, ProductOption> = {};
      for (const id of ids) {
        const p = known.get(id);
        if (p) map[id] = p;
      }
      setSelectedMap(map);
      setCatalog(products.items);
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "50",
          sort: "name",
        });
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        const products = await apiFetch<PaginatedResponse<ProductOption>>(
          `/products?${params.toString()}`,
        );
        if (!cancelled) setCatalog(products.items);
      } catch {
        // keep previous catalog
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const byId = useMemo(() => {
    const map = new Map<string, ProductOption>();
    for (const p of Object.values(selectedMap)) map.set(p.id, p);
    for (const p of catalog) map.set(p.id, p);
    return map;
  }, [catalog, selectedMap]);

  const selectedProducts = useMemo(() => {
    return selectedIds
      .map((id) => byId.get(id))
      .filter((p): p is ProductOption => Boolean(p));
  }, [selectedIds, byId]);

  function toggle(id: string) {
    const product = byId.get(id);
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        setSelectedMap((m) => {
          const next = { ...m };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_TRENDING) {
        toast.error(`Pick up to ${MAX_TRENDING} banner products.`);
        return prev;
      }
      if (product) {
        setSelectedMap((m) => ({ ...m, [id]: product }));
      }
      return [...prev, id];
    });
  }

  function move(id: string, dir: -1 | 1) {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/settings/shop", {
        method: "PUT",
        body: JSON.stringify({ trendingProductIds: selectedIds }),
      });
      invalidateApiCache("/settings/shop");
      toast.success("Banner products saved");
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Shop banner</CardTitle>
        <CardDescription>
          Choose up to {MAX_TRENDING} products for the Telegram shop trending
          strip. Order here is the carousel order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Selected ({selectedIds.length}/{MAX_TRENDING})</Label>
              {selectedProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  None selected — shop will fall back to recent in-stock products.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {selectedProducts.map((p, index) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
                    >
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image src={p.image} alt="" fill className="object-cover" sizes="36px" />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {p.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={index === 0}
                          onClick={() => move(p.id, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={index === selectedProducts.length - 1}
                          onClick={() => move(p.id, 1)}
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="size-7"
                          onClick={() => toggle(p.id)}
                          aria-label={`Remove ${p.name}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-search">Add products</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="banner-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search catalog…"
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2 flex flex-wrap gap-1.5">
                {catalog.map((p) => {
                  const on = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(p.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="button" size="sm" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save banner"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ShopDiscountSettingsCard() {
  const toast = useToast();
  const [catalog, setCatalog] = useState<ProductOption[]>([]);
  const [activeDeals, setActiveDeals] = useState<ProductOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [percent, setPercent] = useState("10");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [busy, setBusy] = useState(false);
  const [loadingDeals, setLoadingDeals] = useState(true);

  const loadCatalog = useCallback(async (q: string) => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "50",
      sort: "name",
    });
    if (q.trim()) params.set("search", q.trim());
    const products = await apiFetch<PaginatedResponse<ProductOption>>(
      `/products?${params.toString()}`,
    );
    setCatalog(products.items);
  }, []);

  const loadActiveDeals = useCallback(async () => {
    setLoadingDeals(true);
    try {
      const products = await apiFetch<PaginatedResponse<ProductOption>>(
        "/products?page=1&pageSize=50&sort=name&discounted=true",
      );
      setActiveDeals(products.items);
    } catch (err) {
      toast.error(err);
    } finally {
      setLoadingDeals(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadCatalog("").catch((err) => toast.error(err));
    void loadActiveDeals();
  }, [loadCatalog, loadActiveDeals, toast]);

  useEffect(() => {
    void loadCatalog(debouncedSearch).catch(() => undefined);
  }, [debouncedSearch, loadCatalog]);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function applyDiscount(productIds: string[], value: number) {
    if (!productIds.length) {
      toast.error("Select at least one product.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ updated: number; discountPercent: number }>(
        "/products/discounts",
        {
          method: "PATCH",
          body: JSON.stringify({
            productIds,
            discountPercent: value,
          }),
        },
      );
      invalidateApiCache("/products");
      await Promise.all([loadCatalog(debouncedSearch), loadActiveDeals()]);
      if (value > 0) setSelectedIds([]);
      toast.success(
        value > 0
          ? `Applied −${res.discountPercent}% to ${res.updated} product(s)`
          : `Cleared discounts on ${res.updated} product(s)`,
      );
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active discounts</CardTitle>
          <CardDescription>
            Products currently on sale in the Telegram shop. Clear one or all.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingDeals ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : activeDeals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              No active discounts yet.
            </p>
          ) : (
            <>
              <ul className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
                {activeDeals.map((p) => {
                  const pct = Math.floor(Number(p.discountPercent) || 0);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg bg-rose-50/80 px-2 py-1.5"
                    >
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={p.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatMoney(Number(p.price) || 0)} ·{" "}
                          <span className="font-bold text-rose-700">−{pct}%</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 px-2 text-[11px]"
                        disabled={busy}
                        onClick={() => applyDiscount([p.id], 0)}
                      >
                        Clear
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                disabled={busy || !activeDeals.length}
                onClick={() =>
                  applyDiscount(
                    activeDeals.map((p) => p.id),
                    0,
                  )
                }
              >
                Clear all discounts
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Issue discounts</CardTitle>
          <CardDescription>
            Select products and set a percent off. Sale price shows in the shop
            and is charged at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discount-search">Products</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="discount-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog…"
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {catalog.map((p) => {
                const on = selectedIds.includes(p.id);
                const pct = Math.floor(Number(p.discountPercent) || 0);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(p.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                      on
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {p.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatMoney(Number(p.price) || 0)}
                      {pct > 0 ? (
                        <span className="ml-1 font-semibold text-rose-700">
                          −{pct}%
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {selectedIds.length} selected
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="discount-pct">Discount %</Label>
              <Input
                id="discount-pct"
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="h-8 w-24 text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => applyDiscount(selectedIds, Number(percent))}
            >
              {busy ? "Applying…" : "Apply discount"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
