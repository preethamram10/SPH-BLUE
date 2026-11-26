"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import TelecallerSidebar from "@/components/telecaller/TelecallerSidebar";
import {
  ClipboardList,
  Search,
  RefreshCw,
  PhoneCall,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";

const PAGE_SIZE = 26;

const OUTCOME_FILTER_OPTIONS = [
  "All Outcomes",
  "Interested",
  "Callback",
  "Not Interested",
  "No Response",
  "Switched Off / Busy",
  "Other",
];

function getOutcomeBadgeClass(outcome: string): string {
  const o = (outcome || "").toLowerCase();
  if (o.includes("not interested")) return "text-rose-700 bg-rose-50 border-rose-200";
  if (o.includes("interested")) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (o.includes("callback")) return "text-sky-700 bg-sky-50 border-sky-200";
  if (o.includes("switched off") || o.includes("busy")) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-slate-700 bg-slate-100 border-slate-300";
}

function getLogMonthKey(log: any): string {
  const raw = log.dateTime || log.createdAt || "";
  if (!raw) return "";
  try {
    const dt = new Date(raw);
    if (!isNaN(dt.getTime())) {
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    }
  } catch {}
  return "";
}

export default function TelecallerLoggedCallsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [branches, setBranches] = useState<string[]>(["All Branches"]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedOutcome, setSelectedOutcome] = useState("All Outcomes");

  // Pagination (26 per page)
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, branchRes] = await Promise.all([
        fetch("/api/telecaller/call-logs", { cache: "no-store" }),
        fetch("/api/branches").catch(() => null),
      ]);
      const data = await logsRes.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      } else {
        setLogs([]);
      }
      if (branchRes && branchRes.ok) {
        try {
          const bData = await branchRes.json();
          const list = Array.isArray(bData?.data) ? bData.data : [];
          const names = list.map((b: any) => String(b.name || "").trim()).filter(Boolean);
          if (names.length > 0) {
            setBranches(["All Branches", ...Array.from(new Set<string>(names))]);
          }
        } catch {}
      }
    } catch (err) {
      console.error("Failed to fetch logged call updates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMonth, selectedBranch, selectedOutcome]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedMonth) {
        const mKey = getLogMonthKey(log);
        if (mKey !== selectedMonth) return false;
      }

      if (selectedBranch !== "All Branches") {
        const bLog = (log.branch || "").toLowerCase().replace(/branch/gi, "").trim();
        const bTarget = selectedBranch.toLowerCase().replace(/branch/gi, "").trim();
        if (bLog !== bTarget && !bLog.includes(bTarget) && !bTarget.includes(bLog)) {
          return false;
        }
      }

      if (selectedOutcome !== "All Outcomes") {
        const oc = (log.callOutcome || "").toLowerCase();
        if (selectedOutcome === "Other") {
          const standard = ["interested", "callback", "callback requested", "not interested", "no response", "switched off / busy"];
          if (standard.includes(oc)) return false;
        } else if (selectedOutcome === "Callback") {
          if (!oc.includes("callback")) return false;
        } else {
          if (oc !== selectedOutcome.toLowerCase()) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches =
          (log.patientName || "").toLowerCase().includes(q) ||
          (log.phone || "").includes(q) ||
          (log.notes || "").toLowerCase().includes(q) ||
          (log.agentName || "").toLowerCase().includes(q) ||
          (log.callOutcome || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [logs, selectedMonth, selectedBranch, selectedOutcome, searchQuery]);

  const totalCount = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = totalCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, totalCount);
  const paginatedLogs = filteredLogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <TelecallerSidebar activeTab="logged_calls" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284c7] border border-sky-200 flex items-center justify-center">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-slate-900">Logged Call Updates</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0284c7] border border-sky-200 text-xs font-extrabold">
                    {totalCount} Records
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-500">
                  Filter by month, branch, call outcome, or search (26 records per page)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loading}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0284c7]" : ""}`} />
                <span>Refresh</span>
              </button>

              <Link
                href="/telecaller/dashboard?tab=log_call"
                className="px-3.5 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Call</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl w-full mx-auto space-y-4">
          {/* Filters Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, phone, notes..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                />
              </div>
              {selectedMonth && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth("")}
                  className="px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-600 cursor-pointer"
                  title="Clear month filter"
                >
                  All
                </button>
              )}
            </div>

            {/* Branch Filter */}
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Call Outcome Filter */}
            <div>
              <select
                value={selectedOutcome}
                onChange={(e) => setSelectedOutcome(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] cursor-pointer"
              >
                {OUTCOME_FILTER_OPTIONS.map((oc) => (
                  <option key={oc} value={oc}>
                    {oc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0284c7]" />
                <span>Loading logged call updates...</span>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <PhoneCall className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No logged call updates found</p>
                <p className="text-xs text-slate-400">Try adjusting your month, branch, outcome filter, or search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Patient Info</th>
                      <th className="py-3 px-3">Branch</th>
                      <th className="py-3 px-3">Call Outcome</th>
                      <th className="py-3 px-4">Notes &amp; Discussion</th>
                      <th className="py-3 px-4">Logged Date / Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="font-extrabold text-slate-900">{log.patientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">📞 {log.phone}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10.5px] font-bold">
                            {log.branch || "Clinic"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${getOutcomeBadgeClass(
                              log.callOutcome
                            )}`}
                          >
                            {log.callOutcome}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-md text-slate-600 text-[11px] break-words">
                          {log.notes || "—"}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                          <div className="font-medium text-slate-700">
                            {log.dateTime
                              ? new Date(log.dateTime).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "—"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {log.agentName || "Telecaller"} ({log.telecallerId || "TC"})
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer (26 per page) */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800">{startIndex}</span> to{" "}
                <span className="font-bold text-slate-800">{endIndex}</span> of{" "}
                <span className="font-bold text-slate-800">{totalCount}</span> records (26 per page)
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      safePage <= 1
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        p === safePage
                          ? "bg-[#0284c7] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      safePage >= totalPages
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
