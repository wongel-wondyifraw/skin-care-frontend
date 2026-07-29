"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import ConfirmModal from "@/components/ConfirmModal";

interface SkinType { id: string; name: string; description: string | null }

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
      try { const data = await apiFetch<SkinType[]>("/skin-types"); if (!cancelled) setSkins(data); }
      catch (err: unknown) { if (!cancelled) setFetchError(err instanceof Error ? err.message : "Failed to load."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return;
    setAddBusy(true); setAddStatus(null);
    try {
      const created = await apiFetch<SkinType>("/skin-types", { method: "POST", body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined }) });
      setSkins((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", description: "" }); setAddStatus({ ok: true, msg: `"${created.name}" added.` });
    } catch (err: unknown) { setAddStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed to add." }); }
    finally { setAddBusy(false); }
  }

  function openEdit(skin: SkinType) { setEditTarget(skin); setEditForm({ name: skin.name, description: skin.description ?? "" }); setEditError(null); }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editTarget || !editForm.name.trim()) return;
    setEditBusy(true); setEditError(null);
    try {
      const updated = await apiFetch<SkinType>(`/skin-types/${editTarget.id}`, { method: "PATCH", body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() || undefined }) });
      setSkins((prev) => prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))); setEditTarget(null);
    } catch (err: unknown) { setEditError(err instanceof Error ? err.message : "Failed to update."); }
    finally { setEditBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return; setDeletingId(deleteTarget.id); setActionError(null);
    try { await apiFetch(`/skin-types/${deleteTarget.id}`, { method: "DELETE" }); setSkins((prev) => prev.filter((s) => s.id !== deleteTarget.id)); setDeleteTarget(null); }
    catch (err: unknown) { setActionError(err instanceof Error ? err.message : "Failed to delete."); setDeleteTarget(null); }
    finally { setDeletingId(null); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Skin Types</h2>
        <p className="text-sm text-muted-foreground">Define skin types for your product catalogue.</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Add New Skin Type</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="skin-name">Name</Label>
              <Input id="skin-name" placeholder="e.g. Oily, Dry, Combination" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skin-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="skin-desc" placeholder="Short description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            {addStatus && <p className={`text-sm ${addStatus.ok ? "text-primary" : "text-destructive"}`} role="alert">{addStatus.msg}</p>}
            <Button type="submit" disabled={addBusy} size="sm" className="self-start">{addBusy ? "Adding…" : "Add Skin Type"}</Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Defined Skin Types</h3>

        {loading && <div className="space-y-2" aria-busy="true">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
        {fetchError && <p className="text-sm text-destructive" role="alert">{fetchError}</p>}
        {actionError && <p className="mb-3 text-sm text-destructive" role="alert">{actionError}</p>}

        {!loading && !fetchError && skins.length === 0 && (
          <div className="py-10 text-center border border-dashed border-border rounded-lg text-muted-foreground">
            <p>No skin types defined yet.</p>
            <p className="text-xs mt-1">Use the form above to add your first.</p>
          </div>
        )}

        {!loading && skins.length > 0 && (
          <>
            <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
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
                          <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(skin)} disabled={deletingId === skin.id}
                            aria-label={`Delete ${skin.name}`} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="lg:hidden list-none p-0 m-0 flex flex-col gap-2">
              {skins.map((skin) => (
                <li key={skin.id} className="flex items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{skin.name}</p>
                    {skin.description && <p className="text-xs text-muted-foreground">{skin.description}</p>}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon-xs" onClick={() => openEdit(skin)}><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(skin)} className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

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
    </div>
  );
}
