"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  AlertCircle,
  RefreshCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  ShieldCheck,
  Copy,
  ExternalLink,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

type LocalOrderLink = {
  id: string;
  status: string;
  verifyEtStatus?: string | null;
  paymentEvidence?: string | null;
  advancePaymentAmount?: number | string | null;
  paymentMethod?: string | null;
  paymentVerifiedAt?: string | null;
  createdAt?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  productName?: string | null;
  raw?: Record<string, unknown> | null;
};

type HistoryItem = {
  requestId: string;
  id?: string;
  bank?: string;
  processingStatus?: string;
  status?: string;
  verified?: boolean;
  durationMs?: number;
  createdAt?: string;
  amount?: number | string;
  referenceNumber?: string;
  transactionNumber?: string;
  receiptNumber?: string;
  senderName?: string;
  receiverName?: string;
  currency?: string;
  localOrders?: LocalOrderLink[];
  [key: string]: unknown;
};

type DetailPayload = {
  requestId: string;
  live: Record<string, unknown> | null;
  localOrders: LocalOrderLink[];
};

function pickRef(item: HistoryItem) {
  return (
    item.referenceNumber ||
    item.transactionNumber ||
    item.receiptNumber ||
    (typeof item.reference === "string" ? item.reference : null) ||
    item.requestId?.slice(0, 8) ||
    "—"
  );
}

function statusTone(verified?: boolean, processingStatus?: string, status?: string) {
  const p = (processingStatus || "").toLowerCase();
  const s = (status || "").toLowerCase();
  if (p === "queued" || p === "running" || s === "pending") {
    return "bg-blue-500/10 text-blue-700";
  }
  if (verified || s === "success") return "bg-green-500/10 text-green-700";
  return "bg-red-500/10 text-red-700";
}

function statusLabel(verified?: boolean, processingStatus?: string, status?: string) {
  const p = (processingStatus || "").toLowerCase();
  if (p === "queued" || p === "running") return p;
  if (verified || status === "success") return "verified";
  return status || "failed";
}

function unwrapLiveData(live: Record<string, unknown> | null) {
  if (!live) return null;
  const data = live.data;
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    return data[0] as Record<string, unknown>;
  }
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return live;
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex justify-between gap-3 text-xs py-1 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-right text-foreground font-medium break-all",
          mono && "font-mono text-[11px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SettlementBlock({ settlement }: { settlement: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Settlement match
      </p>
      <DetailRow
        label="Matched"
        value={settlement.matched === true ? "Yes" : "No"}
      />
      <DetailRow label="Type" value={String(settlement.matchType || "")} />
      <DetailRow
        label="Confidence"
        value={String(settlement.matchConfidence || "")}
      />
      <DetailRow label="Source" value={String(settlement.source || "")} />
      <DetailRow
        label="Receiver account"
        value={String(settlement.receiverAccount || "")}
        mono
      />
      <DetailRow
        label="Matched settlement"
        value={String(settlement.matchedSettlementAccount || "")}
        mono
      />
      <DetailRow label="Reason" value={String(settlement.reason || "")} />
      <DetailRow
        label="Candidates"
        value={
          settlement.candidateCount != null
            ? String(settlement.candidateCount)
            : null
        }
      />
      <DetailRow
        label="Ambiguous"
        value={
          settlement.ambiguous == null
            ? null
            : settlement.ambiguous
              ? "Yes"
              : "No"
        }
      />
    </div>
  );
}

function ConfirmationBlock({
  confirmation,
}: {
  confirmation: Record<string, unknown>;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Confirmation history
      </p>
      <DetailRow label="Scope" value={String(confirmation.scope || "")} />
      <DetailRow
        label="First use"
        value={
          confirmation.isFirstConfirmation == null
            ? null
            : confirmation.isFirstConfirmation
              ? "Yes"
              : "No (duplicate risk)"
        }
      />
      <DetailRow
        label="Confirmed before"
        value={
          confirmation.confirmedBefore == null
            ? null
            : confirmation.confirmedBefore
              ? "Yes"
              : "No"
        }
      />
      <DetailRow
        label="Count"
        value={
          confirmation.confirmationCount != null
            ? String(confirmation.confirmationCount)
            : null
        }
      />
      <DetailRow
        label="First at"
        value={
          confirmation.firstConfirmedAt
            ? formatDateTime(String(confirmation.firstConfirmedAt))
            : null
        }
      />
      <DetailRow
        label="Last at"
        value={
          confirmation.lastConfirmedAt
            ? formatDateTime(String(confirmation.lastConfirmedAt))
            : null
        }
      />
    </div>
  );
}

