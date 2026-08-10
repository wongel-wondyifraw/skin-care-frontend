"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select as CustomSelect } from "@/components/ui/select-custom";

type SelectOption = { value: string; label: string };

type ShopProductFiltersProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filterCategory: string;
  onFilterCategoryChange: (value: string) => void;
  filterSkinType: string;
  onFilterSkinTypeChange: (value: string) => void;
  categoryOptions: SelectOption[];
  skinTypeOptions: SelectOption[];
};

export function ShopProductFilters({
  searchInput,
  onSearchChange,
  filterCategory,
  onFilterCategoryChange,
  filterSkinType,
  onFilterSkinTypeChange,
  categoryOptions,
  skinTypeOptions,
}: ShopProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search products…"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>
      <CustomSelect
        value={filterCategory}
        onValueChange={onFilterCategoryChange}
        options={categoryOptions}
        placeholder="Category"
        size="sm"
        className="w-32"
      />
      <CustomSelect
        value={filterSkinType}
        onValueChange={onFilterSkinTypeChange}
        options={skinTypeOptions}
        placeholder="Skin type"
        size="sm"
        className="w-32"
      />
    </div>
  );
}
