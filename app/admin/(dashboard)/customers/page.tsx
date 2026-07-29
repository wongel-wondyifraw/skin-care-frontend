"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type SkinType = { id: string; name: string };
type Customer = {
  id: string; telegramId: number; fullName: string; phone: string;
  address: string; skinTypeId: string | null; skinType: SkinType | null;
  createdAt: string; updatedAt: string;
};
type PaginatedResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

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
        const data = await apiFetch<PaginatedResponse<Customer>>(`/customers?${params.toString()}`);
        if (!cancelled) {
          setCustomers(data.items);
          setTotal(data.total);
        }
      }
      catch (err: unknown) { if (!cancelled) setFetchError(err instanceof Error ? err.message : "Failed to load customers."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [page, pageSize, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground">Customer profiles + Telegram registration info.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input type="search" placeholder="Search…" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} className="pl-8 h-8 text-xs" />
        </div>
      </div>

      {fetchError && <p className="text-sm text-destructive" role="alert">{fetchError}</p>}
      {loading && (
        <>
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden" aria-busy="true">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex lg:hidden flex-col gap-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-card border border-border rounded-lg space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !fetchError && total === 0 && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p>No customers found.</p>
          {search.trim() && <p className="text-xs mt-1">Try clearing your search.</p>}
        </div>
      )}

      {!loading && !fetchError && customers.length > 0 && (
        <>
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telegram ID</TableHead><TableHead>Full Name</TableHead><TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead><TableHead>Skin Type</TableHead><TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground font-mono text-xs">{c.telegramId}</TableCell>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.address}</TableCell>
                    <TableCell>{c.skinType ? <Badge variant="secondary" className="text-[11px]">{c.skinType.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex lg:hidden flex-col gap-2">
            {customers.map((c) => (
              <div key={c.id} className="p-3 bg-card border border-border rounded-lg">
                <p className="text-sm font-semibold">{c.fullName}</p>
                <p className="text-xs text-muted-foreground">Telegram: {c.telegramId} · {c.phone}</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">{c.address}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {c.skinType && <Badge variant="secondary" className="text-[11px]">{c.skinType.name}</Badge>}
                  <span>Joined {formatDate(c.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {customers.length === 0 ? 0 : (page - 1) * pageSize + 1}
              {" "}to {Math.min(page * pageSize, total)} of {total} customers
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
