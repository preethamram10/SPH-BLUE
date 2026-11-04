"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  Download,
  Filter,
  DollarSign,
  Activity,
} from "lucide-react";

export default function ReportsAnalyticsPage() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [datePeriod, setDatePeriod] = useState("Last 30 Days");

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const kpis = [
    { title: "Total Clinic Visits", value: "1,248", change: "+8.4%", subtitle: "Patient footfall" },
    { title: "New Case Registrations", value: "312", change: "+12.1%", subtitle: "First-time consultations" },
    { title: "Follow-Up Retention", value: "81.6%", change: "+3.2%", subtitle: "Returning chronic cases" },
    { title: "Remedy Dispense Count", value: "2,840", change: "+9.0%", subtitle: "Homeopathy prescriptions" },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/reports-analytics" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Hospital Reports &amp; Analytics</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Executive KPIs, branch comparisons, patient retention &amp; medicine volume
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={datePeriod}
                onChange={(e) => setDatePeriod(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="This Quarter">This Quarter</option>
                <option value="Year to Date">Year to Date</option>
              </select>

              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg shadow-xs transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF Summary</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">{k.title}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-2xl font-extrabold text-slate-900">{k.value}</h3>
                  <span className="text-xs font-extrabold text-emerald-600">{k.change}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-semibold">{k.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Department Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">Chronic vs Acute Cases Treated</h3>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Chronic Illness (Allergy, Thyroid, PCOD, Arthritis)</span>
                    <span className="text-[#0284c7]">74%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#0284c7] h-2 rounded-full" style={{ width: "74%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Acute Illness (Fever, Cough, Migraine)</span>
                    <span className="text-emerald-600">26%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "26%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">Branch Patient Volume Distribution</h3>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>KPHB Main Branch</span>
                    <span>480 patients (38%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#268ec8] h-2 rounded-full" style={{ width: "38%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Chandanagar Branch</span>
                    <span>360 patients (29%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#a8ce3a] h-2 rounded-full" style={{ width: "29%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Nallagandla Branch</span>
                    <span>240 patients (19%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: "19%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Dilshuknagar Branch</span>
                    <span>168 patients (14%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-sky-400 h-2 rounded-full" style={{ width: "14%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

