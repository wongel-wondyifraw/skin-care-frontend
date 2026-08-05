"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Phone, Sparkles } from "lucide-react";
import { apiFetch, apiFetchCached } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { useNetwork } from "@/components/NetworkProvider";
import { useToast } from "@/components/ToastProvider";
import { isNetworkError } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";

type SkinType = { id: string; name: string };
type Customer = {
  id: string;
  telegramId: number;
  fullName: string;
  phone: string;
  address: string;
  telegramUsername: string | null;
  skinType: SkinType | null;
  createdAt: string;
};
type Product = {
  id: string;
  name: string;
  image?: string;
  price?: number;
  stock?: number;
};
type SkinAnalysisDetail = {
  id: string;
  customerId: string;
  imageUrl: string;
  adviceText: string;
  createdAt: string;
  customer: Customer;
  mentionedProducts: Product[];
};
type ChatMessage = {
  id: string;
  customerId: string;
  direction: "inbound" | "outbound";
  body: string;
  adminUserId: string | null;
  createdAt: string;
  adminUser?: { id: string; name: string; email: string } | null;
};

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = typeof params.id === "string" ? params.id : "";
  const { reconnectKey, clearNetworkError, reportNetworkError } = useNetwork();

  const [scan, setScan] = useState<SkinAnalysisDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(
    async (customerId: string, silent = false) => {
      try {
        const data = await apiFetch<ChatMessage[]>(`/customers/${customerId}/messages`, {
          toastOnError: false,
        });
        setMessages(data);
      } catch (err) {
        if (!silent && isNetworkError(err)) reportNetworkError(err);
      }
    },
    [reportNetworkError],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await apiFetchCached<SkinAnalysisDetail>(
          `/skin-analyses/${id}`,
          20_000,
        );
        if (cancelled) return;
        setScan(data);
        await loadMessages(data.customerId);
        clearNetworkError();
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          reportNetworkError(err);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load scan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, reconnectKey, clearNetworkError, reportNetworkError, loadMessages]);

  useEffect(() => {
    if (!scan?.customerId) return;
    const timer = window.setInterval(() => {
      void loadMessages(scan.customerId, true);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [scan?.customerId, loadMessages]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, scan?.id]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!scan || !draft.trim()) return;
    setSending(true);
    try {
      const created = await apiFetch<ChatMessage>(`/customers/${scan.customerId}/messages`, {
        method: "POST",
        toastOnError: false,
        body: JSON.stringify({ text: draft.trim() }),
      });
      setMessages((prev) => [...prev, created]);
      setDraft("");
      toast.success("Message sent");
    } catch (err) {
      if (isNetworkError(err)) reportNetworkError(err);
      else toast.error(err);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm text-destructive" role="alert">
          {error ?? "Scan not found."}
        </p>
        <Button variant="outline" onClick={() => router.push("/admin/scans")}>
          <ArrowLeft className="size-4" />
          Back to scans
        </Button>
      </div>
    );
  }

  const customer = scan.customer;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/admin/scans">
          <ArrowLeft className="size-4" />
          Skin Scans
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 items-start">
        <aside className="space-y-3 lg:sticky lg:top-4">
          <div className="w-40 sm:w-48 lg:w-full max-w-[220px]">
            <ProductImagePreview
              src={scan.imageUrl}
              alt={`Scan of ${customer.fullName}`}
              variant="hero"
              className="rounded-xl overflow-hidden"
            />
          </div>
          <Card>
            <CardContent className="p-3 space-y-1.5">
              <h1 className="text-base font-semibold tracking-tight leading-snug">
                {customer.fullName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {customer.telegramUsername
                  ? `@${customer.telegramUsername.replace(/^@/, "")}`
                  : `ID ${customer.telegramId}`}
              </p>
              <p className="text-xs">{customer.phone}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">{customer.address}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary" className="text-[10px]">
                  {customer.skinType?.name ?? "Skin type not set"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {formatDateTime(scan.createdAt)}
                </Badge>
              </div>
              {customer.phone && (
                <Button asChild size="sm" variant="outline" className="mt-1 h-8 w-full">
                  <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}>
                    <Phone className="size-3.5" />
                    Call
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
          {scan.mentionedProducts?.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                Products
              </h2>
              <ul className="space-y-1">
                {scan.mentionedProducts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-xs text-primary no-underline hover:underline"
                    >
                      {p.name}
                      {p.price != null ? ` · ${formatMoney(Number(p.price))}` : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <Card className="flex flex-col h-[min(72vh,720px)] min-h-[420px]">
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold">Conversation</h2>
              <p className="text-xs text-muted-foreground">
                Scan recommendation and Telegram messages in one thread.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div className="mr-6 rounded-xl border border-primary/20 bg-accent/40 px-3 py-2.5 text-sm">
                <p className="text-[11px] font-medium text-primary mb-1.5 flex items-center gap-1">
                  <Sparkles className="size-3.5" />
                  Scan recommendation · {formatDateTime(scan.createdAt)}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {scan.adviceText}
                </p>
              </div>

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.direction === "outbound"
                      ? "ml-8 rounded-xl bg-primary/10 px-3 py-2 text-sm"
                      : "mr-8 rounded-xl bg-muted px-3 py-2 text-sm"
                  }
                >
                  <p className="text-[11px] text-muted-foreground mb-0.5">
                    {m.direction === "outbound"
                      ? m.adminUser?.name ?? "Admin"
                      : customer.fullName}{" "}
                    · {formatDateTime(m.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>

            <form onSubmit={sendMessage} className="border-t border-border p-3 flex gap-2 shrink-0">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Reply to customer via Telegram…"
                className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button type="submit" disabled={sending || !draft.trim()} className="self-end">
                <Send className="size-4" />
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
