"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import BranchRevenueQualityPanel from "@/components/BranchRevenueQualityPanel";
import { TrendingUp, Sparkles, RefreshCw, Layers } from "lucide-react";

export default function AdminAverageRevenuePage() {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  const handleReconcile = async () => {
    setIsBackfilling(true);
    setBackfillMsg(null);
    try {
      const res = await fetch("/api/admin/branch-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconcile" }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.report.discrepanciesCount === 0) {
          setBackfillMsg("Reconciliation passed with 0 discrepancies found.");
        } else {
          setBackfillMsg(`Reconciliation noted ${data.report.discrepanciesCount} items.`);
        }
      }
    } catch {
      setBackfillMsg("Reconciliation request failed");
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleBackfill = async () => {
    if (!confirm("Re-compute all branch metrics summary tables from raw payments history?")) return;
    setIsBackfilling(true);
    setBackfillMsg(null);
    try {
      const res = await fetch("/api/admin/branch-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backfill", reset: true }),
      });
      const data = await res.json();
      if (data.success) {
        setBackfillMsg(`Summary tables re-indexed successfully (${data.stats.totalRows} months, ${data.stats.patientRows} patients).`);
        window.location.reload();
      }
    } catch {
      setBackfillMsg("Backfill request failed");
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/average-revenue" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <div className="w-full max-w-[1500px] mx-auto p-3.5 space-y-4">
          {/* Top Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 px-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shadow-2xs">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">
                    Average Revenue & Quality Metrics
                  </h1>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    High-Performance Fast Read
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Unit economics, course duration metrics, and average revenue per patient (ARPU) across all clinic branches
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReconcile}
                disabled={isBackfilling}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Reconcile Ledger</span>
              </button>

              <button
                type="button"
                onClick={handleBackfill}
                disabled={isBackfilling}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBackfilling ? "animate-spin" : ""}`} />
                <span>Sync Summary</span>
              </button>
            </div>
          </div>

          {backfillMsg && (
            <div className="p-2.5 px-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{backfillMsg}</span>
            </div>
          )}

          {/* Revenue Quality Panel */}
          <BranchRevenueQualityPanel
            initialBranch="ALL"
            allowBranchChange={true}
            title="Clinic Revenue Quality & Unit Economics"
            subtitle="Derived from summary tables (branch_month_totals & branch_month_patients) with zero table scans"
          />
        </div>
      </main>
    </div>
  );
}
