"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  CheckCircle2,
  XCircle,
  Truck,
  Store,
} from "lucide-react";
import { apiFetch, invalidateApiCache } from "@/lib/api";
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
import {
  LocationSearch,
  type LocationSuggestion,
} from "@/components/location/LocationSearch";
import { LocationPinMap } from "@/components/location/LocationPinMap";
import { MyLocationButton } from "@/components/location/MyLocationButton";
import { shopReverseGeocode } from "@/lib/shop-api";
import { cn } from "@/lib/utils";

type Tab = "pickup" | "delivery";

interface PickupLocation {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

type DeliveryBand = { fromKm: number; toKm: number; fee: number };
type DeliveryRate = { bands: DeliveryBand[]; maxRadiusKm: number };
type DeliveryOrigin = {
  lat: number;
  lon: number;
  displayAddress: string;
  description?: string;
};

type PickupForm = {
  name: string;
  description: string;
  enabled: boolean;
};

const emptyPickupForm = (): PickupForm => ({
  name: "",
  description: "",
  enabled: true,
});

export default function FulfilmentPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("pickup");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Fulfilment</h1>
        <p className="text-sm text-muted-foreground">
          Text pickup locations and delivery pricing by distance bands.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border pb-px">
        <button
          type="button"
          onClick={() => setTab("pickup")}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "pickup"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Store className="size-4" /> Pickup locations
        </button>
        <button
          type="button"
          onClick={() => setTab("delivery")}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "delivery"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Truck className="size-4" /> Delivery pricing
        </button>
      </div>

      {tab === "pickup" ? <PickupTab toast={toast} /> : <DeliveryTab toast={toast} />}
    </div>
  );
}

