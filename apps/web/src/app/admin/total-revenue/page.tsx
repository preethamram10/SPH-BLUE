"use client";

import React, { useState, useMemo, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
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

// --- Type Definitions ---
export interface TransactionRecord {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  branchName: string;
  doctorName: string;
  revenueSplit: string; // 'Consultation' | 'Consultation & Medicine Fee' | 'Package' | 'Diet Plan'
  source: string;       // 'Walk-in' | 'Old Patient' | 'Instagram' | 'Google' | 'Referral' | etc.
  consultationFee: number;
  medicineFee: number;
  packageFee: number;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "split";
  splitDetails?: { cash: number; upi: number };
  timestamp: string;    // YYYY-MM-DD
  dateTime: string;     // Formatted display date e.g. "07/11/2026, 11:30 AM"
  status: "PAID" | "PENDING" | "COMPLETED";
}

export default function AdminTotalRevenuePage() {
  // Stable dates initialized cleanly to avoid SSR prerender mismatch
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

  // --- States ---
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

  // Sorting
  const [sortField, setSortField] = useState<"date" | "amount" | "name" | "branch">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // --- Fetch Transactions from REST API ---
  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/revenue/transactions", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTransactions(data);
        }
      }
    } catch (err) {
      console.warn("Using local transaction data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();

    // Auto-sync polling every 30s only when tab is visible
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchRevenueData();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchRevenueData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Reset Filters
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
    setSortField("date");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  // Sort Toggle
  const handleToggleSort = (field: "date" | "amount" | "name" | "branch") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection(field === "date" || field === "amount" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  // Check Amount Range
  const checkAmountRange = (amt: number, rangeStr: string): boolean => {
    if (rangeStr === "all") return true;
    switch (rangeStr) {
      case "500-1000":
        return amt >= 500 && amt <= 1000;
      case "1000-2000":
        return amt >= 1000 && amt <= 2000;
      case "2000-3000":
        return amt >= 2000 && amt <= 3000;
      case "3000-5000":
        return amt >= 3000 && amt <= 5000;
      case "5000+":
        return amt > 5000;
      default:
        return true;
    }
  };

  // --- Filtering Engine ---
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search Query
        if (revenueSearch.trim()) {
          const q = revenueSearch.toLowerCase().trim();
          const matches =
            t.patientName.toLowerCase().includes(q) ||
            t.phone.includes(q) ||
            t.patientId.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Branch
        if (revenueBranchId !== "all") {
          if (!t.branchName.toLowerCase().includes(revenueBranchId.toLowerCase())) return false;
        }

        // Normalize timestamp for standard YYYY-MM-DD comparisons
        const cleanDate = (t.timestamp || "").replace(/\//g, "-").trim();
        const parts = cleanDate.split("-");
        let tDate = cleanDate;
        if (parts.length === 3 && parts[2].length === 4) {
          tDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        } else if (parts.length === 3 && parts[0].length === 4) {
          tDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        }

        // Date & Date Modes
        if (dateMode === "custom") {
          if (customStartDate && tDate < customStartDate) return false;
          if (customEndDate && tDate > customEndDate) return false;
        } else if (revenueDate) {
          if (tDate !== revenueDate) return false;
        } else if (dateMode === "today") {
          if (tDate !== todayStr) return false;
        } else if (dateMode === "this_month") {
          if (!tDate.startsWith(thisMonthPrefix)) return false;
        } else if (dateMode === "prev_month") {
          if (!tDate.startsWith(prevMonthPrefix)) return false;
        } else if (dateMode === "this_year") {
          if (!tDate.startsWith(currentYearStr)) return false;
        } else if (dateMode === "prev_year") {
          const prevYear = String(Number(currentYearStr) - 1);
          if (!tDate.startsWith(prevYear)) return false;
        }

        // Year Filter
        if (revenueYear !== "all") {
          const [tY] = tDate.split("-");
          if (tY !== revenueYear) return false;
        }

        // Month Filter
        if (revenueMonth !== "all") {
          const [, tM] = tDate.split("-");
          if (tM && parseInt(tM, 10) !== parseInt(revenueMonth, 10)) return false;
        }

        // Doctor
        if (revenueDoctor !== "all" && !t.doctorName.includes(revenueDoctor)) return false;

        // Source
        if (revenueSource !== "all" && t.source !== revenueSource) return false;

        // Payment Method
        if (revenueMethod !== "all" && t.paymentMethod !== revenueMethod) return false;

        // Revenue Split
        if (revenueSplitType !== "all") {
          if (!t.revenueSplit.toLowerCase().includes(revenueSplitType.toLowerCase())) return false;
        }

        // Amount Range
        if (!checkAmountRange(t.totalAmount, revenueAmountRange)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortField === "amount") {
          return sortDirection === "desc"
            ? b.totalAmount - a.totalAmount
            : a.totalAmount - b.totalAmount;
        }
        if (sortField === "name") {
          return sortDirection === "desc"
            ? b.patientName.localeCompare(a.patientName)
            : a.patientName.localeCompare(b.patientName);
        }
        if (sortField === "branch") {
          return sortDirection === "desc"
            ? b.branchName.localeCompare(a.branchName)
            : a.branchName.localeCompare(b.branchName);
        }
        // Date sort
        if (b.timestamp !== a.timestamp) {
          return sortDirection === "desc"
            ? b.timestamp.localeCompare(a.timestamp)
            : a.timestamp.localeCompare(b.timestamp);
        }
        return sortDirection === "desc"
          ? b.dateTime.localeCompare(a.dateTime)
          : a.dateTime.localeCompare(b.dateTime);
      });
  }, [
    transactions,
    revenueSearch,
    revenueBranchId,
    revenueDate,
    customStartDate,
    customEndDate,
    revenueYear,
    revenueMonth,
    revenueDoctor,
    revenueSource,
    revenueMethod,
    revenueSplitType,
    revenueAmountRange,
    dateMode,
    todayStr,
    thisMonthPrefix,
    prevMonthPrefix,
    currentYearStr,
    sortField,
    sortDirection,
  ]);

  // --- Summary Aggregations ---
  const revenueSummary = useMemo(() => {
    let grandTotal = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;

    let splitConsultation = 0;
    let splitConsultationMed = 0;
    let splitCarePackage = 0;
    let splitDietPlan = 0;

    const sourceTotals: Record<string, number> = {};

    filteredTransactions.forEach((t) => {
      grandTotal += t.totalAmount;

      // Mode Breakdown
      if (t.paymentMethod === "cash") cashTotal += t.totalAmount;
      else if (t.paymentMethod === "upi") upiTotal += t.totalAmount;
      else if (t.paymentMethod === "card") cardTotal += t.totalAmount;
      else if (t.paymentMethod === "split") {
        if (t.splitDetails) {
          cashTotal += t.splitDetails.cash || 0;
          upiTotal += t.splitDetails.upi || 0;
        } else {
          cashTotal += Math.round(t.totalAmount / 2);
          upiTotal += Math.round(t.totalAmount / 2);
        }
      }

      // Split Breakdown
      const sLower = t.revenueSplit.toLowerCase();
      if (sLower.includes("package")) splitCarePackage += t.totalAmount;
      else if (sLower.includes("diet")) splitDietPlan += t.totalAmount;
      else if (sLower.includes("medicine")) splitConsultationMed += t.totalAmount;
      else splitConsultation += t.totalAmount;

      // Source Breakdown
      const src = t.source || "Walk-in";
      sourceTotals[src] = (sourceTotals[src] || 0) + t.totalAmount;
    });

    return {
      grandTotal,
      cashTotal,
      upiTotal,
      cardTotal,
      splitConsultation,
      splitConsultationMed,
      splitCarePackage,
      splitDietPlan,
      sourceTotals,
    };
  }, [filteredTransactions]);

  // --- Export to CSV / Excel ---
  const handleExportCSV = () => {
    const headers = [
      "S.No",
      "Reg ID",
      "Patient Name",
      "Phone",
      "Branch",
      "Doctor",
      "Revenue Split",
      "Source",
      "Amount",
      "Method",
      "Date Time",
      "Status",
    ];

    const rows = filteredTransactions.map((t, idx) => [
      idx + 1,
      `"${t.patientId}"`,
      `"${t.patientName}"`,
      `"${t.phone}"`,
      `"${t.branchName}"`,
      `"${t.doctorName}"`,
      `"${t.revenueSplit}"`,
      `"${t.source}"`,
      t.totalAmount,
      `"${t.paymentMethod.toUpperCase()}"`,
      `"${t.dateTime}"`,
      `"${t.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `SPH_Revenue_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* Unified Admin Sidebar */}
      <AdminSidebar currentPath="/admin/total-revenue" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <div className="w-full max-w-[1500px] mx-auto p-3.5 space-y-3.5">
          {/* Top Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 px-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
                <IndianRupee className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">
                    Admin Total Revenue Analytics
                  </h1>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Ledger
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Financial performance, real-time branch collections & revenue split breakdown
                </p>
              </div>
            </div>

            {/* Quick Date Selector Pills */}
            <div className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/70">
              {(
                [
                  { id: "this_month", label: "This Month" },
                  { id: "prev_month", label: "Prev Month" },
                  { id: "this_year", label: "This Year" },
                  { id: "prev_year", label: "Prev Year" },
                  { id: "today", label: "Today" },
                  { id: "custom", label: "Custom Range" },
                  { id: "all", label: "All Time" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setDateMode(id);
                    setRevenueDate("");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                    dateMode === id
                      ? "bg-white text-emerald-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Core Financial Summary Cards (Compact & Fitted) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Grand Total Revenue */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Grand Total Revenue</span>
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  ₹{revenueSummary.grandTotal.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 mt-3 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{filteredTransactions.length} Transactions Recorded</span>
              </div>
            </div>

            {/* Card 2: Total by Mode */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Payment Modes</span>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cash:</span>
                  <span className="font-bold text-slate-800">
                    ₹{revenueSummary.cashTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UPI / GPay:</span>
                  <span className="font-bold text-emerald-600">
                    ₹{revenueSummary.upiTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Card:</span>
                  <span className="font-bold text-blue-600">
                    ₹{revenueSummary.cardTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Revenue Split */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Revenue Split</span>
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                  <Stethoscope className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consultation:</span>
                  <span className="font-bold text-slate-800">
                    ₹{revenueSummary.splitConsultation.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consult + Med:</span>
                  <span className="font-bold text-emerald-600">
                    ₹{revenueSummary.splitConsultationMed.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Packages:</span>
                  <span className="font-bold text-purple-600">
                    ₹{revenueSummary.splitCarePackage.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Diet Plans:</span>
                  <span className="font-bold text-amber-600">
                    ₹{revenueSummary.splitDietPlan.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Patient Sources */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Patient Sources</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1 text-[11px] max-h-20 overflow-y-auto pr-1">
                {Object.keys(revenueSummary.sourceTotals).length === 0 ? (
                  <span className="text-slate-400 italic">No sources recorded</span>
                ) : (
                  Object.entries(revenueSummary.sourceTotals).map(([src, amt]) => (
                    <div key={src} className="flex justify-between">
                      <span className="text-slate-500 truncate max-w-[110px]">{src}:</span>
                      <span className="font-bold text-slate-800">₹{amt.toLocaleString("en-IN")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Compact Filter Transactions Controls Grid */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>Filter Transactions</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchRevenueData}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-md transition"
                  title="Reload transactions from database"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition shadow-2xs"
                >
                  <Download className="w-3 h-3" /> Export excel sheet
                </button>
              </div>
            </div>

            {/* 10 Compact Filter Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px]">
              {/* 1. Search Patient */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Search Patient
                </label>
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                  <input
                    type="text"
                    placeholder="Name or phone..."
                    value={revenueSearch}
                    onChange={(e) => {
                      setRevenueSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-6 pr-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              {/* 2. Filter Branch */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Filter Branch
                </label>
                <select
                  value={revenueBranchId}
                  onChange={(e) => {
                    setRevenueBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                >
                  <option value="all">All Branches</option>
                  <option value="KPHB">KPHB Branch</option>
                  <option value="Chandanagar">Chandanagar Branch</option>
                  <option value="Dilshuknagar">Dilshuknagar Branch</option>
                  <option value="Nallagandla">Nallagandla Branch</option>
                </select>
              </div>

              {/* 3. Filter by Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Filter by Date
                </label>
                <input
                  type="date"
                  value={revenueDate}
                  onChange={(e) => {
                    setRevenueDate(e.target.value);
                    setDateMode("all");
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                />
              </div>

              {/* 4. Filter by Year */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Filter by Year
                </label>
                <select
                  value={revenueYear}
                  onChange={(e) => {
                    setRevenueYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                >
                  <option value="all">All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>

              {/* 5. Filter by Month */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Filter by Month
                </label>
                <select
                  value={revenueMonth}
                  onChange={(e) => {
                    setRevenueMonth(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                >
                  <option value="all">All Months</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>

              {/* 6. Doctor */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Doctor
                </label>
                <select
                  value={revenueDoctor}
                  onChange={(e) => {
                    setRevenueDoctor(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                >
                  <option value="all">All Doctors</option>
                  <option value="Dr. Prashanth K Vaidya">Dr. Prashanth K Vaidya</option>
                  <option value="Dr. Ramakrishna Chanduri">Dr. Ramakrishna Chanduri</option>
                  <option value="Dr. Jobedah Parveej">Dr. Jobedah Parveej</option>
                  <option value="Dr. Padma Priya">Dr. Padma Priya</option>
                </select>
              </div>

              {/* 7. Patient Source */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Patient Source
                </label>
                <select
                  value={revenueSource}
                  onChange={(e) => {
                    setRevenueSource(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                >
                  <option value="all">All Sources</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Old Patient">Old Patient</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Google">Google</option>
                  <option value="Referral">Referral</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Camp / Event">Camp / Event</option>
                </select>
              </div>

              {/* 8. Payment Mode */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Payment Mode
                </label>
                <select
                  value={revenueMethod}
                  onChange={(e) => {
                    setRevenueMethod(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                >
                  <option value="all">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="card">Card</option>
                  <option value="split">Split Payment</option>
                </select>
              </div>

              {/* 9. Revenue Split */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Revenue Split
                </label>
                <select
                  value={revenueSplitType}
                  onChange={(e) => {
                    setRevenueSplitType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                >
                  <option value="all">All Types</option>
                  <option value="Consultation">Consultation Only</option>
                  <option value="Consultation & Medicine">Consultation & Medicine</option>
                  <option value="Package">Package</option>
                  <option value="Diet Plan">Diet Plan</option>
                </select>
              </div>

              {/* 10. Amount Range */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  Amount Range
                </label>
                <select
                  value={revenueAmountRange}
                  onChange={(e) => {
                    setRevenueAmountRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] h-7 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-medium"
                >
                  <option value="all">All Amounts</option>
                  <option value="500-1000">₹500 - ₹1,000</option>
                  <option value="1000-2000">₹1,000 - ₹2,000</option>
                  <option value="2000-3000">₹2,000 - ₹3,000</option>
                  <option value="3000-5000">₹3,000 - ₹5,000</option>
                  <option value="5000+">Above ₹5,000</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range Picker (shown when 'Custom Range' is active) */}
            {dateMode === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-0.5">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1 text-[11px] h-7 border border-emerald-300 bg-emerald-50/40 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-0.5">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2 py-1 text-[11px] h-7 border border-emerald-300 bg-emerald-50/40 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Transactions Ledger Table (Compact & Fitted) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Table Top Controls */}
            <div className="p-3 px-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs">Transaction Logs</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-bold">
                  {filteredTransactions.length} records
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-[11px] border border-slate-300 rounded px-1.5 py-0.5 bg-white font-medium focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 text-[10.5px] uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th
                      onClick={() => handleToggleSort("name")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-emerald-700"
                    >
                      <div className="flex items-center gap-1">
                        Patient / Reg ID
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th
                      onClick={() => handleToggleSort("branch")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-emerald-700"
                    >
                      <div className="flex items-center gap-1">
                        Branch
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3">Revenue Split</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th
                      onClick={() => handleToggleSort("amount")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-emerald-700"
                    >
                      <div className="flex items-center gap-1">
                        Amount
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Method</th>
                    <th
                      onClick={() => handleToggleSort("date")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-emerald-700"
                    >
                      <div className="flex items-center gap-1">
                        Date & Time
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-9 text-center text-slate-400 text-xs">
                        No transactions found matching your criteria. Click <b>Reset</b> to view all.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((t, idx) => (
                      <tr key={t.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-3 font-medium text-slate-400">
                          {startIndex + idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 text-xs">{t.patientName}</div>
                          <div className="font-mono text-[10px] text-emerald-700 font-semibold">
                            {t.patientId}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">{t.phone}</td>
                        <td className="py-2 px-3 font-semibold text-slate-700">{t.branchName}</td>
                        <td className="py-2 px-3 text-slate-800">{t.doctorName}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[10.5px]">
                            {t.revenueSplit}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">{t.source}</td>
                        <td className="py-2 px-3 font-black text-slate-900 text-xs">
                          ₹{t.totalAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 uppercase font-bold text-slate-700 text-[10.5px]">
                          {t.paymentMethod}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{t.dateTime}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {t.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Compact Pagination Bar */}
            <div className="p-2.5 px-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
              <div>
                Showing{" "}
                <span className="font-bold text-slate-800">
                  {filteredTransactions.length === 0 ? 0 : startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-800">
                  {Math.min(startIndex + rowsPerPage, filteredTransactions.length)}
                </span>{" "}
                of <span className="font-bold text-slate-800">{filteredTransactions.length}</span>{" "}
                transactions
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-semibold text-slate-800">
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <button
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded border border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
