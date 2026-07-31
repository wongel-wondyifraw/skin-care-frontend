"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiFetch, apiFetchCached, invalidateApiCache } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { Plus, Pencil, Trash2, Search, PackagePlus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select as CustomSelect } from "@/components/ui/select-custom";
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { useToast } from "@/components/ToastProvider";
import { useNetwork } from "@/components/NetworkProvider";
import { ApiError, isNetworkError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmModal from "@/components/ConfirmModal";

interface Category { id: string; name: string }
interface SkinType { id: string; name: string }
interface Product {
  id: string;
  name: string;
  brand?: string | null;
  description: string | null;
  image: string;
  assetId?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  skinTypeId?: string | null;
  skinType?: SkinType | null;
  skinTypes?: SkinType[];
  stock: number;
  price: number;
  createdAt: string;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type ViewMode = "table" | "tiles";
type SortMode = "name" | "recent";
type ProductForm = {
  name: string;
  brand: string;
  description: string;
  categoryId: string;
  skinTypeIds: string[];
  stock: string;
  price: string;
};
type PaginatedResponse<T> = { items: T[]; total: number; page: number; pageSize: number };
const emptyForm = (): ProductForm => ({
  name: "",
  brand: "",
  description: "",
  categoryId: "",
  skinTypeIds: [],
  stock: "0",
  price: "",
});

const VIEW_MODE_KEY = "productsViewMode";

function productSkinLabels(prod: Product): string {
  if (prod.skinTypes?.length) return prod.skinTypes.map((s) => s.name).join(", ");
  return prod.skinType?.name ?? "All";
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

async function uploadImage(file: File): Promise<{ url: string; assetId: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const uploadRes = await fetch(`${API_BASE_URL}/upload/image`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!uploadRes.ok) throw new Error("Image upload failed");
  return uploadRes.json();
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return <Badge variant="destructive" className="text-[11px]">Out of Stock</Badge>;
  if (stock < 10)
    return <Badge variant="outline" className="text-[11px] border-primary/40 text-primary">{stock} — Low</Badge>;
  return <Badge variant="secondary" className="text-[11px]">{stock} in stock</Badge>;
}

function ProductTile({
  prod,
  deletingId,
  onRestock,
  onEdit,
  onDelete,
}: {
  prod: Product;
  deletingId: string | null;
  onRestock: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md active:scale-[0.99]">
      <Link
        href={`/admin/products/${prod.id}`}
        className="relative block aspect-[3/4] sm:aspect-[4/5] overflow-hidden bg-muted no-underline"
      >
        <Image
          src={prod.image}
          alt={prod.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
          <StockBadge stock={prod.stock} />
        </div>
        <div className="absolute bottom-2 left-2 right-2 sm:hidden">
          <p className="text-[11px] font-semibold text-white drop-shadow-sm line-clamp-1">
            {prod.price != null ? `${Number(prod.price).toFixed(2)} ETB` : ""}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-3.5">
        {prod.brand?.trim() && (
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-muted-foreground truncate">
            {prod.brand.trim()}
          </p>
        )}
        <Link
          href={`/admin/products/${prod.id}`}
          className="text-[13px] sm:text-sm font-semibold text-foreground leading-snug line-clamp-2 no-underline hover:text-primary"
        >
          {prod.name}
        </Link>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">
          {[prod.category?.name, productSkinLabels(prod)].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-auto pt-0.5 hidden sm:flex items-end justify-between gap-2">
          <p className="text-base font-semibold tracking-tight">
            {prod.price != null ? `${Number(prod.price).toFixed(2)} ETB` : "—"}
          </p>
        </div>

        <div className="flex items-center gap-1 pt-1.5 border-t border-border/80">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-[11px] sm:text-xs px-2"
            onClick={() => onRestock(prod)}
            aria-label={`Restock ${prod.name}`}
          >
            <PackagePlus className="size-3.5" />
            <span className="sm:inline">Restock</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-8"
            onClick={() => onEdit(prod)}
            aria-label={`Edit ${prod.name}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(prod)}
            disabled={deletingId === prod.id}
            aria-label={`Delete ${prod.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function ProductFormFields({
  idPrefix, form, setForm, categoryOptions, skinTypes, imagePreview, currentImage, currentName, onImageSelect, requireImage,
}: {
  idPrefix: string; form: ProductForm; setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  categoryOptions: { value: string; label: string }[];
  skinTypes: SkinType[];
  imagePreview: string | null; currentImage?: string; currentName?: string;
  onImageSelect: (file: File) => void; requireImage?: boolean;
}) {
  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  function toggleSkinType(id: string) {
    setForm((f) => ({
      ...f,
      skinTypeIds: f.skinTypeIds.includes(id)
        ? f.skinTypeIds.filter((x) => x !== id)
        : [...f.skinTypeIds, id],
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input id={`${idPrefix}-name`} placeholder="e.g. Cleansing Oil" value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-brand`}>
          Brand <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-brand`}
          placeholder="e.g. Medaf"
          value={form.brand}
          onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-desc`}>Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <textarea id={`${idPrefix}-desc`} placeholder="Brief description" value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
          className={`${selectClass} min-h-[60px] resize-y py-2`} />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <CustomSelect
          value={form.categoryId}
          onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
          options={categoryOptions}
          placeholder={categoryOptions[0]?.label ?? "No categories"}
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          Skin types{" "}
          <span className="font-normal text-muted-foreground">(select one or more)</span>
        </Label>
        {skinTypes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No skin types yet. Add some under Categories &amp; Skin.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 rounded-md border border-border p-2.5 max-h-36 overflow-y-auto">
            {skinTypes.map((st) => {
              const selected = form.skinTypeIds.includes(st.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => toggleSkinType(st.id)}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "rounded-md bg-primary/15 text-primary border border-primary/30 px-2.5 py-1 text-xs font-medium"
                      : "rounded-md bg-muted/60 text-muted-foreground border border-transparent px-2.5 py-1 text-xs hover:bg-muted"
                  }
                >
                  {st.name}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Leave empty to mark as suitable for all skin types.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-stock`}>Stock</Label>
          <Input id={`${idPrefix}-stock`} type="number" min="0" value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-price`}>Price (ETB)</Label>
          <Input id={`${idPrefix}-price`} type="number" min="0" step="0.01" placeholder="0.00"
            value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-image`}>{requireImage ? "Image" : "Image"}</Label>
        <div className="flex items-center gap-3 flex-wrap">
          {(imagePreview || currentImage) && (
            <div className="relative size-14 rounded-md overflow-hidden border border-border bg-muted shrink-0">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : currentImage ? (
                <Image src={currentImage} alt={currentName || "Product"} fill className="object-cover" sizes="56px" />
              ) : null}
            </div>
          )}
          {(imagePreview || currentImage) ? (
            <>
              <input
                id={`${idPrefix}-image`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageSelect(f); }}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <label htmlFor={`${idPrefix}-image`} className="cursor-pointer">
                  {imagePreview ? "Change image" : "Replace image"}
                </label>
              </Button>
            </>
          ) : (
            <Input
              id={`${idPrefix}-image`}
              type="file"
              accept="image/*"
              required={requireImage}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageSelect(f); }}
              className="max-w-[220px]"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const toast = useToast();
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skinTypes, setSkinTypes] = useState<SkinType[]>([]);
  const [total, setTotal] = useState(0);
  const [refsLoading, setRefsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSkinType, setFilterSkinType] = useState("");
  const [filterStock, setFilterStock] = useState<StockFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState("10");
  const [restockBusy, setRestockBusy] = useState(false);
  const [restockError, setRestockError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("tiles");

  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === "table" || saved === "tiles") setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, s] = await Promise.all([
          apiFetchCached<Category[]>("/categories", 5 * 60_000),
          apiFetchCached<SkinType[]>("/skin-types", 5 * 60_000),
        ]);
        if (cancelled) return;
        setCategories(c);
        setSkinTypes(s);
        clearNetworkError();
      } catch (err: unknown) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load reference data.");
      } finally {
        if (!cancelled) setRefsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reconnectKey, clearNetworkError, reportNetworkError]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setFetchError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search.trim()) params.set("search", search.trim());
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterSkinType) params.set("skinTypeId", filterSkinType);
    if (filterStock !== "all") params.set("stock", filterStock);
    params.set("sort", sortMode);

    (async () => {
      try {
        const data = await apiFetch<PaginatedResponse<Product>>(`/products?${params.toString()}`, {
          toastOnError: false,
        });
        if (cancelled) return;
        setProducts(data.items);
        setTotal(data.total);
        clearNetworkError();
      } catch (err: unknown) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load products.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, filterCategory, filterSkinType, filterStock, sortMode, refreshKey, reconnectKey, clearNetworkError, reportNetworkError]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const categoryOptions = useMemo(
    () => [{ value: "", label: "All Categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories],
  );
  const skinTypeOptions = useMemo(
    () => [{ value: "", label: "All Skin Types" }, ...skinTypes.map((s) => ({ value: s.id, label: s.name }))],
    [skinTypes],
  );
  const stockOptions = useMemo(
    () => [
      { value: "all", label: "All Stock" },
      { value: "in_stock", label: "In Stock" },
      { value: "low_stock", label: "Low (< 10)" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
    [],
  );
  const sortOptions = useMemo(
    () => [
      { value: "name", label: "A–Z" },
      { value: "recent", label: "Recent" },
    ],
    [],
  );
  const formCategoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const filtersActive = !!search.trim() || !!filterCategory || !!filterSkinType || filterStock !== "all";
  const initialLoading = (refsLoading || listLoading) && products.length === 0 && total === 0;
  function clearFilters() { setSearchInput(""); setFilterCategory(""); setFilterSkinType(""); setFilterStock("all"); setPage(1); }

  function openModal() {
    setForm({
      ...emptyForm(),
      categoryId: categories[0]?.id ?? "",
    });
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setFormError(null);
    setModalOpen(true);
  }
  function closeCreate() { setModalOpen(false); if (imagePreview) URL.revokeObjectURL(imagePreview); setImagePreview(null); setImageFile(null); }
  function handleImageSelect(file: File) { if (imagePreview) URL.revokeObjectURL(imagePreview); setImageFile(file); setImagePreview(URL.createObjectURL(file)); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !imageFile) { setFormError("Name and image are required."); return; }

    const duplicate = products.find(
      (p) => p.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
    );
    if (duplicate) {
      const msg = `A product named "${duplicate.name}" already exists. Use Restock to add inventory instead.`;
      setFormError(msg);
      toast.info("Product already exists", msg);
      closeCreate();
      setRestockTarget(duplicate);
      setRestockQty("10");
      setRestockError(null);
      return;
    }

    setBusy(true); setFormError(null);
    try {
      const up = await uploadImage(imageFile);
      await apiFetch<Product>("/products", {
        method: "POST",
        toastOnError: false,
        body: JSON.stringify({
          name: form.name.trim(),
          brand: form.brand.trim() || null,
          description: form.description.trim() || undefined,
          image: up.url,
          assetId: up.assetId,
          categoryId: form.categoryId || undefined,
          skinTypeIds: form.skinTypeIds,
          stock: parseInt(form.stock, 10) || 0,
          price: parseFloat(form.price) || 0,
        }),
      });
      invalidateApiCache("/dashboard-summary");
      toast.success("Product created");
      closeCreate();
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create product.";
      setFormError(msg);
      toast.error(err);
      if (err instanceof ApiError && err.status === 409) {
        // Keep create dialog open so the restock message is visible
      }
    } finally { setBusy(false); }
  }

  function openRestock(prod: Product) {
    setRestockTarget(prod);
    setRestockQty("10");
    setRestockError(null);
  }

  async function handleRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!restockTarget) return;
    const qty = parseInt(restockQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setRestockError("Enter a positive quantity.");
      return;
    }
    setRestockBusy(true);
    setRestockError(null);
    try {
      await apiFetch<Product>(`/products/${restockTarget.id}/restock`, {
        method: "PATCH",
        toastOnError: false,
        body: JSON.stringify({ quantity: qty }),
      });
      toast.success("Stock updated", `Added ${qty} units to ${restockTarget.name}.`);
      setRestockTarget(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      setRestockError(err instanceof Error ? err.message : "Failed to restock.");
      toast.error(err);
    } finally {
      setRestockBusy(false);
    }
  }

  function openEdit(prod: Product) {
    const skinIds =
      prod.skinTypes?.length
        ? prod.skinTypes.map((s) => s.id)
        : prod.skinTypeId
          ? [prod.skinTypeId]
          : [];
    setEditTarget(prod);
    setEditForm({
      name: prod.name,
      brand: prod.brand ?? "",
      description: prod.description ?? "",
      stock: String(prod.stock),
      price: String(prod.price ?? ""),
      categoryId: prod.categoryId || categories[0]?.id || "",
      skinTypeIds: skinIds,
    });
    setEditImageFile(null);
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(null);
    setEditError(null);
  }
  function closeEdit() { setEditTarget(null); if (editImagePreview) URL.revokeObjectURL(editImagePreview); setEditImagePreview(null); setEditImageFile(null); }
  function handleEditImageSelect(file: File) { if (editImagePreview) URL.revokeObjectURL(editImagePreview); setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)); }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.name.trim()) { setEditError("Name is required."); return; }
    setEditBusy(true); setEditError(null);
    try {
      let imageUrl = editTarget.image, assetId = editTarget.assetId;
      if (editImageFile) { const up = await uploadImage(editImageFile); imageUrl = up.url; assetId = up.assetId; }
      await apiFetch<Product>(`/products/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          brand: editForm.brand.trim() || null,
          description: editForm.description.trim() || undefined,
          image: imageUrl,
          assetId,
          stock: parseInt(editForm.stock, 10) || 0,
          price: parseFloat(editForm.price) || 0,
          categoryId: editForm.categoryId || undefined,
          skinTypeIds: editForm.skinTypeIds,
        }),
      });
      closeEdit();
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) { setEditError(err instanceof Error ? err.message : "Failed to update product."); } finally { setEditBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return; setDeletingId(deleteTarget.id); setActionError(null);
    try {
      await apiFetch(`/products/${deleteTarget.id}`, { method: "DELETE" });
      invalidateApiCache("/dashboard-summary");
      setDeleteTarget(null);
      if (products.length === 1 && page > 1) setPage((prev) => prev - 1);
      else setRefreshKey((prev) => prev + 1);
    }
    catch (err: unknown) { setActionError(err instanceof Error ? err.message : "Failed to delete."); setDeleteTarget(null); }
    finally { setDeletingId(null); }
  }

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground">Manage your product catalogue.</p>
        </div>
        <Button onClick={openModal} size="sm">
          <Plus className="size-4" /> Create Product
        </Button>
      </div>

      {!initialLoading && (products.length > 0 || filtersActive) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input type="search" placeholder="Search products…" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
              className="pl-8 h-8 text-xs" />
          </div>
          <CustomSelect
            value={filterCategory}
            onValueChange={(value) => { setFilterCategory(value); setPage(1); }}
            options={categoryOptions}
            placeholder="All Categories"
            size="sm"
            className="w-36"
          />
          <CustomSelect
            value={filterSkinType}
            onValueChange={(value) => { setFilterSkinType(value); setPage(1); }}
            options={skinTypeOptions}
            placeholder="All Skin Types"
            size="sm"
            className="w-36"
          />
          <CustomSelect
            value={filterStock}
            onValueChange={(v) => { setFilterStock(v as StockFilter); setPage(1); }}
            options={stockOptions}
            placeholder="All Stock"
            size="sm"
            className="w-32"
          />
          <CustomSelect
            value={sortMode}
            onValueChange={(v) => { setSortMode(v as SortMode); setPage(1); }}
            options={sortOptions}
            placeholder="Sort"
            size="sm"
            className="w-28"
          />
          <div
            className="ml-auto inline-flex items-center rounded-md border border-border bg-card p-0.5 shrink-0"
            role="group"
            aria-label="View mode"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "size-8 rounded-sm",
                viewMode === "tiles" && "bg-accent text-accent-foreground",
              )}
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
              className={cn(
                "size-8 rounded-sm",
                viewMode === "table" && "bg-accent text-accent-foreground",
              )}
              aria-pressed={viewMode === "table"}
              aria-label="Table view"
              onClick={() => changeViewMode("table")}
            >
              <List className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {initialLoading && (
        <>
          {viewMode === "tiles" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border">
                  <Skeleton className="aspect-[3/4] sm:aspect-[4/5] w-full rounded-none" />
                  <div className="p-2.5 sm:p-3 space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="hidden md:block border border-border rounded-lg overflow-hidden" aria-busy="true">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"><Skeleton className="h-4 w-10" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                      <TableHead className="w-48"><Skeleton className="h-4 w-14" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="size-10 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex md:hidden flex-col gap-2" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-card border border-border rounded-lg">
                    <Skeleton className="size-14 rounded-md shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {fetchError && <p className="text-sm text-destructive" role="alert">{fetchError}</p>}
      {actionError && <p className="mb-3 text-sm text-destructive" role="alert">{actionError}</p>}

      {!initialLoading && !fetchError && total === 0 && !filtersActive && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No products yet.</p>
          <Button variant="link" onClick={openModal}>Create your first product</Button>
        </div>
      )}

      {!initialLoading && !fetchError && total === 0 && filtersActive && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No products match your filters.</p>
          {filtersActive && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
        </div>
      )}

      {!initialLoading && !fetchError && products.length > 0 && (
        <>
          {viewMode === "tiles" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {products.map((prod) => (
                <ProductTile
                  key={prod.id}
                  prod={prod}
                  deletingId={deletingId}
                  onRestock={openRestock}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          ) : (
            <>
              <div className="hidden md:block border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Skin Types</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="w-48">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((prod) => (
                      <TableRow key={prod.id} className="group/row">
                        <TableCell>
                          <ProductImagePreview src={prod.image} alt={prod.name} size="sm" />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/products/${prod.id}`}
                            className="text-foreground no-underline hover:text-primary hover:underline underline-offset-2"
                          >
                            {prod.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{prod.brand?.trim() || <em className="opacity-50">—</em>}</TableCell>
                        <TableCell className="text-muted-foreground">{prod.category?.name ?? <em className="opacity-50">—</em>}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px]">
                          <span className="line-clamp-2">{productSkinLabels(prod)}</span>
                        </TableCell>
                        <TableCell className="font-medium">{prod.price != null ? `${Number(prod.price).toFixed(2)} ETB` : "—"}</TableCell>
                        <TableCell><StockBadge stock={prod.stock} /></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => openRestock(prod)} aria-label={`Restock ${prod.name}`}>
                              <PackagePlus className="size-3.5" /> Restock
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => openEdit(prod)} aria-label={`Edit ${prod.name}`}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(prod)} disabled={deletingId === prod.id}
                              aria-label={`Delete ${prod.name}`} className="text-destructive hover:text-destructive">
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
                {products.map((prod) => (
                  <div key={prod.id} className="flex gap-3 p-3 bg-card border border-border rounded-xl">
                    <ProductImagePreview src={prod.image} alt={prod.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/admin/products/${prod.id}`}
                          className="text-sm font-medium text-foreground no-underline hover:text-primary"
                        >
                          {prod.name}
                        </Link>
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon-xs" onClick={() => openRestock(prod)} aria-label={`Restock ${prod.name}`}>
                            <Plus className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => openEdit(prod)}><Pencil className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(prod)} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[prod.brand?.trim(), prod.category?.name ?? "Uncategorized", productSkinLabels(prod)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-sm font-medium">{prod.price != null ? `${Number(prod.price).toFixed(2)} ETB` : "—"}</span>
                        <StockBadge stock={prod.stock} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {products.length === 0 ? 0 : (page - 1) * pageSize + 1}
              {" "}to {Math.min(page * pageSize, total)} of {total} products
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1 || listLoading}
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
                disabled={page >= totalPages || listLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeCreate(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Product</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate}>
            <ProductFormFields idPrefix="create" form={form} setForm={setForm} categoryOptions={formCategoryOptions} skinTypes={skinTypes}
              imagePreview={imagePreview} onImageSelect={handleImageSelect} requireImage />
            {formError && <p className="mt-3 text-sm text-destructive" role="alert">{formError}</p>}
            <DialogFooter className="mt-5 gap-2 sm:gap-2">
              <Button variant="outline" type="button" onClick={closeCreate}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) closeEdit(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          {editTarget && (
            <form onSubmit={handleEdit}>
              <ProductFormFields idPrefix="edit" form={editForm} setForm={setEditForm} categoryOptions={formCategoryOptions} skinTypes={skinTypes}
                imagePreview={editImagePreview} currentImage={editTarget.image} currentName={editTarget.name} onImageSelect={handleEditImageSelect} />
              {editError && <p className="mt-3 text-sm text-destructive" role="alert">{editError}</p>}
              <DialogFooter className="mt-5 gap-2 sm:gap-2">
                <Button variant="outline" type="button" onClick={closeEdit}>Cancel</Button>
                <Button type="submit" disabled={editBusy}>{editBusy ? "Updating…" : "Update"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!restockTarget} onOpenChange={(v) => { if (!v) setRestockTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Restock {restockTarget?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleRestock} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Current stock: <span className="font-medium text-foreground">{restockTarget?.stock ?? 0}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="restock-qty">Quantity to add</Label>
              <Input
                id="restock-qty"
                type="number"
                min="1"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                required
                data-autofocus
              />
            </div>
            {restockError && <p className="text-sm text-destructive" role="alert">{restockError}</p>}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setRestockTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={restockBusy}>{restockBusy ? "Updating…" : "Add Stock"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!deleteTarget} title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="danger" busy={!!deletingId}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}
