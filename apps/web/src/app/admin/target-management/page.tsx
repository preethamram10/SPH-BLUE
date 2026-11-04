"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Target,
  Plus,
  Search,
  Filter,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export default function TargetManagementPage() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedPeriod, setSelectedPeriod] = useState("This Month (Nov 2026)");
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const targets = [
    {
      id: "TGT-01",
      title: "Monthly Clinic Revenue Target",
      assignee: "KPHB Main Branch",
      type: "Revenue",
      targetValue: "₹5,00,000",
      achievedValue: "₹4,12,000",
      progress: 82.4,
      deadline: "30 Nov 2026",
      status: "On Track",
    },
    {
      id: "TGT-02",
      title: "New Chronic Patient Conversions",
      assignee: "Chandanagar Branch",
      type: "Conversions",
      targetValue: "120 Patients",
      achievedValue: "98 Patients",
      progress: 81.6,
      deadline: "30 Nov 2026",
      status: "On Track",
    },
    {
      id: "TGT-03",
      title: "Outbound Lead Calling Quota",
      assignee: "Salman Khan (Telecalling)",
      type: "Calling",
      targetValue: "1,500 Calls",
      achievedValue: "1,340 Calls",
      progress: 89.3,
      deadline: "30 Nov 2026",
      status: "High Achiever",
    },
    {
      id: "TGT-04",
      title: "Annual Chronic Package Enrollments",
      assignee: "All Branches",
      type: "Packages",
      targetValue: "50 Packages",
      achievedValue: "32 Packages",
      progress: 64.0,
      deadline: "30 Nov 2026",
      status: "Needs Attention",
    },
  ];

  const filtered = targets.filter(
    (t) => selectedBranch === "All Branches" || t.assignee.includes(selectedBranch.replace(" Branch", ""))
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/target-management" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Target Management &amp; KPIs</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Set and track monthly revenue quotas, patient conversion goals &amp; staff targets
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
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white shadow-2xs"
              >
                <option value="This Month (Nov 2026)">This Month (Nov 2026)</option>
                <option value="Next Month (Dec 2026)">Next Month (Dec 2026)</option>
                <option value="Q4 FY26">Q4 FY26</option>
              </select>

              <button
                onClick={() => setIsAddTargetModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Assign Target</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Overall Target Goal</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">₹18,50,000</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">81.4% Overall Achievement</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Patient Footfall Target</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">1,400 Patients</h3>
              <p className="text-[11px] text-sky-600 font-bold mt-1">1,180 Registered (84.2%)</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Telecalling Quota</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">4,500 Calls</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">3,920 Completed (87.1%)</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Top Performing Branch</p>
              <h3 className="text-xl font-extrabold text-[#0284c7] mt-1">KPHB Main</h3>
              <p className="text-[11px] text-slate-500 font-bold mt-1">92.4% Target Met</p>
            </div>
          </div>

          {/* Targets Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Active Branch &amp; Staff Targets</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Real-time quota progress tracking</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Target Title</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Target Goal</th>
                    <th className="py-3 px-4">Current Achieved</th>
                    <th className="py-3 px-4">Completion Progress</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="text-[11px] text-slate-400">Deadline: {item.deadline}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{item.assignee}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{item.targetValue}</td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-600">{item.achievedValue}</td>
                      <td className="py-3.5 px-4 w-52">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                item.progress >= 80 ? "bg-emerald-500" : item.progress >= 60 ? "bg-[#0284c7]" : "bg-amber-500"
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-extrabold text-slate-800">{item.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                            item.status === "High Achiever" || item.status === "On Track"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Add Target Modal */}
      {isAddTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Assign New Target</h3>
            <p className="text-xs text-slate-500">
              Set revenue or conversion goals for clinic branches or staff members.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Name</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Revenue Goal"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign To Branch / Staff</label>
                <select className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white">
                  {branches.filter((b) => b !== "All Branches").map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Telecalling Team">Telecalling Team</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Amount / Qty</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹4,00,000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddTargetModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert("Target assigned successfully!");
                  setIsAddTargetModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-xs"
              >
                Save Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

