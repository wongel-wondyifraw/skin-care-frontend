"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../../../lib/api";

export default function DashboardPage() {
  const [counts, setCounts] = useState({ products: 0, categories: 0, skinTypes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodList, catList, skinList] = await Promise.all([
          apiFetch<unknown[]>("/products"),
          apiFetch<unknown[]>("/categories"),
          apiFetch<unknown[]>("/skin-types"),
        ]);
        if (cancelled) return;
        setCounts({
          products: prodList.length,
          categories: catList.length,
          skinTypes: skinList.length,
        });
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
    {
      title: "Products",
      value: loading ? "…" : counts.products,
      href: "/admin/products",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      title: "Categories",
      value: loading ? "…" : counts.categories,
      href: "/admin/categories",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary">
          <path d="M4 6h16M4 10h16M4 14h10M4 18h6" />
        </svg>
      ),
    },
    {
      title: "Skin Types",
      value: loading ? "…" : counts.skinTypes,
      href: "/admin/settings/skin-types",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  ];

  const quickLinks = [
    { href: "/admin/products", label: "Manage products", description: "Add, edit, and stock catalogue items" },
    { href: "/admin/categories", label: "Manage categories", description: "Organize products by category" },
    { href: "/admin/settings/skin-types", label: "Manage skin types", description: "Define skin-type tags for products" },
  ];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-[22px] font-medium text-on-background mb-1">Catalogue overview</h2>
        <p className="text-sm text-outline">Live counts for products, categories, and skin types.</p>
      </div>

      {error && (
        <p className="mb-4 text-[13px] text-error" role="alert">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {kpis.map((kpi) => (
          <Link
            key={kpi.title}
            href={kpi.href}
            className="bg-white border border-[#e8e8e8] hover:border-outline-variant p-5 rounded-[20px] transition-all duration-300 flex items-center justify-between no-underline"
          >
            <div>
              <span className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-outline mb-1.5">
                {kpi.title}
              </span>
              <span className="text-2xl font-bold text-on-background tracking-tight">
                {kpi.value}
              </span>
            </div>
            <div className="w-12 h-12 bg-[#fff8e7] border border-outline-variant rounded-xl flex items-center justify-center shrink-0">
              {kpi.icon}
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-[#e8e8e8] p-6 rounded-[20px]">
        <h3 className="text-[17px] font-medium text-on-background mb-5">Quick links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block p-4 rounded-xl border border-outline-variant hover:bg-[#fff8e7] transition-colors no-underline"
            >
              <span className="block text-sm font-semibold text-primary mb-1">{link.label}</span>
              <span className="block text-[13px] text-outline">{link.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
