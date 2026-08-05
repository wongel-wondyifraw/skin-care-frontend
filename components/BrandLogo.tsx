import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { width: 88, height: 32, className: "h-8 w-[88px]" },
  md: { width: 128, height: 46, className: "h-11 w-32" },
  lg: { width: 200, height: 72, className: "h-[72px] w-[200px]" },
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
        stacked ? "flex-col gap-1.5" : "gap-2",
        className,
      )}
    >
      <Image
        src="/medaf_hand.png"
        alt=""
        width={dim.width}
        height={dim.height}
        className={cn("object-contain object-center mix-blend-multiply", dim.className)}
        priority={priority}
      />
      {showWordmark && (
        <span
          className={cn(
            "font-semibold uppercase text-primary tracking-[0.18em]",
            stacked ? "text-center" : "truncate",
            size === "lg" ? "text-base tracking-[0.22em]" : "text-sm",
            size === "sm" && "text-xs tracking-[0.16em]",
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
