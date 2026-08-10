"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function normalizeDescription(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u2022/g, "•")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isBulletLine(line: string): boolean {
  return /^(?:[-*•]|\d+[.)])\s+\S/.test(line.trim());
}

function stripBullet(line: string): string {
  return line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, "").trim();
}

function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 48) return false;
  if (/[.!?]$/.test(t)) return false;
  if (/^[A-Z0-9][A-Za-z0-9 &/+'’-]{0,40}:\s*$/.test(t)) return true;
  if (/^[A-Z][A-Za-z0-9 &/+'’-]*$/.test(t) && t.split(" ").length <= 6) {
    return true;
  }
  return false;
}

function parseBlocks(raw: string): Block[] {
  const text = normalizeDescription(raw);
  if (!text) return [];

  // Promote inline section labels onto their own lines for free-form text.
  const structured = text.replace(
    /(?:^|\n)\s*([A-Za-z][A-Za-z0-9 &/+'’-]{1,40}:)\s+/g,
    "\n\n$1\n",
  );

  const chunks = structured.split(/\n\n+/);
  const blocks: Block[] = [];

  for (const chunk of chunks) {
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    if (lines.every(isBulletLine)) {
      blocks.push({ type: "list", items: lines.map(stripBullet) });
      continue;
    }

    if (lines.length === 1 && isHeadingLine(lines[0])) {
      blocks.push({
        type: "heading",
        text: lines[0].replace(/:\s*$/, ""),
      });
      continue;
    }

    // Mixed: heading + bullets, or heading + paragraph
    let i = 0;
    if (isHeadingLine(lines[0]) && lines.length > 1) {
      blocks.push({
        type: "heading",
        text: lines[0].replace(/:\s*$/, ""),
      });
      i = 1;
    }

    const rest = lines.slice(i);
    if (rest.every(isBulletLine)) {
      blocks.push({ type: "list", items: rest.map(stripBullet) });
      continue;
    }

    const bulletRun: string[] = [];
    const flushBullets = () => {
      if (!bulletRun.length) return;
      blocks.push({ type: "list", items: [...bulletRun] });
      bulletRun.length = 0;
    };

    for (const line of rest) {
      if (isBulletLine(line)) {
        bulletRun.push(stripBullet(line));
      } else {
        flushBullets();
        if (isHeadingLine(line)) {
          blocks.push({
            type: "heading",
            text: line.replace(/:\s*$/, ""),
          });
        } else {
          // Soft-split very long single lines into readable paragraphs
          const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
          if (sentences && sentences.length > 2 && line.length > 180) {
            for (const sentence of sentences) {
              const s = sentence.trim();
              if (s) blocks.push({ type: "paragraph", text: s });
            }
          } else {
            blocks.push({ type: "paragraph", text: line });
          }
        }
      }
    }
    flushBullets();
  }

  return blocks;
}

/** Lightweight inline emphasis: **bold**, *italic*, and Label: value. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`|[A-Za-z][A-Za-z0-9 &/+-]{0,28}:(?=\s))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      nodes.push(
        <em key={key++} className="italic text-foreground/90">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <span
          key={key++}
          className="rounded bg-muted px-1 py-0.5 font-medium text-foreground"
        >
          {token.slice(1, -1)}
        </span>,
      );
    } else if (token.endsWith(":")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token}
        </strong>,
      );
    } else {
      nodes.push(token);
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type ShopProductDescriptionProps = {
  text: string;
  className?: string;
};

export function ShopProductDescription({
  text,
  className,
}: ShopProductDescriptionProps) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;

  return (
    <div
      className={cn(
        "space-y-3.5 border-t border-border/70 pt-4 text-[13.5px] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
        Details
      </p>
      <div className="space-y-3.5">
        {blocks.map((block, index) => {
          if (block.type === "heading") {
            return (
              <h2
                key={`h-${index}`}
                className="pt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground"
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === "list") {
            return (
              <ul
                key={`l-${index}`}
                className="space-y-2 border-l-2 border-primary/25 pl-3.5"
              >
                {block.items.map((item, i) => (
                  <li
                    key={i}
                    className="relative pl-0.5 text-[13.5px] leading-snug text-muted-foreground"
                  >
                    <span className="absolute -left-[1.05rem] top-[0.55em] size-1 rounded-full bg-primary/70" />
                    <span className="text-foreground/85">{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          }

          const isLead = index === 0 || blocks[index - 1]?.type === "heading";
          return (
            <p
              key={`p-${index}`}
              className={cn(
                "text-pretty",
                isLead
                  ? "text-[14px] leading-relaxed text-foreground/80"
                  : "text-[13.5px] leading-relaxed text-muted-foreground",
              )}
            >
              {renderInline(block.text)}
            </p>
          );
        })}
      </div>
    </div>
  );
}
