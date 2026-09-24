"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgePercent,
  ChevronRight,
  Eye,
  EyeOff,
  ImageIcon,
  Search,
  Shield,
  UserRound,
  UserPlus,
  X,
  Truck,
  CreditCard,
  PhoneCall,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { apiFetch, invalidateApiCache } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { formatCountdown } from "@/lib/shop-pricing";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/Money";
import { cn } from "@/lib/utils";

type SectionId =
  | "profile"
  | "banner"
  | "discounts"
  | "team"
  | "delivery"
  | "payment"
  | "support";

const SECTIONS: {
  id: SectionId;
  label: string;
  hint: string;
  Icon: typeof UserRound;
}[] = [
  {
    id: "profile",
    label: "Profile",
    hint: "Name and password",
    Icon: UserRound,
  },
  {
    id: "banner",
    label: "Shop banner",
    hint: "Trending carousel picks",
    Icon: ImageIcon,
  },
  {
    id: "discounts",
    label: "Discounts",
    hint: "Issue and clear sales",
    Icon: BadgePercent,
  },
  {
    id: "delivery",
    label: "Delivery Zones",
    hint: "Location fees & keywords",
    Icon: Truck,
  },
  {
    id: "payment",
    label: "Payment Info",
    hint: "Bank & Telebirr details",
    Icon: CreditCard,
  },
  {
    id: "support",
    label: "Customer Support",
    hint: "Support telephone number",
    Icon: PhoneCall,
  },
  {
    id: "team",
    label: "Team",
    hint: "Invite administrators",
    Icon: Shield,
  },
];

type ProductOption = {
  id: string;
  name: string;
  image: string;
  price: number;
  discountPercent?: number;
  discountEndsAt?: string | null;
  stock: number;
};

type DiscountDurationMode = "manual" | "timed";

