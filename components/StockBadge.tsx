import { Badge } from "@/components/ui/badge";

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <Badge variant="destructive" className="text-[11px]">
        Out of Stock
      </Badge>
    );
  }
  if (stock < 10) {
    return (
      <Badge variant="outline" className="text-[11px] border-primary/40 text-primary">
        {stock} — Low
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[11px]">
      {stock} in stock
    </Badge>
  );
}
