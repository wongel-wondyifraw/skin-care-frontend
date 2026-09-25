import { Check, Clock, CreditCard, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "awaiting_payment"
  | "payment_submitted"
  | "pending"
  | "confirmed"
  | "delivered"
  | "cancelled";

export type PaymentStage = "unpaid" | "partial" | "full";

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
    label: "Verified",
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

function methodLabel(method?: string | null) {
  if (method === "telebirr") return "Telebirr";
  if (method === "bank") return "CBE";
  return null;
}

/** Compact icon (dashboard lists) or icon + label (tables). */
export function OrderStatusIndicator({
  status,
  showLabel = false,
  className,
  paymentMethod,
  paymentStage,
}: {
  status: OrderStatus;
  showLabel?: boolean;
  className?: string;
  paymentMethod?: string | null;
  paymentStage?: PaymentStage | null;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const { Icon } = meta;
  const method = methodLabel(paymentMethod);

  let label = meta.label;
  if (status === "confirmed") {
    if (paymentStage === "full") {
      label = method ? `Fully paid · ${method}` : "Fully paid";
    } else {
      label = method ? `Verified · ${method}` : "Verified";
    }
  } else if (status === "delivered" && paymentStage === "full" && method) {
    label = `Delivered · ${method}`;
  } else if (status === "delivered" && paymentStage === "partial") {
    label = method ? `Delivered · half paid · ${method}` : "Delivered · half paid";
  }

  if (!showLabel) {
    return (
      <span
        title={label}
        aria-label={label}
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
      {label}
    </span>
  );
}
