import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type MoneyProps = {
  amount: number;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  light?: boolean;
  muted?: boolean;
};

const sizeClass = {
  xs: "text-[12px]",
  sm: "text-[13px]",
  md: "text-base",
  lg: "text-lg",
} as const;

/** Dominant gold currency display used across shop + admin. */
export function Money({
  amount,
  className,
  size = "sm",
  light = false,
  muted = false,
}: MoneyProps) {
  return (
    <span
      className={cn(
        "inline-block font-extrabold tabular-nums tracking-tight",
        sizeClass[size],
        muted
          ? "text-muted-foreground line-through decoration-2 font-semibold opacity-80"
          : light
            ? "text-amber-200"
            : "text-gold",
        className,
      )}
    >
      {formatMoney(amount)}
    </span>
  );
}
