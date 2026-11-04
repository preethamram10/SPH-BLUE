"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  Wallet,
} from "lucide-react";

export default function TotalRevenuePage() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [dateRange, setDateRange] = useState("This Month");

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const stats = [
    { label: "Total Gross Revenue", value: "₹4,82,500", change: "+14.2% vs last month", isPositive: true, icon: DollarSign },
    { label: "Today's Collection", value: "₹24,800", change: "18 transactions today", isPositive: true, icon: TrendingUp },
    { label: "Cash Collections", value: "₹1,45,200", change: "30.1% of total", isPositive: true, icon: Wallet },
    { label: "Digital & UPI", value: "₹3,37,300", change: "69.9% of total", isPositive: true, icon: CreditCard },
  ];

  const branchBreakdown = [
    { branch: "KPHB Branch", revenue: "₹1,85,400", footfall: 142, share: "38.4%" },
    { branch: "Chandanagar Branch", revenue: "₹1,42,100", footfall: 118, share: "29.4%" },
    { branch: "Nallagandla Branch", revenue: "₹95,000", footfall: 86, share: "19.7%" },
    { branch: "Dilshuknagar Branch", revenue: "₹60,000", footfall: 54, share: "12.5%" },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/total-revenue" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Total Revenue & Collections</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Financial analytics, branch collections breakdown & payment modes
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white shadow-2xs"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white shadow-2xs"
              >
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Quarter">This Quarter</option>
              </select>

              <button className="flex items-center gap-1 px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg shadow-xs transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-7 space-y-6 max-w-7xl">
          {/* Key Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{s.label}</span>
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-2">{s.value}</h3>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{s.change}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Branch Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Branch Revenue Performance</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Real-time collections by location</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Clinic Branch</th>
                    <th className="py-2.5 px-3">Total Footfalls</th>
                    <th className="py-2.5 px-3">Gross Collections</th>
                    <th className="py-2.5 px-3">Revenue Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {branchBreakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 flex items-center gap-2 font-bold text-slate-900">
                        <Building2 className="w-3.5 h-3.5 text-[#0284c7]" />
                        <span>{item.branch}</span>
                      </td>
                      <td className="py-3 px-3">{item.footfall} patients</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">{item.revenue}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#0284c7] h-1.5 rounded-full" style={{ width: item.share }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500">{item.share}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

