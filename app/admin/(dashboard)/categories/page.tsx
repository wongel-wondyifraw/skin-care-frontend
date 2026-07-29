"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import ConfirmModal from "../../../../components/ConfirmModal";
import Modal from "../../../../components/Modal";

interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

const fieldClass =
  "border border-outline-variant rounded-xl px-3 py-2.5 bg-transparent w-full text-[15px] leading-[22px] text-on-background outline-none font-inherit transition-colors focus:border-primary";
const labelClass =
  "block text-[11px] font-semibold tracking-[0.12em] uppercase text-outline mb-1";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<Category[]>("/categories");
        if (!cancelled) setCategories(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load categories.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openModal() {
    setForm({ name: "", description: "" });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setFormError(null);
    try {
      const created = await apiFetch<Category>("/categories", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }),
      });
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setEditForm({ name: cat.name, description: cat.description ?? "" });
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.name.trim()) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const updated = await apiFetch<Category>(`/categories/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
        }),
      });
      setCategories((prev) =>
        prev
          .map((c) => (c.id === updated.id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditTarget(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update category.");
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setActionError(null);
    try {
      await apiFetch(`/categories/${deleteTarget.id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-[22px] font-medium text-on-background mb-1">Categories</h2>
          <p className="text-sm text-outline">Manage your product categories.</p>
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
          Create Category
        </button>
      </div>

      {loading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white border border-[#e8e8e8] rounded-2xl animate-pulse" />
          ))}
        </div>
      )}
      {fetchError && <p className="text-[13px] text-error" role="alert">{fetchError}</p>}
      {actionError && <p className="mb-4 text-[13px] text-error" role="alert">{actionError}</p>}

      {!loading && !fetchError && categories.length === 0 && (
        <div className="py-12 px-6 text-center border border-dashed border-outline-variant text-outline rounded-2xl">
          <p className="text-[15px] mb-3">No categories yet.</p>
          <button
            type="button"
            onClick={openModal}
            className="bg-transparent border-none text-primary text-[13px] font-semibold cursor-pointer underline font-inherit"
          >
            Create your first category
          </button>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="hidden sm:grid grid-cols-[1fr_2fr_auto] gap-4 py-2 px-4 text-[11px] font-semibold tracking-[0.1em] uppercase text-outline border-b border-outline-variant">
            <span>Name</span>
            <span>Description</span>
            <span className="sr-only">Actions</span>
          </div>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-col sm:grid sm:grid-cols-[1fr_2fr_auto] gap-2 sm:gap-4 sm:items-center py-3.5 px-4 bg-white border border-[#e8e8e8] hover:border-outline-variant transition-colors rounded-2xl"
            >
              <span className="text-[15px] font-medium text-on-background">{cat.name}</span>
              <span className="text-sm text-outline">
                {cat.description ?? <em className="opacity-50">No description</em>}
              </span>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => openEdit(cat)}
                  aria-label={`Edit ${cat.name}`}
                  className="bg-transparent border-none p-1 cursor-pointer text-primary hover:text-[#574500]"
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
                  onClick={() => setDeleteTarget(cat)}
                  disabled={deletingId === cat.id}
                  aria-label={`Delete ${cat.name}`}
                  className={`bg-transparent border-none p-1 transition-opacity ${
                    deletingId === cat.id
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
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Category" maxWidth="max-w-[460px]">
        <form onSubmit={handleCreate} className="flex flex-col gap-6">
          <div>
            <label className={labelClass} htmlFor="cat-name">Name</label>
            <input
              id="cat-name"
              type="text"
              placeholder="e.g. Moisturisers"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              data-autofocus
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="cat-desc">
              Description <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              id="cat-desc"
              placeholder="Brief description of this category"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className={`resize-y ${fieldClass}`}
            />
          </div>
          {formError && <p className="text-[13px] text-error" role="alert">{formError}</p>}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="bg-transparent border border-outline-variant hover:border-primary py-3 px-6 text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer text-[#4d4635] font-inherit rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl font-inherit text-white ${
                busy ? "bg-[#4a3d00] cursor-not-allowed opacity-70" : "bg-[#1a1a1a] hover:bg-primary cursor-pointer"
              }`}
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Category" maxWidth="max-w-[460px]">
        <form onSubmit={handleEdit} className="flex flex-col gap-6">
          <div>
            <label className={labelClass} htmlFor="edit-cat-name">Name</label>
            <input
              id="edit-cat-name"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
              data-autofocus
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-cat-desc">
              Description <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              id="edit-cat-desc"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className={`resize-y ${fieldClass}`}
            />
          </div>
          {editError && <p className="text-[13px] text-error" role="alert">{editError}</p>}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="bg-transparent border border-outline-variant hover:border-primary py-3 px-6 text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer text-[#4d4635] font-inherit rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editBusy}
              className={`border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl font-inherit text-white ${
                editBusy ? "bg-[#4a3d00] cursor-not-allowed opacity-70" : "bg-[#1a1a1a] hover:bg-primary cursor-pointer"
              }`}
            >
              {editBusy ? "Updating…" : "Update"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Category"
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
