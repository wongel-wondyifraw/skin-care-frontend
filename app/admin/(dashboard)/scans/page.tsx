"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { isAbortError, isNetworkError } from "@/lib/errors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/PaginationBar";
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { useNetwork } from "@/components/NetworkProvider";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

type ViewMode = "tiles" | "table";
const VIEW_MODE_KEY = "scansViewMode";

export default function ScansPage() {
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();
  const [items, setItems] = useState<SkinAnalysis[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("tiles");
  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === "table" || saved === "tiles") setViewMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
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
          { toastOnError: false, signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setItems(data.items);
        setTotal(data.total);
        clearNetworkError();
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load scans.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
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

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer or advice…"
            className="pl-8"
          />
        </div>
        <div
          className="ml-auto inline-flex items-center rounded-md border border-border bg-card p-0.5 shrink-0"
          role="group"
          aria-label="View mode"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn("size-8 rounded-sm", viewMode === "tiles" && "bg-accent text-accent-foreground")}
            aria-pressed={viewMode === "tiles"}
            aria-label="Tile view"
            onClick={() => changeViewMode("tiles")}
          >
            <LayoutGrid className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn("size-8 rounded-sm", viewMode === "table" && "bg-accent text-accent-foreground")}
            aria-pressed={viewMode === "table"}
            aria-label="List view"
            onClick={() => changeViewMode("table")}
          >
            <List className="size-3.5" />
          </Button>
        </div>
      </div>

      {fetchError && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {fetchError}
        </p>
      )}

      {loading && items.length === 0 && (
        viewMode === "tiles" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )
      )}

      {!loading && !fetchError && total === 0 && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground text-sm">
          No skin scans yet. Customers can tap Scan Face in the bot.
        </div>
      )}

      {items.length > 0 && viewMode === "tiles" && (
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
                  {scan.customer?.skinType?.name ? ` · ${scan.customer.skinType.name}` : ""}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {scan.adviceText}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {items.length > 0 && viewMode === "table" && (
        <>
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Photo</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Skin type</TableHead>
                  <TableHead>Scanned</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell>
                      <ProductImagePreview src={scan.imageUrl} alt="" size="sm" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/scans/${scan.id}`}
                        className="text-foreground no-underline hover:text-primary hover:underline"
                      >
                        {scan.customer?.fullName ?? "Unknown"}
                      </Link>
                      <p className="text-xs text-muted-foreground font-normal">
                        {scan.customer?.phone}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {scan.customer?.skinType?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(scan.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-xs text-muted-foreground">
                      <span className="line-clamp-2">{scan.adviceText}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex md:hidden flex-col gap-2">
            {items.map((scan) => (
              <Link
                key={scan.id}
                href={`/admin/scans/${scan.id}`}
                className="flex gap-3 p-3 rounded-xl border border-border bg-card no-underline text-foreground"
              >
                <ProductImagePreview src={scan.imageUrl} alt="" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {scan.customer?.fullName ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(scan.createdAt)}
                    {scan.customer?.skinType?.name ? ` · ${scan.customer.skinType.name}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {scan.adviceText}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {items.length > 0 && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          itemCount={items.length}
          loading={loading}
          itemLabel="scans"
          onPageChange={setPage}
        />
      )}
    </>
  );
}
