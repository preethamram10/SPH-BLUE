"use client";

import React from "react";
import HRSidebar from "@/components/HRSidebar";
import BranchRevenueQualityPanel from "@/components/BranchRevenueQualityPanel";
import MonthlyFeeSpreadPanel from "@/components/MonthlyFeeSpreadPanel";
import { TrendingUp } from "lucide-react";

export default function HRAverageRevenuePage() {
  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/average-revenue" />

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
                    HR & Branch Oversight
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Track branch patient treatment efficiency, ARPU, and average course duration
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Quality Panel */}
          <BranchRevenueQualityPanel
            initialBranch="ALL"
            allowBranchChange={true}
            title="Branch Unit Economics & Average Revenue"
            subtitle="Analyzes treated patient counts, average duration, and quality rates across all branches"
          />

          {/* ADD-ON: Monthly Fee Spread & Averages (Month 1..N, Avg / Month, Avg / Patient-Month) */}
          <MonthlyFeeSpreadPanel
            initialBranch="ALL"
            allowBranchChange={true}
            title="Monthly Fee Spread & Duration Averages"
            subtitle="Plan fees distributed equally across N course months with Avg/Month and Avg/Patient-Month metrics"
          />
        </div>
      </main>
    </div>
  );
}
