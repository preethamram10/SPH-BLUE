"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Users, BarChart3, LogOut } from "lucide-react";
import ReportsAnalyticsDashboard from "@/components/analytics/ReportsAnalyticsDashboard";

export default function HRReportsAnalyticsPage() {
  const handleLogout = () => {
    localStorage.removeItem("user_role");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/hr/dashboard"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>HR Dashboard</span>
          </Link>
          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">HR Reports &amp; Visual Analytics</h1>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
              Loading HR Reports & Visual Analytics...
            </div>
          }
        >
          <ReportsAnalyticsDashboard />
        </Suspense>
      </main>
    </div>
  );
}

