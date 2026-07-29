"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiFetchCached, invalidateApiCache } from "@/lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ToastProvider";
import { useNetwork } from "@/components/NetworkProvider";
import { ApiError, isNetworkError } from "@/lib/errors";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import ConfirmModal from "@/components/ConfirmModal";

interface Category { id: string; name: string; description: string | null; createdAt: string }
interface SkinType { id: string; name: string; description: string | null }

/* ────────────────────────────────────────────────────────────── */
/*  Categories Tab                                                */
/* ────────────────────────────────────────────────────────────── */

function CategoriesTab() {
  const toast = useToast();
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();
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
    setLoading(true);
    (async () => {
      try {
        const data = await apiFetchCached<Category[]>("/categories", 5 * 60_000);
        if (!cancelled) {
          setCategories(data);
          clearNetworkError();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reconnectKey, clearNetworkError, reportNetworkError]);

  function openModal() { setForm({ name: "", description: "" }); setFormError(null); setModalOpen(true); }
  function openEdit(cat: Category) { setEditTarget(cat); setEditForm({ name: cat.name, description: cat.description ?? "" }); setEditError(null); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return;
    const duplicate = categories.find((c) => c.name.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (duplicate) {
      const msg = `A category named "${duplicate.name}" already exists. Edit it instead of creating a duplicate.`;
      setFormError(msg);
      toast.info("Category already exists", msg);
      return;
    }
    setBusy(true); setFormError(null);
    try {
      const created = await apiFetch<Category>("/categories", {
        method: "POST",
        toastOnError: false,
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined }),
      });
      invalidateApiCache("/categories");
      invalidateApiCache("/dashboard-summary");
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Category created");
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create.";
      setFormError(msg);
      toast.error(err);
      if (!(err instanceof ApiError && err.status === 409)) {
        // keep dialog open for other errors too
      }
    } finally { setBusy(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editTarget || !editForm.name.trim()) return; setEditBusy(true); setEditError(null);
    try {
      const updated = await apiFetch<Category>(`/categories/${editTarget.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() || undefined }) });
      invalidateApiCache("/categories");
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))); setEditTarget(null);
    } catch (err: unknown) { setEditError(err instanceof Error ? err.message : "Failed to update."); } finally { setEditBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return; setDeletingId(deleteTarget.id); setActionError(null);
    try { await apiFetch(`/categories/${deleteTarget.id}`, { method: "DELETE" }); invalidateApiCache("/categories"); invalidateApiCache("/dashboard-summary"); setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id)); setDeleteTarget(null); }
    catch (err: unknown) { setActionError(err instanceof Error ? err.message : "Failed to delete."); setDeleteTarget(null); } finally { setDeletingId(null); }
  }

  const textareaClass = "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[60px]";

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={openModal} size="sm"><Plus className="size-4" /> Add Category</Button>
      </div>

      {loading && (
        <>
          <div className="hidden sm:block border border-border rounded-lg overflow-hidden" aria-busy="true">
            <Table>
              <TableHeader><TableRow><TableHead><Skeleton className="h-4 w-16" /></TableHead><TableHead><Skeleton className="h-4 w-24" /></TableHead><TableHead className="w-20"><Skeleton className="h-4 w-14" /></TableHead></TableRow></TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="sm:hidden flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="space-y-2 flex-1"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-4/5" /></div>
                <Skeleton className="h-6 w-14 shrink-0" />
              </div>
            ))}
          </div>
        </>
      )}
      {fetchError && <p className="text-sm text-destructive" role="alert">{fetchError}</p>}
      {actionError && <p className="mb-3 text-sm text-destructive" role="alert">{actionError}</p>}

      {!loading && !fetchError && categories.length === 0 && (
        <div className="py-10 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No categories yet.</p>
          <Button variant="link" onClick={openModal}>Create your first category</Button>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <>
          <div className="hidden sm:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.description ?? <em className="opacity-50">—</em>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(cat)} aria-label={`Edit ${cat.name}`}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(cat)} disabled={deletingId === cat.id} aria-label={`Delete ${cat.name}`} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
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
                <div className="min-w-0"><p className="text-sm font-medium">{cat.name}</p><p className="text-xs text-muted-foreground break-words">{cat.description ?? <em className="opacity-50">No description</em>}</p></div>
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
            <div className="space-y-1.5"><Label htmlFor="cat-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="cat-desc" placeholder="Brief description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={textareaClass} /></div>
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
            <div className="space-y-1.5"><Label htmlFor="edit-cat-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="edit-cat-desc" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={textareaClass} /></div>
            {editError && <p className="text-sm text-destructive" role="alert">{editError}</p>}
            <DialogFooter className="gap-2 sm:gap-2"><Button variant="outline" type="button" onClick={() => setEditTarget(null)}>Cancel</Button><Button type="submit" disabled={editBusy}>{editBusy ? "Updating…" : "Update"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!deleteTarget} title="Delete Category" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" variant="danger" busy={!!deletingId} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Skin Types Tab                                                */
/* ────────────────────────────────────────────────────────────── */

function SkinTypesTab() {
  const toast = useToast();
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();
  const [skins, setSkins] = useState<SkinType[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [addBusy, setAddBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<SkinType | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkinType | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await apiFetchCached<SkinType[]>("/skin-types", 5 * 60_000);
        if (!cancelled) {
          setSkins(data);
          clearNetworkError();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setFetchError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reconnectKey, clearNetworkError, reportNetworkError]);

  function openModal() { setForm({ name: "", description: "" }); setFormError(null); setModalOpen(true); }
  function openEdit(skin: SkinType) { setEditTarget(skin); setEditForm({ name: skin.name, description: skin.description ?? "" }); setEditError(null); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return;
    const duplicate = skins.find((s) => s.name.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (duplicate) {
      const msg = `A skin type named "${duplicate.name}" already exists. Edit it instead of creating a duplicate.`;
      setFormError(msg);
      toast.info("Skin type already exists", msg);
      return;
    }
    setAddBusy(true); setFormError(null);
    try {
      const created = await apiFetch<SkinType>("/skin-types", {
        method: "POST",
        toastOnError: false,
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined }),
      });
      invalidateApiCache("/skin-types");
      invalidateApiCache("/dashboard-summary");
      setSkins((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", description: "" });
      toast.success("Skin type added");
      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add.");
      toast.error(err);
    } finally { setAddBusy(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editTarget || !editForm.name.trim()) return; setEditBusy(true); setEditError(null);
    try {
      const updated = await apiFetch<SkinType>(`/skin-types/${editTarget.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() || undefined }) });
      invalidateApiCache("/skin-types");
      setSkins((prev) => prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))); setEditTarget(null);
    } catch (err: unknown) { setEditError(err instanceof Error ? err.message : "Failed to update."); } finally { setEditBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return; setDeletingId(deleteTarget.id); setActionError(null);
    try { await apiFetch(`/skin-types/${deleteTarget.id}`, { method: "DELETE" }); invalidateApiCache("/skin-types"); invalidateApiCache("/dashboard-summary"); setSkins((prev) => prev.filter((s) => s.id !== deleteTarget.id)); setDeleteTarget(null); }
    catch (err: unknown) { setActionError(err instanceof Error ? err.message : "Failed to delete."); setDeleteTarget(null); } finally { setDeletingId(null); }
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={openModal} size="sm"><Plus className="size-4" /> Add Skin Type</Button>
      </div>

      {loading && (
        <>
          <div className="hidden sm:block border border-border rounded-lg overflow-hidden" aria-busy="true">
            <Table>
              <TableHeader><TableRow><TableHead><Skeleton className="h-4 w-16" /></TableHead><TableHead><Skeleton className="h-4 w-24" /></TableHead><TableHead className="w-20"><Skeleton className="h-4 w-14" /></TableHead></TableRow></TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="sm:hidden flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="space-y-2 flex-1"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
                <Skeleton className="h-6 w-14 shrink-0" />
              </div>
            ))}
          </div>
        </>
      )}
      {fetchError && <p className="text-sm text-destructive" role="alert">{fetchError}</p>}
      {actionError && <p className="mb-3 text-sm text-destructive" role="alert">{actionError}</p>}

      {!loading && !fetchError && skins.length === 0 && (
        <div className="py-10 text-center border border-dashed border-border rounded-lg text-muted-foreground">
          <p className="mb-2">No skin types defined yet.</p>
          <Button variant="link" onClick={openModal}>Add your first skin type</Button>
        </div>
      )}

      {!loading && skins.length > 0 && (
        <>
          <div className="hidden sm:block border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {skins.map((skin) => (
                  <TableRow key={skin.id}>
                    <TableCell className="font-medium">{skin.name}</TableCell>
                    <TableCell className="text-muted-foreground">{skin.description ?? <em className="opacity-50">—</em>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(skin)} aria-label={`Edit ${skin.name}`}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(skin)} disabled={deletingId === skin.id} aria-label={`Delete ${skin.name}`} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="sm:hidden list-none p-0 m-0 flex flex-col gap-2">
            {skins.map((skin) => (
              <li key={skin.id} className="flex items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="min-w-0"><p className="text-sm font-medium">{skin.name}</p>{skin.description && <p className="text-xs text-muted-foreground">{skin.description}</p>}</div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon-xs" onClick={() => openEdit(skin)}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(skin)} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) setModalOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Skin Type</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="space-y-1.5"><Label htmlFor="skin-name">Name</Label><Input id="skin-name" placeholder="e.g. Oily, Dry, Combination" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus /></div>
            <div className="space-y-1.5"><Label htmlFor="skin-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="skin-desc" placeholder="Short description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}
            <DialogFooter className="gap-2 sm:gap-2"><Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" disabled={addBusy}>{addBusy ? "Adding…" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Skin Type</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="space-y-1.5"><Label htmlFor="edit-skin-name">Name</Label><Input id="edit-skin-name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus /></div>
            <div className="space-y-1.5"><Label htmlFor="edit-skin-desc">Description</Label><Input id="edit-skin-desc" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} /></div>
            {editError && <p className="text-sm text-destructive" role="alert">{editError}</p>}
            <DialogFooter className="gap-2 sm:gap-2"><Button variant="outline" type="button" onClick={() => setEditTarget(null)}>Cancel</Button><Button type="submit" disabled={editBusy}>{editBusy ? "Updating…" : "Update"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!deleteTarget} title="Delete Skin Type" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" variant="danger" busy={!!deletingId} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Main Page with Tabs                                           */
/* ────────────────────────────────────────────────────────────── */

export default function CategoriesAndSkinPage() {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-foreground">Categories & Skin</h2>
        <p className="text-sm text-muted-foreground">Manage product categories and skin type definitions.</p>
      </div>


      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="skin-types">Skin Types</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="skin-types">
          <SkinTypesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
