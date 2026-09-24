"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function VerificationDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/admin/verify-et/dashboard");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to fetch Verification API dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        <Button onClick={fetchDashboardData} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return <div>No data available. Is Verify.ET API Key configured?</div>;
  }

  const { uptime, metrics, overview, balance, history } = data;

  const isHealthy = uptime?.status === "operational";
  const credits = balance?.data?.balance || 0;
  const packageType = balance?.data?.package || "Free";
  const successRate = metrics?.data?.successRate || "0%";
  const avgTime = metrics?.data?.averageResponseTimeMs || 0;
  const totalVerified = overview?.data?.totalVerified || 0;
  const totalFailed = overview?.data?.totalFailed || 0;
  const recentItems = history?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Verification API</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor Verify.ET integration health, credits, and recent activity.
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" disabled={loading}>
          <RefreshCcw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Health */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${
                isHealthy ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
              }`}
            >
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">API Status</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground capitalize">
                {isHealthy ? "Healthy" : "Offline"}
              </h3>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
              <Coins className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Credits Remaining</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {credits}
              </h3>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {successRate}
              </h3>
            </div>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {avgTime} ms
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="font-semibold text-foreground">Recent Verifications</h3>
          </div>
          <div className="divide-y divide-border">
            {recentItems.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No recent activity.
              </div>
            ) : (
              recentItems.map((item: any) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full text-muted-foreground">
                      <CreditCard className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.referenceNumber || item.transactionNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.bank} • {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {item.amount ? `${item.amount} ETB` : "---"}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-1 ${
                        item.verified
                          ? "bg-green-500/10 text-green-700"
                          : "bg-red-500/10 text-red-700"
                      }`}
                    >
                      {item.verified ? "Verified" : "Failed"}
                    </span>
                  </div>
                </div>
              ))
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
              <span className="text-sm font-medium capitalize">{packageType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Processed</span>
              <span className="text-sm font-medium">{totalVerified + totalFailed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Successful</span>
              <span className="text-sm font-medium text-emerald-600">{totalVerified}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Failed</span>
              <span className="text-sm font-medium text-red-600">{totalFailed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
