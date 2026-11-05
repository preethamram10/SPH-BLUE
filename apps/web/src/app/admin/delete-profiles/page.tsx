"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Trash2,
  Search,
  AlertTriangle,
  Phone,
  RotateCcw,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpDown,
  Building2,
  ShieldAlert,
  XCircle,
} from "lucide-react";

interface DeletedProfile {
  id: string;
  regId: string;
  name: string;
  phone: string;
  branch: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  retentionUntil?: string;
  daysRemaining: number;
}

const BRANCHES = [
  "All Branches",
  "KPHB Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

export default function DeleteProfilesPage() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [profiles, setProfiles] = useState<DeletedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchDeletedProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchParam = selectedBranch === "All Branches" ? "" : selectedBranch;
      const res = await fetch(
        `/api/admin/deleted-profiles?branch=${encodeURIComponent(branchParam)}&search=${encodeURIComponent(searchQuery)}&sortBy=${sortBy}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.profiles)) {
        setProfiles(data.profiles);
      } else {
        setProfiles([]);
      }
    } catch (err) {
      console.error("Failed to fetch deleted profiles:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch, searchQuery, sortBy]);

  useEffect(() => {
    fetchDeletedProfiles();
  }, [fetchDeletedProfiles]);

  const handleRestore = async (regId: string, name: string) => {
    if (!confirm(`Are you sure you want to restore profile "${name}" (${regId}) back to active status?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/deleted-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE", regId }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Profile "${name}" (${regId}) successfully restored!` });
        fetchDeletedProfiles();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to restore profile." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    }
  };

  const handlePermanentDelete = async (regId: string, name: string) => {
    if (
      !confirm(
        `DANGER: Permanently delete profile "${name}" (${regId})? This cannot be undone. Its ID sequence will remain reserved and will NEVER be reassigned.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/admin/deleted-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PERMANENT_DELETE", regId }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Profile "${name}" (${regId}) permanently purged.` });
        fetchDeletedProfiles();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to purge profile." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    }
  };

  const expiringSoonCount = profiles.filter((p) => p.daysRemaining <= 7).length;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/delete-profiles" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* HEADER */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900">Deleted Profiles Archive</h1>
                <p className="text-[11.5px] text-slate-500">
                  Review, restore, or audit soft-deleted patient profiles within the 30-day retention window
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                {profiles.length} In Trash
              </span>
              {expiringSoonCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                  {expiringSoonCount} Expiring Soon
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* FEEDBACK BANNER */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs underline hover:opacity-75 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* GUARDRAIL NOTICE */}
          <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/60 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#0284c7] shrink-0 mt-0.5" />
            <div className="text-xs text-sky-950 leading-relaxed">
              <p className="font-bold">30-Day Auto-Purge &amp; Sequence Protection Guardrail</p>
              <p className="text-sky-800 mt-0.5">
                Profiles deleted from reception remain recoverable here for <strong>30 days</strong>. After 30 days, expired records are automatically purged permanently. 
                Even after deletion or permanent purge, <strong>the Patient Registration ID is never reused or reassigned</strong> to any other patient.
              </p>
            </div>
          </div>

          {/* CONTROLS: BRANCH FILTER, SEARCH, SORT */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
            {/* Branch Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Branch:</span>
              </div>
              {BRANCHES.map((b) => {
                const isSelected = selectedBranch === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBranch(b)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0284c7] text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200/70"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>

            {/* Search and Sort row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by patient name, phone, or ID (e.g. SPH-KPB-0001)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/50 focus:outline-none focus:border-[#0284c7] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sort:</span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-[#0284c7]"
                >
                  <option value="newest">Newest Deleted First</option>
                  <option value="oldest">Oldest Deleted First</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE OF DELETED PROFILES */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-medium">
                Loading deleted profiles archive...
              </div>
            ) : profiles.length === 0 ? (
              <div className="p-14 text-center space-y-2">
                <Trash2 className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No deleted profiles found</p>
                <p className="text-xs text-slate-400">
                  {searchQuery || selectedBranch !== "All Branches"
                    ? "Try adjusting your branch filter or search query."
                    : "Trash folder is empty. All active patients are currently intact."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Patient Profile</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Deleted At</th>
                      <th className="py-3 px-4">30-Day Retention</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profiles.map((p) => {
                      const deletedDate = p.deletedAt
                        ? new Date(p.deletedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recently";

                      const isUrgent = p.daysRemaining <= 5;

                      return (
                        <tr key={p.regId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 text-sm">{p.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] font-bold text-[#0284c7] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                                {p.regId}
                              </span>
                              {p.deletedReason && (
                                <span className="text-[10px] text-slate-400 italic">
                                  ({p.deletedReason})
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{p.phone}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                              {p.branch}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 font-medium">
                            <div>{deletedDate}</div>
                            <div className="text-[10px] text-slate-400">By: {p.deletedBy || "Reception"}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                                isUrgent
                                  ? "bg-rose-50 border-rose-200 text-rose-700"
                                  : "bg-amber-50 border-amber-200 text-amber-800"
                              }`}
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{p.daysRemaining} days left</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleRestore(p.regId, p.name)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePermanentDelete(p.regId, p.name)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                                title="Permanently delete from database"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Purge</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
