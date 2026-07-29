"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Layers, Shield, ArrowRight } from "lucide-react";
import { apiFetchCached } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardSummary = {
  products: number;
  categories: number;
  skinTypes: number;
  customers: number;
};

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardSummary>({
    products: 0,
    categories: 0,
    skinTypes: 0,
    customers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await apiFetchCached<DashboardSummary>("/dashboard-summary", 30_000);
        if (cancelled) return;
        setCounts(summary);
      } catch {
        if (!cancelled) setError("Could not retrieve some live counts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = [
    { title: "Products", value: counts.products, href: "/admin/products", icon: ShoppingBag },
    { title: "Categories", value: counts.categories, href: "/admin/categories", icon: Layers },
    { title: "Skin Types", value: counts.skinTypes, href: "/admin/categories", icon: Shield },
  ];

  const quickLinks = [
    { href: "/admin/products", label: "Manage products", description: "Add, edit, and stock catalogue items" },
    { href: "/admin/categories", label: "Manage categories", description: "Organize products by category" },
    { href: "/admin/categories", label: "Manage skin types", description: "Define skin-type tags for products" },
  ];

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Catalogue Overview</h2>
        <p className="text-sm text-muted-foreground">Live counts for products, categories, and skin types.</p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href} className="no-underline">
            <Card className="hover:border-primary/30 transition-colors">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {kpi.title}
                  </p>
                  {loading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  )}
                </div>
                <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <kpi.icon className="size-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickLinks.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start justify-between gap-2 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent transition-colors no-underline"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{link.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
