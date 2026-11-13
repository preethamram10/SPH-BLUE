"use client";

import React, { useState, useEffect, useMemo } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  PhoneCall,
  Search,
  RefreshCw,
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface CallLogItem {
  id: string;
  telecallerId?: string;
  agentName: string;
  patientName: string;
  phone: string;
  branch: string;
  callOutcome: string;
  notes: string;
  dateTime: string;
  duration?: string;
  createdAt: string;
}

export default function HRTelecallerUpdatesPage() {
  const [logs, setLogs] = useState<CallLogItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    interested: 0,
    callback: 0,
    notInterested: 0,
    noResponse: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [branchOptions, setBranchOptions] = useState<string[]>([
    "All Branches",
    "KPHB Branch",
    "Chandanagar Branch",
    "Dilshuknagar Branch",
    "Nallagandla Branch",
  ]);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "patient" | "outcome">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/telecaller/call-logs");
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch telecaller logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.data) ? d.data : [];
        if (list.length > 0) {
          const names: string[] = list.map((b: any) => String(b.name || "").trim()).filter(Boolean);
          setBranchOptions(["All Branches", ...Array.from(new Set(names))]);
        }
      })
      .catch(() => {});
  }, []);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, outcomeFilter, branchFilter, sortBy]);

  // Filtered and Sorted Logs
  const sortedAndFiltered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const filtered = logs.filter((item) => {
      const matchesSearch =
        !q ||
        item.patientName.toLowerCase().includes(q) ||
        item.agentName.toLowerCase().includes(q) ||
        (item.telecallerId || "").toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.branch.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);

      const matchesOutcome =
        outcomeFilter === "All" ||
        item.callOutcome.toLowerCase() === outcomeFilter.toLowerCase();

      const matchesBranch =
        branchFilter === "All" ||
        item.branch.toLowerCase().includes(branchFilter.toLowerCase());

      return matchesSearch && matchesOutcome && matchesBranch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "newest") {
        const timeA = new Date(a.createdAt || a.dateTime).getTime() || 0;
        const timeB = new Date(b.createdAt || b.dateTime).getTime() || 0;
        return timeB - timeA;
      }
      if (sortBy === "oldest") {
        const timeA = new Date(a.createdAt || a.dateTime).getTime() || 0;
        const timeB = new Date(b.createdAt || b.dateTime).getTime() || 0;
        return timeA - timeB;
      }
      if (sortBy === "patient") {
        return (a.patientName || "").localeCompare(b.patientName || "");
      }
      if (sortBy === "outcome") {
        return (a.callOutcome || "").localeCompare(b.callOutcome || "");
      }
      return 0;
    });
  }, [logs, searchTerm, outcomeFilter, branchFilter, sortBy]);

  // Pagination slice (25 per page)
  const totalEntries = sortedAndFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAndFiltered.slice(start, start + PAGE_SIZE);
  }, [sortedAndFiltered, currentPage]);

  // Excel Export
  const exportToExcel = () => {
    if (sortedAndFiltered.length === 0) {
      alert("No call logs to export.");
      return;
    }

    const headers = [
      "Log ID",
      "Patient Name",
      "Contact Phone",
      "Telecaller Agent",
      "Unique TC ID",
      "Hospital Branch",
      "Date & Time",
      "Call Duration",
      "Call Outcome / Status",
      "Conversation Notes & Remarks",
    ];

    const rows = sortedAndFiltered.map((l) => [
      `"${(l.id || "").replace(/"/g, '""')}"`,
      `"${(l.patientName || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.agentName || "").replace(/"/g, '""')}"`,
      `"${(l.telecallerId || "").replace(/"/g, '""')}"`,
      `"${(l.branch || "").replace(/"/g, '""')}"`,
      `"${(l.dateTime || "").replace(/"/g, '""')}"`,
      `"${(l.duration || "").replace(/"/g, '""')}"`,
      `"${(l.callOutcome || "").replace(/"/g, '""')}"`,
      `"${(l.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Telecaller_Call_Logs_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getOutcomeBadge = (outcome: string) => {
    const o = outcome.toLowerCase();
    if (o.includes("interested") && !o.includes("not")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (o.includes("callback")) {
      return "bg-sky-50 text-[#0284c7] border-sky-200";
    }
    if (o.includes("not")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/telecaller-updates" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">
                  Live Telecaller Activity &amp; Call Logs (HR)
                </h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Real-time stream of patient call updates, outcomes, lead interest &amp; follow-up notes
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search caller, patient, phone or note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/30 min-w-[220px]"
                />
              </div>

              {/* Outcome Filter */}
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none"
              >
                <option value="All">All Outcomes</option>
                <option value="Interested">Interested</option>
                <option value="Callback Requested">Callback Requested</option>
                <option value="Not Interested">Not Interested</option>
                <option value="No Response">No Response</option>
              </select>

              {/* Branch Filter */}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none"
              >
                {branchOptions.map((b) => (
                  <option key={b} value={b === "All Branches" ? "All" : b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="patient">Sort: Patient Name (A-Z)</option>
                  <option value="outcome">Sort: Call Outcome</option>
                </select>
              </div>

              {/* Excel Export Button */}
              <button
                onClick={exportToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Export filtered logs to Excel sheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              {/* Live Refresh */}
              <button
                onClick={fetchLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                title="Refresh Stream"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0284c7]" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-7 max-w-7xl">
          {/* Metrics summary banner */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-6">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Calls Logged</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.total || logs.length}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Interested</p>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">
                {stats.interested || logs.filter((l) => l.callOutcome === "Interested").length}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-sky-100 bg-sky-50/20 shadow-xs">
              <p className="text-[10px] font-bold text-[#0284c7] uppercase tracking-wider">Callback Requested</p>
              <p className="text-xl font-extrabold text-[#0284c7] mt-1">
                {stats.callback || logs.filter((l) => l.callOutcome.includes("Callback")).length}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Not Interested</p>
              <p className="text-xl font-extrabold text-rose-700 mt-1">
                {stats.notInterested || logs.filter((l) => l.callOutcome === "Not Interested").length}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No Response</p>
              <p className="text-xl font-extrabold text-slate-600 mt-1">
                {stats.noResponse || logs.filter((l) => l.callOutcome === "No Response").length}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Patient &amp; Phone</th>
                    <th className="py-3 px-4">Telecaller Agent</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Call Outcome</th>
                    <th className="py-3 px-4">Conversation Notes &amp; Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {loading ? "Loading live activity..." : "No call updates match your search."}
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-slate-900">{item.patientName}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                            <PhoneCall className="w-3 h-3 text-[#0284c7]" />
                            <span>{item.phone}</span>
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{item.agentName}</span>
                            {item.telecallerId && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-[#0284c7] font-mono text-[10px] font-black border border-sky-100">
                                {item.telecallerId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{item.dateTime}</p>
                          {item.duration && (
                            <p className="text-[10.5px] text-slate-400">{item.duration}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700">
                            {item.branch}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${getOutcomeBadge(
                              item.callOutcome
                            )}`}
                          >
                            {item.callOutcome}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 max-w-md leading-relaxed">
                          {item.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (25 per page) */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-500">
                Showing{" "}
                <span className="text-slate-900 font-extrabold">
                  {totalEntries === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="text-slate-900 font-extrabold">
                  {Math.min(currentPage * PAGE_SIZE, totalEntries)}
                </span>{" "}
                of <span className="text-slate-900 font-extrabold">{totalEntries}</span> call updates (25 / page)
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        (p >= currentPage - 2 && p <= currentPage + 2)
                    )
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <React.Fragment key={p}>
                          {prev && p - prev > 1 && (
                            <span className="px-1 text-slate-400 text-xs font-bold">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-extrabold transition-colors ${
                              currentPage === p
                                ? "bg-[#0284c7] text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-200/60"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
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
