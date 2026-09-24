import { Check, Clock, CreditCard, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "awaiting_payment"
  | "payment_submitted"
  | "pending"
  | "confirmed"
  | "delivered"
  | "cancelled";

const STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    Icon: typeof Check;
    wrap: string;
    icon: string;
  }
> = {
  awaiting_payment: {
    label: "Awaiting Payment",
    Icon: CreditCard,
    wrap: "bg-amber-50 text-amber-800 border border-amber-200/50",
    icon: "text-amber-600",
  },
  payment_submitted: {
    label: "Payment Submitted",
    Icon: Clock,
    wrap: "bg-blue-50 text-blue-700 border border-blue-200/50",
    icon: "text-blue-600",
  },
  confirmed: {
    label: "Confirmed",
    Icon: ShieldCheck,
    wrap: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    icon: "text-emerald-600",
  },
  delivered: {
    label: "Delivered",
    Icon: Check,
    wrap: "bg-teal-50 text-teal-700 border border-teal-200/50",
    icon: "text-teal-600",
  },
  cancelled: {
    label: "Cancelled",
    Icon: X,
    wrap: "bg-rose-50 text-rose-700 border border-rose-200/50",
    icon: "text-rose-600",
  },
  pending: {
    label: "Pending",
    Icon: Clock,
    wrap: "bg-slate-50 text-slate-700 border border-slate-200/50",
    icon: "text-slate-600",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        meta.wrap,
        className,
      )}
    >
      <Icon className={cn("size-3 stroke-[2.25]", meta.icon)} aria-hidden />
      {meta.label}
    </span>
  );
}