function PickupTab({
  toast,
}: {
  toast: ReturnType<typeof useToast>;
}) {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PickupForm>(emptyPickupForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<PickupLocation | null>(null);
  const [editForm, setEditForm] = useState<PickupForm>(emptyPickupForm);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PickupLocation | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function loadLocations() {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiFetch<PickupLocation[]>("/pickup-locations");
      setLocations(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLocations();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.description.trim()) {
      setCreateError("Name and description are required.");
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const created = await apiFetch<PickupLocation>("/pickup-locations", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim(),
          enabled: createForm.enabled,
        }),
      });
      invalidateApiCache("/pickup-locations");
      setLocations((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast.success("Location created", `Added ${created.name}`);
      setCreateOpen(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.name.trim() || !editForm.description.trim()) {
      setEditError("Name and description are required.");
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
            description: editForm.description.trim(),
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
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditBusy(false);
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
      toast.success("Location deleted", deleteTarget.name);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(
        "Delete failed",
        err instanceof Error ? err.message : "Please try again",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setCreateForm(emptyPickupForm());
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="size-4" /> Add pickup
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : fetchError ? (
        <p className="text-sm text-destructive">{fetchError}</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[320px]">
                    <span className="line-clamp-2">
                      {loc.description?.trim() || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {loc.enabled ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="size-3" /> On
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="size-3" /> Off
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setEditTarget(loc);
                          setEditForm({
                            name: loc.name,
                            description: loc.description ?? "",
                            enabled: loc.enabled,
                          });
                          setEditError(null);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteTarget(loc)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!locations.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground text-sm py-8"
                  >
                    No pickup locations yet. Add one with a name and description.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PickupFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add pickup location"
        form={createForm}
        setForm={setCreateForm}
        error={createError}
        busy={createBusy}
        onSubmit={handleCreate}
      />

      <PickupFormDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="Edit pickup location"
        form={editForm}
        setForm={setEditForm}
        error={editError}
        busy={editBusy}
        onSubmit={handleEdit}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete pickup location?"
        message={
          deleteTarget
            ? `Remove “${deleteTarget.name}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function PickupFormDialog({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  error,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  form: PickupForm;
  setForm: React.Dispatch<React.SetStateAction<PickupForm>>;
  error: string | null;
  busy: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Medaf Branch — Bole"
            />
          </div>
          <div className="space-y-2">
            <Label>Description for customers</Label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="e.g. Bole Road near Edna Mall · Blue gate · Open 9am–6pm"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Address, landmarks, and how to find the store — text only, no map.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) =>
                setForm((p) => ({ ...p, enabled: e.target.checked }))
              }
            />
            Enabled for customers
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [origin, setOrigin] = useState<DeliveryOrigin>({
    lat: 0,
    lon: 0,
    displayAddress: "",
    description: "",
  });
  const [rate, setRate] = useState<DeliveryRate>({
    bands: [
      { fromKm: 0, toKm: 5, fee: 100 },
      { fromKm: 5, toKm: 15, fee: 200 },
      { fromKm: 15, toKm: 30, fee: 350 },
    ],
    maxRadiusKm: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<DeliveryOrigin>("/settings/delivery-origin").catch(() => null),
      apiFetch<DeliveryRate | Record<string, unknown>>(
        "/settings/delivery-rate",
      ).catch(() => null),
    ])
      .then(([originData, rateData]) => {
        if (originData?.lat) {
          setOrigin({
            ...originData,
            description: originData.description ?? "",
          });
        }
        if (rateData && Array.isArray((rateData as DeliveryRate).bands)) {
          setRate(rateData as DeliveryRate);
        } else if (rateData && typeof (rateData as { maxRadiusKm?: number }).maxRadiusKm === "number") {
          const legacy = rateData as {
            minFee?: number;
            maxRadiusKm: number;
          };
          setRate({
            bands: [
              {
                fromKm: 0,
                toKm: legacy.maxRadiusKm,
                fee: legacy.minFee ?? 350,
              },
            ],
            maxRadiusKm: legacy.maxRadiusKm,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function updateBand(index: number, patch: Partial<DeliveryBand>) {
    setRate((prev) => ({
      ...prev,
      bands: prev.bands.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const cleanedBands = rate.bands
        .map((b) => ({
          fromKm: Number(b.fromKm) || 0,
          toKm: Number(b.toKm) || 0,
          fee: Number(b.fee) || 0,
        }))
        .filter((b) => b.toKm > b.fromKm);
      if (!cleanedBands.length) {
        toast.error("Add at least one valid KM band");
        return;
      }
      const maxRadiusKm = Math.max(
        Number(rate.maxRadiusKm) || 0,
        ...cleanedBands.map((b) => b.toKm),
      );
      await apiFetch("/settings/delivery-origin", {
        method: "PUT",
        body: JSON.stringify(origin),
      });
      await apiFetch("/settings/delivery-rate", {
        method: "PUT",
        body: JSON.stringify({ bands: cleanedBands, maxRadiusKm }),
      });
      invalidateApiCache("/settings");
      setRate({ bands: cleanedBands, maxRadiusKm });
      toast.success("Delivery settings saved");
    } catch (err: unknown) {
      toast.error(
        "Save failed",
        err instanceof Error ? err.message : "Please try again",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-border p-4 bg-card">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="size-4 text-primary" /> Shop origin
        </h3>
        <p className="text-xs text-muted-foreground">
          Starting point for all distance-based delivery fees.
        </p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <LocationSearch
            placeholder="Search shop address…"
            defaultValue={origin.displayAddress}
            onSelect={(loc) => {
              setOrigin((prev) => ({
                ...prev,
                displayAddress: loc.display_name,
                lat: parseFloat(loc.lat),
                lon: parseFloat(loc.lon),
              }));
            }}
          />
          <MyLocationButton
            onLocated={({ lat, lon, displayName }) => {
              setOrigin((prev) => ({
                ...prev,
                lat,
                lon,
                displayAddress: displayName || prev.displayAddress,
              }));
            }}
            onError={(msg) => toast.error("Location", msg)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {origin.lat !== 0
            ? `${origin.displayAddress || "Pinned"} · ${origin.lat.toFixed(5)}, ${origin.lon.toFixed(5)}`
            : "Search, use My location, or click the map to set the shop origin."}
        </p>
        <LocationPinMap
          lat={origin.lat !== 0 ? origin.lat : null}
          lon={origin.lon !== 0 ? origin.lon : null}
          label="Shop origin"
          heightClass="h-[220px] md:h-[520px]"
          onPick={(lat, lon) => {
            setOrigin((prev) => ({
              ...prev,
              lat,
              lon,
            }));
            void shopReverseGeocode(lat, lon)
              .then((rev) => {
                if (rev?.displayName) {
                  setOrigin((prev) => ({
                    ...prev,
                    lat,
                    lon,
                    displayAddress: rev.displayName,
                  }));
                }
              })
              .catch(() => {});
          }}
        />
        <div className="space-y-2">
          <Label>Delivery notes for customers</Label>
          <Input
            value={origin.description ?? ""}
            onChange={(e) =>
              setOrigin((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="e.g. Call on arrival · leave at security desk if unavailable"
          />
          <p className="text-[11px] text-muted-foreground">
            Shown during checkout so customers know how delivery drop-off works.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border p-4 bg-card">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Truck className="size-4 text-primary" /> KM fee bands
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRate((prev) => {
                const last = prev.bands[prev.bands.length - 1];
                const from = last ? last.toKm : 0;
                return {
                  ...prev,
                  bands: [
                    ...prev.bands,
                    { fromKm: from, toKm: from + 10, fee: 400 },
                  ],
                };
              })
            }
          >
            <Plus className="size-3.5 mr-1" /> Add band
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Flat fee when driving distance falls in a band (e.g. 0–5 km → 100 ETB).
        </p>

        <div className="space-y-2">
          {rate.bands.map((band, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
            >
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">
                  From km
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={band.fromKm}
                  onChange={(e) =>
                    updateBand(i, { fromKm: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">
                  To km
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={band.toKm}
                  onChange={(e) =>
                    updateBand(i, { toKm: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">
                  Fee (ETB)
                </Label>
                <Input
                  type="number"
                  value={band.fee}
                  onChange={(e) =>
                    updateBand(i, { fee: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={rate.bands.length <= 1}
                onClick={() =>
                  setRate((prev) => ({
                    ...prev,
                    bands: prev.bands.filter((_, idx) => idx !== i),
                  }))
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-1 max-w-[200px]">
          <Label>Max delivery radius (km)</Label>
          <Input
            type="number"
            value={rate.maxRadiusKm}
            onChange={(e) =>
              setRate((prev) => ({
                ...prev,
                maxRadiusKm: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save delivery settings"}
      </Button>
    </div>
  );
}
