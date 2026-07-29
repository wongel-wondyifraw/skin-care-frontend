"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../lib/api";

type SkinType = {
  id: string;
  name: string;
};

type Customer = {
  id: string;
  telegramId: number;
  fullName: string;
  phone: string;
  address: string;
  skinTypeId: string | null;
  skinType: SkinType | null;
  createdAt: string;
  updatedAt: string;
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
      try {
        const data = await apiFetch<Customer[]>("/customers");
        if (!cancelled) setCustomers(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load customers.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const skinName = c.skinType?.name ?? "";
      return (
        c.fullName.toLowerCase().includes(q) ||
        String(c.telegramId).includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        skinName.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-[22px] font-medium text-on-background mb-1">Customers</h2>
          <p className="text-sm text-outline">Customer profiles + Telegram registration info.</p>
        </div>

        <div className="relative w-full sm:w-[360px]">
          <input
            type="search"
            placeholder="Search by name, telegram ID, phone, address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-outline-variant rounded-full py-2.5 px-4 text-sm bg-white text-on-background outline-none font-inherit focus:border-primary transition-colors w-full"
          />
        </div>
      </div>

      {fetchError && <p className="text-[13px] text-error" role="alert">{fetchError}</p>}

      {loading && (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading customers">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[78px] bg-white border border-[#e8e8e8] rounded-[20px] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !fetchError && filtered.length === 0 && (
        <div className="py-12 px-6 text-center border border-dashed border-outline-variant text-outline rounded-2xl">
          <p className="text-[15px] mb-3">No customers found.</p>
          {customers.length > 0 && (
            <p className="text-[13px] text-outline">Try clearing your search.</p>
          )}
        </div>
      )}

      {!loading && !fetchError && filtered.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden lg:flex flex-col gap-0.5">
            <div className="grid grid-cols-[140px_150px_1.4fr_1fr_1.2fr_220px_140px_140px] gap-3 py-2 px-4 text-[11px] font-semibold tracking-[0.1em] uppercase text-outline border-b border-outline-variant">
              <span>Customer ID</span>
              <span>Telegram ID</span>
              <span>Full Name</span>
              <span>Phone</span>
              <span>Address</span>
              <span>Skin Type</span>
              <span>Created</span>
              <span>Updated</span>
            </div>

            {filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[140px_150px_1.4fr_1fr_1.2fr_220px_140px_140px] gap-3 items-start p-3 bg-white border border-[#e8e8e8] hover:border-outline-variant transition-colors rounded-[20px]"
              >
                <span className="text-[13px] font-medium text-on-background truncate">
                  {c.id}
                </span>
                <span className="text-[13px] text-outline truncate">
                  {c.telegramId}
                </span>
                <span className="text-[14px] font-medium text-on-background truncate">
                  {c.fullName}
                </span>
                <span className="text-[13px] text-outline truncate">
                  {c.phone}
                </span>
                <span className="text-[13px] text-outline break-words">
                  {c.address}
                </span>
                <span className="text-[13px] text-outline truncate">
                  {c.skinType?.name ?? <em className="opacity-50">Not set</em>}
                </span>
                <span className="text-[13px] text-outline truncate">
                  {formatDate(c.createdAt)}
                </span>
                <span className="text-[13px] text-outline truncate">
                  {formatDate(c.updatedAt)}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="flex lg:hidden flex-col gap-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-white border border-[#e8e8e8] rounded-[20px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-on-background truncate">
                      {c.fullName}
                    </div>
                    <div className="text-[13px] text-outline">
                      Telegram: <span className="font-medium text-on-background">{c.telegramId}</span>
                    </div>
                    <div className="text-[13px] text-outline truncate">
                      Phone: {c.phone}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-[13px] text-outline">
                  <div className="font-semibold text-on-background mb-1">Address</div>
                  <div className="break-words">{c.address}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-outline">
                  <div>
                    Skin Type:{" "}
                    <span className="font-medium text-on-background">
                      {c.skinType?.name ?? "Not set"}
                    </span>
                  </div>
                  <div>
                    Created:{" "}
                    <span className="font-medium text-on-background">
                      {formatDate(c.createdAt)}
                    </span>
                  </div>
                  <div>
                    Updated:{" "}
                    <span className="font-medium text-on-background">
                      {formatDate(c.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

