"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Search,
  Filter,
  Phone,
  Clock,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  X,
  Stethoscope,
  CalendarPlus,
  RotateCcw,
} from "lucide-react";

export interface FollowUpItem {
  id: string;
  appointmentId: string;
  mrn: string;
  patientName: string;
  phone: string;
  doctorName: string;
  doctorId: string;
  branch: string;
  dueDate: string;
  dueTime: number;
  dueMonth: number;
  dueYear: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isThisMonth: boolean;
  isNextMonth: boolean;
  followUpInterval: string;
  status: "Due Today" | "Overdue" | "Upcoming" | "Confirmed" | "Scheduled" | "Completed";
  notes: string;
  consultationFee: number;
  prescriptionImages?: string[];
}

const STANDARD_TIME_SLOTS = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
];

const DOCTOR_OPTIONS = [
  { id: "1793864791241", name: "Dr. Prashanth K Vaidya" },
  { id: "doc-padma", name: "Dr. Padma Priya" },
  { id: "doc-jobeadh", name: "Dr. Jobeadh Parveej" },
  { id: "doc-ramakrishna", name: "Dr. Ramakrishna Chanduri" },
];

function ReceptionFollowUpsContent() {
  const router = useRouter();
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [branches, setBranches] = useState<string[]>([
    "All Branches",
    "KPHB Branch",
    "Chandanagar Branch",
    "Nallagandla Branch",
    "Dilshuknagar Branch",
  ]);
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [statusFilter, setStatusFilter] = useState("All");

  // Period / Month Filters: "all", "overdue", "this_month", "next_month", "due_today"
  const [periodFilter, setPeriodFilter] = useState<"all" | "overdue" | "this_month" | "next_month" | "due_today">("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Modals state
  const [rescheduleItem, setRescheduleItem] = useState<FollowUpItem | null>(null);
  const [bookingItem, setBookingItem] = useState<FollowUpItem | null>(null);

  // Form state for Reschedule
  const [newDueDate, setNewDueDate] = useState("");
  const [newInterval, setNewInterval] = useState("1 Month");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Form state for Book Appointment
  const [bookBranch, setBookBranch] = useState("KPHB Branch");
  const [bookDoctorId, setBookDoctorId] = useState("1793864791241");
  const [bookDoctorName, setBookDoctorName] = useState("Dr. Prashanth K Vaidya");
  const [bookDate, setBookDate] = useState("");
  const [bookTimeSlot, setBookTimeSlot] = useState("11:00 AM");
  const [bookMode, setBookMode] = useState<"In-Clinic" | "Video Call">("In-Clinic");
  const [bookReason, setBookReason] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [savingBooking, setSavingBooking] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Pagination (Default 35 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(35);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Summary counts
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    thisMonth: 0,
    nextMonth: 0,
    completed: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) {
      setBranchName(saved);
      // Pre-select local branch if in the list or keep All Branches
    }
  }, []);

  // Fetch live follow-ups from database
  const fetchFollowUps = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("pageSize", String(pageSize));
        params.set("period", periodFilter);

        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (selectedBranch && selectedBranch !== "All Branches") params.set("branch", selectedBranch);
        if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

        const res = await fetch(`/api/reception/follow-ups?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch follow-ups");
        const data = await res.json();

        if (data.success) {
          setFollowUps(data.followUps || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          if (data.branches && Array.isArray(data.branches)) {
            setBranches(data.branches);
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error("Error fetching reception follow-ups:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, periodFilter, searchTerm, selectedBranch, statusFilter]
  );

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Debounced search handling
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentPage(1);
  };

  const handlePeriodChange = (period: "all" | "overdue" | "this_month" | "next_month" | "due_today") => {
    setPeriodFilter(period);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Open Reschedule Modal
  const openRescheduleModal = (item: FollowUpItem) => {
    setRescheduleItem(item);
    // Convert DD-MM-YYYY to YYYY-MM-DD for standard html date picker
    const parts = (item.dueDate || "").split("-");
    if (parts.length === 3) {
      setNewDueDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      setNewDueDate(new Date().toISOString().slice(0, 10));
    }
    setNewInterval(item.followUpInterval || "1 Month");
    setRescheduleNotes(item.notes || "");
  };

  // Submit Reschedule
  const handleSaveReschedule = async () => {
    if (!rescheduleItem || !newDueDate) return;
    setSavingReschedule(true);
    try {
      const res = await fetch("/api/reception/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: rescheduleItem.appointmentId,
          newFollowUpDate: newDueDate,
          newInterval,
          notes: rescheduleNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Follow-up for ${rescheduleItem.patientName} successfully rescheduled!`);
        setTimeout(() => setActionMessage(null), 4000);
        setRescheduleItem(null);
        fetchFollowUps(true);
      } else {
        alert(data.error || "Failed to reschedule follow-up");
      }
    } catch (err: any) {
      alert(err.message || "Error rescheduling follow-up");
    } finally {
      setSavingReschedule(false);
    }
  };

  // Open Book Appointment Modal
  const openBookingModal = (item: FollowUpItem) => {
    setBookingItem(item);
    setBookBranch(item.branch || "KPHB Branch");
    setBookDoctorId(item.doctorId || "1793864791241");
    setBookDoctorName(item.doctorName || "Dr. Prashanth K Vaidya");

    // Default booking date to tomorrow or follow-up date
    const parts = (item.dueDate || "").split("-");
    if (parts.length === 3) {
      setBookDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      setBookDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    }

    setBookTimeSlot("11:00 AM");
    setBookMode("In-Clinic");
    setBookReason(`Follow-up review for ${item.patientName}`);
    setBookNotes(item.notes || "Booked from reception follow-up queue");
  };

  // Submit Book Appointment
  const handleConfirmBooking = async () => {
    if (!bookingItem || !bookDate || !bookTimeSlot) return;
    setSavingBooking(true);
    try {
      const res = await fetch("/api/reception/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: bookingItem.mrn,
          patientName: bookingItem.patientName,
          phoneNumber: bookingItem.phone,
          branch: bookBranch,
          doctorId: bookDoctorId,
          doctorName: bookDoctorName,
          appointmentDate: bookDate,
          selectedTimeSlot: bookTimeSlot,
          consultationMode: bookMode,
          diseases: bookReason,
          notes: bookNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Appointment successfully booked for ${bookingItem.patientName} on ${bookDate} (${bookTimeSlot})!`);
        setTimeout(() => setActionMessage(null), 4500);
        setBookingItem(null);
        fetchFollowUps(true);
      } else {
        alert(data.error || "Failed to book appointment");
      }
    } catch (err: any) {
      alert(err.message || "Error booking appointment");
    } finally {
      setSavingBooking(false);
    }
  };

  // Real Excel / CSV Export
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.set("export", "true");
      params.set("period", periodFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedBranch && selectedBranch !== "All Branches") params.set("branch", selectedBranch);
      if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/reception/follow-ups?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;
      const data = await res.json();
      const exportList: FollowUpItem[] = data.followUps || followUps;

      if (exportList.length === 0) return;

      const headers = [
        "Follow-Up ID",
        "MRN",
        "Patient Name",
        "Phone",
        "Attending Doctor",
        "Branch",
        "Follow-Up Due Date",
        "Interval",
        "Status",
      ];

      const rows = exportList.map((f) => [
        `"${f.id}"`,
        `"${f.mrn}"`,
        `"${f.patientName.replace(/"/g, '""')}"`,
        `"${f.phone}"`,
        `"${f.doctorName.replace(/"/g, '""')}"`,
        `"${f.branch}"`,
        `"${f.dueDate}"`,
        `"${f.followUpInterval}"`,
        `"${f.status}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      const nowStr = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SPH_Reception_FollowUps_${periodFilter}_${nowStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn("Failed to export follow-ups CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  // Direct WhatsApp Message
  const handleWhatsApp = (f: FollowUpItem) => {
    const cleanPhone = f.phone.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("No valid phone number for WhatsApp message");
      return;
    }
    const message = encodeURIComponent(
      `Hello ${f.patientName},\nThis is a gentle follow-up reminder from Spiritual Homeopathy Clinics (${f.branch}).\nYour follow-up consultation with ${f.doctorName} is scheduled on ${f.dueDate}.\nPlease reply to confirm or reschedule your visit.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <ReceptionSidebar activePage="follow-ups" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Patient Follow-Ups & Reminders
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Queue
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {branchName} • Follow-up schedule with direct rescheduling, booking, and branch trajectory
              </p>
            </div>

            {/* Actions: Search, Branch Filter, Status Filter, Refresh, Excel Export */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient, phone, MRN..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-48 sm:w-56"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Branch Filter (Branch-wise) */}
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Due Today">Due Today</option>
                <option value="Overdue">Overdue</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => fetchFollowUps(true)}
                disabled={loading || refreshing}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-sky-600" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Export Excel / CSV Button */}
              <button
                onClick={handleExportCSV}
                disabled={exporting || followUps.length === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? "Exporting..." : "Export Excel"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Action notification toast */}
        {actionMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Period Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">
                Period Filter:
              </span>

              {/* All Follow-Ups */}
              <button
                onClick={() => handlePeriodChange("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodFilter === "all"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <span>All Follow-Ups</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-current font-extrabold">
                  {stats.total}
                </span>
              </button>

              {/* Overdue (Follow-up date passed) */}
              <button
                onClick={() => handlePeriodChange("overdue")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodFilter === "overdue"
                    ? "bg-rose-600 text-white shadow-2xs shadow-rose-200"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Overdue (Date Passed)</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    periodFilter === "overdue" ? "bg-white/25 text-white" : "bg-rose-200 text-rose-800"
                  }`}
                >
                  {stats.overdue}
                </span>
              </button>

              {/* Due Today */}
              <button
                onClick={() => handlePeriodChange("due_today")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodFilter === "due_today"
                    ? "bg-amber-600 text-white shadow-2xs shadow-amber-200"
                    : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Due Today</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    periodFilter === "due_today" ? "bg-white/25 text-white" : "bg-amber-200 text-amber-900"
                  }`}
                >
                  {stats.dueToday}
                </span>
              </button>

              {/* This Month */}
              <button
                onClick={() => handlePeriodChange("this_month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodFilter === "this_month"
                    ? "bg-sky-600 text-white shadow-2xs shadow-sky-200"
                    : "bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>This Month</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    periodFilter === "this_month" ? "bg-white/25 text-white" : "bg-sky-200 text-sky-800"
                  }`}
                >
                  {stats.thisMonth}
                </span>
              </button>

              {/* Next Month */}
              <button
                onClick={() => handlePeriodChange("next_month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodFilter === "next_month"
                    ? "bg-indigo-600 text-white shadow-2xs shadow-indigo-200"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Next Month</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    periodFilter === "next_month" ? "bg-white/25 text-white" : "bg-indigo-200 text-indigo-800"
                  }`}
                >
                  {stats.nextMonth}
                </span>
              </button>
            </div>

            {/* Pagination Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-md border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={35}>35 (Default)</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Follow-Ups Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-3 w-12 text-center">S.No</th>
                    <th className="py-3 px-4">Patient MRN & Name</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Branch</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-3 text-center">Follow-Up Due Date</th>
                    <th className="py-3 px-3 text-center">Interval</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                          <span className="font-bold text-xs text-slate-600">Loading follow-ups...</span>
                        </div>
                      </td>
                    </tr>
                  ) : followUps.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CalendarCheck className="w-8 h-8 text-slate-300" />
                          <span className="font-bold text-slate-700 text-sm">No follow-ups found</span>
                          <span className="text-xs text-slate-400 max-w-sm">
                            No patient follow-ups match the selected period, branch, or search criteria.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    followUps.map((item, idx) => {
                      const sNo = (currentPage - 1) * pageSize + idx + 1;
                      const cleanPhone = item.phone.replace(/\D/g, "");

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-sky-50/40 transition-colors group"
                        >
                          {/* S.No */}
                          <td className="py-3 px-3 text-center text-slate-400 font-bold">
                            {sNo}
                          </td>

                          {/* Patient MRN & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {item.patientName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center gap-1.5">
                                  <span>{item.patientName}</span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 font-semibold">
                                  {item.mrn}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-slate-700 font-semibold">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{cleanPhone || "—"}</span>
                            </div>
                          </td>

                          {/* Branch */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-slate-600 font-semibold">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{item.branch}</span>
                            </div>
                          </td>

                          {/* Attending Doctor */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                              <Stethoscope className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span className="truncate max-w-[150px]">{item.doctorName}</span>
                            </div>
                          </td>

                          {/* Follow-Up Due Date */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{item.dueDate}</span>
                            </div>
                          </td>

                          {/* Interval */}
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                              {item.followUpInterval}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wide uppercase ${
                                item.status === "Overdue"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : item.status === "Due Today"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : item.status === "Completed"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-sky-100 text-sky-800 border border-sky-200"
                              }`}
                            >
                              {item.status === "Overdue" && <AlertCircle className="w-2.5 h-2.5" />}
                              {item.status === "Due Today" && <Clock className="w-2.5 h-2.5" />}
                              {item.status}
                            </span>
                          </td>

                          {/* Action Options: Reschedule, Book Appointment, WhatsApp, Patient File */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Reschedule Button */}
                              <button
                                onClick={() => openRescheduleModal(item)}
                                className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                                title="Reschedule Follow-Up Date"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reschedule</span>
                              </button>

                              {/* Book Appointment Button */}
                              <button
                                onClick={() => openBookingModal(item)}
                                className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                                title="Book Clinical Appointment"
                              >
                                <CalendarPlus className="w-3 h-3" />
                                <span>Book Appointment</span>
                              </button>

                              {/* WhatsApp Button */}
                              <button
                                onClick={() => handleWhatsApp(item)}
                                className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                title="Send WhatsApp Follow-up Reminder"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Patient File Link Button */}
                              <button
                                onClick={() =>
                                  router.push(
                                    `/reception/patient-file?id=${encodeURIComponent(item.appointmentId)}&name=${encodeURIComponent(item.patientName)}&phone=${encodeURIComponent(item.phone)}&registrationId=${encodeURIComponent(item.mrn)}&branch=${encodeURIComponent(item.branch)}`
                                  )
                                }
                                className="p-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                                title="Open Patient File & Prescription History"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
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

            {/* Pagination Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs font-semibold text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-800">
                  {followUps.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-800">
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{" "}
                of <span className="font-bold text-slate-900">{totalCount}</span> follow-up records
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-800 shadow-2xs">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || loading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* POPUP MODAL 1: Reschedule Follow-up */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Reschedule Follow-Up</h3>
                  <p className="text-[11px] text-amber-100">
                    Patient: {rescheduleItem.patientName} ({rescheduleItem.mrn})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-medium text-slate-700">
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
                <span>Current Follow-Up Due Date:</span>
                <span className="font-black font-mono">{rescheduleItem.dueDate}</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  New Follow-Up Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Follow-Up Interval
                </label>
                <select
                  value={newInterval}
                  onChange={(e) => setNewInterval(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="1 Week">1 Week</option>
                  <option value="2 Weeks">2 Weeks</option>
                  <option value="3 Weeks">3 Weeks</option>
                  <option value="1 Month">1 Month</option>
                  <option value="45 Days">45 Days</option>
                  <option value="2 Months">2 Months</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Reschedule Notes / Reason
                </label>
                <textarea
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  rows={2}
                  placeholder="Patient requested postponement, traveling, etc."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReschedule}
                  disabled={savingReschedule || !newDueDate}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {savingReschedule ? "Updating..." : "Save Rescheduled Date"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: Book Appointment Directly */}
      {bookingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Book Follow-Up Appointment</h3>
                  <p className="text-[11px] text-sky-100">
                    Patient: {bookingItem.patientName} • {bookingItem.mrn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookingItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs font-medium text-slate-700 max-h-[80vh] overflow-y-auto">
              {/* Patient info bar */}
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-between text-sky-950">
                <div>
                  <span className="font-black text-slate-900">{bookingItem.patientName}</span>
                  <span className="ml-2 text-slate-500 font-mono">({bookingItem.phone})</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-sky-200 text-sky-900 font-bold text-[10px]">
                  {bookingItem.mrn}
                </span>
              </div>

              {/* Branch & Doctor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bookBranch}
                    onChange={(e) => setBookBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {branches.filter((b) => b !== "All Branches").map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Consultant Doctor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bookDoctorId}
                    onChange={(e) => {
                      setBookDoctorId(e.target.value);
                      const doc = DOCTOR_OPTIONS.find((d) => d.id === e.target.value);
                      if (doc) setBookDoctorName(doc.name);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {DOCTOR_OPTIONS.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Appointment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Time Slot <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bookTimeSlot}
                    onChange={(e) => setBookTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {STANDARD_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Consultation Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Consultation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookMode("In-Clinic")}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                      bookMode === "In-Clinic"
                        ? "bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    In-Clinic Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookMode("Video Call")}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                      bookMode === "Video Call"
                        ? "bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Video Consultation
                  </button>
                </div>
              </div>

              {/* Reason / Complaints */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Reason for Visit / Condition
                </label>
                <input
                  type="text"
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  placeholder="Follow-up consultation, medication refill, symptom review"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Booking Remarks
                </label>
                <textarea
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes from receptionist..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookingItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={savingBooking || !bookDate || !bookTimeSlot}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {savingBooking ? "Booking..." : "Confirm & Book Slot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceptionFollowUpsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-slate-400 font-semibold text-xs">
          Loading Follow-ups & Reminders...
        </div>
      }
    >
      <ReceptionFollowUpsContent />
    </Suspense>
  );
}
