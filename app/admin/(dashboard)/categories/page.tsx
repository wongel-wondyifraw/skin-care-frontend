"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import ConfirmModal from "../../../../components/ConfirmModal";

interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiFetch<Category[]>("/categories");
      setCategories(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(cat: Category) {
    setDeleteTarget(cat);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiFetch(`/categories/${deleteTarget.id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteTarget(null);
      alert(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-[22px] font-medium text-[#1a1c1c] mb-1">
            Categories
          </h2>
          <p className="text-sm text-[#7f7663]">
            Manage your product categories.
          </p>
        </div>
        <button
          onClick={openModal}
          className="bg-[#1a1a1a] text-white border-none py-3 px-6 text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer flex items-center gap-2 transition-colors duration-200 font-inherit rounded-xl hover:bg-[#735c00]"
        >
          {/* Plus icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="w-3.5 h-3.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Category
        </button>
      </div>

      {/* ── List ── */}
      {loading && <p className="text-sm text-[#7f7663]">Loading…</p>}
      {fetchError && <p className="text-[13px] text-[#ba1a1a]" role="alert">{fetchError}</p>}
      {!loading && !fetchError && categories.length === 0 && (
        <div className="py-12 px-6 text-center border border-dashed border-[#d0c5af] text-[#7f7663] rounded-2xl">
          <p className="text-[15px] mb-3">No categories yet.</p>
          <button
            onClick={openModal}
            className="bg-transparent border-none text-[#735c00] text-[13px] font-semibold cursor-pointer underline font-inherit"
          >
            Create your first category
          </button>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_2fr_auto] gap-4 py-2 px-4 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#7f7663] border-b border-[#d0c5af]">
            <span>Name</span>
            <span>Description</span>
            <span></span>
          </div>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="grid grid-cols-[1fr_2fr_auto] gap-4 items-center py-3.5 px-4 bg-white border border-[#e8e8e8] hover:border-[#d0c5af] transition-colors duration-200 rounded-2xl"
            >
              <span className="text-[15px] font-medium text-[#1a1c1c]">
                {cat.name}
              </span>
              <span className="text-sm text-[#7f7663]">
                {cat.description ?? <em className="opacity-50">No description</em>}
              </span>
              <button
                onClick={() => handleDelete(cat)}
                disabled={deletingId === cat.id}
                aria-label={`Delete ${cat.name}`}
                className={`bg-transparent border-none p-1 transition-opacity duration-200 ${
                  deletingId === cat.id ? "cursor-not-allowed text-[#d0c5af] opacity-40" : "cursor-pointer text-[#ba1a1a] opacity-100"
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
        >
          {/* Backdrop */}
          <div
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-black/35"
          />

          {/* Modal card */}
          <div className="relative bg-white p-10 w-full max-w-[460px] shadow-[0_16px_40px_rgba(0,0,0,0.12)] rounded-[20px]">
            {/* Close */}
            <button
              onClick={() => setModalOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-[#7f7663] p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3
              id="modal-title"
              className="text-xl font-medium text-[#1a1c1c] mb-7"
            >
              Create Category
            </h3>

            <form onSubmit={handleCreate} className="flex flex-col gap-6">
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1" htmlFor="cat-name">Name</label>
                <input
                  id="cat-name"
                  type="text"
                  placeholder="e.g. Moisturisers"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                  className="border border-[#d0c5af] rounded-xl px-3 py-2.5 bg-transparent w-full text-[15px] leading-[22px] text-[#1a1c1c] outline-none font-inherit transition-colors duration-250 focus:border-[#735c00]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7f7663] mb-1" htmlFor="cat-desc">
                  Description{" "}
                  <span className="font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  id="cat-desc"
                  placeholder="Brief description of this category"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="resize-y border border-[#d0c5af] rounded-xl p-2.5 bg-transparent w-full text-[15px] leading-[22px] text-[#1a1c1c] outline-none font-inherit transition-colors duration-250 focus:border-[#735c00]"
                />
              </div>

              {formError && (
                <p className="text-[13px] text-[#ba1a1a]" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-transparent border border-[#d0c5af] hover:border-[#735c00] py-3 px-6 text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer text-[#4d4635] font-inherit rounded-xl transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={`border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl transition-colors duration-200 font-inherit text-white ${
                    busy ? "bg-[#4a3d00] cursor-not-allowed opacity-70" : "bg-[#1a1a1a] hover:bg-[#735c00] cursor-pointer"
                  }`}
                >
                  {busy ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Delete Confirmation Modal ── */}
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

