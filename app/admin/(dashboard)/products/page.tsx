"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE_URL } from "../../../../lib/api";
import ConfirmModal from "../../../../components/ConfirmModal";
import Modal from "../../../../components/Modal";
import Image from "next/image";
import { AdminTable } from "../../../../components/AdminTable";

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
  price: number;
  createdAt: string;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

type ProductForm = {
  name: string;
  description: string;
  categoryId: string;
  skinTypeId: string;
  stock: string;
  price: string;
};

const emptyForm = (): ProductForm => ({
  name: "",
  description: "",
  categoryId: "",
  skinTypeId: "",
  stock: "0",
  price: "",
});

const fieldClass =
  "border border-outline-variant rounded-xl py-2.5 px-3 bg-transparent w-full text-[15px] leading-[22px] text-on-background outline-none font-inherit transition-colors duration-200 focus:border-primary";
const labelClass =
  "block text-[11px] font-semibold tracking-[0.12em] uppercase text-outline mb-1";
const selectClass =
  "border border-outline-variant rounded-xl py-2 px-3 text-sm bg-white text-on-background outline-none font-inherit focus:border-primary transition-colors duration-200";

async function uploadImage(file: File): Promise<{ url: string; assetId: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const uploadRes = await fetch(`${API_BASE_URL}/upload/image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!uploadRes.ok) throw new Error("Image upload failed");
  return uploadRes.json();
}

function stockBadge(stock: number) {
  if (stock === 0) {
    return (
      <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-error">
        Out of Stock
      </span>
    );
  }
  if (stock < 10) {
    return (
      <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#fff8e7] text-primary">
        {stock} — Low
      </span>
    );
  }
  return (
    <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#fff8e7] text-[#4d4635]">
      {stock} in stock
    </span>
  );
}

function ProductFormFields({
  idPrefix,
  form,
  setForm,
  categories,
  skinTypes,
  imagePreview,
  currentImage,
  currentName,
  onImageSelect,
  requireImage,
}: {
  idPrefix: string;
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  categories: Category[];
  skinTypes: SkinType[];
  imagePreview: string | null;
  currentImage?: string;
  currentName?: string;
  onImageSelect: (file: File) => void;
  requireImage?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-name`}>Name</label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          placeholder="e.g. Cleansing Oil"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          data-autofocus
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-desc`}>
          Description <span className="font-normal normal-case">(optional)</span>
        </label>
        <textarea
          id={`${idPrefix}-desc`}
          placeholder="Brief description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className={`resize-y ${fieldClass}`}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-category`}>Category</label>
        <select
          id={`${idPrefix}-category`}
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          className={fieldClass}
        >
          <option value="">— Select category —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-skin`}>Skin Type</label>
        <select
          id={`${idPrefix}-skin`}
          value={form.skinTypeId}
          onChange={(e) => setForm((f) => ({ ...f, skinTypeId: e.target.value }))}
          className={fieldClass}
        >
          <option value="">— Select skin type —</option>
          {skinTypes.map((skin) => (
            <option key={skin.id} value={skin.id}>{skin.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-stock`}>Stock Level</label>
          <input
            id={`${idPrefix}-stock`}
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-price`}>Price (ETB)</label>
          <input
            id={`${idPrefix}-price`}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-image`}>
          {requireImage ? "Image" : "Replace Image"}{" "}
          {!requireImage && <span className="font-normal normal-case">(optional)</span>}
        </label>
        <div className="flex items-center gap-4 mt-1 flex-wrap">
          {(imagePreview || currentImage) && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-outline-variant bg-[#f3f3f3] shrink-0">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : currentImage ? (
                <Image src={currentImage} alt={currentName || "Product"} fill className="object-cover" sizes="64px" />
              ) : null}
            </div>
          )}
          <input
            id={`${idPrefix}-image`}
            type="file"
            accept="image/*"
            required={requireImage}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageSelect(file);
            }}
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function ProductActions({
  prod,
  deletingId,
  onEdit,
  onDelete,
}: {
  prod: Product;
  deletingId: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${prod.name}`}
        className="bg-transparent border-none p-1.5 cursor-pointer text-primary hover:text-[#574500] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="w-[17px] h-[17px]" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deletingId === prod.id}
        aria-label={`Delete ${prod.name}`}
        className={`bg-transparent border-none p-1.5 transition-opacity ${
          deletingId === prod.id
            ? "cursor-not-allowed text-outline-variant opacity-40"
            : "cursor-pointer text-error"
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
        const [prodData, catData, skinData] = await Promise.all([
          apiFetch<Product[]>("/products"),
          apiFetch<Category[]>("/categories"),
          apiFetch<SkinType[]>("/skin-types"),
        ]);
        if (cancelled) return;
        setProducts(prodData);
        setCategories(catData);
        setSkinTypes(skinData);
      } catch (err: unknown) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load data.");
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
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filterCategory) list = list.filter((p) => p.categoryId === filterCategory);
    if (filterSkinType) list = list.filter((p) => p.skinTypeId === filterSkinType);
    if (filterStock === "out_of_stock") list = list.filter((p) => p.stock === 0);
    else if (filterStock === "low_stock") list = list.filter((p) => p.stock > 0 && p.stock < 10);
    else if (filterStock === "in_stock") list = list.filter((p) => p.stock > 0);
    return list;
  }, [products, search, filterCategory, filterSkinType, filterStock]);

  const filtersActive =
    !!search.trim() || !!filterCategory || !!filterSkinType || filterStock !== "all";

  function clearFilters() {
    setSearch("");
    setFilterCategory("");
    setFilterSkinType("");
    setFilterStock("all");
  }

  function openModal() {
    setForm(emptyForm());
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setFormError(null);
    setModalOpen(true);
  }

  function closeCreate() {
    setModalOpen(false);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
  }

  function handleImageSelect(file: File) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
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
      const uploadData = await uploadImage(imageFile);
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
          price: parseFloat(form.price) || 0,
        }),
      });
      setProducts((prev) => [created, ...prev]);
      closeCreate();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(prod: Product) {
    setEditTarget(prod);
    setEditForm({
      name: prod.name,
      description: prod.description ?? "",
      stock: String(prod.stock),
      price: String(prod.price ?? ""),
      categoryId: prod.categoryId || "",
      skinTypeId: prod.skinTypeId || "",
    });
    setEditImageFile(null);
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(null);
    setEditError(null);
  }

  function closeEdit() {
    setEditTarget(null);
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(null);
    setEditImageFile(null);
  }

  function handleEditImageSelect(file: File) {
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.name.trim()) {
      setEditError("Name is required.");
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      let imageUrl = editTarget.image;
      let assetId = editTarget.assetId;
      if (editImageFile) {
        const uploadData = await uploadImage(editImageFile);
        imageUrl = uploadData.url;
        assetId = uploadData.assetId;
      }

      const updated = await apiFetch<Product>(`/products/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
          image: imageUrl,
          assetId,
          stock: parseInt(editForm.stock, 10) || 0,
          price: parseFloat(editForm.price) || 0,
          categoryId: editForm.categoryId || undefined,
          skinTypeId: editForm.skinTypeId || undefined,
        }),
      });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      closeEdit();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setActionError(null);
    try {
      await apiFetch(`/products/${deleteTarget.id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  }

  const modalActions = (onCancel: () => void, busyState: boolean, submitLabel: string) => (
    <div className="flex gap-3 justify-end mt-6">
      <button
        type="button"
        onClick={onCancel}
        className="bg-transparent border border-outline-variant hover:border-primary py-3 px-6 text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer text-[#4d4635] font-inherit rounded-xl transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={busyState}
        className={`border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl transition-colors font-inherit text-white ${
          busyState
            ? "bg-[#4a3d00] cursor-not-allowed opacity-70"
            : "bg-[#1a1a1a] hover:bg-primary cursor-pointer"
        }`}
      >
        {busyState ? "Saving…" : submitLabel}
      </button>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-[22px] font-medium text-on-background mb-1">Products</h2>
          <p className="text-sm text-outline">Manage your product catalogue.</p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="bg-[#1a1a1a] text-white border-none py-3 px-6 text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer flex items-center gap-2 transition-colors font-inherit rounded-xl hover:bg-primary"
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
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-outline-variant rounded-full py-2 pl-9 pr-3 text-sm bg-white text-on-background outline-none font-inherit w-full focus:border-primary transition-colors"
            />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select value={filterSkinType} onChange={(e) => setFilterSkinType(e.target.value)} className={selectClass}>
            <option value="">All Skin Types</option>
            {skinTypes.map((skin) => (
              <option key={skin.id} value={skin.id}>{skin.name}</option>
            ))}
          </select>
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value as StockFilter)}
            className={selectClass}
          >
            <option value="all">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (&lt; 10)</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading products">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[72px] bg-white border border-[#e8e8e8] rounded-[20px] animate-pulse" />
          ))}
        </div>
      )}

      {fetchError && (
        <p className="text-[13px] text-error" role="alert">{fetchError}</p>
      )}
      {actionError && (
        <p className="mb-4 text-[13px] text-error" role="alert">{actionError}</p>
      )}

      {!loading && !fetchError && products.length === 0 && (
        <div className="py-12 px-6 text-center border border-dashed border-outline-variant text-outline rounded-2xl">
          <p className="text-[15px] mb-3">No products yet.</p>
          <button
            type="button"
            onClick={openModal}
            className="bg-transparent border-none text-primary text-[13px] font-semibold cursor-pointer underline font-inherit"
          >
            Create your first product
          </button>
        </div>
      )}

      {!loading && products.length > 0 && filtered.length === 0 && (
        <div className="py-12 px-6 text-center border border-dashed border-outline-variant text-outline rounded-2xl">
          <p className="text-[15px] mb-3">No products match your filters.</p>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="bg-transparent border-none text-primary text-[13px] font-semibold cursor-pointer underline font-inherit"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <AdminTable
              columns={[
                {
                  key: "image",
                  header: "Image",
                  cellClassName: "w-[72px]",
                  render: (prod) => (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#f3f3f3]">
                      <Image src={prod.image} alt={prod.name} fill className="object-cover" sizes="56px" />
                    </div>
                  ),
                },
                {
                  key: "name",
                  header: "Name",
                  render: (prod) => (
                    <span className="text-[14px] font-medium text-on-background truncate">
                      {prod.name}
                    </span>
                  ),
                },
                {
                  key: "category",
                  header: "Category",
                  render: (prod) => (
                    <span className="text-[13px] text-outline truncate">
                      {prod.category?.name ?? <em className="opacity-50">Uncategorized</em>}
                    </span>
                  ),
                },
                {
                  key: "skinType",
                  header: "Skin Type",
                  render: (prod) => (
                    <span className="text-[13px] text-outline truncate">
                      {prod.skinType?.name ?? "All"}
                    </span>
                  ),
                },
                {
                  key: "price",
                  header: "Price",
                  render: (prod) => (
                    <span className="text-[13px] font-medium text-on-background truncate">
                      {prod.price != null ? `${Number(prod.price).toFixed(2)} ETB` : "—"}
                    </span>
                  ),
                },
                {
                  key: "stock",
                  header: "Stock",
                  render: (prod) => <div>{stockBadge(prod.stock)}</div>,
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (prod) => (
                    <ProductActions
                      prod={prod}
                      deletingId={deletingId}
                      onEdit={() => openEdit(prod)}
                      onDelete={() => setDeleteTarget(prod)}
                    />
                  ),
                },
              ]}
              rows={filtered}
              getRowKey={(p) => p.id}
            />
          </div>

          {/* Mobile cards */}
          <div className="flex lg:hidden flex-col gap-3">
            {filtered.map((prod) => (
              <div
                key={prod.id}
                className="flex gap-3 p-3 bg-white border border-[#e8e8e8] rounded-[20px]"
              >
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#f3f3f3] shrink-0">
                  <Image src={prod.image} alt={prod.name} fill className="object-cover" sizes="64px" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[15px] font-medium text-on-background">{prod.name}</span>
                    <ProductActions
                      prod={prod}
                      deletingId={deletingId}
                      onEdit={() => openEdit(prod)}
                      onDelete={() => setDeleteTarget(prod)}
                    />
                  </div>
                  <p className="text-[13px] text-outline mt-0.5 truncate">
                    {prod.category?.name ?? "Uncategorized"} · {prod.skinType?.name ?? "All"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-sm font-medium text-on-background">
                      {prod.price != null ? `${Number(prod.price).toFixed(2)} ETB` : "—"}
                    </span>
                    {stockBadge(prod.stock)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={closeCreate} title="Create Product">
        <form onSubmit={handleCreate}>
          <ProductFormFields
            idPrefix="create"
            form={form}
            setForm={setForm}
            categories={categories}
            skinTypes={skinTypes}
            imagePreview={imagePreview}
            onImageSelect={handleImageSelect}
            requireImage
          />
          {formError && (
            <p className="mt-4 text-[13px] text-error" role="alert">{formError}</p>
          )}
          {modalActions(closeCreate, busy, "Save")}
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={closeEdit} title="Edit Product">
        {editTarget && (
          <form onSubmit={handleEdit}>
            <ProductFormFields
              idPrefix="edit"
              form={editForm}
              setForm={setEditForm}
              categories={categories}
              skinTypes={skinTypes}
              imagePreview={editImagePreview}
              currentImage={editTarget.image}
              currentName={editTarget.name}
              onImageSelect={handleEditImageSelect}
            />
            {editError && (
              <p className="mt-4 text-[13px] text-error" role="alert">{editError}</p>
            )}
            {modalActions(closeEdit, editBusy, "Update")}
          </form>
        )}
      </Modal>

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
