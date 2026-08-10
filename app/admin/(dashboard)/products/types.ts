export interface Category {
  id: string;
  name: string;
}

export interface SkinType {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string | null;
  description: string | null;
  image: string;
  assetId?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  skinTypeId?: string | null;
  skinType?: SkinType | null;
  skinTypes?: SkinType[];
  stock: number;
  price: number;
  discountPercent?: number;
  discountEndsAt?: string | null;
  createdAt: string;
}

export type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type ViewMode = "table" | "tiles";
export type SortMode = "name" | "recent";

export type ProductForm = {
  name: string;
  brand: string;
  description: string;
  categoryId: string;
  skinTypeIds: string[];
  stock: string;
  price: string;
};

export const VIEW_MODE_KEY = "productsViewMode";

export function emptyForm(): ProductForm {
  return {
    name: "",
    brand: "",
    description: "",
    categoryId: "",
    skinTypeIds: [],
    stock: "0",
    price: "",
  };
}

export function productSkinLabels(prod: Product): string {
  if (prod.skinTypes?.length) return prod.skinTypes.map((s) => s.name).join(", ");
  return prod.skinType?.name ?? "All";
}
