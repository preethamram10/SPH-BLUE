"use client";

import React, { Suspense } from "react";
import HRSidebar from "@/components/HRSidebar";
import ReportsAnalyticsDashboard from "@/components/analytics/ReportsAnalyticsDashboard";

export default function AdminReportsAnalyticsPage() {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/reports-analytics" />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
              Loading Reports & Visual Analytics...
            </div>
          }
        >
          <ReportsAnalyticsDashboard />
        </Suspense>
      </main>
    </div>
  );
}
