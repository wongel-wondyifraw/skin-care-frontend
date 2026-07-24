"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";

interface Order {
  id: string;
  customer: string;
  date: string;
  amount: string;
  status: "Delivered" | "Shipped" | "Processing" | "Pending";
}

const recentOrders: Order[] = [
  { id: "ORD-7291", customer: "Amara Diallo", date: "Jul 24, 2026", amount: "$124.50", status: "Delivered" },
  { id: "ORD-7290", customer: "Yuki Tanaka", date: "Jul 24, 2026", amount: "$89.00", status: "Processing" },
  { id: "ORD-7289", customer: "Liam Johnson", date: "Jul 23, 2026", amount: "$210.00", status: "Shipped" },
  { id: "ORD-7288", customer: "Sofia Rodriguez", date: "Jul 23, 2026", amount: "$45.20", status: "Pending" }
];

export default function DashboardPage() {
  const [counts, setCounts] = useState({ products: 0, categories: 0, skinTypes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [prodList, catList, skinList] = await Promise.all([
          apiFetch<any[]>("/products"),
          apiFetch<any[]>("/categories"),
          apiFetch<any[]>("/skin-types"),
        ]);
        setCounts({
          products: prodList.length,
          categories: catList.length,
          skinTypes: skinList.length
        });
      } catch (err: unknown) {
        setError("Could not retrieve some live counts.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  function statusBadge(status: Order["status"]) {
    const classes: Record<Order["status"], string> = {
      Delivered: "bg-emerald-100 text-emerald-700",
      Shipped: "bg-amber-100 text-amber-700",
      Processing: "bg-blue-100 text-blue-700",
      Pending: "bg-gray-100 text-gray-700"
    };
    return (
      <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${classes[status]}`}>
        {status}
      </span>
    );
  }

  const kpis = [
    {
      title: "Products",
      value: loading ? "..." : counts.products,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#735c00]">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      )
    },
    {
      title: "Categories",
      value: loading ? "..." : counts.categories,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#735c00]">
          <path d="M4 6h16M4 10h16M4 14h10M4 18h6" />
        </svg>
      )
    },
    {
      title: "Skin Types",
      value: loading ? "..." : counts.skinTypes,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#735c00]">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      title: "Orders",
      value: "142", // Hardcoded for now
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#735c00]">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )
    }
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-[22px] font-medium text-[#1a1c1c] mb-1">Dashboard</h2>
        <p className="text-sm text-[#7f7663]">Real-time statistics & business overview.</p>
      </div>

      {error && (
        <p className="mb-4 text-[13px] text-[#ba1a1a]" role="alert">{error}</p>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#e8e8e8] hover:border-[#d0c5af] p-5 rounded-[20px] transition-all duration-300 shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#7f7663] mb-1.5">
                {kpi.title}
              </span>
              <span className="text-2xl font-bold text-[#1a1c1c] tracking-tight">
                {kpi.value}
              </span>
            </div>
            <div className="w-12 h-12 bg-[#fff8e7] border border-[#d0c5af] rounded-xl flex items-center justify-center shrink-0">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white border border-[#e8e8e8] p-6 rounded-[20px] shadow-sm">
        <h3 className="text-[17px] font-medium text-[#1a1c1c] mb-5">Recent Orders</h3>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#d0c5af] text-[11px] font-semibold tracking-[0.1em] uppercase text-[#7f7663]">
                <th className="pb-3 px-2">Order ID</th>
                <th className="pb-3 px-2">Customer</th>
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2">Amount</th>
                <th className="pb-3 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[#f3f3f3] hover:bg-[#fff8e7]/20 transition-colors duration-150 text-sm text-[#4d4635] last:border-none"
                >
                  <td className="py-3.5 px-2 font-semibold text-[#1a1c1c]">{order.id}</td>
                  <td className="py-3.5 px-2">{order.customer}</td>
                  <td className="py-3.5 px-2 text-xs text-[#7f7663]">{order.date}</td>
                  <td className="py-3.5 px-2 font-medium text-[#1a1c1c]">{order.amount}</td>
                  <td className="py-3.5 px-2 text-right">{statusBadge(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

