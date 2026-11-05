"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  Calendar,
  Users,
  CalendarCheck,
  Sparkles,
  Ticket,
  Plus,
  Clock,
  Phone,
  Search,
  CheckCircle2,
  ArrowRight,
  UserX,
  RefreshCw,
  Video,
  MapPin,
  CalendarDays,
  Trash2,
  RotateCcw,
  X,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function ReceptionDashboardPage() {
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");
  const [currentDate, setCurrentDate] = useState("");

  // Date Helpers (DD-MM-YYYY)
  const getTodayStr = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const getTomorrowStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = String(tomorrow.getDate()).padStart(2, "0");
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const y = tomorrow.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const toISODate = (ddmmyyyy: string) => {
    const parts = ddmmyyyy.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) return ddmmyyyy;
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ddmmyyyy;
  };

  const fromISODate = (yyyymmdd: string) => {
    const parts = yyyymmdd.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return yyyymmdd;
  };

  const todayStr = useMemo(() => getTodayStr(), []);
  const tomorrowStr = useMemo(() => getTomorrowStr(), []);

  // Selected Date Filter for Appointments (Default: Today)
  const [selectedDate, setSelectedDate] = useState(() => getTodayStr());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "ACTIVE" | "COMPLETED">("ALL");

  // 24-Hour Restore Modal State (Reception view)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [deletedAppointments, setDeletedAppointments] = useState<any[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) setBranchName(saved);

    const today = new Date();
    setCurrentDate(
      today.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  // Fetch appointments live from API
  const fetchAppointments = async (branch: string, dt: string) => {
    setIsLoadingAppointments(true);
    try {
      const cleanBranch = branch.replace(/Spiritual Homeopathy/gi, "").trim();
      const res = await fetch(`/api/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dt)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard appointments:", err);
      setAppointments([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchAppointments(branchName, selectedDate);

    // Auto-sync every 10 seconds for real-time application updates
    const interval = setInterval(() => {
      fetchAppointments(branchName, selectedDate);
    }, 10000);

    const handleFocus = () => {
      fetchAppointments(branchName, selectedDate);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [branchName, selectedDate]);

  const fetchDeletedAppointments = async () => {
    setIsLoadingDeleted(true);
    try {
      const cleanBranch = branchName.replace(/Spiritual Homeopathy/gi, "").trim();
      const res = await fetch(`/api/reception/deleted-appointments?branch=${encodeURIComponent(cleanBranch)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setDeletedAppointments(data.appointments);
      } else {
        setDeletedAppointments([]);
      }
    } catch (err) {
      console.error("Failed to fetch deleted appointments:", err);
      setDeletedAppointments([]);
    } finally {
      setIsLoadingDeleted(false);
    }
  };

  const handleOpenRestoreModal = () => {
    setIsRestoreModalOpen(true);
    fetchDeletedAppointments();
  };

  const handleRestoreAppointment = async (id: string, token: string, patientName: string) => {
    try {
      const res = await fetch("/api/reception/deleted-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE", id }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Appointment ${token} for ${patientName} restored successfully!` });
        fetchDeletedAppointments();
        fetchAppointments(branchName, selectedDate);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to restore appointment." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    }
  };

  const handleDeleteAppointment = async (id: string, token: string, patientName: string) => {
    if (!confirm(`Cancel/Delete appointment ${token} for ${patientName}? It can be restored within 24 hours.`)) {
      return;
    }
    try {
      const res = await fetch("/api/reception/deleted-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE",
          id,
          deletedBy: "Reception",
          reason: "Cancelled by reception",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Appointment ${token} for ${patientName} moved to 24h trash.` });
        fetchAppointments(branchName, selectedDate);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to delete appointment." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    }
  };

  const handleRestoreRefresh = () => {
    handleOpenRestoreModal();
  };

  // Status Counts
  const totalCount = appointments.length;
  const waitingCount = useMemo(
    () => appointments.filter((a) => !a.status || a.status === "SCHEDULED" || a.status === "WAITING").length,
    [appointments]
  );
  const activeCount = useMemo(
    () => appointments.filter((a) => a.status === "IN_CONSULTATION").length,
    [appointments]
  );
  const completedCount = useMemo(
    () => appointments.filter((a) => a.status === "COMPLETED").length,
    [appointments]
  );

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    if (activeFilter === "ALL") return appointments;
    if (activeFilter === "UPCOMING") {
      return appointments.filter(
        (a) => !a.status || a.status === "SCHEDULED" || a.status === "WAITING"
      );
    }
    if (activeFilter === "ACTIVE") {
      return appointments.filter((a) => a.status === "IN_CONSULTATION");
    }
    if (activeFilter === "COMPLETED") {
      return appointments.filter((a) => a.status === "COMPLETED");
    }
    return appointments;
  }, [appointments, activeFilter]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      {/* Static Left Sidebar */}
      <ReceptionSidebar activePage="dashboard" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">Reception Dashboard</h2>
                <span className="bg-[#a8ce3a]/20 text-[#268ec8] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#a8ce3a]/40">
                  Front Desk Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {branchName} • {currentDate}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/reception/appointments"
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
              >
                <Calendar className="w-3.5 h-3.5 text-[#268ec8]" />
                <span>View Appointments</span>
              </Link>

              <Link
                href="/reception/all-patients"
                className="flex items-center space-x-1.5 bg-[#268ec8] hover:bg-[#1f75a6] text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Patient</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Overview Stats */}
        <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Live Appointments */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booked Appointments</p>
                <div className="w-8 h-8 rounded-lg bg-[#268ec8]/10 text-[#268ec8] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-[#268ec8]">{totalCount}</p>
                <span className="text-xs text-slate-500 font-medium">
                  {waitingCount} Waiting • {activeCount} Active • {completedCount} Done
                </span>
              </div>
            </div>

            {/* Card 2: All Patients */}
            <Link
              href="/reception/all-patients"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Patients</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-slate-800">148</p>
                <span className="text-xs text-emerald-600 font-semibold">+6 Registered this week</span>
              </div>
            </Link>

            {/* Card 3: Follow-ups */}
            <Link
              href="/reception/follow-ups"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Follow-ups</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-amber-600">8</p>
                <span className="text-xs text-slate-500 font-medium">Due for review today</span>
              </div>
            </Link>

            {/* Card 4: Branch Cleaning */}
            <Link
              href="/reception/branch-cleaning"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Cleaning</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-[#a8ce3a]">Done</p>
                <span className="text-xs text-emerald-600 font-semibold">Morning checklist verified</span>
              </div>
            </Link>
          </div>

          {/* Quick Reception Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/reception/appointments"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#268ec8] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#268ec8]/10 text-[#268ec8] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Appointments</h4>
                  <p className="text-xs text-slate-400">Manage daily clinic bookings</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#268ec8] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/reception/doctor-no-show"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-rose-400 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Doctor No-Show</h4>
                  <p className="text-xs text-slate-400">Leaves &amp; unavailable times</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/reception/all-patients"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#268ec8] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">All Patients List</h4>
                  <p className="text-xs text-slate-400">Search patient records &amp; MRN</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/reception/follow-ups"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#268ec8] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Follow-ups</h4>
                  <p className="text-xs text-slate-400">Call &amp; confirm follow-up visits</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/reception/branch-cleaning"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#268ec8] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#a8ce3a]/20 text-[#268ec8] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Branch Cleaning</h4>
                  <p className="text-xs text-slate-400">Housekeeping &amp; hygiene status</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#268ec8] group-hover:translate-x-1 transition-all" />
            </Link>
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
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

          {/* UPCOMING APPOINTMENTS SECTION */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            {/* Header Row: Title & Count left, Restore (24h) right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-extrabold text-slate-900">Upcoming Appointments</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-sky-50 text-[#0284c7] border border-sky-200">
                  {filteredAppointments.length}
                </span>
              </div>

              <button
                type="button"
                onClick={handleRestoreRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0284c7] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer w-fit"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAppointments ? "animate-spin" : ""}`} />
                <span>Restore (24h)</span>
              </button>
            </div>

            {/* DATE FILTER BELOW RESTORE OPTION */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedDate === todayStr
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedDate === tomorrowStr
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  Tomorrow
                </button>

                {/* Date Picker Input for any day / future day */}
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={toISODate(selectedDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(fromISODate(e.target.value));
                      }
                    }}
                    className={`pl-3 pr-2 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      selectedDate !== todayStr && selectedDate !== tomorrowStr
                        ? "bg-[#0284c7] text-white border-[#0284c7]"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("UPCOMING")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeFilter === "UPCOMING" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Upcoming ({waitingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("ACTIVE")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeFilter === "ACTIVE" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("COMPLETED")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeFilter === "COMPLETED" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Completed ({completedCount})
                </button>
              </div>
            </div>

            {/* Appointments List or Empty State */}
            {isLoadingAppointments ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Loading appointments for {selectedDate}...</span>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-10 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No appointments found</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    There are no scheduled {activeFilter !== "ALL" ? activeFilter.toLowerCase() : ""} appointments for {selectedDate}.
                  </p>
                </div>
                <Link
                  href="/reception/appointments"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book Appointment</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Token &amp; ID</th>
                      <th className="py-3 px-4">Patient Details</th>
                      <th className="py-3 px-4">Consultant Doctor</th>
                      <th className="py-3 px-4">Slot &amp; Mode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((appt) => {
                      const status = (appt.status || "WAITING").toUpperCase();
                      const isWaiting = status === "WAITING" || status === "SCHEDULED";
                      const isActive = status === "IN_CONSULTATION";
                      const isCompleted = status === "COMPLETED";

                      return (
                        <tr key={appt.id || appt.token} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-extrabold bg-sky-50 text-[#0284c7] border border-sky-200 text-[11px]">
                                {appt.token || "#"}
                              </span>
                              <span className="font-bold text-slate-700">{appt.registrationId}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm">{appt.patientName}</div>
                              <div className="text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>📞 {appt.phone || appt.phoneNumber}</span>
                                {appt.diseases && (
                                  <span className="text-slate-400 truncate max-w-[150px]">• {appt.diseases}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{appt.doctorName}</div>
                            <div className="text-[11px] text-slate-400">{branchName}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{appt.timeSlot || appt.selectedTimeSlot}</span>
                            </div>
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                {appt.consultationMode || "In-Clinic"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                isWaiting
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : isActive
                                  ? "bg-sky-50 text-[#0284c7] border border-sky-200"
                                  : isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteAppointment(appt.id, appt.token, appt.patientName)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                              title="Cancel / Delete Appointment (24h Restore available)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 24-HOUR RESTORE DELETED APPOINTMENTS MODAL */}
          {isRestoreModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Restore Deleted Appointments (24h Window)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Reception retention limit: <strong>24 Hours</strong>. Recover cancelled or mistakenly deleted bookings.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRestoreModalOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-3">
                  {isLoadingDeleted ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                      Loading deleted appointments...
                    </div>
                  ) : deletedAppointments.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">No deleted appointments</p>
                      <p className="text-xs text-slate-400">
                        There are no appointments deleted within the last 24 hours for {branchName}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {deletedAppointments.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#0284c7]/40 shadow-xs flex items-center justify-between gap-4 transition-all"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-black bg-sky-50 text-[#0284c7] border border-sky-200 text-xs">
                                {item.token}
                              </span>
                              <span className="font-extrabold text-slate-900 text-sm truncate">
                                {item.patientName}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">({item.registrationId})</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>👨‍⚕️ {item.doctorName}</span>
                              <span>•</span>
                              <span>🕒 {item.appointmentDate} @ {item.timeSlot}</span>
                              {item.phone && (
                                <>
                                  <span>•</span>
                                  <span>📞 {item.phone}</span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-amber-700 font-bold">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>{item.hoursRemaining} hours left to restore</span>
                              {item.deletedReason && (
                                <span className="text-slate-400 font-normal italic">
                                  — &quot;{item.deletedReason}&quot;
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRestoreAppointment(item.id, item.token, item.patientName)}
                            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                  <span>Note: Older deleted appointments are audited by Admin (48h retention).</span>
                  <button
                    type="button"
                    onClick={() => setIsRestoreModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
