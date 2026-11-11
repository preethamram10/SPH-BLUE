"use client";

import React, { useState, useMemo, useEffect } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  IndianRupee,
  CreditCard,
  Stethoscope,
  Users,
  Search,
  Filter,
  Download,
  RotateCcw,
  ArrowUpDown,
  TrendingUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

export interface TransactionRecord {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  branchName: string;
  doctorName: string;
  revenueSplit: string;
  source: string;
  consultationFee: number;
  medicineFee: number;
  packageFee: number;
  dietFee?: number;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "split";
  displayPaymentMethod?: string;
  splitDetails?: { cash?: number; upi?: number; card?: number; counterUpi?: number };
  timestamp: string;
  dateTime: string;
  status: "PAID" | "PENDING" | "COMPLETED";
}

export default function HRTotalRevenuePage() {
  const [todayStr, setTodayStr] = useState("2026-11-07");
  const [currentYearStr, setCurrentYearStr] = useState("2026");
  const [currentMonthNumStr, setCurrentMonthNumStr] = useState("11");
  const [thisMonthPrefix, setThisMonthPrefix] = useState("2026-11");
  const [prevMonthPrefix, setPrevMonthPrefix] = useState("2026-10");

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const today = `${y}-${m}-${day}`;
    setTodayStr(today);
    setCurrentYearStr(String(y));
    setCurrentMonthNumStr(String(parseInt(m, 10)));
    setThisMonthPrefix(`${y}-${m}`);

    const prevD = new Date();
    prevD.setDate(1);
    prevD.setMonth(prevD.getMonth() - 1);
    const prevY = prevD.getFullYear();
    const prevM = String(prevD.getMonth() + 1).padStart(2, "0");
    setPrevMonthPrefix(`${prevY}-${prevM}`);
  }, []);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [revenueSearch, setRevenueSearch] = useState("");
  const [revenueBranchId, setRevenueBranchId] = useState("all");
  const [revenueDate, setRevenueDate] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [revenueYear, setRevenueYear] = useState<string>("all");
  const [revenueMonth, setRevenueMonth] = useState<string>("all");
  const [revenueDoctor, setRevenueDoctor] = useState("all");
  const [revenueSource, setRevenueSource] = useState("all");
  const [revenueMethod, setRevenueMethod] = useState("all");
  const [revenueSplitType, setRevenueSplitType] = useState("all");
  const [revenueAmountRange, setRevenueAmountRange] = useState("all");
  const [dateMode, setDateMode] = useState<
    "this_month" | "prev_month" | "this_year" | "prev_year" | "today" | "custom" | "all"
  >("this_month");

  // Pagination State (Page-wise breakdown)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/revenue/transactions");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.warn("Failed fetching revenue records for HR:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const handleResetFilters = () => {
    setRevenueSearch("");
    setRevenueBranchId("all");
    setRevenueDate("");
    setCustomStartDate("");
    setCustomEndDate("");
    setRevenueYear("all");
    setRevenueMonth("all");
    setRevenueDoctor("all");
    setRevenueSource("all");
    setRevenueMethod("all");
    setRevenueSplitType("all");
    setRevenueAmountRange("all");
    setDateMode("this_month");
    setCurrentPage(1);
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (revenueSearch.trim()) {
        const q = revenueSearch.toLowerCase().trim();
        const matches =
          t.patientName.toLowerCase().includes(q) ||
          t.phone.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.doctorName.toLowerCase().includes(q) ||
          t.branchName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (revenueBranchId !== "all") {
        if (!t.branchName.toLowerCase().includes(revenueBranchId.toLowerCase())) {
          return false;
        }
      }

      if (revenueDoctor !== "all") {
        if (!t.doctorName.toLowerCase().includes(revenueDoctor.toLowerCase())) {
          return false;
        }
      }

      if (revenueMethod !== "all") {
        const method = (t.paymentMethod || "").toLowerCase();
        const display = (t.displayPaymentMethod || "").toLowerCase();
        if (revenueMethod === "cash" && !method.includes("cash") && !display.includes("cash")) return false;
        if (revenueMethod === "upi" && !method.includes("upi") && !display.includes("upi")) return false;
        if (revenueMethod === "card" && !method.includes("card") && !display.includes("card")) return false;
        if (revenueMethod === "split" && !method.includes("split") && !display.includes("split")) return false;
      }

      const txDate = t.timestamp ? t.timestamp.slice(0, 10) : "";
      if (dateMode === "today" && txDate !== todayStr) return false;
      if (dateMode === "this_month" && !txDate.startsWith(thisMonthPrefix)) return false;
      if (dateMode === "prev_month" && !txDate.startsWith(prevMonthPrefix)) return false;
      if (dateMode === "this_year" && !txDate.startsWith(currentYearStr)) return false;

      if (dateMode === "custom") {
        if (customStartDate && txDate < customStartDate) return false;
        if (customEndDate && txDate > customEndDate) return false;
      }

      return true;
    });
  }, [
    transactions,
    revenueSearch,
    revenueBranchId,
    revenueDoctor,
    revenueMethod,
    dateMode,
    todayStr,
    thisMonthPrefix,
    prevMonthPrefix,
    currentYearStr,
    customStartDate,
    customEndDate,
  ]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    let grossTotal = 0;
    let consultTotal = 0;
    let medTotal = 0;
    let pkgTotal = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;

    filteredTransactions.forEach((t) => {
      const amt = Number(t.totalAmount) || 0;
      grossTotal += amt;
      consultTotal += Number(t.consultationFee) || 0;
      medTotal += Number(t.medicineFee) || 0;
      pkgTotal += Number(t.packageFee) || 0;

      const method = (t.paymentMethod || "").toLowerCase();
      if (t.splitDetails) {
        cashTotal += Number(t.splitDetails.cash) || 0;
        upiTotal += (Number(t.splitDetails.upi) || 0) + (Number(t.splitDetails.counterUpi) || 0);
        cardTotal += Number(t.splitDetails.card) || 0;
      } else if (method.includes("cash")) {
        cashTotal += amt;
      } else if (method.includes("upi")) {
        upiTotal += amt;
      } else if (method.includes("card")) {
        cardTotal += amt;
      }
    });

    return {
      grossTotal,
      consultTotal,
      medTotal,
      pkgTotal,
      cashTotal,
      upiTotal,
      cardTotal,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/total-revenue" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Clinic Total Revenue &amp; Financial Ledger
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live Audited
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Multi-branch revenue streams, consultation &amp; pharmacy collections, and payment modes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRevenueData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0284c7] ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Filters</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          {/* Date Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "today", label: "Today" },
                { id: "this_month", label: "This Month" },
                { id: "prev_month", label: "Last Month" },
                { id: "this_year", label: "This Year" },
                { id: "all", label: "All History" },
                { id: "custom", label: "Custom Range" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => {
                    setDateMode(btn.id as any);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    dateMode === btn.id
                      ? "bg-[#0284c7] text-white shadow-2xs font-extrabold"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {dateMode === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-medium"
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-medium"
                />
              </div>
            )}
          </div>

          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Gross Collections
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xs font-bold text-slate-400">₹</span>
                <span className="text-2xl font-black text-slate-900">
                  {summaryMetrics.grossTotal.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {summaryMetrics.count} Total Paid Receipts
              </p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Consultation Collections
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xs font-bold text-slate-400">₹</span>
                <span className="text-2xl font-black text-[#0284c7]">
                  {summaryMetrics.consultTotal.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Doctor visit fees</p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Pharmacy / Medicine
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xs font-bold text-slate-400">₹</span>
                <span className="text-2xl font-black text-amber-600">
                  {summaryMetrics.medTotal.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Remedies &amp; Kits</p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Payment Modes Split
              </p>
              <div className="text-[11px] font-bold text-slate-700 mt-1 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">UPI / QR:</span>
                  <span className="text-sky-700">₹{summaryMetrics.upiTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cash:</span>
                  <span className="text-emerald-700">₹{summaryMetrics.cashTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Card / Split:</span>
                  <span className="text-purple-700">₹{summaryMetrics.cardTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={revenueSearch}
                    onChange={(e) => {
                      setRevenueSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search patient, doctor, receipt..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0284c7] w-60"
                  />
                </div>

                <select
                  value={revenueBranchId}
                  onChange={(e) => {
                    setRevenueBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                >
                  <option value="all">All Branches</option>
                  <option value="KPHB">KPHB Main</option>
                  <option value="Chandanagar">Chandanagar</option>
                  <option value="Dilsukhnagar">Dilsukhnagar</option>
                  <option value="Nallagandla">Nallagandla</option>
                </select>

                <select
                  value={revenueMethod}
                  onChange={(e) => {
                    setRevenueMethod(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                >
                  <option value="all">All Methods</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card / POS</option>
                  <option value="split">Split</option>
                </select>
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <span>Per Page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Receipt #</th>
                    <th className="py-2.5 px-4">Patient Details</th>
                    <th className="py-2.5 px-4">Branch</th>
                    <th className="py-2.5 px-4">Doctor</th>
                    <th className="py-2.5 px-4">Fee Split</th>
                    <th className="py-2.5 px-4">Payment Method</th>
                    <th className="py-2.5 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                          {tx.id}
                          <div className="text-[10px] text-slate-400 font-sans font-normal">
                            {tx.dateTime || tx.timestamp}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-extrabold text-slate-900">{tx.patientName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">+91 {tx.phone}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 font-semibold">{tx.branchName}</td>
                        <td className="py-2.5 px-4 text-slate-700">{tx.doctorName}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[11px] font-bold text-slate-700">
                            {tx.consultationFee > 0 && `Consult ₹${tx.consultationFee} `}
                            {tx.medicineFee > 0 && `• Med ₹${tx.medicineFee} `}
                            {tx.packageFee > 0 && `• Pkg ₹${tx.packageFee}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {tx.displayPaymentMethod || tx.paymentMethod || "UPI"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900 text-sm">
                          ₹{Number(tx.totalAmount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No revenue transactions matched the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-500 font-semibold">
                Showing {Math.min(filteredTransactions.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                {Math.min(filteredTransactions.length, currentPage * itemsPerPage)} of {filteredTransactions.length}{" "}
                transactions
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition font-bold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 font-extrabold text-slate-800">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition font-bold cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