const DURATION_PRESETS = [
  { hours: 24, label: "24 hours" },
  { hours: 48, label: "48 hours" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
] as const;

function DealCountdown({ endsAt }: { endsAt?: string | null }) {
  const [msLeft, setMsLeft] = useState(() => {
    if (!endsAt) return null;
    return Math.max(0, new Date(endsAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!endsAt) {
      setMsLeft(null);
      return;
    }
    const tick = () =>
      setMsLeft(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (msLeft == null) {
    return <span className="text-xs text-muted-foreground">Until cleared</span>;
  }
  return (
    <span className="text-xs font-semibold tabular-nums text-rose-700">
      Ends in {formatCountdown(msLeft)}
    </span>
  );
}

const MAX_TRENDING = 5;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function SettingsShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="hidden flex-wrap items-start justify-between gap-3 border-b border-border bg-gradient-to-br from-sidebar-accent/40 via-card to-card px-5 py-4 sm:px-6 lg:flex">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      <div className="p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted-foreground lg:hidden">
          {description}
        </p>
        {children}
      </div>
      {action ? (
        <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="[&_button]:w-full">{action}</div>
        </div>
      ) : null}
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pr-9 h-11 text-base lg:h-10 lg:text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function ProfileSection() {
  const toast = useToast();
  const { adminName, setAdminName } = useAdmin();
  const [name, setName] = useState(adminName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    const wantsPasswordChange =
      currentPassword.length > 0 ||
      newPassword.length > 0 ||
      confirmPassword.length > 0;

    if (wantsPasswordChange) {
      if (!currentPassword) {
        toast.error("Enter your current password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters.");
        return;
      }
    }

    setBusy(true);
    try {
      const res = await apiFetch<{ name: string }>("/admin-users/profile", {
        method: "PATCH",
        toastOnError: false,
        body: JSON.stringify({
          name: trimmedName,
          ...(wantsPasswordChange ? { currentPassword, newPassword } : {}),
        }),
      });
      setAdminName(res.name);
      if (typeof window !== "undefined") {
        localStorage.setItem("adminName", res.name);
      }
      invalidateApiCache("/auth/me");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(
        wantsPasswordChange ? "Profile and password updated" : "Profile updated",
      );
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsShell
      title="Your profile"
      description="Update how your name appears in the admin panel and change your password."
    >
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[180px_1fr] lg:gap-8">
        <div className="hidden flex-col items-center gap-3 text-center lg:flex lg:pt-2">
          <Avatar className="size-20 ring-4 ring-sidebar-accent/60">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xl font-semibold">
              {initials(name || adminName || "Admin")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {name || adminName || "Admin"}
            </p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>

        <div className="space-y-5 max-w-md w-full">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 text-base lg:h-10 lg:text-sm"
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-xs text-muted-foreground">
                Leave blank to keep your current password.
              </p>
            </div>
            <PasswordField
              id="current-pw"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                id="new-pw"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-pw"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="min-w-32 w-full lg:w-auto h-11 lg:h-9">
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </SettingsShell>
  );
}

function BannerSection() {
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
        // keep catalog
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

  const selectedProducts = useMemo(
    () =>
      selectedIds
        .map((id) => byId.get(id))
        .filter((p): p is ProductOption => Boolean(p)),
    [selectedIds, byId],
  );

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
      if (product) setSelectedMap((m) => ({ ...m, [id]: product }));
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
    <SettingsShell
      title="Shop banner"
      description={`Choose up to ${MAX_TRENDING} products for the Telegram trending strip. Order here is the carousel order.`}
      action={
        <Button type="button" disabled={saving || loading} onClick={save}>
          {saving ? "Saving…" : "Save banner"}
        </Button>
      }
    >
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
          <div className="space-y-3">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border p-2.5"
              >
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <Skeleton className="size-12 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="size-8 shrink-0 rounded-md" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="max-h-72 space-y-1 overflow-hidden rounded-xl border border-border p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Selected
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {selectedIds.length}/{MAX_TRENDING}
                </span>
              </p>
            </div>
            {selectedProducts.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                No picks yet — shop falls back to recent in-stock products.
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedProducts.map((p, index) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        className="size-8"
                        disabled={index === 0}
                        onClick={() => move(p.id, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        className="size-8"
                        disabled={index === selectedProducts.length - 1}
                        onClick={() => move(p.id, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
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

          <div className="space-y-3">
            <Label htmlFor="banner-search">Browse catalog</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="banner-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="h-10 pl-9"
              />
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {catalog.map((p) => {
                const on = selectedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                      on
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "hover:bg-muted/70",
                    )}
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {p.name}
                    </span>
                    {on && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        Added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </SettingsShell>
  );
}

function DiscountsSection() {
  const toast = useToast();
  const [catalog, setCatalog] = useState<ProductOption[]>([]);
  const [activeDeals, setActiveDeals] = useState<ProductOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [percent, setPercent] = useState("10");
  const [durationMode, setDurationMode] =
    useState<DiscountDurationMode>("manual");
  const [durationHours, setDurationHours] = useState("24");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [busy, setBusy] = useState(false);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

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
    setLoadingCatalog(true);
    void loadCatalog("")
      .catch((err) => toast.error(err))
      .finally(() => setLoadingCatalog(false));
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
      const body: {
        productIds: string[];
        discountPercent: number;
        durationHours?: number;
      } = {
        productIds,
        discountPercent: value,
      };
      if (value > 0 && durationMode === "timed") {
        const hours = Number(durationHours);
        if (!Number.isFinite(hours) || hours <= 0) {
          toast.error("Choose a valid duration.");
          setBusy(false);
          return;
        }
        body.durationHours = hours;
      }

      const res = await apiFetch<{
        updated: number;
        discountPercent: number;
        discountEndsAt: string | null;
      }>("/products/discounts", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      invalidateApiCache("/products");
      await Promise.all([loadCatalog(debouncedSearch), loadActiveDeals()]);
      if (value > 0) setSelectedIds([]);
      toast.success(
        value > 0
          ? durationMode === "timed" && res.discountEndsAt
            ? `Applied −${res.discountPercent}% for ${durationHours}h to ${res.updated} product(s)`
            : `Applied −${res.discountPercent}% to ${res.updated} product(s) (until cleared)`
          : `Cleared discounts on ${res.updated} product(s)`,
      );
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsShell
        title="Active discounts"
        description="Live sale products in the Telegram shop. Timed deals end automatically; manual ones stay until you clear them."
        action={
          activeDeals.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                applyDiscount(
                  activeDeals.map((p) => p.id),
                  0,
                )
              }
            >
              Clear all
            </Button>
          ) : undefined
        }
      >
        {loadingDeals ? (
          <ul className="grid gap-2 sm:grid-cols-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border p-2.5"
              >
                <Skeleton className="size-12 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="h-8 w-14 shrink-0 rounded-md" />
              </li>
            ))}
          </ul>
        ) : activeDeals.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
            No active discounts yet.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {activeDeals.map((p) => {
              const pct = Math.floor(Number(p.discountPercent) || 0);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-rose-200/80 bg-rose-50/50 p-2.5"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-rose-600 py-0.5 text-center text-[9px] font-extrabold text-white">
                      −{pct}%
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <Money amount={Number(p.price) || 0} size="xs" />
                    </p>
                    <DealCountdown endsAt={p.discountEndsAt} />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    disabled={busy}
                    onClick={() => applyDiscount([p.id], 0)}
                  >
                    Clear
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsShell>

      <SettingsShell
        title="Issue a discount"
        description="Choose until cleared, or a time limit (e.g. 24 hours). Timed sales show a countdown on the shop badge and turn off automatically."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products to discount…"
                className="h-10 pl-9"
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {loadingCatalog ? (
                <div className="space-y-1" aria-busy="true">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg px-2 py-2"
                    >
                      <Skeleton className="size-10 shrink-0 rounded-lg" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  ))}
                </div>
              ) : (
                catalog.map((p) => {
                  const on = selectedIds.includes(p.id);
                  const pct = Math.floor(Number(p.discountPercent) || 0);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                        on
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-muted/70",
                      )}
                    >
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={p.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {p.name}
                      </span>
                    <span className="shrink-0 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                      <Money amount={Number(p.price) || 0} size="xs" />
                      {pct > 0 ? (
                        <span className="font-bold text-rose-700">
                          −{pct}%
                        </span>
                      ) : null}
                    </span>
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} selected
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 h-fit">
            <div className="space-y-1.5">
              <Label htmlFor="discount-pct">Discount percent</Label>
              <div className="relative">
                <Input
                  id="discount-pct"
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  className="h-11 pr-8 text-lg font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  aria-pressed={durationMode === "manual"}
                  onClick={() => setDurationMode("manual")}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                    durationMode === "manual"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  Until cleared
                </button>
                <button
                  type="button"
                  aria-pressed={durationMode === "timed"}
                  onClick={() => setDurationMode("timed")}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                    durationMode === "timed"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  Time-bound
                </button>
              </div>
              {durationMode === "timed" && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.hours}
                        type="button"
                        onClick={() => setDurationHours(String(preset.hours))}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[11px] font-medium",
                          Number(durationHours) === preset.hours
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-muted/60",
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0.25}
                      max={720}
                      step={0.25}
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      className="h-9 pr-12 text-sm"
                      aria-label="Duration in hours"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      hrs
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              disabled={busy || !selectedIds.length}
              className="w-full"
              onClick={() => applyDiscount(selectedIds, Number(percent))}
            >
              {busy ? "Applying…" : "Apply discount"}
            </Button>
          </div>
        </div>
      </SettingsShell>
    </div>
  );
}

function TeamSection() {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ name: string; email: string }>(
        "/admin-users",
        {
          method: "POST",
          toastOnError: false,
          body: JSON.stringify(form),
        },
      );
      toast.success(
        "Admin created",
        `${res.name} (${res.email}) can now sign in.`,
      );
      setForm({ name: "", email: "", password: "" });
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsShell
      title="Invite an admin"
      description="Create another administrator account for your team."
    >
      <form
        onSubmit={handleSubmit}
        className="grid max-w-xl gap-4 sm:grid-cols-2"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="add-admin-name">Full name</Label>
          <Input
            id="add-admin-name"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoComplete="off"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="add-admin-email">Email</Label>
          <Input
            id="add-admin-email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            autoComplete="off"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="add-admin-password">Temporary password</Label>
          <div className="relative">
            <Input
              id="add-admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              required
              autoComplete="new-password"
              className="h-10 pr-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide" : "Show"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy} className="gap-2">
            <UserPlus className="size-4" />
            {busy ? "Creating…" : "Create admin"}
          </Button>
        </div>
      </form>
    </SettingsShell>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Delivery Zones Section                                        */
/* ────────────────────────────────────────────────────────────── */

type DeliveryZoneItem = {
  name: string;
  fee: number;
  keywords: string[];
};

function DeliverySection() {
  const toast = useToast();
  const [zones, setZones] = useState<DeliveryZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<DeliveryZoneItem[]>("/settings/delivery-zones")
      .then((data) => setZones(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function addZone() {
    setZones((prev) => [
      ...prev,
      { name: "New Zone", fee: 300, keywords: ["area"] },
    ]);
  }

  function removeZone(index: number) {
    setZones((prev) => prev.filter((_, i) => i !== index));
  }

  function updateZone(
    index: number,
    field: keyof DeliveryZoneItem,
    val: string | number | string[],
  ) {
    setZones((prev) =>
      prev.map((z, i) => (i === index ? { ...z, [field]: val } : z)),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/settings/delivery-zones", {
        method: "PUT",
        body: JSON.stringify({ zones }),
      });
      invalidateApiCache("/settings");
      toast.success("Delivery zones saved");
    } catch (err: unknown) {
      toast.error(
        "Failed to save zones",
        err instanceof Error ? err.message : "Please try again",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsShell
      title="Delivery Zones & Fees"
      description="Configure location-based delivery pricing (ETB 220–500) and address matching keywords."
      action={
        <Button onClick={handleSave} disabled={saving} className="rounded-full">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <div className="space-y-3">
            {zones.map((zone, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20"
              >
                <div className="flex-1 w-full space-y-1">
                  <Label className="text-xs">Zone Name</Label>
                  <Input
                    value={zone.name}
                    onChange={(e) => updateZone(idx, "name", e.target.value)}
                    placeholder="E.g., Bole / CMC"
                  />
                </div>
                <div className="w-full sm:w-32 space-y-1">
                  <Label className="text-xs">Fee (ETB)</Label>
                  <Input
                    type="number"
                    value={zone.fee}
                    onChange={(e) =>
                      updateZone(idx, "fee", Number(e.target.value))
                    }
                  />
                </div>
                <div className="flex-[2] w-full space-y-1">
                  <Label className="text-xs">Keywords (comma-separated)</Label>
                  <Input
                    value={
                      Array.isArray(zone.keywords)
                        ? zone.keywords.join(", ")
                        : ""
                    }
                    onChange={(e) =>
                      updateZone(
                        idx,
                        "keywords",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="bole, cmc, gerji"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-5 text-destructive hover:bg-destructive/10"
                  onClick={() => removeZone(idx)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addZone}
              className="gap-1.5"
            >
              <Plus className="size-3.5" /> Add Delivery Zone
            </Button>
          </div>
        )}
      </div>
    </SettingsShell>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Payment Accounts Section                                      */
/* ────────────────────────────────────────────────────────────── */

type PaymentInfoState = {
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  telebirr: {
    phoneNumber: string;
    accountName: string;
  };
};

function PaymentSection() {
  const toast = useToast();
  const [info, setInfo] = useState<PaymentInfoState>({
    bankAccount: {
      bankName: "Commercial Bank of Ethiopia",
      accountNumber: "1000XXXXXXXX",
      accountName: "Medaf Skin Care",
    },
    telebirr: {
      phoneNumber: "09XXXXXXXX",
      accountName: "Medaf Skin Care",
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<PaymentInfoState>("/settings/payment-info")
      .then((data) => {
        if (data?.bankAccount) setInfo(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/settings/payment-info", {
        method: "PUT",
        body: JSON.stringify(info),
      });
      invalidateApiCache("/settings");
      toast.success("Payment details saved");
    } catch (err: unknown) {
      toast.error(
        "Failed to save",
        err instanceof Error ? err.message : "Please try again",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsShell
      title="Payment Accounts (50% Advance)"
      description="Bank transfer and Telebirr account information displayed to customers at checkout."
      action={
        <Button onClick={handleSave} disabled={saving} className="rounded-full">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="space-y-6 max-w-xl">
        {loading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : (
          <>
            {/* Bank details */}
            <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/20">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="size-4 text-primary" /> Bank Account (CBE)
              </h3>
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank Name</Label>
                <Input
                  id="bank-name"
                  value={info.bankAccount.bankName}
                  onChange={(e) =>
                    setInfo({
                      ...info,
                      bankAccount: {
                        ...info.bankAccount,
                        bankName: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-acc">Account Number</Label>
                <Input
                  id="bank-acc"
                  value={info.bankAccount.accountNumber}
                  onChange={(e) =>
                    setInfo({
                      ...info,
                      bankAccount: {
                        ...info.bankAccount,
                        accountNumber: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-holder">Account Name</Label>
                <Input
                  id="bank-holder"
                  value={info.bankAccount.accountName}
                  onChange={(e) =>
                    setInfo({
                      ...info,
                      bankAccount: {
                        ...info.bankAccount,
                        accountName: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Telebirr details */}
            <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/20">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                📱 Telebirr Account
              </h3>
              <div className="space-y-2">
                <Label htmlFor="tele-phone">Telebirr Phone Number</Label>
                <Input
                  id="tele-phone"
                  value={info.telebirr.phoneNumber}
                  onChange={(e) =>
                    setInfo({
                      ...info,
                      telebirr: {
                        ...info.telebirr,
                        phoneNumber: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tele-name">Account Name</Label>
                <Input
                  id="tele-name"
                  value={info.telebirr.accountName}
                  onChange={(e) =>
                    setInfo({
                      ...info,
                      telebirr: {
                        ...info.telebirr,
                        accountName: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </SettingsShell>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Support Phone Section                                         */
/* ────────────────────────────────────────────────────────────── */

function SupportSection() {
  const toast = useToast();
  const [supportPhone, setSupportPhone] = useState("66XXXXXXXX");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ supportPhone: string }>("/settings/support-phone")
      .then((data) => {
        if (data?.supportPhone) setSupportPhone(data.supportPhone);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/settings/support-phone", {
        method: "PUT",
        body: JSON.stringify({ supportPhone }),
      });
      invalidateApiCache("/settings");
      toast.success("Support phone number saved");
    } catch (err: unknown) {
      toast.error(
        "Failed to save",
        err instanceof Error ? err.message : "Please try again",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsShell
      title="Customer Support Contact"
      description="The official support telephone number (66...) shown across the bot, web shop, and checkout."
      action={
        <Button onClick={handleSave} disabled={saving} className="rounded-full">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="space-y-4 max-w-md">
        {loading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="support-phone">Support Telephone Number</Label>
            <Input
              id="support-phone"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="E.g., 66XXXXXXXX"
            />
            <p className="text-xs text-muted-foreground">
              This number is linked in all order confirmation messages, the shop header, and cart pages.
            </p>
          </div>
        )}
      </div>
    </SettingsShell>
  );
}

export default function SettingsPage() {
  const { adminName } = useAdmin();
  const [section, setSection] = useState<SectionId>("profile");
  /** Mobile: null = hub list; desktop always shows content with sidebar */
  const [mobileOpen, setMobileOpen] = useState<SectionId | null>(null);
  const active =
    SECTIONS.find((s) => s.id === (mobileOpen ?? section)) ?? SECTIONS[0];

  function openSection(id: SectionId) {
    setSection(id);
    setMobileOpen(id);
  }

  function renderSection(id: SectionId) {
    if (id === "profile") return <ProfileSection />;
    if (id === "banner") return <BannerSection />;
    if (id === "discounts") return <DiscountsSection />;
    if (id === "delivery") return <DeliverySection />;
    if (id === "payment") return <PaymentSection />;
    if (id === "support") return <SupportSection />;
    return <TeamSection />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* ── Mobile hub ─────────────────────────────────────────── */}
      <div className={cn("lg:hidden", mobileOpen && "hidden")}>
        <div className="mb-5 space-y-1 px-0.5">
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Account, shop, discounts, and team.
          </p>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <Avatar className="size-14 ring-2 ring-sidebar-accent">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-lg font-semibold">
              {initials(adminName || "Admin")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {adminName || "Admin"}
            </p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => openSection("profile")}
          >
            Edit
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {SECTIONS.map(({ id, label, hint, Icon }, index) => (
            <button
              key={id}
              type="button"
              onClick={() => openSection(id)}
              className={cn(
                "flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-muted/80 transition-colors",
                index > 0 && "border-t border-border",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-accent-foreground">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-foreground">
                  {label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {hint}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground/70" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile detail ──────────────────────────────────────── */}
      <div className={cn("lg:hidden", !mobileOpen && "hidden")}>
        <div className="sticky top-0 z-20 -mx-3 mb-4 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:-mx-4 sm:px-4">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 gap-1 text-primary"
              onClick={() => setMobileOpen(null)}
            >
              <ArrowLeft className="size-4" />
              Settings
            </Button>
          </div>
          <div className="mt-1 px-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {active.label}
            </h1>
            <p className="text-xs text-muted-foreground">{active.hint}</p>
          </div>
        </div>
        {mobileOpen ? renderSection(mobileOpen) : null}
      </div>

      {/* ── Desktop ────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your account, Telegram shop banner, discounts, and team
            access.
          </p>
        </div>

        <div className="flex items-start gap-5">
          <nav
            aria-label="Settings sections"
            className="sticky top-4 w-56 shrink-0"
          >
            <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-2 shadow-sm">
              {SECTIONS.map(({ id, label, hint, Icon }) => {
                const on = section === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSection(id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      on
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        on ? "bg-primary-foreground/15" : "bg-muted",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "block text-[11px] leading-tight",
                          on
                            ? "text-primary-foreground/75"
                            : "text-muted-foreground",
                        )}
                      >
                        {hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="min-w-0 flex-1">{renderSection(section)}</div>
        </div>
      </div>
    </div>
  );
}
