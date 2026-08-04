import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select as CustomSelect } from "@/components/ui/select-custom";
import { cn } from "@/lib/utils";
import type { SortMode, StockFilter, ViewMode } from "./types";

type SelectOption = { value: string; label: string };

type ProductFiltersProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filterCategory: string;
  onFilterCategoryChange: (value: string) => void;
  filterSkinType: string;
  onFilterSkinTypeChange: (value: string) => void;
  filterStock: StockFilter;
  onFilterStockChange: (value: StockFilter) => void;
  sortMode: SortMode;
  onSortModeChange: (value: SortMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  categoryOptions: SelectOption[];
  skinTypeOptions: SelectOption[];
  stockOptions: SelectOption[];
  sortOptions: SelectOption[];
};

export function ProductFilters({
  searchInput,
  onSearchChange,
  filterCategory,
  onFilterCategoryChange,
  filterSkinType,
  onFilterSkinTypeChange,
  filterStock,
  onFilterStockChange,
  sortMode,
  onSortModeChange,
  viewMode,
  onViewModeChange,
  categoryOptions,
  skinTypeOptions,
  stockOptions,
  sortOptions,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
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
        placeholder="All Categories"
        size="sm"
        className="w-36"
      />
      <CustomSelect
        value={filterSkinType}
        onValueChange={onFilterSkinTypeChange}
        options={skinTypeOptions}
        placeholder="All Skin Types"
        size="sm"
        className="w-36"
      />
      <CustomSelect
        value={filterStock}
        onValueChange={(v) => onFilterStockChange(v as StockFilter)}
        options={stockOptions}
        placeholder="All Stock"
        size="sm"
        className="w-32"
      />
      <CustomSelect
        value={sortMode}
        onValueChange={(v) => onSortModeChange(v as SortMode)}
        options={sortOptions}
        placeholder="Sort"
        size="sm"
        className="w-28"
      />
      <div
        className="ml-auto inline-flex items-center rounded-md border border-border bg-card p-0.5 shrink-0"
        role="group"
        aria-label="View mode"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            "size-8 rounded-sm",
            viewMode === "tiles" && "bg-accent text-accent-foreground",
          )}
          aria-pressed={viewMode === "tiles"}
          aria-label="Tile view"
          onClick={() => onViewModeChange("tiles")}
        >
          <LayoutGrid className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            "size-8 rounded-sm",
            viewMode === "table" && "bg-accent text-accent-foreground",
          )}
          aria-pressed={viewMode === "table"}
          aria-label="Table view"
          onClick={() => onViewModeChange("table")}
        >
          <List className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
