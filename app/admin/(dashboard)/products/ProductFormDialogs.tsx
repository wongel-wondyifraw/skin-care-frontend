import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select as CustomSelect } from "@/components/ui/select-custom";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Product, ProductForm, SkinType } from "./types";

type SelectOption = { value: string; label: string };

type ProductFormFieldsProps = {
  idPrefix: string;
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  categoryOptions: SelectOption[];
  skinTypes: SkinType[];
  imagePreview: string | null;
  currentImage?: string;
  currentName?: string;
  onImageSelect: (file: File) => void;
  requireImage?: boolean;
};

function ProductFormFields({
  idPrefix,
  form,
  setForm,
  categoryOptions,
  skinTypes,
  imagePreview,
  currentImage,
  currentName,
  onImageSelect,
  requireImage,
}: ProductFormFieldsProps) {
  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  function toggleSkinType(id: string) {
    setForm((f) => ({
      ...f,
      skinTypeIds: f.skinTypeIds.includes(id)
        ? f.skinTypeIds.filter((x) => x !== id)
        : [...f.skinTypeIds, id],
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="e.g. Cleansing Oil"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          data-autofocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-brand`}>
          Brand <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-brand`}
          placeholder="e.g. Medaf"
          value={form.brand}
          onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-desc`}>
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <textarea
          id={`${idPrefix}-desc`}
          placeholder="Brief description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className={`${selectClass} min-h-[60px] resize-y py-2`}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <CustomSelect
          value={form.categoryId}
          onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
          options={categoryOptions}
          placeholder={categoryOptions[0]?.label ?? "No categories"}
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          Skin types{" "}
          <span className="font-normal text-muted-foreground">(select one or more)</span>
        </Label>
        {skinTypes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No skin types yet. Add some under Categories &amp; Skin.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 rounded-md border border-border p-2.5 max-h-36 overflow-y-auto">
            {skinTypes.map((st) => {
              const selected = form.skinTypeIds.includes(st.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => toggleSkinType(st.id)}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "rounded-md bg-primary/15 text-primary border border-primary/30 px-2.5 py-1 text-xs font-medium"
                      : "rounded-md bg-muted/60 text-muted-foreground border border-transparent px-2.5 py-1 text-xs hover:bg-muted"
                  }
                >
                  {st.name}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Leave empty to mark as suitable for all skin types.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-stock`}>Stock</Label>
          <Input
            id={`${idPrefix}-stock`}
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-price`}>Price (ETB)</Label>
          <Input
            id={`${idPrefix}-price`}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-image`}>{requireImage ? "Image" : "Image"}</Label>
        <div className="flex items-center gap-3 flex-wrap">
          {(imagePreview || currentImage) && (
            <div className="relative size-14 rounded-md overflow-hidden border border-border bg-muted shrink-0">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : currentImage ? (
                <Image
                  src={currentImage}
                  alt={currentName || "Product"}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : null}
            </div>
          )}
          {imagePreview || currentImage ? (
            <>
              <input
                id={`${idPrefix}-image`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImageSelect(f);
                }}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <label htmlFor={`${idPrefix}-image`} className="cursor-pointer">
                  {imagePreview ? "Change image" : "Replace image"}
                </label>
              </Button>
            </>
          ) : (
            <Input
              id={`${idPrefix}-image`}
              type="file"
              accept="image/*"
              required={requireImage}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImageSelect(f);
              }}
              className="max-w-[220px]"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export type ProductFormDialogsProps = {
  skinTypes: SkinType[];
  formCategoryOptions: SelectOption[];
  modalOpen: boolean;
  onCloseCreate: () => void;
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  imagePreview: string | null;
  onCreateImageSelect: (file: File) => void;
  formError: string | null;
  busy: boolean;
  onCreate: (e: FormEvent) => void;
  editTarget: Product | null;
  onCloseEdit: () => void;
  editForm: ProductForm;
  setEditForm: Dispatch<SetStateAction<ProductForm>>;
  editImagePreview: string | null;
  onEditImageSelect: (file: File) => void;
  editError: string | null;
  editBusy: boolean;
  onEdit: (e: FormEvent) => void;
  restockTarget: Product | null;
  onCloseRestock: () => void;
  restockQty: string;
  onRestockQtyChange: (value: string) => void;
  restockError: string | null;
  restockBusy: boolean;
  onRestock: (e: FormEvent) => void;
  deleteTarget: Product | null;
  deletingId: string | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

export function ProductFormDialogs({
  skinTypes,
  formCategoryOptions,
  modalOpen,
  onCloseCreate,
  form,
  setForm,
  imagePreview,
  onCreateImageSelect,
  formError,
  busy,
  onCreate,
  editTarget,
  onCloseEdit,
  editForm,
  setEditForm,
  editImagePreview,
  onEditImageSelect,
  editError,
  editBusy,
  onEdit,
  restockTarget,
  onCloseRestock,
  restockQty,
  onRestockQtyChange,
  restockError,
  restockBusy,
  onRestock,
  deleteTarget,
  deletingId,
  onConfirmDelete,
  onCancelDelete,
}: ProductFormDialogsProps) {
  return (
    <>
      <Dialog
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v) onCloseCreate();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate}>
            <ProductFormFields
              idPrefix="create"
              form={form}
              setForm={setForm}
              categoryOptions={formCategoryOptions}
              skinTypes={skinTypes}
              imagePreview={imagePreview}
              onImageSelect={onCreateImageSelect}
              requireImage
            />
            {formError && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
            <DialogFooter className="mt-5 gap-2 sm:gap-2">
              <Button variant="outline" type="button" onClick={onCloseCreate}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) onCloseEdit();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={onEdit}>
              <ProductFormFields
                idPrefix="edit"
                form={editForm}
                setForm={setEditForm}
                categoryOptions={formCategoryOptions}
                skinTypes={skinTypes}
                imagePreview={editImagePreview}
                currentImage={editTarget.image}
                currentName={editTarget.name}
                onImageSelect={onEditImageSelect}
              />
              {editError && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {editError}
                </p>
              )}
              <DialogFooter className="mt-5 gap-2 sm:gap-2">
                <Button variant="outline" type="button" onClick={onCloseEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editBusy}>
                  {editBusy ? "Updating…" : "Update"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!restockTarget}
        onOpenChange={(v) => {
          if (!v) onCloseRestock();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restock {restockTarget?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onRestock} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Current stock:{" "}
              <span className="font-medium text-foreground">{restockTarget?.stock ?? 0}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="restock-qty">Quantity to add</Label>
              <Input
                id="restock-qty"
                type="number"
                min="1"
                value={restockQty}
                onChange={(e) => onRestockQtyChange(e.target.value)}
                required
                data-autofocus
              />
            </div>
            {restockError && (
              <p className="text-sm text-destructive" role="alert">
                {restockError}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onCloseRestock}>
                Cancel
              </Button>
              <Button type="submit" disabled={restockBusy}>
                {restockBusy ? "Updating…" : "Add Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        busy={!!deletingId}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </>
  );
}
