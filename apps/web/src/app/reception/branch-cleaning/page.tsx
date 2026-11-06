"use client";

import React, { useState, useEffect } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import ReceptionCleaningLockoutView from "@/components/cleaning/ReceptionCleaningLockoutView";
import { Sparkles, Calendar, Clock, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";
import { getTodayDDMMYYYY } from "@/utils/cleaningDate";

export default function ReceptionBranchCleaningPage() {
  const [branchName, setBranchName] = useState("Kphb");
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("branch_name") || localStorage.getItem("user_branch");
    if (saved) setBranchName(saved);
  }, []);

  const checkTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cleaning/lockout?branchName=${encodeURIComponent(branchName)}`);
      const data = await res.json();
      if (data.success && data.task) {
        setActiveTask(data.task);
      } else {
        setActiveTask(null);
      }
    } catch (err) {
      console.error("Failed to check cleaning audit:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchName) checkTask();
  }, [branchName]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <ReceptionSidebar activePage="branch-cleaning" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900">
                Daily Branch Cleaning &amp; Hygiene Audit
              </h1>
              <p className="text-[11.5px] text-slate-500">
                Upload photos for each allocated area and send for Admin / HR verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-black text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{branchName}</span>
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-bold">
              Loading cleaning audit...
            </div>
          ) : activeTask ? (
            <ReceptionCleaningLockoutView
              initialTask={activeTask}
              branchName={branchName}
              onUnlocked={() => checkTask()}
              isFullLockoutScreen={false}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                No Mandatory Cleaning Audit Pending
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                There is currently no pending or rejected cleaning task assigned for <strong>{branchName}</strong> on today&apos;s date ({getTodayDDMMYYYY()}). When Admin or HR assigns a cleaning audit, the required inspection areas will appear here for photo upload.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
