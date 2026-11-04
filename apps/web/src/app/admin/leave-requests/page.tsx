"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  CalendarX,
  Check,
  X,
  Filter,
  Calendar,
  Clock,
  User,
  Building2,
  AlertCircle,
} from "lucide-react";

export default function LeaveRequestsPage() {
  const [activeTab, setActiveTab] = useState("Pending");

  const [leaves, setLeaves] = useState([
    {
      id: "LR-301",
      employeeName: "Anil Kumar M",
      role: "Regular Staff",
      branch: "KPHB Branch",
      type: "Sick Leave",
      fromDate: "10 Nov 2026",
      toDate: "11 Nov 2026",
      totalDays: "2 Days",
      reason: "Viral fever and doctor consultation",
      status: "Pending",
      appliedOn: "04 Nov 2026",
    },
    {
      id: "LR-302",
      employeeName: "Dr. Padma priya",
      role: "Doctor",
      branch: "Nallagandla Branch",
      type: "Casual Leave",
      fromDate: "15 Nov 2026",
      toDate: "16 Nov 2026",
      totalDays: "2 Days",
      reason: "Family event / out of station",
      status: "Pending",
      appliedOn: "03 Nov 2026",
    },
    {
      id: "LR-303",
      employeeName: "Preetham Ram",
      role: "Regular Staff",
      branch: "KPHB Branch",
      type: "Personal Leave",
      fromDate: "01 Nov 2026",
      toDate: "02 Nov 2026",
      totalDays: "2 Days",
      reason: "Personal urgent work",
      status: "Approved",
      appliedOn: "28 Oct 2026",
    },
  ]);

  const handleAction = (id: string, newStatus: "Approved" | "Rejected") => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
  };

  const filtered = leaves.filter((l) =>
    activeTab === "All" ? true : l.status === activeTab
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/leave-requests" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <CalendarX className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Leave Requests &amp; Approvals</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Review and approve leave applications for doctors and clinic staff
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {["Pending", "Approved", "Rejected", "All"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Branch &amp; Role</th>
                    <th className="py-3 px-4">Leave Duration</th>
                    <th className="py-3 px-4">Type &amp; Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No leave requests under &quot;{activeTab}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{item.employeeName}</p>
                          <p className="text-[11px] text-slate-400">Applied: {item.appliedOn}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{item.role}</p>
                          <p className="text-[11px] text-slate-500">{item.branch}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">
                            {item.fromDate} to {item.toDate}
                          </p>
                          <span className="text-[10.5px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                            {item.totalDays}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{item.type}</p>
                          <p className="text-slate-500 text-[11.5px] max-w-xs">{item.reason}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                              item.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {item.status === "Pending" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleAction(item.id, "Approved")}
                                className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Approve Leave"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleAction(item.id, "Rejected")}
                                className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                                title="Reject Leave"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

