"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import Image from "next/image";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
const emptyForm = (): ProductForm => ({ name: "", description: "", categoryId: "", skinTypeId: "", stock: "0", price: "" });

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
  idPrefix, form, setForm, categories, skinTypes, imagePreview, currentImage, currentName, onImageSelect, requireImage,
}: {
  idPrefix: string; form: ProductForm; setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  categories: Category[]; skinTypes: SkinType[];
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
          <Label htmlFor={`${idPrefix}-category`}>Category</Label>
          <select id={`${idPrefix}-category`} value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className={selectClass}>
            <option value="">— Select —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-skin`}>Skin Type</Label>
          <select id={`${idPrefix}-skin`} value={form.skinTypeId}
            onChange={(e) => setForm((f) => ({ ...f, skinTypeId: e.target.value }))} className={selectClass}>
            <option value="">— Select —</option>
            {skinTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skinTypes, setSkinTypes] = useState<SkinType[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSkinType, setFilterSkinType] = useState("");
  const [filterStock, setFilterStock] = useState<StockFilter>("all");

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, c, s] = await Promise.all([
          apiFetch<Product[]>("/products"),
          apiFetch<Category[]>("/categories"),
          apiFetch<SkinType[]>("/skin-types"),
        ]);
        if (cancelled) return;
        setProducts(p); setCategories(c); setSkinTypes(s);
      } catch (err: unknown) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q)); }
    if (filterCategory) list = list.filter((p) => p.categoryId === filterCategory);
    if (filterSkinType) list = list.filter((p) => p.skinTypeId === filterSkinType);
    if (filterStock === "out_of_stock") list = list.filter((p) => p.stock === 0);
    else if (filterStock === "low_stock") list = list.filter((p) => p.stock > 0 && p.stock < 10);
    else if (filterStock === "in_stock") list = list.filter((p) => p.stock > 0);
    return list;
  }, [products, search, filterCategory, filterSkinType, filterStock]);

  const filtersActive = !!search.trim() || !!filterCategory || !!filterSkinType || filterStock !== "all";
  function clearFilters() { setSearch(""); setFilterCategory(""); setFilterSkinType(""); setFilterStock("all"); }

  function openModal() { setForm(emptyForm()); setImageFile(null); if (imagePreview) URL.revokeObjectURL(imagePreview); setImagePreview(null); setFormError(null); setModalOpen(true); }
  function closeCreate() { setModalOpen(false); if (imagePreview) URL.revokeObjectURL(imagePreview); setImagePreview(null); setImageFile(null); }
  function handleImageSelect(file: File) { if (imagePreview) URL.revokeObjectURL(imagePreview); setImageFile(file); setImagePreview(URL.createObjectURL(file)); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !imageFile) { setFormError("Name and image are required."); return; }
    setBusy(true); setFormError(null);
    try {
      const up = await uploadImage(imageFile);
      const created = await apiFetch<Product>("/products", { method: "POST", body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined, image: up.url, assetId: up.assetId, categoryId: form.categoryId || undefined, skinTypeId: form.skinTypeId || undefined, stock: parseInt(form.stock, 10) || 0, price: parseFloat(form.price) || 0 }) });
      setProducts((prev) => [created, ...prev]); closeCreate();
    } catch (err: unknown) { setFormError(err instanceof Error ? err.message : "Failed to create product."); } finally { setBusy(false); }
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
      const updated = await apiFetch<Product>(`/products/${editTarget.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() || undefined, image: imageUrl, assetId, stock: parseInt(editForm.stock, 10) || 0, price: parseFloat(editForm.price) || 0, categoryId: editForm.categoryId || undefined, skinTypeId: editForm.skinTypeId || undefined }) });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p))); closeEdit();
    } catch (err: unknown) { setEditError(err instanceof Error ? err.message : "Failed to update product."); } finally { setEditBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return; setDeletingId(deleteTarget.id); setActionError(null);
    try { await apiFetch(`/products/${deleteTarget.id}`, { method: "DELETE" }); setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id)); setDeleteTarget(null); }
    catch (err: unknown) { setActionError(err instanceof Error ? err.message : "Failed to delete."); setDeleteTarget(null); }
    finally { setDeletingId(null); }
  }

  const selectClass = "flex h-8 rounded-md border border-input bg-transparent px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground">Manage your product catalogue.</p>
        </div>
        <Button onClick={openModal} size="sm">
          <Plus className="size-4" /> Create Product
        </Button>
      </div>

      {!loading && products.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input type="search" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs" />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterSkinType} onChange={(e) => setFilterSkinType(e.target.value)} className={selectClass}>
            <option value="">All Skin Types</option>
            {skinTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterStock} onChange={(e) => setFilterStock(e.target.value as StockFilter)} className={selectClass}>
            <option value="all">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low (&lt; 10)</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      )}

      {loading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}
      {fetchError && <p className="text-sm text-destructive" role="alert">{fetchError}</p>}
      {actionError && <p className="mb-3 text-sm text-destructive" role="alert">{actionError}</p>}

      {!loading && !fetchError && products.length === 0 && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No products yet.</p>
          <Button variant="link" onClick={openModal}>Create your first product</Button>
        </div>
      )}

      {!loading && products.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No products match your filters.</p>
          {filtersActive && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
        </div>
      )}

      {!loading && filtered.length > 0 && (
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
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((prod) => (
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
                      <div className="flex gap-1">
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
            {filtered.map((prod) => (
              <div key={prod.id} className="flex gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="relative size-14 rounded-md overflow-hidden bg-muted shrink-0">
                  <Image src={prod.image} alt={prod.name} fill className="object-cover" sizes="56px" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{prod.name}</span>
                    <div className="flex gap-0.5 shrink-0">
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
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeCreate(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Product</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate}>
            <ProductFormFields idPrefix="create" form={form} setForm={setForm} categories={categories} skinTypes={skinTypes}
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
              <ProductFormFields idPrefix="edit" form={editForm} setForm={setEditForm} categories={categories} skinTypes={skinTypes}
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

      <ConfirmModal open={!!deleteTarget} title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="danger" busy={!!deletingId}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}
