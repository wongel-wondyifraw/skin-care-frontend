"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import ConfirmModal from "@/components/ConfirmModal";

interface Category { id: string; name: string; description: string | null; createdAt: string }

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
      try { const data = await apiFetch<Category[]>("/categories"); if (!cancelled) setCategories(data); }
      catch (err: unknown) { if (!cancelled) setFetchError(err instanceof Error ? err.message : "Failed to load categories."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  function openModal() { setForm({ name: "", description: "" }); setFormError(null); setModalOpen(true); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return;
    setBusy(true); setFormError(null);
    try {
      const created = await apiFetch<Category>("/categories", { method: "POST", body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined }) });
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setModalOpen(false);
    } catch (err: unknown) { setFormError(err instanceof Error ? err.message : "Failed to create category."); }
    finally { setBusy(false); }
  }

  function openEdit(cat: Category) { setEditTarget(cat); setEditForm({ name: cat.name, description: cat.description ?? "" }); setEditError(null); }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editTarget || !editForm.name.trim()) return;
    setEditBusy(true); setEditError(null);
    try {
      const updated = await apiFetch<Category>(`/categories/${editTarget.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() || undefined }) });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditTarget(null);
    } catch (err: unknown) { setEditError(err instanceof Error ? err.message : "Failed to update category."); }
    finally { setEditBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return; setDeletingId(deleteTarget.id); setActionError(null);
    try { await apiFetch(`/categories/${deleteTarget.id}`, { method: "DELETE" }); setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id)); setDeleteTarget(null); }
    catch (err: unknown) { setActionError(err instanceof Error ? err.message : "Failed to delete."); setDeleteTarget(null); }
    finally { setDeletingId(null); }
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Categories</h2>
          <p className="text-sm text-muted-foreground">Manage your product categories.</p>
        </div>
        <Button onClick={openModal} size="sm"><Plus className="size-4" /> Create Category</Button>
      </div>

      {loading && <div className="space-y-2" aria-busy="true">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
      {fetchError && <p className="text-sm text-destructive" role="alert">{fetchError}</p>}
      {actionError && <p className="mb-3 text-sm text-destructive" role="alert">{actionError}</p>}

      {!loading && !fetchError && categories.length === 0 && (
        <div className="py-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No categories yet.</p>
          <Button variant="link" onClick={openModal}>Create your first category</Button>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <>
          <div className="hidden sm:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="w-20">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.description ?? <em className="opacity-50">—</em>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(cat)} aria-label={`Edit ${cat.name}`}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(cat)} disabled={deletingId === cat.id}
                          aria-label={`Delete ${cat.name}`} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="sm:hidden flex flex-col gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-start justify-between gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground break-words">{cat.description ?? <em className="opacity-50">No description</em>}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon-xs" onClick={() => openEdit(cat)}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(cat)} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) setModalOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="space-y-1.5"><Label htmlFor="cat-name">Name</Label><Input id="cat-name" placeholder="e.g. Moisturisers" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus /></div>
            <div className="space-y-1.5"><Label htmlFor="cat-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="cat-desc" placeholder="Brief description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[60px]" /></div>
            {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}
            <DialogFooter className="gap-2 sm:gap-2"><Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="space-y-1.5"><Label htmlFor="edit-cat-name">Name</Label><Input id="edit-cat-name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus /></div>
            <div className="space-y-1.5"><Label htmlFor="edit-cat-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="edit-cat-desc" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[60px]" /></div>
            {editError && <p className="text-sm text-destructive" role="alert">{editError}</p>}
            <DialogFooter className="gap-2 sm:gap-2"><Button variant="outline" type="button" onClick={() => setEditTarget(null)}>Cancel</Button><Button type="submit" disabled={editBusy}>{editBusy ? "Updating…" : "Update"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!deleteTarget} title="Delete Category" message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete" variant="danger" busy={!!deletingId} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}
