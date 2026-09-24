"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, apiFetchCached, invalidateApiCache } from "@/lib/api";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/PaginationBar";
import { useToast } from "@/components/ToastProvider";
import { useNetwork } from "@/components/NetworkProvider";
import { ApiError, isAbortError, isNetworkError } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { PaginatedResponse } from "@/lib/types/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductFilters } from "./ProductFilters";
import { ProductFormDialogs } from "./ProductFormDialogs";
import { ProductTable } from "./ProductTable";
import { ProductTile } from "./ProductTile";
import {
  emptyForm,
  VIEW_MODE_KEY,
  type Category,
  type Product,
  type ProductForm,
  type SkinType,
  type SortMode,
  type StockFilter,
  type ViewMode,
} from "./types";
import { uploadImage } from "./upload";

function ProductsPageContent() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm());
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
  const editFromQueryHandled = useRef(false);

  const pageSize = 12;
  const search = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === "table" || saved === "tiles") setTimeout(() => setViewMode(saved), 0);
    } catch {
      // ignore
    }
  }, []);

  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

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
    return () => {
      cancelled = true;
    };
  }, [reconnectKey, clearNetworkError, reportNetworkError]);

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
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

      try {
        const data = await apiFetch<PaginatedResponse<Product>>(`/products?${params.toString()}`, {
          toastOnError: false,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setProducts(data.items);
        setTotal(data.total);
        clearNetworkError();
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load products.");
      } finally {
        if (!controller.signal.aborted) setListLoading(false);
      }
    };
    void loadData();

    return () => {
      controller.abort();
    };
  }, [
    page,
    pageSize,
    search,
    filterCategory,
    filterSkinType,
    filterStock,
    sortMode,
    refreshKey,
    reconnectKey,
    clearNetworkError,
    reportNetworkError,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setTimeout(() => setPage(totalPages), 0);
    }
  }, [page, totalPages]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );
  const skinTypeOptions = useMemo(
    () => [
      { value: "", label: "All Skin Types" },
      ...skinTypes.map((s) => ({ value: s.id, label: s.name })),
    ],
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

  const filtersActive =
    !!search.trim() || !!filterCategory || !!filterSkinType || filterStock !== "all";
  const initialLoading = (refsLoading || listLoading) && products.length === 0 && total === 0;

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilterCategory("");
    setFilterSkinType("");
    setFilterStock("all");
    setPage(1);
  }, []);

  const openModal = useCallback(() => {
    setForm({
      ...emptyForm(),
      categoryId: categories[0]?.id ?? "",
    });
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFormError(null);
    setModalOpen(true);
  }, [categories]);

  const closeCreate = useCallback(() => {
    setModalOpen(false);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !imageFile) {
      setFormError("Name and image are required.");
      return;
    }

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

    setBusy(true);
    setFormError(null);
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
      invalidateApiCache("/products");
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
    } finally {
      setBusy(false);
    }
  };

  const openRestock = useCallback((prod: Product) => {
    setRestockTarget(prod);
    setRestockQty("10");
    setRestockError(null);
  }, []);

  const handleRestock = async (e: React.FormEvent) => {
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
      invalidateApiCache("/products");
      invalidateApiCache("/dashboard-summary");
      toast.success("Stock updated", `Added ${qty} units to ${restockTarget.name}.`);
      setRestockTarget(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      setRestockError(err instanceof Error ? err.message : "Failed to restock.");
      toast.error(err);
    } finally {
      setRestockBusy(false);
    }
  };

  const openEdit = useCallback(
    (prod: Product) => {
      const skinIds = prod.skinTypes?.length
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
      setEditImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setEditError(null);
    },
    [categories],
  );

  const closeEdit = useCallback(() => {
    setEditTarget(null);
    setEditImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setEditImageFile(null);
  }, []);

  const handleEditImageSelect = useCallback((file: File) => {
    setEditImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setEditImageFile(file);
  }, []);

  const handleEdit = async (e: React.FormEvent) => {
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
        const up = await uploadImage(editImageFile);
        imageUrl = up.url;
        assetId = up.assetId;
      }
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
      invalidateApiCache("/products");
      closeEdit();
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setActionError(null);
    try {
      await apiFetch(`/products/${deleteTarget.id}`, { method: "DELETE" });
      invalidateApiCache("/dashboard-summary");
      invalidateApiCache("/products");
      setDeleteTarget(null);
      if (products.length === 1 && page > 1) setPage((prev) => prev - 1);
      else setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  const editId = searchParams.get("edit");

  useEffect(() => {
    if (editFromQueryHandled.current || !editId || refsLoading) return;

    let cancelled = false;

    (async () => {
      const fromList = products.find((p) => p.id === editId);
      if (fromList) {
        editFromQueryHandled.current = true;
        openEdit(fromList);
        router.replace("/admin/products");
        return;
      }

      if (listLoading) return;

      try {
        const product = await apiFetch<Product>(`/products/${editId}`, {
          toastOnError: false,
        });
        if (cancelled) return;
        editFromQueryHandled.current = true;
        openEdit(product);
        router.replace("/admin/products");
      } catch {
        if (cancelled) return;
        editFromQueryHandled.current = true;
        router.replace("/admin/products");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editId, refsLoading, listLoading, products, openEdit, router]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setPage(1);
  }, []);

  const handleFilterCategoryChange = useCallback((value: string) => {
    setFilterCategory(value);
    setPage(1);
  }, []);

  const handleFilterSkinTypeChange = useCallback((value: string) => {
    setFilterSkinType(value);
    setPage(1);
  }, []);

  const handleFilterStockChange = useCallback((value: StockFilter) => {
    setFilterStock(value);
    setPage(1);
  }, []);

  const handleSortModeChange = useCallback((value: SortMode) => {
    setSortMode(value);
    setPage(1);
  }, []);

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your product catalogue.</p>
        </div>
        <Button onClick={openModal} size="sm">
          <Plus className="size-4" /> Create Product
        </Button>
      </div>

      {!initialLoading && (products.length > 0 || filtersActive) && (
        <ProductFilters
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          filterCategory={filterCategory}
          onFilterCategoryChange={handleFilterCategoryChange}
          filterSkinType={filterSkinType}
          onFilterSkinTypeChange={handleFilterSkinTypeChange}
          filterStock={filterStock}
          onFilterStockChange={handleFilterStockChange}
          sortMode={sortMode}
          onSortModeChange={handleSortModeChange}
          viewMode={viewMode}
          onViewModeChange={changeViewMode}
          categoryOptions={categoryOptions}
          skinTypeOptions={skinTypeOptions}
          stockOptions={stockOptions}
          sortOptions={sortOptions}
        />
      )}

      {initialLoading && (
        <>
          {viewMode === "tiles" ? (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4"
              aria-busy="true"
            >
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
              <div
                className="hidden md:block border border-border rounded-lg overflow-hidden"
                aria-busy="true"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-20" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-12" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-12" />
                      </TableHead>
                      <TableHead className="w-48">
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="size-10 rounded-md" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-24" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex md:hidden flex-col gap-2" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 bg-card border border-border rounded-lg"
                  >
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
      {fetchError && (
        <p className="text-sm text-destructive" role="alert">
          {fetchError}
        </p>
      )}
      {actionError && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {!initialLoading && !fetchError && total === 0 && !filtersActive && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No products yet.</p>
          <Button variant="link" onClick={openModal}>
            Create your first product
          </Button>
        </div>
      )}

      {!initialLoading && !fetchError && total === 0 && filtersActive && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No products match your filters.</p>
          {filtersActive && (
            <Button variant="link" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {!initialLoading && !fetchError && products.length > 0 && (
        <>
          {viewMode === "tiles" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {products.map((prod, index) => (
                <ProductTile
                  key={prod.id}
                  prod={prod}
                  deletingId={deletingId}
                  priority={index < 4}
                  onRestock={openRestock}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          ) : (
            <ProductTable
              products={products}
              deletingId={deletingId}
              onRestock={openRestock}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          )}

          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            itemCount={products.length}
            loading={listLoading}
            itemLabel="products"
            onPageChange={setPage}
          />
        </>
      )}

      <ProductFormDialogs
        skinTypes={skinTypes}
        formCategoryOptions={formCategoryOptions}
        modalOpen={modalOpen}
        onCloseCreate={closeCreate}
        form={form}
        setForm={setForm}
        imagePreview={imagePreview}
        onCreateImageSelect={handleImageSelect}
        formError={formError}
        busy={busy}
        onCreate={handleCreate}
        editTarget={editTarget}
        onCloseEdit={closeEdit}
        editForm={editForm}
        setEditForm={setEditForm}
        editImagePreview={editImagePreview}
        onEditImageSelect={handleEditImageSelect}
        editError={editError}
        editBusy={editBusy}
        onEdit={handleEdit}
        restockTarget={restockTarget}
        onCloseRestock={() => setRestockTarget(null)}
        restockQty={restockQty}
        onRestockQtyChange={setRestockQty}
        restockError={restockError}
        restockBusy={restockBusy}
        onRestock={handleRestock}
        deleteTarget={deleteTarget}
        deletingId={deletingId}
        onConfirmDelete={confirmDelete}
        onCancelDelete={() => setDeleteTarget(null)}
      />
    </>
  );
}

function ProductsPageFallback() {
  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
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
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageFallback />}>
      <ProductsPageContent />
    </Suspense>
  );
}
