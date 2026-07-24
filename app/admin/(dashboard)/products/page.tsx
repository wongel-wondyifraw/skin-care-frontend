"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE_URL } from "../../../../lib/api";
import ConfirmModal from "../../../../components/ConfirmModal";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
}

interface SkinType {
  id: string;
  name: string;
}

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
  createdAt: string;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skinTypes, setSkinTypes] = useState<SkinType[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSkinType, setFilterSkinType] = useState("");
  const [filterStock, setFilterStock] = useState<StockFilter>("all");

  // ── Create Modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", categoryId: "", skinTypeId: "", stock: "0" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Edit Modal ──
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ stock: "0", categoryId: "", skinTypeId: "" });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Delete ──
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [prodData, catData, skinData] = await Promise.all([
        apiFetch<Product[]>("/products"),
        apiFetch<Category[]>("/categories"),
        apiFetch<SkinType[]>("/skin-types"),
      ]);
      setProducts(prodData);
      setCategories(catData);
      setSkinTypes(skinData);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtered products ──
  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filterCategory) {
      list = list.filter((p) => p.categoryId === filterCategory);
    }
    if (filterSkinType) {
      list = list.filter((p) => p.skinTypeId === filterSkinType);
    }
    if (filterStock === "out_of_stock") list = list.filter((p) => p.stock === 0);
    else if (filterStock === "low_stock") list = list.filter((p) => p.stock > 0 && p.stock < 10);
    else if (filterStock === "in_stock") list = list.filter((p) => p.stock > 0);
    return list;
  }, [products, search, filterCategory, filterSkinType, filterStock]);

  // ── Create ──
  function openModal() {
    setForm({ name: "", description: "", categoryId: "", skinTypeId: "", stock: "0" });
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
    setModalOpen(true);
  }

  function handleImageSelect(file: File) {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !imageFile) {
      setFormError("Name and image are required.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const token = localStorage.getItem("adminToken");
      const uploadRes = await fetch(`${API_BASE_URL}/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Image upload failed");
      const uploadData = await uploadRes.json();

      const created = await apiFetch<Product>("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          image: uploadData.url,
          assetId: uploadData.assetId,
          categoryId: form.categoryId || undefined,
          skinTypeId: form.skinTypeId || undefined,
          stock: parseInt(form.stock, 10) || 0,
        }),
      });
      setProducts((prev) => [created, ...prev]);
      setModalOpen(false);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setBusy(false);
    }
  }

  // ── Edit ──
  function openEdit(prod: Product) {
    setEditTarget(prod);
    setEditForm({
      stock: String(prod.stock),
      categoryId: prod.categoryId || "",
      skinTypeId: prod.skinTypeId || "",
    });
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditError(null);
  }

  function handleEditImageSelect(file: File) {
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditBusy(true);
    setEditError(null);
    try {
      let imageUrl = editTarget.image;
      let assetId = editTarget.assetId;

      // If a new image was selected, upload it first
      if (editImageFile) {
        const formData = new FormData();
        formData.append("image", editImageFile);
        const token = localStorage.getItem("adminToken");
        const uploadRes = await fetch(`${API_BASE_URL}/upload/image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
        assetId = uploadData.assetId;
      }

      const updated = await apiFetch<Product>(`/products/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          image: imageUrl,
          assetId: assetId,
          stock: parseInt(editForm.stock, 10) || 0,
          categoryId: editForm.categoryId || undefined,
          skinTypeId: editForm.skinTypeId || undefined,
        }),
      });

      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditTarget(null);
      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setEditBusy(false);
    }
  }

  // ── Delete ──
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiFetch(`/products/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteTarget(null);
      alert(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  function stockBadge(stock: number) {
    if (stock === 0) return <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Out of Stock</span>;
    if (stock < 10) return <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{stock} — Low</span>;
    return <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{stock} in stock</span>;
  }

  const selectClass = "border border-[#d0c5af] rounded-xl py-2 px-3 text-sm bg-white text-[#1a1c1c] outline-none font-inherit focus:border-[#735c00] transition-colors duration-200";

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-[22px] font-medium text-[#1a1c1c] mb-1">Products</h2>
          <p className="text-sm text-[#7f7663]">Manage your product catalogue.</p>
        </div>
        <button
          onClick={openModal}
          className="bg-[#1a1a1a] text-white border-none py-3 px-6 text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer flex items-center gap-2 transition-colors duration-200 font-inherit rounded-xl hover:bg-[#735c00]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="w-3.5 h-3.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Product
        </button>
      </div>

      {/* ── Filters ── */}
      {!loading && products.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="#7f7663" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-[#d0c5af] rounded-full py-2 pl-9 pr-3 text-sm bg-white text-[#1a1c1c] outline-none font-inherit w-full focus:border-[#735c00] transition-colors duration-200"
            />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
            <option value="">All Categories</option>
            {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
          </select>
          <select value={filterSkinType} onChange={(e) => setFilterSkinType(e.target.value)} className={selectClass}>
            <option value="">All Skin Types</option>
            {skinTypes.map((skin) => (<option key={skin.id} value={skin.id}>{skin.name}</option>))}
          </select>
          <select value={filterStock} onChange={(e) => setFilterStock(e.target.value as StockFilter)} className={selectClass}>
            <option value="all">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (&lt; 10)</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      )}

      {/* ── List ── */}
      {loading && <p className="text-sm text-[#7f7663]">Loading…</p>}
      {fetchError && <p className="text-[13px] text-[#ba1a1a]" role="alert">{fetchError}</p>}
      {!loading && !fetchError && products.length === 0 && (
        <div className="py-12 px-6 text-center border border-dashed border-[#d0c5af] text-[#7f7663] rounded-2xl">
          <p className="text-[15px] mb-3">No products yet.</p>
          <button onClick={openModal} className="bg-transparent border-none text-[#735c00] text-[13px] font-semibold cursor-pointer underline font-inherit">
            Create your first product
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="grid grid-cols-[80px_1.2fr_1fr_1fr_100px_40px_40px] gap-3 py-2 px-4 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#7f7663] border-b border-[#d0c5af]">
            <span>Image</span>
            <span>Name</span>
            <span>Category</span>
            <span>Skin Type</span>
            <span>Stock</span>
            <span></span>
            <span></span>
          </div>

          {filtered.map((prod) => (
            <div
              key={prod.id}
              className="grid grid-cols-[80px_1.2fr_1fr_1fr_100px_40px_40px] gap-3 items-center p-3 bg-white border border-[#e8e8e8] hover:border-[#d0c5af] transition-colors duration-200 rounded-[20px]"
            >
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100">
                <Image src={prod.image} alt={prod.name} fill className="object-cover" sizes="56px" />
              </div>
              <span className="text-[15px] font-medium text-[#1a1c1c] truncate">{prod.name}</span>
              <span className="text-sm text-[#7f7663] truncate">
                {prod.category?.name ?? <em className="opacity-50">Uncategorized</em>}
              </span>
              <span className="text-sm text-[#7f7663] truncate">
                {prod.skinType?.name ?? "All"}
              </span>
              <div>{stockBadge(prod.stock)}</div>
              {/* Edit */}
              <button
                onClick={() => openEdit(prod)}
                aria-label={`Edit ${prod.name}`}
                className="bg-transparent border-none p-1 cursor-pointer text-[#735c00] hover:text-[#574500] transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="w-[17px] h-[17px]" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              {/* Delete */}
              <button
                onClick={() => setDeleteTarget(prod)}
                disabled={deletingId === prod.id}
                aria-label={`Delete ${prod.name}`}
                className={`bg-transparent border-none p-1 transition-opacity duration-200 ${
                  deletingId === prod.id ? "cursor-not-allowed text-[#d0c5af] opacity-40" : "cursor-pointer text-[#ba1a1a] opacity-100"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  className="w-[17px] h-[17px]" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Modal ── */}
      {modalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div onClick={() => { setModalOpen(false); if (imagePreview) URL.revokeObjectURL(imagePreview); }} className="absolute inset-0 bg-black/35" />
          <div className="relative bg-white p-10 w-full max-w-[500px] shadow-[0_16px_40px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto rounded-[20px]">
            <button onClick={() => { setModalOpen(false); if (imagePreview) URL.revokeObjectURL(imagePreview); }}
              className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-[#7f7663] p-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="text-xl font-medium text-[#1a1c1c] mb-7">Create Product</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-5">
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">Name</label>
                <input type="text" placeholder="e.g. Cleansing Oil" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus
                  className="border border-[#d0c5af] rounded-xl py-2.5 px-3 bg-transparent w-full text-[15px] leading-[22px] text-[#1a1c1c] outline-none font-inherit transition-colors duration-250 focus:border-[#735c00]" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">
                  Description <span className="font-normal normal-case">(optional)</span>
                </label>
                <textarea placeholder="Brief description" value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                  className="resize-y border border-[#d0c5af] rounded-xl p-2.5 bg-transparent w-full text-[15px] leading-[22px] text-[#1a1c1c] outline-none font-inherit transition-colors duration-250 focus:border-[#735c00]" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">Category</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="border border-[#d0c5af] rounded-xl py-2.5 px-3 bg-transparent w-full text-[15px] text-[#1a1c1c] outline-none font-inherit focus:border-[#735c00] transition-colors duration-250">
                  <option value="">— Select category —</option>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">Skin Type</label>
                <select value={form.skinTypeId} onChange={(e) => setForm((f) => ({ ...f, skinTypeId: e.target.value }))}
                  className="border border-[#d0c5af] rounded-xl py-2.5 px-3 bg-transparent w-full text-[15px] text-[#1a1c1c] outline-none font-inherit focus:border-[#735c00] transition-colors duration-250">
                  <option value="">— Select skin type —</option>
                  {skinTypes.map((skin) => (<option key={skin.id} value={skin.id}>{skin.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">Stock Level</label>
                <input type="number" min="0" placeholder="0" value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  className="border border-[#d0c5af] rounded-xl py-2.5 px-3 bg-transparent w-full text-[15px] leading-[22px] text-[#1a1c1c] outline-none font-inherit transition-colors duration-250 focus:border-[#735c00]" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">Image</label>
                <input type="file" accept="image/*"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageSelect(file); }}
                  required className="text-sm mt-1" />
                {imagePreview && (
                  <div className="mt-3 relative w-24 h-24 rounded-lg overflow-hidden border border-[#d0c5af]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              {formError && <p className="text-[13px] text-[#ba1a1a]" role="alert">{formError}</p>}
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => { setModalOpen(false); if (imagePreview) URL.revokeObjectURL(imagePreview); }}
                  className="bg-transparent border border-[#d0c5af] hover:border-[#735c00] py-3 px-6 text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer text-[#4d4635] font-inherit rounded-xl transition-colors duration-200">
                  Cancel
                </button>
                <button type="submit" disabled={busy}
                  className={`border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl transition-colors duration-200 font-inherit text-white ${
                    busy ? "bg-[#4a3d00] cursor-not-allowed opacity-70" : "bg-[#1a1a1a] hover:bg-[#735c00] cursor-pointer"
                  }`}>
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div onClick={() => { setEditTarget(null); if (editImagePreview) URL.revokeObjectURL(editImagePreview); }} className="absolute inset-0 bg-black/35" />
          <div className="relative bg-white p-10 w-full max-w-[460px] shadow-[0_16px_40px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto rounded-[20px]">
            <button onClick={() => { setEditTarget(null); if (editImagePreview) URL.revokeObjectURL(editImagePreview); }}
              className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-[#7f7663] p-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="text-xl font-medium text-[#1a1c1c] mb-7">Edit Product</h3>
            <p className="text-sm text-[#7f7663] mb-5">Editing <strong className="text-[#1a1c1c]">{editTarget.name}</strong></p>
            <form onSubmit={handleEdit} className="flex flex-col gap-5">
              {/* Stock */}
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">Stock Level</label>
                <input type="number" min="0" value={editForm.stock}
                  onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                  className="border border-[#d0c5af] rounded-xl py-2.5 px-3 bg-transparent w-full text-[15px] leading-[22px] text-[#1a1c1c] outline-none font-inherit transition-colors duration-250 focus:border-[#735c00]" />
              </div>
              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">Category</label>
                <select value={editForm.categoryId} onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="border border-[#d0c5af] rounded-xl py-2.5 px-3 bg-transparent w-full text-[15px] text-[#1a1c1c] outline-none font-inherit focus:border-[#735c00] transition-colors duration-250">
                  <option value="">— Select category —</option>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>
              {/* Skin Type */}
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">Skin Type</label>
                <select value={editForm.skinTypeId} onChange={(e) => setEditForm((f) => ({ ...f, skinTypeId: e.target.value }))}
                  className="border border-[#d0c5af] rounded-xl py-2.5 px-3 bg-transparent w-full text-[15px] text-[#1a1c1c] outline-none font-inherit focus:border-[#735c00] transition-colors duration-250">
                  <option value="">— Select skin type —</option>
                  {skinTypes.map((skin) => (<option key={skin.id} value={skin.id}>{skin.name}</option>))}
                </select>
              </div>
              {/* Image */}
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1">
                  Replace Image <span className="font-normal normal-case">(optional)</span>
                </label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#d0c5af] bg-gray-100 shrink-0">
                    {editImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editImagePreview} alt="New preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image src={editTarget.image} alt={editTarget.name} fill className="object-cover" sizes="64px" />
                    )}
                  </div>
                  <input type="file" accept="image/*"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleEditImageSelect(file); }}
                    className="text-sm" />
                </div>
              </div>
              {editError && <p className="text-[13px] text-[#ba1a1a]" role="alert">{editError}</p>}
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => { setEditTarget(null); if (editImagePreview) URL.revokeObjectURL(editImagePreview); }}
                  className="bg-transparent border border-[#d0c5af] hover:border-[#735c00] py-3 px-6 text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer text-[#4d4635] font-inherit rounded-xl transition-colors duration-200">
                  Cancel
                </button>
                <button type="submit" disabled={editBusy}
                  className={`border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl transition-colors duration-200 font-inherit text-white ${
                    editBusy ? "bg-[#4a3d00] cursor-not-allowed opacity-70" : "bg-[#1a1a1a] hover:bg-[#735c00] cursor-pointer"
                  }`}>
                  {editBusy ? "Updating…" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        busy={!!deletingId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
