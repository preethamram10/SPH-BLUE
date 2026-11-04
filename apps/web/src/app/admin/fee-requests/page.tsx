"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  FileCheck2,
  Check,
  X,
  Filter,
  DollarSign,
  User,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function FeeRequestsPage() {
  const [activeTab, setActiveTab] = useState("Pending");

  const [requests, setRequests] = useState([
    {
      id: "FR-801",
      patientName: "G. Venkateswarlu",
      phone: "+91 9849112233",
      branch: "KPHB Branch",
      originalFee: "₹850",
      requestedFee: "₹500",
      discount: "₹350 (41% Off)",
      reason: "BPL card holder, long term chronic arthritis case",
      requestedBy: "Anil Kumar (Reception)",
      status: "Pending",
      time: "Today, 10:15 AM",
    },
    {
      id: "FR-802",
      patientName: "M. Lakshmi",
      phone: "+91 9701445566",
      branch: "Chandanagar Branch",
      originalFee: "₹1,200",
      requestedFee: "₹800",
      discount: "₹400 (33% Off)",
      reason: "Doctor recommended concession for pediatric follow-up",
      requestedBy: "Ashwini Begari (Reception)",
      status: "Pending",
      time: "Today, 11:30 AM",
    },
    {
      id: "FR-803",
      patientName: "S. Naveen",
      phone: "+91 9988112233",
      branch: "Nallagandla Branch",
      originalFee: "₹15,000",
      requestedFee: "₹12,000",
      discount: "₹3,000 (20% Off)",
      reason: "Annual chronic care package upfront payment discount",
      requestedBy: "Vaishnavi Peri (Staff)",
      status: "Approved",
      time: "Yesterday, 04:00 PM",
    },
  ]);

  const handleAction = (id: string, newStatus: "Approved" | "Declined") => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const filtered = requests.filter((r) =>
    activeTab === "All" ? true : r.status === activeTab
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/fee-requests" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Fee Concession &amp; Discount Requests</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Review and approve special price exemptions submitted by receptionists
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {["Pending", "Approved", "Declined", "All"].map((tab) => (
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
                    <th className="py-3 px-4">Patient &amp; Phone</th>
                    <th className="py-3 px-4">Branch &amp; Staff</th>
                    <th className="py-3 px-4">Fee Structure</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No fee concession requests found under &quot;{activeTab}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{r.patientName}</p>
                          <p className="text-[11px] text-slate-400">{r.phone}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{r.branch}</p>
                          <p className="text-[11px] text-slate-500">{r.requestedBy}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="line-through text-slate-400 text-[11px]">{r.originalFee}</span>
                            <span className="font-extrabold text-emerald-600 text-sm">{r.requestedFee}</span>
                          </div>
                          <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                            {r.discount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">{r.reason}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                              r.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : r.status === "Declined"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {r.status === "Pending" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleAction(r.id, "Approved")}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(r.id, "Declined")}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
                              >
                                Decline
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

