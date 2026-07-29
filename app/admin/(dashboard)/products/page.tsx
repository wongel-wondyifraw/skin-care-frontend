"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiFetch, apiFetchCached, invalidateApiCache } from "@/lib/api";
import Image from "next/image";
import { Plus, Pencil, Trash2, Search, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select as CustomSelect } from "@/components/ui/select-custom";
import { useToast } from "@/components/ToastProvider";
import { useNetwork } from "@/components/NetworkProvider";
import { ApiError, isNetworkError } from "@/lib/errors";
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
  description: string | null;
  image: string;
  assetId?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  skinTypeId?: string | null;
  skinType?: SkinType | null;
  stock: number;
  price: number;
  createdAt: string;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type ProductForm = { name: string; description: string; categoryId: string; skinTypeId: string; stock: string; price: string };
type PaginatedResponse<T> = { items: T[]; total: number; page: number; pageSize: number };
const emptyForm = (): ProductForm => ({ name: "", description: "", categoryId: "", skinTypeId: "", stock: "0", price: "" });

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

function ProductFormFields({
  idPrefix, form, setForm, categoryOptions, skinTypeOptions, imagePreview, currentImage, currentName, onImageSelect, requireImage,
}: {
  idPrefix: string; form: ProductForm; setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  categoryOptions: { value: string; label: string }[];
  skinTypeOptions: { value: string; label: string }[];
  imagePreview: string | null; currentImage?: string; currentName?: string;
  onImageSelect: (file: File) => void; requireImage?: boolean;
}) {
  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input id={`${idPrefix}-name`} placeholder="e.g. Cleansing Oil" value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-desc`}>Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <textarea id={`${idPrefix}-desc`} placeholder="Brief description" value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
          className={`${selectClass} min-h-[60px] resize-y py-2`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <CustomSelect
            value={form.categoryId}
            onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
            options={categoryOptions}
            placeholder="— Select —"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Skin Type</Label>
          <CustomSelect
            value={form.skinTypeId}
            onValueChange={(v) => setForm((f) => ({ ...f, skinTypeId: v }))}
            options={skinTypeOptions}
            placeholder="— Select —"
          />
        </div>
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
        <Label htmlFor={`${idPrefix}-image`}>{requireImage ? "Image" : "Replace Image"}</Label>
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
          <Input id={`${idPrefix}-image`} type="file" accept="image/*" required={requireImage}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageSelect(f); }} className="max-w-[220px]" />
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

  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

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
  }, [page, pageSize, search, filterCategory, filterSkinType, filterStock, refreshKey, reconnectKey, clearNetworkError, reportNetworkError]);

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
  const formCategoryOptions = useMemo(
    () => [{ value: "", label: "— Select —" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories],
  );
  const formSkinTypeOptions = useMemo(
    () => [{ value: "", label: "— Select —" }, ...skinTypes.map((s) => ({ value: s.id, label: s.name }))],
    [skinTypes],
  );

  const filtersActive = !!search.trim() || !!filterCategory || !!filterSkinType || filterStock !== "all";
  const initialLoading = (refsLoading || listLoading) && products.length === 0 && total === 0;
  function clearFilters() { setSearchInput(""); setFilterCategory(""); setFilterSkinType(""); setFilterStock("all"); setPage(1); }

  function openModal() { setForm(emptyForm()); setImageFile(null); if (imagePreview) URL.revokeObjectURL(imagePreview); setImagePreview(null); setFormError(null); setModalOpen(true); }
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
          description: form.description.trim() || undefined,
          image: up.url,
          assetId: up.assetId,
          categoryId: form.categoryId || undefined,
          skinTypeId: form.skinTypeId || undefined,
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

  function openEdit(prod: Product) { setEditTarget(prod); setEditForm({ name: prod.name, description: prod.description ?? "", stock: String(prod.stock), price: String(prod.price ?? ""), categoryId: prod.categoryId || "", skinTypeId: prod.skinTypeId || "" }); setEditImageFile(null); if (editImagePreview) URL.revokeObjectURL(editImagePreview); setEditImagePreview(null); setEditError(null); }
  function closeEdit() { setEditTarget(null); if (editImagePreview) URL.revokeObjectURL(editImagePreview); setEditImagePreview(null); setEditImageFile(null); }
  function handleEditImageSelect(file: File) { if (editImagePreview) URL.revokeObjectURL(editImagePreview); setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)); }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.name.trim()) { setEditError("Name is required."); return; }
    setEditBusy(true); setEditError(null);
    try {
      let imageUrl = editTarget.image, assetId = editTarget.assetId;
      if (editImageFile) { const up = await uploadImage(editImageFile); imageUrl = up.url; assetId = up.assetId; }
      await apiFetch<Product>(`/products/${editTarget.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() || undefined, image: imageUrl, assetId, stock: parseInt(editForm.stock, 10) || 0, price: parseFloat(editForm.price) || 0, categoryId: editForm.categoryId || undefined, skinTypeId: editForm.skinTypeId || undefined }) });
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
        </div>
      )}

      {initialLoading && (
        <>
          {/* Desktop skeleton */}
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden" aria-busy="true">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"><Skeleton className="h-4 w-10" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead className="w-20"><Skeleton className="h-4 w-14" /></TableHead>
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
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile skeleton */}
          <div className="flex lg:hidden flex-col gap-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 bg-card border border-border rounded-lg">
                <Skeleton className="size-14 rounded-md shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Skin Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell>
                      <div className="relative size-10 rounded-md overflow-hidden bg-muted">
                        <Image src={prod.image} alt={prod.name} fill className="object-cover" sizes="40px" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{prod.name}</TableCell>
                    <TableCell className="text-muted-foreground">{prod.category?.name ?? <em className="opacity-50">—</em>}</TableCell>
                    <TableCell className="text-muted-foreground">{prod.skinType?.name ?? "All"}</TableCell>
                    <TableCell className="font-medium">{prod.price != null ? `${Number(prod.price).toFixed(2)} ETB` : "—"}</TableCell>
                    <TableCell><StockBadge stock={prod.stock} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="xs" onClick={() => openRestock(prod)} aria-label={`Restock ${prod.name}`}>
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

          <div className="flex lg:hidden flex-col gap-2">
            {products.map((prod) => (
              <div key={prod.id} className="flex gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="relative size-14 rounded-md overflow-hidden bg-muted shrink-0">
                  <Image src={prod.image} alt={prod.name} fill className="object-cover" sizes="56px" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{prod.name}</span>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={() => openRestock(prod)} aria-label={`Restock ${prod.name}`}>
                        <Plus className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(prod)}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(prod)} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{prod.category?.name ?? "Uncategorized"} · {prod.skinType?.name ?? "All"}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-sm font-medium">{prod.price != null ? `${Number(prod.price).toFixed(2)} ETB` : "—"}</span>
                    <StockBadge stock={prod.stock} />
                  </div>
                </div>
              </div>
            ))}
          </div>

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Product</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate}>
            <ProductFormFields idPrefix="create" form={form} setForm={setForm} categoryOptions={formCategoryOptions} skinTypeOptions={formSkinTypeOptions}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          {editTarget && (
            <form onSubmit={handleEdit}>
              <ProductFormFields idPrefix="edit" form={editForm} setForm={setEditForm} categoryOptions={formCategoryOptions} skinTypeOptions={formSkinTypeOptions}
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
