"use client";

import React, { useState, useEffect, useMemo } from "react";
import HRSidebar from "@/components/HRSidebar";
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
  RefreshCw,
  Clock,
  CheckCircle2,
  Search,
  ChevronDown,
} from "lucide-react";

export default function HRFeeRequestsPage() {
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Declined" | "All">("Pending");
  const [monthsFilter, setMonthsFilter] = useState<number>(2); // Default 2 months of history
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [liveDiscounts, setLiveDiscounts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch live discount requests from API (scoped to months)
  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("months", String(monthsFilter));
      if (selectedBranch && selectedBranch !== "All Branches") {
        params.set("branch", selectedBranch);
      }

      const res = await fetch(`/api/admin/discounts?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.discounts)) {
        setLiveDiscounts(data.discounts);
        if (data.stats) {
          setStats(data.stats);
        } else {
          setStats({
            total: data.discounts.length,
            pending: data.discounts.filter((d: any) => (d.discountStatus || "PENDING") === "PENDING").length,
            approved: data.discounts.filter((d: any) => d.discountStatus === "APPROVED").length,
            rejected: data.discounts.filter((d: any) => d.discountStatus === "REJECTED").length,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load live discounts for HR:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [monthsFilter, selectedBranch]);

  const handleAction = async (apptId: string, action: "ACCEPT" | "REJECT", discountAmt: number) => {
    let customNote = "";
    if (action === "REJECT") {
      const promptNote = window.prompt("Reason for rejecting discount concession (optional):", "Concession limit exceeded");
      if (promptNote === null) return;
      customNote = promptNote.trim() || "Declined by HR";
    }

    setProcessingId(apptId);
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: apptId,
          action,
          approvedAmount: action === "ACCEPT" ? discountAmt : 0,
          notes: customNote || (action === "ACCEPT" ? "Approved by HR" : "Declined by HR"),
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

  const branchList = useMemo(() => {
    const list = new Set<string>();
    liveDiscounts.forEach((d) => {
      if (d.branch) list.add(d.branch);
    });
    return ["All Branches", ...Array.from(list)];
  }, [liveDiscounts]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return liveDiscounts.filter((d) => {
      const status = d.discountStatus || "PENDING";

      if (activeTab === "Pending" && status !== "PENDING") return false;
      if (activeTab === "Approved" && status !== "APPROVED") return false;
      if (activeTab === "Declined" && status !== "REJECTED") return false;

      if (q) {
        const pName = (d.patientName || "").toLowerCase();
        const phone = (d.phone || d.phoneNumber || "").toLowerCase();
        const reg = (d.registrationId || "").toLowerCase();
        const doc = (d.doctorName || "").toLowerCase();
        const branch = (d.branch || "").toLowerCase();
        const notes = (d.discountNotes || "").toLowerCase();

        if (
          !pName.includes(q) &&
          !phone.includes(q) &&
          !reg.includes(q) &&
          !doc.includes(q) &&
          !branch.includes(q) &&
          !notes.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [liveDiscounts, activeTab, searchQuery]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/fee-requests" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">
                  Medical Discount &amp; Fee Concession Requests
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Last {monthsFilter} Months Data
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Review, approve, or reject discount requests. Showing {monthsFilter} months history across all clinic branches.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient, phone, reg ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-44 sm:w-56"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Timeframe Filter (1 Month, 2 Months, All Time) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { label: "1 Month", val: 1 },
                  { label: "2 Months", val: 2 },
                  { label: "All History", val: 12 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setMonthsFilter(item.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      monthsFilter === item.val
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchDiscounts}
                disabled={isLoading}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                title="Refresh Requests"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">
              Filter by Status:
            </span>

            {/* Pending Tab */}
            <button
              onClick={() => setActiveTab("Pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "Pending"
                  ? "bg-amber-600 text-white shadow-xs shadow-amber-200"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Requests</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "Pending" ? "bg-white/25 text-white" : "bg-amber-200 text-amber-900"
                }`}
              >
                {stats.pending}
              </span>
            </button>

            {/* Approved Tab */}
            <button
              onClick={() => setActiveTab("Approved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "Approved"
                  ? "bg-emerald-600 text-white shadow-xs shadow-emerald-200"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "Approved" ? "bg-white/25 text-white" : "bg-emerald-200 text-emerald-900"
                }`}
              >
                {stats.approved}
              </span>
            </button>

            {/* Declined / Rejected Tab */}
            <button
              onClick={() => setActiveTab("Declined")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "Declined"
                  ? "bg-rose-600 text-white shadow-xs shadow-rose-200"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200"
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Declined / Rejected</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "Declined" ? "bg-white/25 text-white" : "bg-rose-200 text-rose-900"
                }`}
              >
                {stats.rejected}
              </span>
            </button>

            {/* All History Tab */}
            <button
              onClick={() => setActiveTab("All")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "All"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              <span>All Requests</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "All" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-800"
                }`}
              >
                {stats.total}
              </span>
            </button>
          </div>
        </header>

        <div className="p-7 max-w-7xl">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Patient &amp; Phone</th>
                    <th className="py-3 px-4">Branch &amp; Doctor</th>
                    <th className="py-3 px-4">Target Total &amp; Discount</th>
                    <th className="py-3 px-4">Reason &amp; Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action / Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                            <span>Loading discount requests...</span>
                          </div>
                        ) : (
                          `No medical discount requests found under "${activeTab}" for the selected timeframe.`
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d) => {
                      const status = d.discountStatus || "PENDING";
                      const discountRequested = d.discountRequested || 0;
                      const discountApproved = typeof d.discountApproved === "number" ? d.discountApproved : discountRequested;
                      const targetAmt = d.consultationFee || 0;
                      const effectiveDiscount = status === "APPROVED" ? discountApproved : discountRequested;
                      const netAmt = Math.max(0, targetAmt - effectiveDiscount);

                      const dateFormatted = d.discountRespondedAt
                        ? new Date(d.discountRespondedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
                        : d.appointmentDate || (d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN") : "Recent");

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{d.patientName || "N/A"}</p>
                            <p className="text-[11px] text-slate-400">{d.phone || d.phoneNumber || "No Phone"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block text-[9.5px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {d.registrationId || "ID: N/A"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                • {dateFormatted}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">{d.branch || "All Branches"}</p>
                            <p className="text-[11px] text-slate-500">
                              {d.doctorName?.startsWith("Dr.") ? d.doctorName : `Dr. ${d.doctorName || "Doctor"}`}
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="line-through text-slate-400 text-[11px]">₹{targetAmt}</span>
                              <span className="font-extrabold text-emerald-600 text-sm">
                                ₹{status === "REJECTED" ? targetAmt : netAmt}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${
                                status === "APPROVED"
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : status === "REJECTED"
                                  ? "text-rose-700 bg-rose-50 border-rose-200 line-through"
                                  : "text-amber-800 bg-amber-50 border-amber-200"
                              }`}
                            >
                              {status === "APPROVED"
                                ? `Concession: ₹${discountApproved}`
                                : `Requested: ₹${discountRequested}`}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                            <p className="text-xs font-medium">{d.discountNotes || "Standard concession request."}</p>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border inline-flex items-center gap-1 ${
                                status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {status === "APPROVED" ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Approved</span>
                                </>
                              ) : status === "REJECTED" ? (
                                <>
                                  <X className="w-3 h-3" />
                                  <span>Declined</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={processingId === d.id}
                                  onClick={() => handleAction(d.id, "ACCEPT", discountRequested)}
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
                              <div className="flex flex-col items-end">
                                <span className={`text-[11px] font-extrabold ${status === "APPROVED" ? "text-emerald-700" : "text-rose-600"}`}>
                                  {status === "APPROVED" ? "Concession Settled ✓" : "Declined by HR ✕"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {dateFormatted}
                                </span>
                              </div>
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
    </div>
  );
}
