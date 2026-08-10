import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { width: 160, height: 58, className: "h-12 w-[140px]" },
  md: { width: 220, height: 80, className: "h-20 w-[196px]" },
  lg: { width: 280, height: 100, className: "h-24 w-[240px]" },
} as const;

type BrandLogoProps = {
  href?: string;
  size?: keyof typeof SIZES;
  showWordmark?: boolean;
  wordmark?: string;
  stacked?: boolean;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  href,
  size = "md",
  showWordmark = true,
  wordmark = "Medaf",
  stacked = false,
  className,
  priority = false,
}: BrandLogoProps) {
  const dim = SIZES[size];
  const mark = (
    <span
      className={cn(
        "inline-flex min-w-0 items-center",
        stacked ? "relative flex-col" : "-ml-1 gap-1.5",
        className,
      )}
    >
      <Image
        src="/medaf_hand_sm.png"
        alt=""
        width={dim.width}
        height={dim.height}
        className={cn(
          "object-contain object-center mix-blend-multiply",
          dim.className,
          stacked && "relative z-0",
        )}
        priority={priority}
      />
      {showWordmark && (
        <span
          className={cn(
            "relative z-10 font-bold uppercase text-primary",
            stacked ? "text-center" : "truncate",
            size === "lg" && "text-lg tracking-[0.2em] -mt-5",
            size === "md" && (stacked ? "text-[15px] tracking-[0.2em] -mt-4" : "text-sm tracking-[0.18em]"),
            size === "sm" &&
              (stacked
                ? "text-[11px] tracking-[0.2em] -mt-3"
                : "text-xs tracking-[0.16em]"),
          )}
        >
          {wordmark}
        </span>
      )}
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="no-underline text-inherit" aria-label="Medaf Skin Care home">
      {mark}
    </Link>
  );
}
