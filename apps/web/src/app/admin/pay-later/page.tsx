"use client";

import React, { useState, useEffect, useMemo } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { getBranchPhone } from "@/app/reception/medical-requests/pdf";
import {
  Clock,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  CreditCard,
  User,
  RefreshCw,
} from "lucide-react";

interface PayLaterRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  appointmentId?: string;
  branch: string;
  doctorName?: string;
  totalBill: number;
  paidAmount: number;
  dueAmount: number;
  status: "PENDING" | "CLEARED" | "CANCELLED";
  createdAt: string;
  dueDate?: string;
  clearedAt?: string;
  clearedInAppointmentId?: string;
  notes?: string;
  paymentMode?: string;
}

const BRANCHES = [
  "All Branches",
  "KPHB",
  "Chandanagar",
  "Dilshuknagar",
  "Nallagandla",
];

type DateFilterPreset = "THIS_MONTH" | "LAST_MONTH" | "ALL_HISTORY" | "CUSTOM";

export default function AdminPayLaterPage() {
  const [records, setRecords] = useState<PayLaterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "CLEARED">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  // Date Range Filters (Default: THIS_MONTH)
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("THIS_MONTH");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [dateBounds, setDateBounds] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  // Settle modal
  const [settlingRecord, setSettlingRecord] = useState<PayLaterRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleMethod, setSettleMethod] = useState<string>("UPI");
  const [settleNotes, setSettleNotes] = useState<string>("");
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Compute date boundaries inside useEffect to avoid blocking Next.js client prerender
  useEffect(() => {
    const now = new Date();
    if (datePreset === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      setDateBounds({ start, end });
    } else if (datePreset === "LAST_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      setDateBounds({ start, end });
    } else if (datePreset === "CUSTOM") {
      const start = customFromDate ? new Date(`${customFromDate}T00:00:00`) : null;
      const end = customToDate ? new Date(`${customToDate}T23:59:59`) : null;
      setDateBounds({ start, end });
    } else {
      setDateBounds({ start: null, end: null });
    }
  }, [datePreset, customFromDate, customToDate]);

  const fetchPayLaterData = async () => {
    setIsLoading(true);
    try {
      const recRes = await fetch("/api/pay-later");
      const recData = await recRes.json();
      if (recData && recData.success) {
        setRecords(recData.records || []);
      }
    } catch (e) {
      console.error("Failed to load Pay Later records:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayLaterData();
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Date filter
      if (dateBounds.start || dateBounds.end) {
        const itemDate = new Date(r.createdAt);
        if (dateBounds.start && itemDate < dateBounds.start) return false;
        if (dateBounds.end && itemDate > dateBounds.end) return false;
      }

      // Branch filter
      if (selectedBranch !== "All Branches") {
        const branchMatch = (r.branch || "").toLowerCase().includes(selectedBranch.toLowerCase());
        if (!branchMatch) return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && r.status !== statusFilter) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.patientName || "").toLowerCase().includes(q);
        const phoneMatch = (r.patientPhone || "").includes(q);
        const branchMatch = (r.branch || "").toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !branchMatch) return false;
      }
      return true;
    });
  }, [records, dateBounds, selectedBranch, statusFilter, searchQuery]);

  // Dynamic summary metrics
  const metrics = useMemo(() => {
    const dateFiltered = records.filter((r) => {
      if (dateBounds.start || dateBounds.end) {
        const itemDate = new Date(r.createdAt);
        if (dateBounds.start && itemDate < dateBounds.start) return false;
        if (dateBounds.end && itemDate > dateBounds.end) return false;
      }
      return true;
    });

    const totalPending = dateFiltered
      .filter((r) => r.status === "PENDING")
      .reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);

    const totalCleared = dateFiltered
      .filter((r) => r.status === "CLEARED")
      .reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);

    const pendingCount = dateFiltered.filter((r) => r.status === "PENDING").length;

    return {
      totalPending,
      totalCleared,
      pendingCount,
      totalRecords: dateFiltered.length,
    };
  }, [records, dateBounds]);

  const handleOpenSettleModal = (record: PayLaterRecord) => {
    setSettlingRecord(record);
    setSettleAmount(String(record.dueAmount));
    setSettleMethod("UPI");
    setSettleNotes(`Cleared by Admin on ${new Date().toLocaleDateString("en-IN")}`);
  };

  const handleConfirmSettle = async () => {
    if (!settlingRecord) return;
    const amt = parseFloat(settleAmount) || 0;
    if (amt <= 0) {
      alert("Please enter a valid amount to settle.");
      return;
    }

    setIsSubmittingSettle(true);
    try {
      const res = await fetch("/api/pay-later", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settle",
          payLaterId: settlingRecord.id,
          settledAmount: amt,
          paymentMode: settleMethod,
          notes: settleNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Balance settled successfully!");
        setSettlingRecord(null);
        fetchPayLaterData();
      } else {
        alert(data.error || "Failed to settle balance.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while settling balance.");
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const sendWhatsAppReminder = (r: PayLaterRecord) => {
    const cleanPhone = (r.patientPhone || "").replace(/\D/g, "").slice(-10);
    if (!cleanPhone) {
      alert("No valid phone number for this patient.");
      return;
    }
    const msg = encodeURIComponent(
      `Dear ${r.patientName},\n\n` +
      `This is a gentle reminder regarding your pending balance of ₹${r.dueAmount.toLocaleString()} from your visit at ${r.branch || "Spiritual Homeopathy"}.\n\n` +
      `Total Bill: ₹${r.totalBill.toLocaleString()}\n` +
      `Paid at Clinic: ₹${r.paidAmount.toLocaleString()}\n` +
      `Pending Pay Later Due: ₹${r.dueAmount.toLocaleString()}\n\n` +
      `You may clear this balance at your next visit or via UPI to sseomni9k9v0j291124pos@mairtel.\n\n` +
      `Thank you,\nSpiritual Homeopathy Clinics (${r.branch || "Clinic"})\nBranch Contact: ${getBranchPhone(r.branch)}`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-xs">
      <AdminSidebar currentPath="/admin/pay-later" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Compact Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#268ec8] to-[#a8ce3a] flex items-center justify-center text-white shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">Pay Later &amp; Pending Dues</h1>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-100 text-[#0284c7] border border-sky-200">
                    Finance
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Track and settle partial fee payments and carried-forward patient balances</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPayLaterData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#0284c7] ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-5 max-w-7xl w-full mx-auto space-y-4">
          {/* Compact Date Range Filter Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Date Filter:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg gap-0.5">
                  {(
                    [
                      { key: "THIS_MONTH", label: "This Month" },
                      { key: "LAST_MONTH", label: "Last Month" },
                      { key: "ALL_HISTORY", label: "All History" },
                      { key: "CUSTOM", label: "Custom Range" },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => setDatePreset(preset.key)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        datePreset === preset.key
                          ? "bg-[#268ec8] text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Pickers */}
              {datePreset === "CUSTOM" && (
                <div className="flex items-center gap-2 flex-wrap animate-in fade-in duration-150">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                    <span className="text-[10px] font-bold text-slate-500">From:</span>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="text-[11px] text-slate-800 bg-transparent focus:outline-hidden font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                    <span className="text-[10px] font-bold text-slate-500">To:</span>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="text-[11px] text-slate-800 bg-transparent focus:outline-hidden font-medium"
                    />
                  </div>
                  {(customFromDate || customToDate) && (
                    <button
                      onClick={() => {
                        setCustomFromDate("");
                        setCustomToDate("");
                      }}
                      className="text-[10px] text-[#0284c7] font-bold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Compact Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Pending */}
            <div className="bg-gradient-to-br from-[#0284c7] to-[#0369a1] rounded-xl p-3.5 text-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky-100 uppercase tracking-wider">Total Pending Due</span>
                <span className="p-1 bg-white/20 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5 text-white" />
                </span>
              </div>
              <p className="text-xl font-black mt-1 tracking-tight">
                ₹{metrics.totalPending.toLocaleString()}
              </p>
              <p className="text-[10px] text-sky-100 mt-0.5">
                {datePreset === "THIS_MONTH" ? "This Month" : datePreset === "LAST_MONTH" ? "Last Month" : "Selected Period"}
              </p>
            </div>

            {/* Total Cleared */}
            <div className="bg-gradient-to-br from-[#16a34a] to-[#15803d] rounded-xl p-3.5 text-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Total Cleared</span>
                <span className="p-1 bg-white/20 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </span>
              </div>
              <p className="text-xl font-black mt-1 tracking-tight">
                ₹{metrics.totalCleared.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-100 mt-0.5">Settled in follow-up visits</p>
            </div>

            {/* Pending Patients Count */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Profiles</span>
                <span className="p-1 bg-sky-50 rounded-md text-[#0284c7]">
                  <User className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black text-slate-900 mt-1 tracking-tight">
                {metrics.pendingCount}
              </p>
              <p className="text-[10px] text-[#0284c7] font-semibold mt-0.5">Patients with balance</p>
            </div>

            {/* Total Entries */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Bills</span>
                <span className="p-1 bg-emerald-50 rounded-md text-[#16a34a]">
                  <CreditCard className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black text-slate-900 mt-1 tracking-tight">
                {metrics.totalRecords}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">In selected date filter</p>
            </div>
          </div>

          {/* Compact Branch-Wise Breakdown Cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                Branch-Wise Pending ({datePreset === "THIS_MONTH" ? "This Month" : "Selected Period"})
              </h3>
              <span className="text-[10px] font-bold text-[#0284c7]">Click branch to filter</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {["KPHB", "Chandanagar", "Dilshuknagar", "Nallagandla"].map((branch) => {
                const branchRecords = records.filter((r) => {
                  if (dateBounds.start || dateBounds.end) {
                    const d = new Date(r.createdAt);
                    if (dateBounds.start && d < dateBounds.start) return false;
                    if (dateBounds.end && d > dateBounds.end) return false;
                  }
                  return (r.branch || "").toLowerCase().includes(branch.toLowerCase());
                });

                const branchPending = branchRecords
                  .filter((r) => r.status === "PENDING")
                  .reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);
                const count = branchRecords.filter((r) => r.status === "PENDING").length;

                const isSelected = selectedBranch === branch;

                return (
                  <div
                    key={branch}
                    onClick={() => setSelectedBranch(isSelected ? "All Branches" : branch)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#268ec8] bg-sky-50 shadow-2xs"
                        : "border-slate-100 bg-slate-50 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">{branch}</span>
                      <Building2 className={`w-3.5 h-3.5 ${isSelected ? "text-[#0284c7]" : "text-slate-400"}`} />
                    </div>
                    <p className="text-sm font-black text-[#0284c7] mt-1">
                      ₹{branchPending.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{count} pending</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compact Filters & Search Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            {/* Branch Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {BRANCHES.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBranch(b)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    selectedBranch === b
                      ? "bg-[#268ec8] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Status & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg gap-0.5">
                {(["PENDING", "CLEARED", "ALL"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      statusFilter === st
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {st === "PENDING" ? "⏳ Pending" : st === "CLEARED" ? "✓ Cleared" : "All"}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#268ec8] w-48"
                />
              </div>
            </div>
          </div>

          {/* Compact Patient Dues Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Patient Details</th>
                    <th className="py-2.5 px-3">Branch &amp; Doctor</th>
                    <th className="py-2.5 px-3 text-right">Total Bill</th>
                    <th className="py-2.5 px-3 text-right">Paid Amount</th>
                    <th className="py-2.5 px-3 text-right">Pending Due</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <p className="font-semibold text-xs">No Pay Later records found matching your filters</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const isPending = r.status === "PENDING";
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Patient */}
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900 text-xs">{r.patientName || "Unknown"}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>+91 {r.patientPhone || "N/A"}</span>
                            </div>
                          </td>

                          {/* Branch & Doctor */}
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800 text-[11px]">{r.branch || "KPHB"}</span>
                            {r.doctorName && (
                              <div className="text-[10px] text-slate-500">Dr. {r.doctorName}</div>
                            )}
                          </td>

                          {/* Total Bill */}
                          <td className="py-2 px-3 text-right font-medium text-slate-700 text-xs">
                            ₹{r.totalBill?.toLocaleString() || "0"}
                          </td>

                          {/* Paid */}
                          <td className="py-2 px-3 text-right font-semibold text-emerald-600 text-xs">
                            ₹{r.paidAmount?.toLocaleString() || "0"}
                          </td>

                          {/* Pending Due Badge */}
                          <td className="py-2 px-3 text-right">
                            {isPending ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-sky-100 text-[#0284c7] font-extrabold text-[11px] border border-sky-200">
                                ₹{r.dueAmount?.toLocaleString() || "0"}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold line-through text-[11px]">
                                ₹{r.dueAmount?.toLocaleString() || "0"}
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-2 px-3 text-slate-500 text-[10px]">
                            {new Date(r.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-100 text-[#0284c7] uppercase">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Pending</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Cleared</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isPending && (
                                <button
                                  onClick={() => handleOpenSettleModal(r)}
                                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#268ec8] text-white hover:bg-[#0284c7] transition-all shadow-2xs"
                                >
                                  Settle
                                </button>
                              )}

                              <button
                                onClick={() => sendWhatsAppReminder(r)}
                                title="Send WhatsApp Reminder"
                                className="p-1 rounded-md border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-all"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                            </div>
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

      {/* Settle Modal */}
      {settlingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Settle Pay Later</h3>
                  <p className="text-[10px] text-slate-500">Record payment received</p>
                </div>
              </div>
              <button
                onClick={() => setSettlingRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-3">
              <div className="bg-sky-50 p-2.5 rounded-lg border border-sky-200 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Patient:</span>
                  <span>{settlingRecord.patientName}</span>
                </div>
                <div className="flex justify-between text-slate-600 mt-0.5 text-[11px]">
                  <span>Branch:</span>
                  <span>{settlingRecord.branch}</span>
                </div>
                <div className="flex justify-between text-slate-600 mt-0.5 text-[11px]">
                  <span>Pending Due:</span>
                  <span className="font-black text-[#0284c7]">₹{settlingRecord.dueAmount}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Settlement Amount (₹) *
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#268ec8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["UPI", "Cash", "Card", "Transfer"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSettleMethod(mode)}
                      className={`py-1 text-[11px] font-bold rounded-lg border transition-all ${
                        settleMethod === mode
                          ? "bg-[#268ec8] text-white border-[#268ec8] shadow-2xs"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Settlement Notes
                </label>
                <textarea
                  rows={2}
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Cleared at reception counter"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#268ec8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSettlingRecord(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingSettle}
                onClick={handleConfirmSettle}
                className="px-4 py-1.5 text-xs font-bold bg-[#268ec8] text-white hover:bg-[#0284c7] rounded-lg transition-all shadow-xs"
              >
                {isSubmittingSettle ? "Settling..." : "Confirm Settlement ✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
