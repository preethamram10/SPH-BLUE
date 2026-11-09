"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import Link from "next/link";
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
  Clock3,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity,
  MessageCircle,
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

function AllFollowUpsContent() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [branches, setBranches] = useState<string[]>([
    "All Branches",
    "KPHB Branch",
    "Chandanagar Branch",
    "Nallagandla Branch",
    "Dilshuknagar Branch",
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [statusFilter, setStatusFilter] = useState("All");

  // Period / Month Filters: "all", "overdue", "this_month", "next_month", "due_today"
  const [periodFilter, setPeriodFilter] = useState<"all" | "overdue" | "this_month" | "next_month" | "due_today">("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Modals state
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpItem | null>(null);
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

  // Fetch live follow-ups from database
  const fetchFollowUps = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("pageSize", String(pageSize));
        params.set("period", periodFilter);
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (selectedBranch && selectedBranch !== "All Branches") params.set("branch", selectedBranch);
        if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

        const res = await fetch(`/api/admin/all-follow-ups?${params.toString()}`, {
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.followUps)) {
            setFollowUps(data.followUps);
            setTotalCount(data.totalCount || 0);
            setTotalPages(data.totalPages || 1);
            if (data.stats) setStats(data.stats);
            if (Array.isArray(data.branches) && data.branches.length > 0) {
              setBranches(data.branches);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load follow-ups:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, searchTerm, selectedBranch, statusFilter, periodFilter]
  );

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const handlePeriodChange = (period: "all" | "overdue" | "this_month" | "next_month" | "due_today") => {
    setPeriodFilter(period);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Open Reschedule Modal
  const openRescheduleModal = (item: FollowUpItem) => {
    setRescheduleItem(item);
    // Convert DD-MM-YYYY to YYYY-MM-DD for HTML input
    const parts = (item.dueDate || "").split("-");
    if (parts.length === 3) {
      setNewDueDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      setNewDueDate(tomorrow);
    }
    setNewInterval(item.followUpInterval || "1 Month");
    setRescheduleNotes(item.notes || "");
  };

  // Submit Reschedule
  const handleConfirmReschedule = async () => {
    if (!rescheduleItem || !newDueDate) return;
    setSavingReschedule(true);
    try {
      const res = await fetch("/api/admin/all-follow-ups", {
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
    setBookNotes(item.notes || "Booked from hospital follow-up queue");
  };

  // Submit Book Appointment
  const handleConfirmBooking = async () => {
    if (!bookingItem || !bookDate || !bookTimeSlot) return;
    setSavingBooking(true);
    try {
      const res = await fetch("/api/admin/all-follow-ups", {
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

      const res = await fetch(`/api/admin/all-follow-ups?${params.toString()}`, {
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
      link.setAttribute("download", `SPH_FollowUps_${periodFilter}_${nowStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn("Failed to export follow-ups CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/all-follow-ups" />

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
                  All Patient Follow-Ups
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Queue
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Hospital-wide follow-up schedule with direct rescheduling, booking, and branch trajectory
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
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
                title="Refresh follow-ups"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${refreshing ? "animate-spin" : ""}`} />
              </button>

              {/* Excel / CSV Export Button */}
              <button
                onClick={handleExportCSV}
                disabled={totalCount === 0 || exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                title="Export follow-ups to Excel / CSV"
              >
                <Download className={`w-3.5 h-3.5 ${exporting ? "animate-bounce" : ""}`} />
                <span>{exporting ? "Exporting..." : "Export Excel Sheet"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area - Full Width */}
        <div className="p-5 md:p-6 w-full space-y-4">
          {/* Action Success Notification Toast */}
          {actionMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Time & Period Filter Buttons: All, Overdue, This Month, Next Month, Due Today */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 ml-1">
                Filter Period:
              </span>

              {/* All */}
              <button
                onClick={() => handlePeriodChange("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  periodFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>All Follow-Ups</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${periodFilter === "all" ? "bg-slate-800 text-slate-200" : "bg-white text-slate-600"}`}>
                  {stats.total}
                </span>
              </button>

              {/* Overdue (Passes the follow-up date) */}
              <button
                onClick={() => handlePeriodChange("overdue")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  periodFilter === "overdue"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Overdue (Date Passed)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${periodFilter === "overdue" ? "bg-rose-800 text-white" : "bg-white text-rose-700 border border-rose-200"}`}>
                  {stats.overdue}
                </span>
              </button>

              {/* This Month */}
              <button
                onClick={() => handlePeriodChange("this_month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  periodFilter === "this_month"
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "bg-sky-50 text-sky-700 border border-sky-200/80 hover:bg-sky-100"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>This Month</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${periodFilter === "this_month" ? "bg-sky-800 text-white" : "bg-white text-sky-700 border border-sky-200"}`}>
                  {stats.thisMonth}
                </span>
              </button>

              {/* Next Month */}
              <button
                onClick={() => handlePeriodChange("next_month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  periodFilter === "next_month"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-purple-50 text-purple-700 border border-purple-200/80 hover:bg-purple-100"
                }`}
              >
                <Clock3 className="w-3.5 h-3.5" />
                <span>Next Month</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${periodFilter === "next_month" ? "bg-purple-800 text-white" : "bg-white text-purple-700 border border-purple-200"}`}>
                  {stats.nextMonth}
                </span>
              </button>

              {/* Due Today */}
              <button
                onClick={() => handlePeriodChange("due_today")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  periodFilter === "due_today"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Due Today</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${periodFilter === "due_today" ? "bg-emerald-800 text-white" : "bg-white text-emerald-700 border border-emerald-200"}`}>
                  {stats.dueToday}
                </span>
              </button>
            </div>

            <div className="text-[11px] font-bold text-slate-500 mr-2">
              Viewing: <span className="text-slate-900 font-extrabold">{selectedBranch}</span>
            </div>
          </div>

          {/* Master Follow-Ups Card - Full Width */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">S.No</th>
                    <th className="py-3 px-4">Patient MRN / ID</th>
                    <th className="py-3 px-4">Patient Name &amp; Phone</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-3 text-center">Interval</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                          <span className="text-xs font-semibold">Loading real follow-up records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : followUps.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <CalendarCheck className="w-6 h-6 text-slate-300" />
                          <p className="font-bold text-slate-600 text-sm">No follow-ups matching current criteria</p>
                          <p className="text-[11px] text-slate-400">
                            Try adjusting your period filter, search query, or selected branch
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    followUps.map((item, idx) => {
                      const sNo = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* S.No */}
                          <td className="py-3 px-3 text-center font-bold text-slate-400 text-xs">
                            {sNo}
                          </td>

                          {/* Patient MRN / ID */}
                          <td className="py-3 px-4">
                            <span className="text-[10.5px] font-mono font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                              {item.mrn}
                            </span>
                          </td>

                          {/* Patient Name & Phone */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                              {item.patientName}
                            </span>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-[#0284c7]" />
                              <span>{item.phone}</span>
                            </p>
                          </td>

                          {/* Attending Doctor */}
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.doctorName}</span>
                            </div>
                          </td>

                          {/* Branch */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800 bg-slate-100/80 px-2 py-0.5 rounded text-[11px]">
                              {item.branch}
                            </span>
                          </td>

                          {/* Due Date */}
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className={`font-bold ${item.isOverdue ? "text-rose-600" : item.isDueToday ? "text-emerald-700" : "text-slate-800"}`}>
                                {item.dueDate}
                              </span>
                            </div>
                          </td>

                          {/* Interval */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10.5px]">
                              {item.followUpInterval}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black border inline-block ${
                                item.status === "Due Today"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse"
                                  : item.status === "Overdue"
                                  ? "bg-rose-50 text-rose-700 border-rose-300"
                                  : item.status === "Confirmed"
                                  ? "bg-sky-50 text-sky-700 border-sky-300"
                                  : item.status === "Completed"
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-amber-50 text-amber-700 border-amber-300"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          {/* Actions: Reschedule & Book Appointment */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* 1. Reschedule Button */}
                              <button
                                onClick={() => openRescheduleModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-md text-[11px] font-bold transition shadow-2xs"
                                title="Reschedule Follow-Up Date"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span>Reschedule</span>
                              </button>

                              {/* 2. Book Appointment Button */}
                              <button
                                onClick={() => openBookingModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-md text-[11px] font-bold transition shadow-2xs"
                                title="Book Clinical Appointment"
                              >
                                <CalendarPlus className="w-3 h-3" />
                                <span>Book Appointment</span>
                              </button>

                              {/* WhatsApp Contact */}
                              <a
                                href={`https://wa.me/${String(item.phone || "").replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-md transition"
                                title="Message on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>

                              {/* Details Eye Button */}
                              <button
                                onClick={() => setSelectedFollowUp(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                                title="Quick Overview"
                              >
                                <Eye className="w-3.5 h-3.5" />
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

            {/* Server-Side Pagination Controls (Default 35 per page) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50/70 text-xs">
              <div className="text-slate-500 font-medium">
                {totalCount > 0 ? (
                  <>
                    Showing <b className="text-slate-800">{(currentPage - 1) * pageSize + 1}</b> to{" "}
                    <b className="text-slate-800">{Math.min(currentPage * pageSize, totalCount)}</b> of{" "}
                    <b className="text-slate-800">{totalCount}</b> follow-ups
                  </>
                ) : (
                  <span>0 follow-up entries found</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Per Page Selector: 25, 35, 50, 100 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-2 py-1 rounded-md border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value={25}>25 / page</option>
                    <option value={35}>35 / page (Default)</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="px-2 font-bold text-slate-700 text-xs">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || loading}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RESCHEDULE POPUP MODAL                                                    */}
        {/* ========================================================================= */}
        {rescheduleItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-amber-50/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Reschedule Follow-Up</h3>
                    <p className="text-[11px] text-slate-500">
                      {rescheduleItem.patientName} • MRN: {rescheduleItem.mrn}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRescheduleItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    New Follow-Up Due Date *
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Current Due Date: <strong className="text-slate-700">{rescheduleItem.dueDate}</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Follow-Up Interval
                  </label>
                  <select
                    value={newInterval}
                    onChange={(e) => setNewInterval(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="15 Days">15 Days</option>
                    <option value="1 Month">1 Month</option>
                    <option value="2 Months">2 Months</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Reschedule Reason / Clinical Note
                  </label>
                  <textarea
                    rows={3}
                    value={rescheduleNotes}
                    onChange={(e) => setRescheduleNotes(e.target.value)}
                    placeholder="Enter reason for date change or patient conversation note..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  disabled={savingReschedule}
                  className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  disabled={savingReschedule || !newDueDate}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  {savingReschedule ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>{savingReschedule ? "Rescheduling..." : "Confirm & Save"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOOK APPOINTMENT POPUP MODAL                                              */}
        {/* ========================================================================= */}
        {bookingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-sky-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center font-bold">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Book Follow-Up Appointment</h3>
                    <p className="text-[11px] text-slate-500">
                      Scheduling clinical encounter for {bookingItem.patientName} ({bookingItem.mrn})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBookingItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
                {/* Patient Summary Strip */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase">Patient Name</span>
                    <p className="font-bold text-slate-900">{bookingItem.patientName}</p>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase">Phone Number</span>
                    <p className="font-bold text-slate-900">{bookingItem.phone}</p>
                  </div>
                </div>

                {/* Branch & Doctor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 uppercase mb-1">Clinic Branch *</label>
                    <select
                      value={bookBranch}
                      onChange={(e) => setBookBranch(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {branches.filter((b) => b !== "All Branches").map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 uppercase mb-1">Attending Doctor *</label>
                    <select
                      value={bookDoctorId}
                      onChange={(e) => {
                        const sel = DOCTOR_OPTIONS.find((d) => d.id === e.target.value);
                        setBookDoctorId(e.target.value);
                        if (sel) setBookDoctorName(sel.name);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {DOCTOR_OPTIONS.map((doc) => (
                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Appointment Date & Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 uppercase mb-1">Appointment Date *</label>
                    <input
                      type="date"
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 uppercase mb-1">Preferred Time Slot *</label>
                    <select
                      value={bookTimeSlot}
                      onChange={(e) => setBookTimeSlot(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {STANDARD_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Consultation Mode */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 uppercase mb-1">Consultation Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBookMode("In-Clinic")}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition text-center ${
                        bookMode === "In-Clinic"
                          ? "bg-sky-50 border-sky-300 text-[#0284c7]"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      🏥 In-Clinic Encounter
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookMode("Video Call")}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition text-center ${
                        bookMode === "Video Call"
                          ? "bg-sky-50 border-sky-300 text-[#0284c7]"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      📹 Video Consultation
                    </button>
                  </div>
                </div>

                {/* Reason & Notes */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 uppercase mb-1">Primary Symptoms / Reason</label>
                  <input
                    type="text"
                    value={bookReason}
                    onChange={(e) => setBookReason(e.target.value)}
                    placeholder="e.g. Chronic Allergy follow-up check..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 uppercase mb-1">Clinical Remarks / Booking Notes</label>
                  <textarea
                    rows={2}
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    placeholder="Any patient requests, notes from previous prescription..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookingItem(null)}
                  disabled={savingBooking}
                  className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={savingBooking || !bookDate || !bookTimeSlot}
                  className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  {savingBooking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                  <span>{savingBooking ? "Confirming Booking..." : "Confirm & Book Appointment"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick View Details Modal */}
        {selectedFollowUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{selectedFollowUp.patientName}</h3>
                    <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                      MRN: {selectedFollowUp.mrn}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFollowUp(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</span>
                    <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-sky-600" />
                      <span>{selectedFollowUp.phone}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow-Up Due Date</span>
                    <div className="font-bold text-slate-900 mt-0.5">{selectedFollowUp.dueDate}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Clinic</span>
                    <div className="font-bold text-slate-900 mt-0.5">{selectedFollowUp.branch}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attending Doctor</span>
                    <div className="font-bold text-slate-900 mt-0.5">{selectedFollowUp.doctorName}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Clinical Review Notes / Condition
                  </span>
                  <div className="p-2.5 rounded-lg bg-sky-50/50 border border-sky-100 text-slate-800 font-semibold">
                    {selectedFollowUp.notes}
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 text-[11px]">
                  <span>
                    Interval: <strong className="text-slate-900">{selectedFollowUp.followUpInterval}</strong>
                  </span>
                  <span>
                    Status: <strong className="text-slate-900">{selectedFollowUp.status}</strong>
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`https://wa.me/${String(selectedFollowUp.phone || "").replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const item = selectedFollowUp;
                      setSelectedFollowUp(null);
                      openRescheduleModal(item);
                    }}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-lg transition"
                  >
                    Reschedule
                  </button>

                  <button
                    onClick={() => {
                      const item = selectedFollowUp;
                      setSelectedFollowUp(null);
                      openBookingModal(item);
                    }}
                    className="px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs rounded-lg transition"
                  >
                    Book Appointment
                  </button>

                  <button
                    onClick={() => setSelectedFollowUp(null)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AllFollowUpsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans">
          <AdminSidebar currentPath="/admin/all-follow-ups" />
          <main className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
              <span>Loading Patient Follow-Ups Queue...</span>
            </div>
          </main>
        </div>
      }
    >
      <AllFollowUpsContent />
    </Suspense>
  );
}
