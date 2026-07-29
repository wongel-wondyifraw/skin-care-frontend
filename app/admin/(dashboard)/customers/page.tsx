"use client";

import { useEffect, useState } from "react";
import { apiFetch, invalidateApiCache } from "@/lib/api";
import { Search, Trash2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetwork } from "@/components/NetworkProvider";
import { useToast } from "@/components/ToastProvider";
import { isNetworkError } from "@/lib/errors";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type SkinType = { id: string; name: string };
type Customer = {
  id: string;
  telegramId: number;
  fullName: string;
  phone: string;
  address: string;
  telegramUsername: string | null;
  skinTypeId: string | null;
  skinType: SkinType | null;
  createdAt: string;
  updatedAt: string;
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

function telegramChatUrl(customer: Customer) {
  const username = customer.telegramUsername?.replace(/^@/, "").trim();
  if (username) return `https://t.me/${username}`;
  return `tg://user?id=${customer.telegramId}`;
}

function phoneCallHref(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function ConnectTelegramButton({ customer }: { customer: Customer }) {
  return (
    <Button
      asChild
      size="sm"
      className="h-8 bg-[#229ED9] hover:bg-[#1b8fc5] text-white border-0 shrink-0"
    >
      <a
        href={telegramChatUrl(customer)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Connect with ${customer.fullName} on Telegram`}
      >
        <TelegramIcon className="size-3.5" />
        Connect on Telegram
      </a>
    </Button>
  );
}

function CallButton({ customer }: { customer: Customer }) {
  const href = phoneCallHref(customer.phone);
  if (!href) return null;

  return (
    <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
      <a href={href} aria-label={`Call ${customer.fullName}`}>
        <Phone className="size-3.5" />
        Call
      </a>
    </Button>
  );
}

export default function CustomersPage() {
  const toast = useToast();
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
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
        const data = await apiFetch<PaginatedResponse<Customer>>(`/customers?${params.toString()}`, {
          toastOnError: false,
        });
        if (!cancelled) {
          setCustomers(data.items);
          setTotal(data.total);
          clearNetworkError();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load customers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, pageSize, search, reconnectKey, refreshKey, clearNetworkError, reportNetworkError]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/customers/${deleteTarget.id}`, {
        method: "DELETE",
        toastOnError: false,
      });
      toast.success("Customer deleted", `${deleteTarget.fullName} was removed.`);
      invalidateApiCache("/dashboard-summary");
      setDeleteTarget(null);
      if (customers.length === 1 && page > 1) setPage((prev) => prev - 1);
      else setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      toast.error(err);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

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
          <div className="hidden md:block border border-border rounded-lg overflow-hidden" aria-busy="true">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
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
                    <TableCell><Skeleton className="h-8 w-36" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex md:hidden flex-col gap-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-card border border-border rounded-lg space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-40" />
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
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Skin Type</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[280px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {c.telegramUsername ? `@${c.telegramUsername}` : <span className="opacity-50">—</span>}
                    </TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[160px] truncate">{c.address}</TableCell>
                    <TableCell>
                      {c.skinType ? (
                        <Badge variant="secondary" className="text-[11px]">{c.skinType.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <CallButton customer={c} />
                        <ConnectTelegramButton customer={c} />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(c)}
                          aria-label={`Delete ${c.fullName}`}
                          className="size-8 shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex md:hidden flex-col gap-2">
            {customers.map((c) => (
              <div key={c.id} className="p-3 bg-card border border-border rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.telegramUsername ? `@${c.telegramUsername}` : `ID ${c.telegramId}`} · {c.phone}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 break-words">{c.address}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {c.skinType && <Badge variant="secondary" className="text-[11px]">{c.skinType.name}</Badge>}
                  <span>Joined {formatDate(c.createdAt)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CallButton customer={c} />
                  <ConnectTelegramButton customer={c} />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setDeleteTarget(c)}
                    aria-label={`Delete ${c.fullName}`}
                    className="size-8 shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
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

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.fullName}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
