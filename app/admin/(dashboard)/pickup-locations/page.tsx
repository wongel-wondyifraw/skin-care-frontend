"use client";

import { useEffect, useState } from "react";
import { apiFetch, invalidateApiCache } from "@/lib/api";
import { Plus, Pencil, Trash2, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ToastProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmModal from "@/components/ConfirmModal";

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PickupLocationsPage() {
  const toast = useToast();
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    address: "",
    enabled: true,
  });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<PickupLocation | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    enabled: true,
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<PickupLocation | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function loadLocations() {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiFetch<PickupLocation[]>("/pickup-locations");
      setLocations(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  function openCreate() {
    setCreateForm({ name: "", address: "", enabled: true });
    setCreateError(null);
    setCreateOpen(true);
  }

  function openEdit(loc: PickupLocation) {
    setEditTarget(loc);
    setEditForm({ name: loc.name, address: loc.address, enabled: loc.enabled });
    setEditError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.address.trim()) {
      setCreateError("Name and address are required.");
      return;
    }

    setCreateBusy(true);
    setCreateError(null);
    try {
      const created = await apiFetch<PickupLocation>("/pickup-locations", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          address: createForm.address.trim(),
          enabled: createForm.enabled,
        }),
      });
      invalidateApiCache("/pickup-locations");
      setLocations((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Location created", `Added ${created.name}`);
      setCreateOpen(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create location");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.name.trim() || !editForm.address.trim()) {
      setEditError("Name and address are required.");
      return;
    }

    setEditBusy(true);
    setEditError(null);
    try {
      const updated = await apiFetch<PickupLocation>(
        `/pickup-locations/${editTarget.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: editForm.name.trim(),
            address: editForm.address.trim(),
            enabled: editForm.enabled,
          }),
        },
      );
      invalidateApiCache("/pickup-locations");
      setLocations((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l)),
      );
      toast.success("Location updated", `Updated ${updated.name}`);
      setEditTarget(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update location");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleToggleEnabled(loc: PickupLocation) {
    try {
      const updated = await apiFetch<PickupLocation>(
        `/pickup-locations/${loc.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: !loc.enabled }),
        },
      );
      invalidateApiCache("/pickup-locations");
      setLocations((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l)),
      );
      toast.success(
        updated.enabled ? "Location enabled" : "Location disabled",
        `${updated.name} is now ${updated.enabled ? "available" : "hidden"} in checkout.`,
      );
    } catch (err: unknown) {
      toast.error(
        "Failed to update",
        err instanceof Error ? err.message : "Please try again",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/pickup-locations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      invalidateApiCache("/pickup-locations");
      setLocations((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      toast.success("Location deleted", `Removed ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(
        "Failed to delete",
        err instanceof Error ? err.message : "Please try again",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <MapPin className="size-6 text-primary" />
            Pickup Locations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage physical store branches where customers can pick up orders for free.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          Add Location
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between">
          <span>{fetchError}</span>
          <Button variant="outline" size="sm" onClick={loadLocations}>
            Retry
          </Button>
        </div>
      )}

      {/* Locations Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <MapPin className="size-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-semibold text-foreground">
              No pickup locations yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add your branches or store locations so customers can pick up their orders in person.
            </p>
            <Button onClick={openCreate} size="sm" className="mt-2">
              Add First Location
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <MapPin className="size-4" />
                      </span>
                      <span>{loc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs">
                    {loc.address}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(loc)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        loc.enabled
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {loc.enabled ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3 text-muted-foreground" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(loc)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(loc)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pickup Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Location Name</Label>
              <Input
                id="loc-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="E.g., Medaf HQ — Bole"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc-address">Full Address / Directions</Label>
              <Input
                id="loc-address"
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm({ ...createForm, address: e.target.value })
                }
                placeholder="E.g., Bole Road, Near Edna Mall, Addis Ababa"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="loc-enabled"
                checked={createForm.enabled}
                onChange={(e) =>
                  setCreateForm({ ...createForm, enabled: e.target.checked })
                }
                className="rounded border-border text-primary focus:ring-primary size-4"
              />
              <Label htmlFor="loc-enabled" className="cursor-pointer text-xs">
                Enabled (visible for customer pickup in shop)
              </Label>
            </div>

            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBusy}>
                {createBusy ? "Saving…" : "Create Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={Boolean(editTarget)} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pickup Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Location Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-address">Full Address / Directions</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-enabled"
                checked={editForm.enabled}
                onChange={(e) =>
                  setEditForm({ ...editForm, enabled: e.target.checked })
                }
                className="rounded border-border text-primary focus:ring-primary size-4"
              />
              <Label htmlFor="edit-enabled" className="cursor-pointer text-xs">
                Enabled (visible for customer pickup in shop)
              </Label>
            </div>

            {editError && (
              <p className="text-xs text-destructive">{editError}</p>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editBusy}>
                {editBusy ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Pickup Location"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Customers will no longer be able to select this location for store pickup.`}
        confirmLabel={deleteBusy ? "Deleting…" : "Delete Location"}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
