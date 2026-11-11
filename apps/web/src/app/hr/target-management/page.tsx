"use client";

import React, { useState, useEffect } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  Target,
  Plus,
  Search,
  Filter,
  Building2,
  DollarSign,
  TrendingUp,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  AlertCircle,
  Lock,
  Unlock,
  Check,
  X,
} from "lucide-react";

interface BranchTargetItem {
  id: string;
  branch: string;
  branchId: string;
  monthYear: string;
  targetGoal: number;
  targetReached: number;
  percentage: number;
  remaining: number;
  status: string;
  completedAppointmentsCount: number;
  setByRole: "ADMIN" | "HR" | null;
  setByName: string | null;
  hrLocked: boolean;
  canEdit: boolean;
}

interface MonthOption {
  key: string;
  label: string;
  isNextMonth?: boolean;
  isCurrentMonth?: boolean;
  isPastMonth?: boolean;
  windowOpen?: boolean;
}

export default function TargetManagementPage() {
  const [userRole, setUserRole] = useState<"ADMIN" | "HR">("ADMIN");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthsList, setMonthsList] = useState<MonthOption[]>([]);
  const [branches, setBranches] = useState<BranchTargetItem[]>([]);
  const [totalGoal, setTotalGoal] = useState(0);
  const [totalReached, setTotalReached] = useState(0);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [isNextMonthWindowOpen, setIsNextMonthWindowOpen] = useState(false);
  const [daysUntilWindow, setDaysUntilWindow] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("All Branches");

  // Edit / Set Target Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchTargetItem | null>(null);
  const [inputTargetAmount, setInputTargetAmount] = useState("");
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  // Check if current user is HR or Admin (from localStorage or default to ADMIN)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_role") || localStorage.getItem("role");
      if (stored && stored.toUpperCase() === "HR") {
        setUserRole("HR");
      }
    } catch {
      // fallback
    }
  }, []);

  const fetchTargets = async (monthKey?: string) => {
    setIsLoading(true);
    try {
      const url = `/api/admin/targets?role=${userRole}${monthKey ? `&month=${encodeURIComponent(monthKey)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBranches(data.branches || []);
        setTotalGoal(data.totalGoal || 0);
        setTotalReached(data.totalReached || 0);
        setOverallPercentage(data.overallPercentage || 0);
        setIsNextMonthWindowOpen(data.isNextMonthWindowOpen);
        setDaysUntilWindow(data.daysUntilNextMonthWindow || 0);
        if (Array.isArray(data.monthsList) && data.monthsList.length > 0) {
          setMonthsList(data.monthsList);
          if (!selectedMonth) {
            setSelectedMonth(data.monthYear);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load branch targets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets(selectedMonth || undefined);
  }, [selectedMonth, userRole]);

  const handleOpenEdit = (b: BranchTargetItem) => {
    setEditBranch(b);
    setInputTargetAmount(b.targetGoal > 0 ? String(b.targetGoal) : "");
    setIsEditModalOpen(true);
  };

  const handleSaveTarget = async () => {
    if (!editBranch) return;
    const num = parseFloat(inputTargetAmount);
    if (isNaN(num) || num < 0) {
      alert("Please enter a valid numeric target amount (₹).");
      return;
    }

    setIsSavingTarget(true);
    try {
      const res = await fetch("/api/admin/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: editBranch.branch,
          monthYear: selectedMonth,
          targetAmount: num,
          role: userRole,
          userName: userRole === "ADMIN" ? "Admin" : "HR Manager",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || `Target for ${editBranch.branch} saved successfully!`);
        setIsEditModalOpen(false);
        fetchTargets(selectedMonth);
      } else {
        alert(data.error || "Failed to save target.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to communicate with server.");
    } finally {
      setIsSavingTarget(false);
    }
  };

  const filteredBranches = branches.filter((b) => {
    if (selectedBranchFilter === "All Branches") return true;
    return b.branch.toLowerCase().includes(selectedBranchFilter.toLowerCase().replace(/branch/gi, "").trim());
  });

  const selectedMonthObj = monthsList.find((m) => m.key === selectedMonth);
  const isSelectedNextMonth = Boolean(selectedMonthObj?.isNextMonth);
  const isNextMonthLocked = isSelectedNextMonth && !isNextMonthWindowOpen;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/target-management" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">
                  Branch Target &amp; Monthly Revenue Goals
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Viewing as: {userRole}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Set monthly branch revenue targets and track live payment collections per branch in real time
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Role Toggle for Testing */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setUserRole("ADMIN")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    userRole === "ADMIN" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setUserRole("HR")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    userRole === "HR" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  HR
                </button>
              </div>

              {/* Month Selector (Historical, Current & Next Month) */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <Calendar className="w-4 h-4 text-[#0284c7]" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {monthsList.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} {m.isNextMonth ? (m.windowOpen ? "• Open" : "• Unlocks in last 3 days") : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => fetchTargets(selectedMonth)}
                disabled={isLoading}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-7 max-w-7xl space-y-6">
          {/* Next Month Window Notification Banner */}
          {isSelectedNextMonth && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                isNextMonthWindowOpen
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isNextMonthWindowOpen ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <span className="font-extrabold block">
                    {isNextMonthWindowOpen
                      ? "Next Month Target Entry Is OPEN (3 Days Before Month End)"
                      : `Next Month Target Locked • Opens in ${daysUntilWindow} Day(s)`}
                  </span>
                  <span className="text-[11px] opacity-85">
                    {isNextMonthWindowOpen
                      ? "HR and Admin can now set targets for next month for all branches."
                      : "Per hospital policy, targets for the upcoming month automatically unlock during the final 3 days of the active month."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Target Goal
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{totalGoal.toLocaleString()}</p>
              <span className="text-[11px] text-slate-500 font-medium">All Branches Combined</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Live Revenue Reached
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                ₹{totalReached.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">Completed Appointments</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Overall Progress
              </span>
              <p className="text-2xl font-black text-[#0284c7] mt-1">{overallPercentage}%</p>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, overallPercentage)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Remaining Deficit
              </span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                ₹{Math.max(0, totalGoal - totalReached).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">To reach monthly quota</span>
            </div>
          </div>

          {/* Branch Target Cards List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                  Branch Breakdown ({filteredBranches.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="All Branches">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.branchId} value={b.branch}>
                      {b.branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Branch Name</th>
                    <th className="py-3 px-4">Target Goal (₹)</th>
                    <th className="py-3 px-4">Live Reached (₹)</th>
                    <th className="py-3 px-4">Progress (% Goal)</th>
                    <th className="py-3 px-4">Remaining (₹)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Configured By</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        No branches found.
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((b) => {
                      const isLocked = isNextMonthLocked || (!b.canEdit && userRole === "HR");

                      return (
                        <tr key={b.branchId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-black text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-[#0284c7]" />
                              <span>{b.branch}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold pl-5.5">
                              {b.completedAppointmentsCount} paid consultations
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {b.targetGoal > 0 ? `₹${b.targetGoal.toLocaleString()}` : "Not Set"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-black text-emerald-600 text-sm">
                              ₹{b.targetReached.toLocaleString()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 min-w-[130px]">
                            <div className="flex items-center justify-between text-[11px] font-extrabold mb-1">
                              <span className="text-[#0284c7]">{b.percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  b.percentage >= 100
                                    ? "bg-emerald-500"
                                    : b.percentage >= 75
                                    ? "bg-[#0284c7]"
                                    : b.percentage >= 40
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.min(100, b.percentage)}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-600">
                            ₹{b.remaining.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                b.status === "Achieved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : b.status === "On Track"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : b.status === "In Progress"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : b.status === "Not Set"
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {b.setByRole ? (
                              <div>
                                <span className="font-bold text-slate-700">{b.setByName || b.setByRole}</span>
                                {b.hrLocked && (
                                  <span className="block text-[9.5px] text-amber-600 font-semibold">
                                    HR Locked
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Default</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isLocked ? (
                              <button
                                type="button"
                                disabled
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed"
                                title={
                                  isNextMonthLocked
                                    ? "Next month target unlocks 3 days before month end"
                                    : "HR can only set target once per month. Only Admin can update."
                                }
                              >
                                <Lock className="w-3 h-3" />
                                <span>Locked</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(b)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 text-[#0284c7] hover:bg-[#0284c7] hover:text-white border border-sky-200 text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>{b.targetGoal > 0 ? "Edit Target" : "Set Target"}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Set / Edit Target Modal */}
      {isEditModalOpen && editBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Set Monthly Target</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {editBranch.branch} • {selectedMonth}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Target Revenue Amount (₹)
                </label>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-sky-500">
                  <span className="font-bold text-slate-500 text-sm">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={inputTargetAmount}
                    onChange={(e) => setInputTargetAmount(e.target.value)}
                    className="w-full font-black text-slate-900 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {userRole === "HR" && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Note: As HR, you can only set this target once per month. Once saved, only Admin can edit it.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-slate-300 font-bold text-slate-700 text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingTarget}
                onClick={handleSaveTarget}
                className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-xs disabled:opacity-50"
              >
                {isSavingTarget ? "Saving..." : "Save Target"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
