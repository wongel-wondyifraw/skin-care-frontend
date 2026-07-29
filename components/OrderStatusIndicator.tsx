import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus = "pending" | "delivered" | "cancelled";

const STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    Icon: typeof Check;
    wrap: string;
    icon: string;
  }
> = {
  delivered: {
    label: "Delivered",
    Icon: Check,
    wrap: "bg-emerald-50 text-emerald-700",
    icon: "text-emerald-600",
  },
  cancelled: {
    label: "Cancelled",
    Icon: X,
    wrap: "bg-rose-50 text-rose-700",
    icon: "text-rose-600",
  },
  pending: {
    label: "Pending",
    Icon: Clock,
    wrap: "bg-amber-50 text-amber-800",
    icon: "text-amber-600",
  },
};

/** Compact icon (dashboard lists) or icon + label (tables). */
export function OrderStatusIndicator({
  status,
  showLabel = false,
  className,
}: {
  status: OrderStatus;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const { Icon } = meta;

  if (!showLabel) {
    return (
      <span
        title={meta.label}
        aria-label={meta.label}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
          meta.wrap,
          className,
        )}
      >
        <Icon className={cn("size-3.5 stroke-[2.25]", meta.icon)} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        meta.wrap,
        className,
      )}
    >
      <Icon className={cn("size-3 stroke-[2.25]", meta.icon)} aria-hidden />
      {meta.label}
    </span>
  );
}
