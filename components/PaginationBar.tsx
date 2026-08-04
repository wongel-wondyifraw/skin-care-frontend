"use client";

import { Button } from "@/components/ui/button";

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  itemCount: number;
  loading?: boolean;
  itemLabel?: string;
  onPageChange: (page: number) => void;
};

export function PaginationBar({
  page,
  pageSize,
  total,
  itemCount,
  loading = false,
  itemLabel = "items",
  onPageChange,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = itemCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Showing {from} to {to} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1 || loading}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
