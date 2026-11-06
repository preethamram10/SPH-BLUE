"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  Check,
  X,
  Building2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  LogOut,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function HRMedicalDiscountsPage() {
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Declined" | "All">("Pending");
  const [liveDiscounts, setLiveDiscounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/discounts");
      const data = await res.json();
      if (data.success && Array.isArray(data.discounts)) {
        setLiveDiscounts(data.discounts);
      }
    } catch (err) {
      console.error("Failed to load live discounts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleAction = async (apptId: string, action: "ACCEPT" | "REJECT", discountAmt: number) => {
    setProcessingId(apptId);
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: apptId,
          action,
          approvedAmount: action === "ACCEPT" ? discountAmt : 0,
          notes: action === "ACCEPT" ? "Approved by HR" : "Declined by HR",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Discount request ${action === "ACCEPT" ? "APPROVED" : "REJECTED"} successfully!`);
        fetchDiscounts();
      } else {
        alert(data.error || "Failed to update discount request.");
      }
    } catch (err: any) {
      alert(err.message || "Network error.");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = liveDiscounts.filter((d) => {
    const status = d.discountStatus || "PENDING";
    if (activeTab === "All") return true;
    if (activeTab === "Pending") return status === "PENDING";
    if (activeTab === "Approved") return status === "APPROVED";
    if (activeTab === "Declined") return status === "REJECTED";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Medical Discount Approvals</h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                HR Portal
              </span>
            </div>
            <p className="text-xs text-slate-500">Review reception discount requests & concessions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hr/dashboard"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            ← HR Dashboard
          </Link>
          <button
            type="button"
            onClick={fetchDiscounts}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-4">
        {/* Filter bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            {(["Pending", "Approved", "Declined", "All"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Patient &amp; Phone</th>
                  <th className="py-3 px-4">Branch &amp; Doctor</th>
                  <th className="py-3 px-4">Target Total &amp; Discount</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">HR Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      {isLoading ? "Loading requests..." : `No discount requests under "${activeTab}".`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => {
                    const status = d.discountStatus || "PENDING";
                    const discountAmt = d.discountRequested || 0;
                    const targetAmt = d.consultationFee || 0;
                    const netAmt = Math.max(0, targetAmt - discountAmt);

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{d.patientName || "N/A"}</p>
                          <p className="text-[11px] text-slate-400">{d.phone || d.phoneNumber || "No Phone"}</p>
                          <span className="inline-block mt-0.5 text-[9.5px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {d.registrationId || "ID: N/A"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{d.branch || "All Branches"}</p>
                          <p className="text-[11px] text-slate-500">Dr. {d.doctorName || "Doctor"}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="line-through text-slate-400 text-[11px]">₹{targetAmt}</span>
                            <span className="font-extrabold text-emerald-600 text-sm">₹{netAmt}</span>
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                            Discount: ₹{discountAmt}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                          <p className="text-xs">{d.discountNotes || "No notes provided."}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                              status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {status === "APPROVED"
                              ? "Approved ✓"
                              : status === "REJECTED"
                              ? "Declined ✕"
                              : "Pending Approval"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={processingId === d.id}
                                onClick={() => handleAction(d.id, "ACCEPT", discountAmt)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {processingId === d.id ? "..." : "Accept"}
                              </button>
                              <button
                                type="button"
                                disabled={processingId === d.id}
                                onClick={() => handleAction(d.id, "REJECT", 0)}
                                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                              >
                                {processingId === d.id ? "..." : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold italic">Resolved</span>
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
      </main>
    </div>
  );
}

