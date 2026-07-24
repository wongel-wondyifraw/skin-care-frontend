"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api";
import ConfirmModal from "../../../../../components/ConfirmModal";

interface SkinType {
  id: string;
  name: string;
  description: string | null;
}

const inputStyle: React.CSSProperties = {
  border: "none",
  borderBottom: "1px solid #1a1a1a",
  borderRadius: 0,
  padding: "10px 0",
  background: "transparent",
  width: "100%",
  fontSize: "15px",
  lineHeight: "22px",
  color: "#1a1c1c",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.25s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7f7663",
  marginBottom: "4px",
};

export default function SkinTypesPage() {
  const [skins, setSkins] = useState<SkinType[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", description: "" });
  const [addBusy, setAddBusy] = useState(false);
  const [addStatus, setAddStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkinType | null>(null);

  const loadSkins = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiFetch<SkinType[]>("/skin-types");
      setSkins(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load skin types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSkins(); }, [loadSkins]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setAddBusy(true);
    setAddStatus(null);
    try {
      const created = await apiFetch<SkinType>("/skin-types", {
        method: "POST",
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined }),
      });
      setSkins((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", description: "" });
      setAddStatus({ ok: true, msg: `"${created.name}" added.` });
    } catch (err: unknown) {
      setAddStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to add skin type." });
    } finally {
      setAddBusy(false);
    }
  }

  function handleDelete(skin: SkinType) {
    setDeleteTarget(skin);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiFetch(`/skin-types/${deleteTarget.id}`, { method: "DELETE" });
      setSkins((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteTarget(null);
      alert(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 500, color: "#1a1c1c", marginBottom: "4px" }}>
        Skin Types
      </h2>
      <p style={{ fontSize: "14px", color: "#7f7663", marginBottom: "36px" }}>
        Define the skin types available across your product catalogue.
      </p>

      {/* ── Add form ── */}
      <section style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4d4635", marginBottom: "20px", paddingBottom: "8px", borderBottom: "1px solid #d0c5af" }}>
          Add New Skin Type
        </h3>
        <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={labelStyle} htmlFor="skin-name">Name</label>
            <input
              id="skin-name"
              type="text"
              placeholder="e.g. Oily, Dry, Combination"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderBottomColor = "#735c00")}
              onBlur={(e) => (e.target.style.borderBottomColor = "#1a1a1a")}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="skin-description">Description <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
            <input
              id="skin-description"
              type="text"
              placeholder="Short description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderBottomColor = "#735c00")}
              onBlur={(e) => (e.target.style.borderBottomColor = "#1a1a1a")}
            />
          </div>
          {addStatus && (
            <p style={{ fontSize: "13px", color: addStatus.ok ? "#2e7d32" : "#ba1a1a" }} role="alert">
              {addStatus.msg}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={addBusy}
              style={{
                backgroundColor: "#1a1a1a",
                color: "#fff",
                border: "none",
                padding: "12px 28px",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: addBusy ? "not-allowed" : "pointer",
                opacity: addBusy ? 0.6 : 1,
                transition: "background-color 0.2s ease",
                fontFamily: "inherit",
                borderRadius: "10px",
              }}
              onMouseEnter={(e) => { if (!addBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#735c00"; }}
              onMouseLeave={(e) => { if (!addBusy) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a1a"; }}
            >
              {addBusy ? "Adding…" : "Add Skin Type"}
            </button>
          </div>
        </form>
      </section>

      {/* ── List ── */}
      <section>
        <h3 style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4d4635", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid #d0c5af" }}>
          Defined Skin Types
        </h3>

        {loading && (
          <p style={{ fontSize: "14px", color: "#7f7663" }}>Loading…</p>
        )}
        {fetchError && (
          <p style={{ fontSize: "13px", color: "#ba1a1a" }} role="alert">{fetchError}</p>
        )}
        {!loading && !fetchError && skins.length === 0 && (
          <p style={{ fontSize: "14px", color: "#7f7663" }}>No skin types defined yet.</p>
        )}

        {!loading && skins.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
            {skins.map((skin) => (
              <li
                key={skin.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e8e8e8",
                  gap: "16px",
                  borderRadius: "12px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: "15px", fontWeight: 500, color: "#1a1c1c", display: "block" }}>
                    {skin.name}
                  </span>
                  {skin.description && (
                    <span style={{ fontSize: "13px", color: "#7f7663" }}>{skin.description}</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(skin)}
                  disabled={deletingId === skin.id}
                  aria-label={`Delete ${skin.name}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: deletingId === skin.id ? "not-allowed" : "pointer",
                    color: deletingId === skin.id ? "#d0c5af" : "#ba1a1a",
                    padding: "4px",
                    flexShrink: 0,
                    transition: "opacity 0.2s",
                    opacity: deletingId === skin.id ? 0.5 : 1,
                  }}
                >
                  {/* Trash icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ width: "18px", height: "18px" }} aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
