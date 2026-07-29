"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Search } from "lucide-react";
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

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const data = await apiFetch<Customer[]>("/customers"); if (!cancelled) setCustomers(data); }
      catch (err: unknown) { if (!cancelled) setFetchError(err instanceof Error ? err.message : "Failed to load customers."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.fullName.toLowerCase().includes(q) || String(c.telegramId).includes(q) || c.phone.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || (c.skinType?.name ?? "").toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground">Customer profiles + Telegram registration info.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input type="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
      </div>

      {fetchError && <p className="text-sm text-destructive" role="alert">{fetchError}</p>}
      {loading && <div className="space-y-2" aria-busy="true">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}

      {!loading && !fetchError && filtered.length === 0 && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p>No customers found.</p>
          {customers.length > 0 && <p className="text-xs mt-1">Try clearing your search.</p>}
        </div>
      )}

      {!loading && !fetchError && filtered.length > 0 && (
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
                {filtered.map((c) => (
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
            {filtered.map((c) => (
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
        </>
      )}
    </>
  );
}
