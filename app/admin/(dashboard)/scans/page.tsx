"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/PaginationBar";
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { useNetwork } from "@/components/NetworkProvider";
import { isNetworkError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  telegramUsername: string | null;
  skinType?: { name: string } | null;
};

type SkinAnalysis = {
  id: string;
  customerId: string;
  imageUrl: string;
  adviceText: string;
  createdAt: string;
  customer?: Customer | null;
};

export default function ScansPage() {
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();
  const [items, setItems] = useState<SkinAnalysis[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search.trim()) params.set("search", search.trim());

    (async () => {
      try {
        const data = await apiFetch<PaginatedResponse<SkinAnalysis>>(
          `/skin-analyses?${params.toString()}`,
          { toastOnError: false },
        );
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        clearNetworkError();
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load scans.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, search, reconnectKey, clearNetworkError, reportNetworkError]);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Skin Scans</h1>
        <p className="text-sm text-muted-foreground">
          Facial photos and Gemini recommendations from the Telegram bot.
        </p>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by customer or advice…"
          className="pl-8"
        />
      </div>

      {fetchError && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {fetchError}
        </p>
      )}

      {loading && items.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !fetchError && total === 0 && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground text-sm">
          No skin scans yet. Customers can tap Scan Face in the bot.
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((scan) => (
              <Link
                key={scan.id}
                href={`/admin/scans/${scan.id}`}
                className="flex gap-3 p-3 rounded-xl border border-border bg-card no-underline text-foreground hover:border-primary/40 transition-colors"
              >
                <ProductImagePreview src={scan.imageUrl} alt="Face scan" size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {scan.customer?.fullName ?? "Unknown customer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(scan.createdAt)}
                    {scan.customer?.skinType?.name
                      ? ` · ${scan.customer.skinType.name}`
                      : ""}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {scan.adviceText}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            itemCount={items.length}
            loading={loading}
            itemLabel="scans"
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
}
