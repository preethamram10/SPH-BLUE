"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Calendar,
  User,
  RefreshCw,
  CalendarDays,
  FileText,
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

interface DeletedAppointment {
  id: string;
  token: string;
  registrationId: string;
  patientName: string;
  phone: string;
  diseases?: string;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
  branch: string;
  consultationMode: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedRole?: string;
  deletedReason?: string;
  hoursRemaining: number;
}

export default function DeleteProfilesPage() {
  const [activeTab, setActiveTab] = useState<"profiles" | "appointments">("profiles");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Deleted Profiles State (30-day retention)
  const [profiles, setProfiles] = useState<DeletedProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // Deleted Appointments State (48-hour retention)
  const [deletedAppointments, setDeletedAppointments] = useState<DeletedAppointment[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<{
    monthName: string;
    total: number;
    branchWise: Record<string, number>;
  }>({
    monthName: "",
    total: 0,
    branchWise: {},
  });
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch dynamic branches directly from backend - no hardcoded defaults!
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch("/api/branches");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const names: string[] = data.data
            .map((b: any) => b.name?.trim())
            .filter(Boolean);
          setAvailableBranches(names);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic branches:", err);
      }
    };
    fetchBranches();
  }, []);

  // Compute active branch options dynamically
  const filterBranchOptions = useMemo(() => {
    const namesSet = new Set<string>();
    availableBranches.forEach((b) => namesSet.add(b));
    if (monthlyStats.branchWise) {
      Object.keys(monthlyStats.branchWise).forEach((k) => {
        if (k && k !== "Other") namesSet.add(k);
      });
    }
    return ["All Branches", ...Array.from(namesSet)];
  }, [availableBranches, monthlyStats.branchWise]);

  const fetchDeletedProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
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
      setIsLoadingProfiles(false);
    }
  }, [selectedBranch, searchQuery, sortBy]);

  const fetchDeletedAppointments = useCallback(async () => {
    setIsLoadingAppointments(true);
    try {
      const branchParam = selectedBranch === "All Branches" ? "" : selectedBranch;
      const res = await fetch(
        `/api/admin/deleted-appointments?branch=${encodeURIComponent(branchParam)}&search=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setDeletedAppointments(data.appointments);
        if (data.monthlyStats) {
          setMonthlyStats(data.monthlyStats);
        }
      } else {
        setDeletedAppointments([]);
      }
    } catch (err) {
      console.error("Failed to fetch deleted appointments:", err);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [selectedBranch, searchQuery]);

  useEffect(() => {
    if (activeTab === "profiles") {
      fetchDeletedProfiles();
    } else {
      fetchDeletedAppointments();
    }

    const interval = setInterval(() => {
      if (activeTab === "profiles") {
        fetchDeletedProfiles();
      } else {
        fetchDeletedAppointments();
      }
    }, 15000);

    const handleFocus = () => {
      if (activeTab === "profiles") {
        fetchDeletedProfiles();
      } else {
        fetchDeletedAppointments();
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeTab, fetchDeletedProfiles, fetchDeletedAppointments]);

  // Profile Actions
  const handleRestoreProfile = async (regId: string, name: string) => {
    if (!confirm(`Restore profile "${name}" (${regId}) back to active status?`)) return;
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

  const handlePermanentDeleteProfile = async (regId: string, name: string) => {
    if (!confirm(`DANGER: Permanently delete profile "${name}" (${regId})? Its ID sequence will NEVER be reassigned.`)) return;
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

  // Appointment Actions
  const handleRestoreAppointment = async (id: string, patientName: string, token: string) => {
    if (!confirm(`Restore appointment for "${patientName}" (${token}) back to active schedule?`)) return;
    try {
      const res = await fetch("/api/admin/deleted-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE", id }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Appointment for "${patientName}" (${token}) successfully restored!` });
        fetchDeletedAppointments();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to restore appointment." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    }
  };

  const handlePermanentDeleteAppointment = async (id: string, patientName: string, token: string) => {
    if (!confirm(`DANGER: Permanently purge appointment for "${patientName}" (${token})? This action cannot be undone.`)) return;
    try {
      const res = await fetch("/api/admin/deleted-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PERMANENT_DELETE", id }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Appointment for "${patientName}" (${token}) permanently purged.` });
        fetchDeletedAppointments();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to purge appointment." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    }
  };

  const expiringSoonProfiles = profiles.filter((p) => p.daysRemaining <= 7).length;
  const expiringSoonAppts = deletedAppointments.filter((a) => a.hoursRemaining <= 12).length;

  const isLoading = activeTab === "profiles" ? isLoadingProfiles : isLoadingAppointments;

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
                <h1 className="text-base font-extrabold text-slate-900">
                  {activeTab === "profiles" ? "Deleted Patient Profiles Archive" : "Deleted Appointments Archive"}
                </h1>
                <p className="text-[11.5px] text-slate-500">
                  {activeTab === "profiles"
                    ? "Review, restore, or audit soft-deleted patient profiles within the 30-day retention window"
                    : "Review, restore, or audit soft-deleted appointments within the 48-hour admin retention window (Reception: 24h)"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                {activeTab === "profiles" ? `${profiles.length} Profiles In Trash` : `${deletedAppointments.length} Appointments In Trash`}
              </span>
              {activeTab === "profiles" && expiringSoonProfiles > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                  {expiringSoonProfiles} Expiring Soon
                </span>
              )}
              {activeTab === "appointments" && expiringSoonAppts > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                  {expiringSoonAppts} Expiring Soon (&lt;12h)
                </span>
              )}
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* TAB SWITCHER */}
          <div className="flex items-center p-1.5 bg-slate-200/80 rounded-2xl w-fit shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("profiles")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "profiles"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4 text-[#0284c7]" />
              <span>Deleted Patient Profiles (30 Days)</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-black">
                {profiles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("appointments")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "appointments"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4 text-rose-500" />
              <span>Deleted Appointments (48 Hours)</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-black">
                {deletedAppointments.length}
              </span>
            </button>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex items-center p-1.5 bg-slate-200/80 rounded-2xl w-fit shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("profiles")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "profiles"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4 text-[#0284c7]" />
              <span>Deleted Patient Profiles (30 Days)</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-black">
                {profiles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("appointments")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "appointments"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4 text-rose-500" />
              <span>Deleted Appointments (48 Hours)</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-black">
                {deletedAppointments.length}
              </span>
            </button>
          </div>

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

          {/* TAB 1: PROFILES GUARDRAIL */}
          {activeTab === "profiles" && (
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
          )}

          {/* TAB 2: APPOINTMENTS MONTHLY STATS & RETENTION NOTICE */}
          {activeTab === "appointments" && (
            <div className="space-y-4">
              {/* Monthly Branch-Wise Deleted Appointments Counter Cards */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#0284c7]" />
                      <span>Deleted Appointments Counter — {monthlyStats.monthName || "This Month"}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Branch-wise deleted appointments count. Resets automatically at the start of every calendar month.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black">
                    Total Deleted This Month: {monthlyStats.total}
                  </div>
                </div>

                {/* Dynamic Stats Cards Grid - Auto-adapts whenever any branch is created */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">All Branches</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{monthlyStats.total}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{monthlyStats.monthName}</p>
                  </div>

                  {filterBranchOptions
                    .filter((b) => b !== "All Branches")
                    .map((branchName) => {
                      const cleanB = branchName.replace(/branch/gi, "").trim().toLowerCase();
                      let count = monthlyStats.branchWise?.[branchName] || 0;
                      if (count === 0 && monthlyStats.branchWise) {
                        for (const [key, val] of Object.entries(monthlyStats.branchWise)) {
                          const cleanKey = key.replace(/branch/gi, "").trim().toLowerCase();
                          if (cleanKey === cleanB || cleanKey.includes(cleanB) || cleanB.includes(cleanKey)) {
                            count = val;
                            break;
                          }
                        }
                      }

                      return (
                        <div key={branchName} className="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                          <p className="text-[11px] font-bold text-slate-600 truncate" title={branchName}>
                            {branchName}
                          </p>
                          <p className="text-2xl font-black text-[#0284c7] mt-1">{count}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Deleted this month</p>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Retention Notice: 48h admin vs 24h reception */}
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 leading-relaxed">
                  <p className="font-bold">48-Hour Admin Retention Policy (Reception Limit: 24 Hours)</p>
                  <p className="text-amber-800 mt-0.5">
                    Appointments deleted by reception can be viewed and restored by <strong>Reception for 24 hours</strong>. As <strong>Admin</strong>, you have access to deleted appointments for up to <strong>48 hours</strong> with full restore and purge capabilities. After 48 hours, records are automatically purged.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CONTROLS: BRANCH FILTER, SEARCH, SORT */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
            {/* Branch Pills - Dynamic from Database */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Branch:</span>
              </div>
              {filterBranchOptions.map((b) => {
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
                  placeholder={
                    activeTab === "profiles"
                      ? "Search by patient name, phone, or ID (e.g. SPH-KPB-0001)..."
                      : "Search by token, patient name, doctor, or ID..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/50 focus:outline-none focus:border-[#0284c7] focus:bg-white"
                />
              </div>

              {activeTab === "profiles" && (
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
              )}
            </div>
          </div>

          {/* TAB 1: TABLE OF DELETED PROFILES */}
          {activeTab === "profiles" && (
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
                                  onClick={() => handleRestoreProfile(p.regId, p.name)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handlePermanentDeleteProfile(p.regId, p.name)}
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
          )}

          {/* TAB 2: TABLE OF DELETED APPOINTMENTS */}
          {activeTab === "appointments" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400 font-medium">
                  Loading deleted appointments archive...
                </div>
              ) : deletedAppointments.length === 0 ? (
                <div className="p-14 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No deleted appointments found</p>
                  <p className="text-xs text-slate-400">
                    {searchQuery || selectedBranch !== "All Branches"
                      ? "Try adjusting your branch filter or search query."
                      : "No appointments have been deleted within the last 48 hours."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4">Token &amp; Patient</th>
                        <th className="py-3 px-4">Doctor &amp; Slot</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Deleted At</th>
                        <th className="py-3 px-4">48h Retention</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deletedAppointments.map((a) => {
                        const deletedDate = a.deletedAt
                          ? new Date(a.deletedAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recently";

                        const isUrgent = a.hoursRemaining <= 12;

                        return (
                          <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md font-extrabold bg-sky-50 text-[#0284c7] border border-sky-200 text-[11px]">
                                  {a.token}
                                </span>
                                <span className="font-extrabold text-slate-900 text-sm">{a.patientName}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-slate-500">
                                <span className="font-mono text-[11px] font-bold text-slate-600">{a.registrationId}</span>
                                <span>•</span>
                                <span>📞 {a.phone}</span>
                                {a.diseases && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-400 truncate max-w-[150px]">{a.diseases}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800">{a.doctorName}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-slate-500 font-medium">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{a.appointmentDate} @ {a.timeSlot}</span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-600 font-bold">
                                  {a.consultationMode}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                                {a.branch}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-500 font-medium">
                              <div>{deletedDate}</div>
                              <div className="text-[10px] text-slate-400">By: {a.deletedBy || a.deletedRole || "Reception"}</div>
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
                                <span>{a.hoursRemaining}h left</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreAppointment(a.id, a.patientName, a.token)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handlePermanentDeleteAppointment(a.id, a.patientName, a.token)}
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
          )}
        </div>
      </main>
    </div>
  );
}
