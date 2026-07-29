"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import ConfirmModal from "../../../../../components/ConfirmModal";
import Modal from "../../../../../components/Modal";

interface SkinType {
  id: string;
  name: string;
  description: string | null;
}

const fieldClass =
  "border border-outline-variant rounded-xl px-3 py-2.5 bg-transparent w-full text-[15px] leading-[22px] text-on-background outline-none font-inherit transition-colors focus:border-primary";
const labelClass =
  "block text-[11px] font-semibold tracking-[0.12em] uppercase text-outline mb-1";
const primaryBtn =
  "bg-[#1a1a1a] text-white border-none py-3 px-7 text-xs font-semibold tracking-[0.12em] uppercase rounded-xl font-inherit hover:bg-primary transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

export default function SkinTypesPage() {
  const [skins, setSkins] = useState<SkinType[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", description: "" });
  const [addBusy, setAddBusy] = useState(false);
  const [addStatus, setAddStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [editTarget, setEditTarget] = useState<SkinType | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkinType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<SkinType[]>("/skin-types");
        if (!cancelled) setSkins(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load skin types.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setAddBusy(true);
    setAddStatus(null);
    try {
      const created = await apiFetch<SkinType>("/skin-types", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }),
      });
      setSkins((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setForm({ name: "", description: "" });
      setAddStatus({ ok: true, msg: `"${created.name}" added.` });
    } catch (err: unknown) {
      setAddStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed to add skin type.",
      });
    } finally {
      setAddBusy(false);
    }
  }

  function openEdit(skin: SkinType) {
    setEditTarget(skin);
    setEditForm({ name: skin.name, description: skin.description ?? "" });
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.name.trim()) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const updated = await apiFetch<SkinType>(`/skin-types/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
        }),
      });
      setSkins((prev) =>
        prev
          .map((s) => (s.id === updated.id ? updated : s))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditTarget(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update skin type.");
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setActionError(null);
    try {
      await apiFetch(`/skin-types/${deleteTarget.id}`, { method: "DELETE" });
      setSkins((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-[600px]">
      <h2 className="text-[22px] font-medium text-on-background mb-1">Skin Types</h2>
      <p className="text-sm text-outline mb-9">
        Define the skin types available across your product catalogue.
      </p>

      <section className="mb-10">
        <h3 className="text-[13px] font-semibold tracking-[0.1em] uppercase text-[#4d4635] mb-5 pb-2 border-b border-outline-variant">
          Add New Skin Type
        </h3>
        <form onSubmit={handleAdd} className="flex flex-col gap-5">
          <div>
            <label className={labelClass} htmlFor="skin-name">Name</label>
            <input
              id="skin-name"
              type="text"
              placeholder="e.g. Oily, Dry, Combination"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="skin-description">
              Description <span className="font-normal normal-case">(optional)</span>
            </label>
            <input
              id="skin-description"
              type="text"
              placeholder="Short description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={fieldClass}
            />
          </div>
          {addStatus && (
            <p
              className={`text-[13px] ${addStatus.ok ? "text-primary" : "text-error"}`}
              role="alert"
            >
              {addStatus.msg}
            </p>
          )}
          <div>
            <button type="submit" disabled={addBusy} className={primaryBtn}>
              {addBusy ? "Adding…" : "Add Skin Type"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold tracking-[0.1em] uppercase text-[#4d4635] mb-4 pb-2 border-b border-outline-variant">
          Defined Skin Types
        </h3>

        {loading && (
          <div className="flex flex-col gap-2" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-white border border-[#e8e8e8] rounded-xl animate-pulse" />
            ))}
          </div>
        )}
        {fetchError && <p className="text-[13px] text-error" role="alert">{fetchError}</p>}
        {actionError && <p className="mb-3 text-[13px] text-error" role="alert">{actionError}</p>}

        {!loading && !fetchError && skins.length === 0 && (
          <div className="py-10 px-5 text-center border border-dashed border-outline-variant text-outline rounded-2xl">
            <p className="text-[15px] mb-2">No skin types defined yet.</p>
            <p className="text-[13px]">Use the form above to add your first skin type.</p>
          </div>
        )}

        {!loading && skins.length > 0 && (
          <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
            {skins.map((skin) => (
              <li
                key={skin.id}
                className="flex items-center justify-between gap-4 py-3 px-4 bg-white border border-[#e8e8e8] rounded-xl"
              >
                <div className="min-w-0">
                  <span className="block text-[15px] font-medium text-on-background">
                    {skin.name}
                  </span>
                  {skin.description && (
                    <span className="text-[13px] text-outline">{skin.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(skin)}
                    aria-label={`Edit ${skin.name}`}
                    className="bg-transparent border-none p-1 cursor-pointer text-primary"
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
                    onClick={() => setDeleteTarget(skin)}
                    disabled={deletingId === skin.id}
                    aria-label={`Delete ${skin.name}`}
                    className={`bg-transparent border-none p-1 ${
                      deletingId === skin.id
                        ? "cursor-not-allowed text-outline-variant opacity-50"
                        : "cursor-pointer text-error"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      className="w-[18px] h-[18px]" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Skin Type" maxWidth="max-w-[460px]">
        <form onSubmit={handleEdit} className="flex flex-col gap-5">
          <div>
            <label className={labelClass} htmlFor="edit-skin-name">Name</label>
            <input
              id="edit-skin-name"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
              data-autofocus
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-skin-desc">
              Description <span className="font-normal normal-case">(optional)</span>
            </label>
            <input
              id="edit-skin-desc"
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              className={fieldClass}
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
            <button type="submit" disabled={editBusy} className={primaryBtn}>
              {editBusy ? "Updating…" : "Update"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Skin Type"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        busy={!!deletingId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