function VerificationDetailPanel({
  item,
  detail,
  loadingDetail,
}: {
  item: HistoryItem;
  detail: DetailPayload | null;
  loadingDetail: boolean;
}) {
  const liveRoot = detail?.live ?? null;
  const liveData = unwrapLiveData(liveRoot);
  const verification =
    liveRoot?.verification && typeof liveRoot.verification === "object"
      ? (liveRoot.verification as Record<string, unknown>)
      : null;

  const amount =
    liveData?.amount ?? item.amount ?? (liveData as { amount?: unknown })?.amount;
  const currency = String(liveData?.currency || item.currency || "ETB");
  const sender = String(liveData?.senderName || item.senderName || "");
  const receiver = String(liveData?.receiverName || item.receiverName || "");
  const receiverAccount = String(liveData?.receiverAccount || "");
  const bank = String(liveData?.bank || item.bank || "");
  const ref =
    String(
      liveData?.referenceNumber ||
        liveData?.transactionNumber ||
        liveData?.receiptNumber ||
        pickRef(item),
    ) || "—";
  const accountSuffix = String(liveData?.accountSuffix || "");
  const timestamp = liveData?.timestamp
    ? String(liveData.timestamp)
    : liveData?.completedAt
      ? String(liveData.completedAt)
      : item.createdAt;
  const settlement = liveData?.settlementAccountMatch as
    | Record<string, unknown>
    | undefined;
  const confirmation = liveData?.confirmationHistory as
    | Record<string, unknown>
    | undefined;
  const processingStatus = String(
    liveData?.processingStatus ||
      verification?.processingStatus ||
      item.processingStatus ||
      "",
  );
  const apiStatus = String(
    liveData?.status || verification?.status || item.status || "",
  );
  const durationMs =
    Number(liveData?.durationMs ?? item.durationMs ?? 0) || null;
  const message =
    typeof liveRoot?.message === "string" ? liveRoot.message : null;

  const localOrders = detail?.localOrders?.length
    ? detail.localOrders
    : item.localOrders || [];

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  if (loadingDetail && !detail) {
    return (
      <div className="px-4 pb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading live details…
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-3 bg-muted/15 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
        <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
            <CreditCard className="size-3.5" /> Transaction
          </p>
          <DetailRow label="Bank" value={bank.toUpperCase()} />
          <DetailRow
            label="Reference"
            value={
              <span className="inline-flex items-center gap-1">
                <span className="font-mono text-[11px]">{ref}</span>
                {ref !== "—" && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => void copyText(ref)}
                    aria-label="Copy reference"
                  >
                    <Copy className="size-3" />
                  </button>
                )}
              </span>
            }
          />
          <DetailRow label="Account suffix" value={accountSuffix} mono />
          <DetailRow
            label="Amount"
            value={amount != null && amount !== "" ? `${amount} ${currency}` : null}
          />
          <DetailRow
            label="Verified"
            value={
              liveData?.verified == null && item.verified == null
                ? null
                : (liveData?.verified ?? item.verified)
                  ? "Yes"
                  : "No"
            }
          />
          <DetailRow label="API status" value={apiStatus} />
          <DetailRow label="Processing" value={processingStatus} />
          <DetailRow
            label="Duration"
            value={durationMs != null ? `${durationMs} ms` : null}
          />
          <DetailRow
            label="Txn time"
            value={timestamp ? formatDateTime(timestamp) : null}
          />
          {message && <DetailRow label="Message" value={message} />}
        </div>

        <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
            <User className="size-3.5" /> Parties
          </p>
          <DetailRow label="Sender" value={sender} />
          <DetailRow label="Receiver" value={receiver} />
          <DetailRow label="Receiver account" value={receiverAccount} mono />
          <DetailRow
            label="Request ID"
            value={
              <span className="inline-flex items-center gap-1">
                <span className="font-mono text-[10px]">{item.requestId}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => void copyText(item.requestId)}
                >
                  <Copy className="size-3" />
                </button>
              </span>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {settlement && <SettlementBlock settlement={settlement} />}
        {confirmation && <ConfirmationBlock confirmation={confirmation} />}
      </div>

      {localOrders.length > 0 && (
        <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Building2 className="size-3.5" /> Linked shop orders
          </p>
          {localOrders.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-2 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {o.customerName || "Customer"} · {o.productName || "Product"}
                </p>
                <p className="text-muted-foreground">
                  Status: {o.status}
                  {o.verifyEtStatus ? ` · Verify: ${o.verifyEtStatus}` : ""}
                  {o.advancePaymentAmount != null
                    ? ` · Advance ${Number(o.advancePaymentAmount).toFixed(2)} ETB`
                    : ""}
                </p>
                {o.paymentEvidence && (
                  <p className="font-mono text-[10px] text-muted-foreground truncate">
                    TX: {o.paymentEvidence}
                  </p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <Link href="/admin/orders">
                  Orders <ExternalLink className="size-3 ml-1" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}

      {liveRoot && (
        <details className="rounded-lg border border-border bg-background/60 p-3">
          <summary className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
            Raw Verify.ET response
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(liveRoot, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function VerificationDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailPayload>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/admin/verify-et/dashboard");
      setData(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch Verification API dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  async function toggleExpand(requestId: string) {
    if (expandedId === requestId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(requestId);
    if (details[requestId]) return;
    setDetailLoading(requestId);
    try {
      const res = await apiFetch<DetailPayload>(
        `/admin/verify-et/verifications/${encodeURIComponent(requestId)}`,
      );
      setDetails((prev) => ({ ...prev, [requestId]: res }));
    } catch {
      // keep list usable even if detail fetch fails
    } finally {
      setDetailLoading(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
        <h3 className="font-semibold flex items-center gap-2">
          <AlertCircle className="size-5" /> Error loading dashboard
        </h3>
        <p className="mt-1 text-sm">{error}</p>
        <Button onClick={() => void fetchDashboardData()} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No data available. Set <code className="text-xs">VERIFY_ET_API_KEY</code>{" "}
        on the backend.
      </div>
    );
  }

  const { uptime, metrics, overview, balance, verifications, history } = data;
  const isHealthy = uptime?.status === "operational" || uptime?.success === true;
  const credits = balance?.data?.balance ?? balance?.balance ?? 0;
  const packageType =
    balance?.data?.package || balance?.data?.plan || balance?.package || "—";
  const successRate =
    metrics?.data?.successRate ?? metrics?.successRate ?? "—";
  const avgTime =
    metrics?.data?.averageResponseTimeMs ??
    metrics?.data?.avgResponseTimeMs ??
    metrics?.averageResponseTimeMs ??
    0;
  const totalVerified =
    overview?.data?.totalVerified ?? overview?.totalVerified ?? 0;
  const totalFailed =
    overview?.data?.totalFailed ?? overview?.totalFailed ?? 0;
  const recentItems: HistoryItem[] = Array.isArray(verifications)
    ? verifications
    : Array.isArray(history?.data)
      ? history.data
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Verification API
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live Verify.ET health, credits, and full per-transaction detail.
          </p>
        </div>
        <Button
          onClick={() => void fetchDashboardData()}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCcw
            className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${
                isHealthy
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                API Status
              </p>
              <h3 className="text-2xl font-bold tracking-tight capitalize">
                {isHealthy ? "Healthy" : "Offline"}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
              <Coins className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Credits Remaining
              </p>
              <h3 className="text-2xl font-bold tracking-tight">{credits}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Success Rate
              </p>
              <h3 className="text-2xl font-bold tracking-tight">
                {String(successRate)}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Avg Response
              </p>
              <h3 className="text-2xl font-bold tracking-tight">
                {avgTime ? `${avgTime} ms` : "—"}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Recent verifications
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {recentItems.length} shown · expand for live detail
            </span>
          </div>
          <div className="divide-y divide-border">
            {recentItems.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No recent activity from Verify.ET.
              </div>
            ) : (
              recentItems.map((item) => {
                const requestId = item.requestId || String(item.id || "");
                const open = expandedId === requestId;
                return (
                  <div key={requestId} className="bg-card">
                    <button
                      type="button"
                      onClick={() => void toggleExpand(requestId)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-muted rounded-full text-muted-foreground shrink-0">
                          <CreditCard className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate font-mono">
                            {pickRef(item)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(item.bank || "—").toString().toUpperCase()}
                            {item.createdAt
                              ? ` · ${formatDateTime(item.createdAt)}`
                              : ""}
                            {item.localOrders?.length
                              ? ` · ${item.localOrders.length} order(s)`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {item.amount != null && item.amount !== ""
                              ? `${item.amount} ETB`
                              : "—"}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-1 capitalize",
                              statusTone(
                                item.verified,
                                item.processingStatus,
                                item.status,
                              ),
                            )}
                          >
                            {statusLabel(
                              item.verified,
                              item.processingStatus,
                              item.status,
                            )}
                          </span>
                        </div>
                        {open ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                    {open && (
                      <VerificationDetailPanel
                        item={item}
                        detail={details[requestId] ?? null}
                        loadingDetail={detailLoading === requestId}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-xs h-fit">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="font-semibold text-foreground">Overview</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Package</span>
              <span className="text-sm font-medium capitalize">
                {String(packageType)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Total processed
              </span>
              <span className="text-sm font-medium">
                {Number(totalVerified) + Number(totalFailed)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Successful</span>
              <span className="text-sm font-medium text-emerald-600">
                {totalVerified}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Failed</span>
              <span className="text-sm font-medium text-red-600">
                {totalFailed}
              </span>
            </div>
            {history?.meta?.total != null && (
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">
                  History total
                </span>
                <span className="text-sm font-medium">
                  {String(history.meta.total)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
