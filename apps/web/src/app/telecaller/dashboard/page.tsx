"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TelecallerSidebar from "@/components/telecaller/TelecallerSidebar";
import AnalogClockPicker from "@/components/AnalogClockPicker";
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
  ChevronDown,
  ExternalLink,
  MessageSquare,
  X,
  Stethoscope,
  CalendarPlus,
  RotateCcw,
  Headset,
  PhoneCall,
  PhoneOutgoing,
  Check,
  ClipboardList,
  Sparkles,
  Users,
  Trash2,
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
  isDueTomorrow?: boolean;
  isThisMonth: boolean;
  isNextMonth: boolean;
  followUpInterval: string;
  status: "Due Today" | "Due Tomorrow" | "Overdue" | "Upcoming" | "Confirmed" | "Scheduled" | "Completed";
  notes: string;
  consultationFee: number;
  prescriptionImages?: string[];
}

export interface DoctorOption {
  id: string;
  doctorId?: string;
  name: string;
  specialty?: string;
  phone?: string;
  color?: string;
  slots?: any[];
}

export interface PatientSuggestion {
  id: string;
  name: string;
  phone: string;
  regId: string;
  branch?: string;
  diseases?: string;
}

const CONSULTATION_MODES = [
  { id: "In-Clinic", label: "In-Clinic" },
  { id: "Online", label: "Online" },
];

const MARKETING_SOURCES = [
  "Old Patient",
  "Referral",
  "Google",
  "Youtube",
  "Walk-in",
  "Practo",
  "Facebook",
  "Instagram",
  "Other",
];

const CALL_OUTCOMES = [
  { id: "Interested", label: "Interested", color: "text-emerald-700 bg-emerald-50 border-emerald-300" },
  { id: "Callback Requested", label: "Callback", color: "text-sky-700 bg-sky-50 border-sky-300" },
  { id: "Not Interested", label: "Not Interested", color: "text-rose-700 bg-rose-50 border-rose-300" },
  { id: "No Response", label: "No Response", color: "text-slate-700 bg-slate-100 border-slate-300" },
  { id: "Switched Off / Busy", label: "Switched Off / Busy", color: "text-amber-700 bg-amber-50 border-amber-300" },
];

function getDayOfWeekAbbr(dateStr: string): string {
  if (!dateStr) return "Mon";
  let d: Date;
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts[0].length === 4) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  } else {
    d = new Date(dateStr);
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()] || "Mon";
}

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const clean = t.trim().toUpperCase();
  const match = clean.match(/(\d{1,2})(?::(\d{1,2}))?\s*([APap][Mm])?/);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ap = (match[3] || "").toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function minutesToTimeString(minutes: number): string {
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hStr = String(h).padStart(2, "0");
  const mStr = String(m).padStart(2, "0");
  return `${hStr}:${mStr} ${ap}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function toDDMMYYYY(dt: string): string {
  if (!dt) return "";
  const parts = dt.trim().split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dt;
}

function isDateInPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split("-");
  let y: number, m: number, d: number;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else {
      y = parseInt(parts[2], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[0], 10);
    }
    const target = new Date(y, m, d);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target.getTime() < today.getTime();
  }
  return false;
}

function isDateToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split("-");
  let y: number, m: number, d: number;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else {
      y = parseInt(parts[2], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[0], 10);
    }
    const today = new Date();
    return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
  }
  return false;
}

function isSlotTimePassed(timeStr: string, dateStr: string): boolean {
  if (isDateInPast(dateStr)) return true;
  if (!isDateToday(dateStr)) return false;
  const slotMinutes = parseTimeToMinutes(timeStr);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes < currentMinutes;
}

function TelecallerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") || "followups").toLowerCase();

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

  // Period Filters: "all", "overdue", "this_month", "next_month", "due_today", "due_tomorrow", "month", "range"
  const [periodFilter, setPeriodFilter] = useState<"all" | "overdue" | "this_month" | "next_month" | "due_today" | "due_tomorrow" | "month" | "range">("due_today");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Modals state for Follow-up Roster
  const [rescheduleItem, setRescheduleItem] = useState<FollowUpItem | null>(null);
  const [bookingItem, setBookingItem] = useState<FollowUpItem | null>(null);
  const [logCallItem, setLogCallItem] = useState<FollowUpItem | null>(null);

  // Form state for Reschedule
  const [newDueDate, setNewDueDate] = useState("");
  const [newInterval, setNewInterval] = useState("1 Month");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Form state for Book Appointment (Modal & Desk)
  const [bookBranch, setBookBranch] = useState("KPHB Branch");
  const [bookDoctorId, setBookDoctorId] = useState("");
  const [bookDoctorName, setBookDoctorName] = useState("");
  const [bookDate, setBookDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookTimeSlot, setBookTimeSlot] = useState("");
  const [bookMode, setBookMode] = useState<"In-Clinic" | "Online">("In-Clinic");
  const [bookReason, setBookReason] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [savingBooking, setSavingBooking] = useState(false);

  // =========================================================================
  // APPOINTMENT BOOKING DESK (SAME AS RECEPTION + EXTRA BRANCH DROPDOWN)
  // =========================================================================
  const [deskPatientName, setDeskPatientName] = useState("");
  const [deskPhone, setDeskPhone] = useState("");
  const [deskDiseases, setDeskDiseases] = useState("");
  const [deskSource, setDeskSource] = useState("Referral");
  const [deskBranch, setDeskBranch] = useState("KPHB Branch");
  const [deskRegId, setDeskRegId] = useState("");
  const [patientSuggestions, setPatientSuggestions] = useState<PatientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef<any>(null);

  // Success Confirmation Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookedSuccessDetails, setBookedSuccessDetails] = useState<any>(null);

  // Interactive Web Calendar State for Book Appointment (Desk & Modal)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const daysInMonth = useMemo(() => new Date(calYear, calMonth + 1, 0).getDate(), [calYear, calMonth]);
  const firstDayOffset = useMemo(() => new Date(calYear, calMonth, 1).getDay(), [calYear, calMonth]);

  // Keep calMonth and calYear synced with bookDate
  useEffect(() => {
    if (bookDate) {
      const parts = bookDate.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          setCalYear(parseInt(parts[0], 10));
          setCalMonth(parseInt(parts[1], 10) - 1);
        } else {
          setCalYear(parseInt(parts[2], 10));
          setCalMonth(parseInt(parts[1], 10) - 1);
        }
      }
    }
  }, [bookDate]);

  // Form state for Log Call Outcome
  const [callOutcome, setCallOutcome] = useState("Interested");
  const [callRemarks, setCallRemarks] = useState("");
  const [savingCallLog, setSavingCallLog] = useState(false);

  // Standalone Call Logs Form state
  const [logPatientName, setLogPatientName] = useState("");
  const [logPhone, setLogPhone] = useState("");
  const [logBranch, setLogBranch] = useState("KPHB Branch");
  const [logSuggestions, setLogSuggestions] = useState<PatientSuggestion[]>([]);
  const [showLogSuggestions, setShowLogSuggestions] = useState(false);
  const logSearchDebounceRef = useRef<any>(null);

  // Recent call activity logs for viewing and deletion
  const [recentCallLogs, setRecentCallLogs] = useState<any[]>([]);
  const [loadingRecentLogs, setLoadingRecentLogs] = useState(false);

  // Dynamic doctors, no-shows & booked appointments
  const [bookingAvailableDoctors, setBookingAvailableDoctors] = useState<DoctorOption[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<any[]>([]);
  const [loadingBookingDoctors, setLoadingBookingDoctors] = useState(false);
  const [activeBookingNoShows, setActiveBookingNoShows] = useState<any[]>([]);

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
    dueTomorrow: 0,
    thisMonth: 0,
    nextMonth: 0,
    completed: 0,
  });

  // Load clinic branches & initial assigned branch
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("user_assigned_branch") ||
        localStorage.getItem("user_branch") ||
        localStorage.getItem("branch_name");
      if (saved && saved !== "Spiritual Homeopathy Clinic" && saved !== "All Branches") {
        setSelectedBranch(saved);
        setBookBranch(saved);
        setDeskBranch(saved);
        setLogBranch(saved);
      }
    } catch {}

    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.data) ? d.data : [];
        if (list.length > 0) {
          const names: string[] = list.map((b: any) => String(b.name || "").trim()).filter(Boolean);
          setBranches(["All Branches", ...Array.from(new Set(names))]);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch follow-ups from database (Synced across All Branches or selected branch)
  const fetchFollowUps = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("pageSize", String(pageSize));
        params.set("period", periodFilter);
        if (periodFilter === "month" && selectedMonth) {
          params.set("selectedMonth", selectedMonth);
        }
        if (periodFilter === "range") {
          if (startDate) params.set("startDate", startDate);
          if (endDate) params.set("endDate", endDate);
        }

        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (selectedBranch && selectedBranch !== "All Branches") {
          params.set("branch", selectedBranch);
        }
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
            setBranches(["All Branches", ...data.branches.filter((b: string) => b !== "All Branches")]);
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error("Error fetching telecaller follow-ups:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, periodFilter, searchTerm, selectedBranch, statusFilter, selectedMonth, startDate, endDate]
  );

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Debounced patient autocomplete search for Book Appointment Desk
  const handleDeskPatientNameChange = (val: string) => {
    setDeskPatientName(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val || val.trim().length < 2) {
      setPatientSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const cleanB = deskBranch.replace(/Spiritual Homeopathy/gi, "").trim();
        const res = await fetch(`/api/reception/patients?query=${encodeURIComponent(val.trim())}&branch=${encodeURIComponent(cleanB)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.patients)) {
            setPatientSuggestions(data.patients.slice(0, 8));
            setShowSuggestions(data.patients.length > 0);
          }
        }
      } catch {}
    }, 280);
  };

  const handleSelectSuggestion = (p: PatientSuggestion) => {
    setDeskPatientName(p.name);
    setDeskPhone(p.phone || "");
    setDeskRegId(p.regId || "");
    if (p.diseases) setDeskDiseases(p.diseases);
    if (p.branch && branches.includes(p.branch)) {
      setDeskBranch(p.branch);
      setBookBranch(p.branch);
    }
    setShowSuggestions(false);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentPage(1);
  };

  const handlePeriodChange = (
    period: "all" | "overdue" | "this_month" | "next_month" | "due_today" | "due_tomorrow" | "month" | "range"
  ) => {
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
    const parts = (item.dueDate || "").split("-");
    if (parts.length === 3) {
      setNewDueDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      setNewDueDate(new Date().toISOString().slice(0, 10));
    }
    const cleanIntv =
      !item.followUpInterval || item.followUpInterval === "Custom Date" || item.followUpInterval === "No Follow-up"
        ? item.dueDate || "1 Month"
        : item.followUpInterval;
    setNewInterval(cleanIntv);
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
        setActionMessage(`Follow-up for ${rescheduleItem.patientName} successfully rescheduled to ${newDueDate}!`);
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

  // Open Book Appointment Modal from Table
  const openBookingModal = (item: FollowUpItem) => {
    setBookingItem(item);
    const initialBranch =
      item.branch && item.branch !== "All Branches"
        ? item.branch
        : selectedBranch !== "All Branches"
        ? selectedBranch
        : "KPHB Branch";
    setBookBranch(initialBranch);
    setBookDoctorId(item.doctorId || "");
    setBookDoctorName(item.doctorName || "");

    let initDate = "";
    const parts = (item.dueDate || "").split("-");
    if (parts.length === 3) {
      initDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      initDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    }
    setBookDate(initDate);
    setBookTimeSlot("");
    setBookMode("In-Clinic");
    setBookReason(`Follow-up review for ${item.patientName}`);
    setBookNotes(item.notes || "Booked from telecaller calling roster");
  };

  // Open Log Call Modal from Table
  const openLogCallModal = (item: FollowUpItem) => {
    setLogCallItem(item);
    setCallOutcome("Interested");
    setCallRemarks(item.notes || "");
  };

  // Submit Call Log Modal
  const handleSaveCallLog = async () => {
    if (!logCallItem) return;
    setSavingCallLog(true);
    try {
      const agentName = localStorage.getItem("telecaller_name") || localStorage.getItem("user_name") || "Telecaller Desk";
      const telecallerId = localStorage.getItem("telecaller_id") || "TC01";

      const res = await fetch("/api/telecaller/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: logCallItem.patientName,
          phone: logCallItem.phone.replace(/\D/g, ""),
          branch: logCallItem.branch,
          dateTime: new Date().toISOString(),
          callOutcome,
          notes: callRemarks,
          agentName,
          telecallerId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Call log saved for ${logCallItem.patientName} (${callOutcome})!`);
        setTimeout(() => setActionMessage(null), 4000);
        setLogCallItem(null);
      } else {
        alert(data.error || "Failed to save call log");
      }
    } catch (err: any) {
      alert(err.message || "Error saving call log");
    } finally {
      setSavingCallLog(false);
    }
  };

  // Submit Standalone Call Log from Call Logs tab
  const handleStandaloneCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logPatientName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    const cleanPhone = logPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSavingCallLog(true);
    try {
      const agentName = localStorage.getItem("telecaller_name") || localStorage.getItem("user_name") || "Telecaller Desk";
      const telecallerId = localStorage.getItem("telecaller_id") || "TC01";

      const res = await fetch("/api/telecaller/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: logPatientName.trim(),
          phone: cleanPhone,
          branch: logBranch,
          dateTime: new Date().toISOString(),
          callOutcome,
          notes: callRemarks,
          agentName,
          telecallerId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Call log recorded for ${logPatientName} (${callOutcome})!`);
        setTimeout(() => setActionMessage(null), 4000);
        setLogPatientName("");
        setLogPhone("");
        setCallRemarks("");
        // Redirect to main Follow-Up Calling Roster
        router.push("/telecaller/dashboard");
      } else {
        alert(data.error || "Failed to save call log");
      }
    } catch (err: any) {
      alert(err.message || "Error saving call log");
    } finally {
      setSavingCallLog(false);
    }
  };

  // Debounced patient autocomplete search for Log Call Desk
  const handleLogPatientNameChange = (val: string) => {
    setLogPatientName(val);
    if (logSearchDebounceRef.current) clearTimeout(logSearchDebounceRef.current);
    if (!val || val.trim().length < 2) {
      setLogSuggestions([]);
      setShowLogSuggestions(false);
      return;
    }
    logSearchDebounceRef.current = setTimeout(async () => {
      try {
        const cleanB = logBranch.replace(/Spiritual Homeopathy/gi, "").trim();
        const res = await fetch(
          `/api/reception/patients?query=${encodeURIComponent(val.trim())}&branch=${encodeURIComponent(cleanB)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.patients)) {
            setLogSuggestions(data.patients.slice(0, 8));
            setShowLogSuggestions(true);
          }
        }
      } catch {
        // ignore
      }
    }, 250);
  };

  const handleSelectLogSuggestion = (p: PatientSuggestion) => {
    setLogPatientName(p.name);
    setLogPhone((p.phone || "").replace(/\D/g, ""));
    if (p.branch) {
      const bNorm = p.branch.includes("Branch") ? p.branch : `${p.branch} Branch`;
      setLogBranch(bNorm);
    }
    setShowLogSuggestions(false);
  };

  // Fetch recent call activity logs
  const fetchRecentLogs = useCallback(async () => {
    setLoadingRecentLogs(true);
    try {
      const res = await fetch("/api/telecaller/call-logs");
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setRecentCallLogs(data.logs);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRecentLogs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "log_call") {
      fetchRecentLogs();
    }
  }, [activeTab, fetchRecentLogs]);

  // Delete Call Log Update
  const handleDeleteCallLog = async (logId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to delete the call log update for "${patientName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/telecaller/call-logs?id=${encodeURIComponent(logId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecentCallLogs((prev) => prev.filter((l) => l.id !== logId));
        setActionMessage(`Call log for ${patientName} deleted successfully.`);
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.error || "Failed to delete call log update.");
      }
    } catch (err: any) {
      alert(err.message || "Error deleting call log update.");
    }
  };

  // Active target branch for doctor loading (works for both modal & standalone desk)
  const activeTargetBranch = activeTab === "book_appointment" ? deskBranch : bookBranch;

  // Fetch doctors and active no-shows for Book Appointment based on branch, date, and mode
  useEffect(() => {
    if (!bookDate) return;

    let isMounted = true;
    setLoadingBookingDoctors(true);

    if (bookMode === "Online") {
      fetch("/api/admin/employees?category=DOCTOR")
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          const docList = Array.isArray(data.employees) ? data.employees : [];
          const mapped: DoctorOption[] = docList.map((d: any) => ({
            id: d.id,
            doctorId: d.id,
            name: d.name,
            specialty: d.designation || d.specialty || "Homeopathic Consultant",
            slots: [],
          }));
          setBookingAvailableDoctors(mapped);
          setActiveBookingNoShows([]);

          if (mapped.length > 0) {
            const match = mapped.find((d: any) => d.id === bookDoctorId || d.name === bookDoctorName);
            const sel = match || mapped[0];
            setBookDoctorId(sel.id);
            setBookDoctorName(sel.name);
          }
        })
        .catch((err) => {
          console.error("Error fetching online doctors:", err);
          if (isMounted) setBookingAvailableDoctors([]);
        })
        .finally(() => {
          if (isMounted) setLoadingBookingDoctors(false);
        });

      return () => {
        isMounted = false;
      };
    }

    // In-Clinic mode: Fetch branch doctors and active no-shows for this date
    const day = getDayOfWeekAbbr(bookDate);
    const cleanBranch = activeTargetBranch.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

    let dtFormatted = bookDate;
    if (bookDate.includes("-")) {
      const p = bookDate.split("-");
      if (p[0].length === 4) {
        dtFormatted = `${p[2]}-${p[1]}-${p[0]}`;
      }
    }

    Promise.all([
      fetch(`/api/admin/doctor-timings?branch=${encodeURIComponent(cleanBranch)}&day=${day}`).then((r) => r.json()),
      fetch(`/api/reception/doctor-no-show?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dtFormatted)}`).then((r) => r.json()),
    ])
      .then(([timingsData, noShowData]) => {
        if (!isMounted) return;
        let noShows: any[] = [];
        if (noShowData && noShowData.success && Array.isArray(noShowData.noShows)) {
          noShows = noShowData.noShows;
        }
        setActiveBookingNoShows(noShows);

        let doctors: any[] = [];
        if (timingsData && timingsData.success && Array.isArray(timingsData.doctors)) {
          doctors = timingsData.doctors;
        }

        const availableDocs: DoctorOption[] = doctors.map((d: any) => ({
          ...d,
          id: d.doctorId || d.id,
          doctorId: d.doctorId || d.id,
          name: d.doctorName || d.name,
          doctorName: d.doctorName || d.name,
        }));

        setBookingAvailableDoctors(availableDocs);

        const currentDocMatch = availableDocs.find(
          (d: any) => d.doctorId === bookDoctorId || d.id === bookDoctorId || d.name === bookDoctorName
        );
        const activeDoc = currentDocMatch || availableDocs[0] || null;

        if (activeDoc) {
          setBookDoctorId(activeDoc.doctorId || activeDoc.id);
          setBookDoctorName(activeDoc.name);
        } else {
          setBookDoctorId("");
          setBookDoctorName("");
          setBookTimeSlot("");
        }
      })
      .catch((err) => {
        console.error("Error fetching booking doctors:", err);
        if (isMounted) {
          setBookingAvailableDoctors([]);
          setActiveBookingNoShows([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingBookingDoctors(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTargetBranch, bookDate, bookMode]);

  // Fetch booked appointments for live slot capacity calculation (In-Clinic mode)
  useEffect(() => {
    if (bookMode !== "In-Clinic" || !bookDoctorId || !bookDate) {
      setBookedAppointments([]);
      return;
    }

    let isMounted = true;
    let dtFormatted = bookDate;
    if (bookDate.includes("-")) {
      const p = bookDate.split("-");
      if (p[0].length === 4) {
        dtFormatted = `${p[2]}-${p[1]}-${p[0]}`;
      }
    }
    const cleanBranch = activeTargetBranch.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

    fetch(
      `/api/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dtFormatted)}&doctorId=${encodeURIComponent(bookDoctorId)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        if (data && data.success && Array.isArray(data.appointments)) {
          setBookedAppointments(data.appointments);
        } else {
          setBookedAppointments([]);
        }
      })
      .catch(() => {
        if (isMounted) setBookedAppointments([]);
      });

    return () => {
      isMounted = false;
    };
  }, [bookMode, activeTargetBranch, bookDate, bookDoctorId]);

  // Compute 15-minute slot sessions with 3-capacity per slot for In-Clinic mode
  const bookingSlotSessions = useMemo(() => {
    if (bookMode === "Online" || !bookDoctorId || bookingAvailableDoctors.length === 0) return [];

    const selectedDoc = bookingAvailableDoctors.find(
      (d: any) => (d.doctorId || d.id) === bookDoctorId
    );
    if (!selectedDoc) return [];

    let ranges = Array.isArray(selectedDoc.slots) ? selectedDoc.slots : [];
    if (ranges.length === 0) {
      ranges = [
        { displayText: "10:00 AM - 01:00 PM" },
        { displayText: "05:00 PM - 09:00 PM" },
      ];
    }

    const doctorNoShow = activeBookingNoShows.find(
      (ns) =>
        ns.doctorId === selectedDoc.doctorId ||
        ns.doctorId === selectedDoc.id ||
        ns.doctorName === selectedDoc.name
    );

    const checkIsSlotNoShow = (curMin: number): boolean => {
      if (!doctorNoShow) return false;
      if (doctorNoShow.type === "FULL_DAY") return true;
      if (doctorNoShow.type === "HALF_DAY") {
        if (doctorNoShow.halfDayType === "FIRST_HALF") {
          return curMin < 840; // Before 2:00 PM
        } else {
          return curMin >= 840; // 2:00 PM onwards
        }
      }
      if (doctorNoShow.type === "SPECIFIC_TIME" && doctorNoShow.startTime && doctorNoShow.endTime) {
        const startNoShow = parseTimeToMinutes(doctorNoShow.startTime);
        const endNoShow = parseTimeToMinutes(doctorNoShow.endTime);
        return curMin >= startNoShow && curMin < endNoShow;
      }
      return false;
    };

    const getSlotBookedCount = (timeStr: string) => {
      const normTime = timeStr.trim().toUpperCase();
      return bookedAppointments.filter(
        (a) => (a.timeSlot || "").trim().toUpperCase() === normTime && a.status !== "CANCELLED"
      ).length;
    };

    return ranges.map((r: any, sIdx: number) => {
      let startMin = 0;
      let endMin = 0;
      const rText = typeof r === "string" ? r : (r?.displayText || "");

      if (typeof r === "object" && r?.startHour && r?.endHour) {
        const sHour = r.startHour;
        const sMin = r.startMin ?? r.startMinute ?? "00";
        const sAmPm = r.startAmPm || "AM";

        const eHour = r.endHour;
        const eMin = r.endMin ?? r.endMinute ?? "00";
        const eAmPm = r.endAmPm || "PM";

        startMin = parseTimeToMinutes(`${sHour}:${sMin} ${sAmPm}`);
        endMin = parseTimeToMinutes(`${eHour}:${eMin} ${eAmPm}`);
      } else if (rText) {
        const parts = rText.split(/[-–—]|to/i);
        if (parts.length === 2) {
          startMin = parseTimeToMinutes(parts[0]);
          endMin = parseTimeToMinutes(parts[1]);
        }
      }

      if (startMin === 0 && endMin === 0) {
        startMin = 600; // 10:00 AM
        endMin = 780;  // 01:00 PM
      }

      if (endMin <= startMin) {
        endMin = startMin + 180;
      }

      const sessionSlots: { time: string; bookedCount: number; maxCapacity: number; isFull: boolean; isNoShow: boolean; isPast: boolean }[] = [];

      for (let cur = startMin; cur < endMin; cur += 15) {
        const timeStr = minutesToTimeString(cur);
        const isNoShow = checkIsSlotNoShow(cur);
        const bookedCount = getSlotBookedCount(timeStr);
        const isPast = isSlotTimePassed(timeStr, bookDate);
        const isFull = isNoShow || bookedCount >= 3 || isPast;
        sessionSlots.push({
          time: timeStr,
          bookedCount,
          maxCapacity: 3,
          isFull,
          isNoShow,
          isPast,
        });
      }

      return {
        sessionName: `Session ${sIdx + 1} (${minutesToTimeString(startMin)} - ${minutesToTimeString(endMin)})`,
        slots: sessionSlots,
      };
    });
  }, [bookMode, bookDoctorId, bookingAvailableDoctors, activeBookingNoShows, bookedAppointments, bookDate]);

  // Handle Confirm Booking from Modal
  const handleConfirmModalBooking = async () => {
    if (!bookingItem || !bookDate || !bookTimeSlot) {
      alert("Please choose appointment date and an available time slot");
      return;
    }
    setSavingBooking(true);
    try {
      let dtFormatted = bookDate;
      if (bookDate.includes("-")) {
        const p = bookDate.split("-");
        if (p[0].length === 4) {
          dtFormatted = `${p[2]}-${p[1]}-${p[0]}`;
        }
      }

      const res = await fetch("/api/reception/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: bookingItem.appointmentId,
          patientName: bookingItem.patientName,
          phoneNumber: bookingItem.phone,
          branch: bookMode === "Online" ? "Online Consultation" : bookBranch,
          doctorId: bookDoctorId,
          doctorName: bookDoctorName,
          appointmentDate: dtFormatted,
          selectedTimeSlot: bookTimeSlot,
          consultationMode: bookMode,
          diseases: bookReason || "Follow-up Booking",
          notes: bookNotes || "Booked from telecaller portal",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFollowUps((prev) =>
          prev.filter(
            (f) => f.id !== bookingItem.id && f.appointmentId !== bookingItem.appointmentId
          )
        );
        setActionMessage(
          `Appointment successfully booked for ${bookingItem.patientName} at ${bookBranch} on ${dtFormatted} (${bookTimeSlot})!`
        );
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

  // Handle Confirm Booking from Standalone Desk (Reception Mirror)
  const handleDeskBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskPatientName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    const cleanPhone = deskPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!bookDate || !bookTimeSlot) {
      alert("Please choose appointment date and an available time slot.");
      return;
    }
    if (!bookDoctorId) {
      alert("Please select a consultant doctor.");
      return;
    }

    setSavingBooking(true);
    try {
      let dtFormatted = bookDate;
      if (bookDate.includes("-")) {
        const p = bookDate.split("-");
        if (p[0].length === 4) {
          dtFormatted = `${p[2]}-${p[1]}-${p[0]}`;
        }
      }

      const res = await fetch("/api/reception/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: deskPatientName.trim(),
          phoneNumber: cleanPhone,
          diseases: deskDiseases.trim() || "Consultation",
          marketingSource: deskSource,
          consultationMode: bookMode,
          branch: bookMode === "Online" ? "Online Consultation" : deskBranch,
          doctorId: bookDoctorId,
          doctorName: bookDoctorName,
          appointmentDate: dtFormatted,
          selectedTimeSlot: bookTimeSlot,
          notes: bookNotes || "Booked from telecaller appointment desk",
          registrationId: deskRegId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookedSuccessDetails({
          token: data.token || `#A-${Math.floor(1000 + Math.random() * 9000)}`,
          regId: data.registrationId || deskRegId || "SPH-GEN",
          name: deskPatientName,
          doctor: bookDoctorName,
          date: dtFormatted,
          time: bookTimeSlot,
          branch: deskBranch,
        });
        setShowSuccessModal(true);
        // Reset form
        setDeskPatientName("");
        setDeskPhone("");
        setDeskDiseases("");
        setDeskRegId("");
        setBookTimeSlot("");
        setBookNotes("");
        fetchFollowUps(true);
      } else {
        alert(data.error || "Failed to schedule appointment. Please try again.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to book appointment");
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
      if (periodFilter === "month" && selectedMonth) params.set("selectedMonth", selectedMonth);
      if (periodFilter === "range") {
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }
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
        `"${!f.followUpInterval || f.followUpInterval === "Custom Date" || f.followUpInterval === "No Follow-up" ? f.dueDate : f.followUpInterval}"`,
        `"${f.status}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      const nowStr = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SPH_Telecaller_FollowUps_${periodFilter}_${nowStr}.csv`);
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
      <TelecallerSidebar activeTab={activeTab} />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold shadow-2xs">
                  {activeTab === "book_appointment" ? (
                    <CalendarPlus className="w-4 h-4" />
                  ) : activeTab === "log_call" ? (
                    <ClipboardList className="w-4 h-4" />
                  ) : (
                    <Headset className="w-4 h-4" />
                  )}
                </div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {activeTab === "book_appointment"
                    ? "Book Patient Appointment"
                    : activeTab === "log_call"
                    ? "Log Patient Call Update"
                    : "Patient Follow-Up Calling Roster"}
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Queue
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {activeTab === "book_appointment"
                  ? `${deskBranch} • Direct registration & slot booking with multi-branch selection`
                  : activeTab === "log_call"
                  ? `${logBranch} • Record patient call outcomes & discussion updates`
                  : `${selectedBranch} • Multi-branch telecaller roster with live status, slot booking & rescheduling`}
              </p>
            </div>

            {/* Navigation Tabs Pill Bar */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
              <Link
                href="/telecaller/dashboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "followups"
                    ? "bg-white text-sky-700 shadow-2xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Follow-ups</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-sky-100 text-sky-800 font-extrabold">
                  {stats.total}
                </span>
              </Link>

              <Link
                href="/telecaller/dashboard?tab=book_appointment"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "book_appointment"
                    ? "bg-white text-sky-700 shadow-2xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Book Slot</span>
              </Link>

              <Link
                href="/telecaller/dashboard?tab=log_call"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "log_call"
                    ? "bg-white text-sky-700 shadow-2xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Log Call</span>
              </Link>
            </div>

            {/* Actions for Follow-ups Tab */}
            {activeTab === "followups" && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patient, phone, MRN..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-44 sm:w-52"
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

                {/* Branch Selector (UNLOCKED: Telecaller can view All Branches or any branch) */}
                <select
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-xs font-bold text-sky-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs"
                >
                  <option value="All Branches">🌐 All Branches</option>
                  {branches
                    .filter((b) => b !== "All Branches")
                    .map((b) => (
                      <option key={b} value={b}>
                        📍 {b}
                      </option>
                    ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs"
                >
                  <option value="All">All Statuses</option>
                  <option value="Due Today">Due Today</option>
                  <option value="Due Tomorrow">Due Tomorrow</option>
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
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Refresh Live Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-sky-600" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* Export Excel / CSV Button */}
                <button
                  onClick={handleExportCSV}
                  disabled={exporting || followUps.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exporting ? "Exporting..." : "Export Excel"}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Action notification toast */}
        {actionMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: PATIENT FOLLOW-UP CALLING ROSTER                                  */}
        {/* ========================================================================= */}
        {activeTab === "followups" && (
          <div className="p-6 space-y-4">
            {/* Period Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">
                  Period Filter:
                </span>

                {/* 1. Today */}
                <button
                  onClick={() => handlePeriodChange("due_today")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    periodFilter === "due_today"
                      ? "bg-amber-600 text-white shadow-2xs shadow-amber-200"
                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Today</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${
                      periodFilter === "due_today" ? "bg-white/25 text-white" : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {stats.dueToday}
                  </span>
                </button>

                {/* 2. Tomorrow */}
                <button
                  onClick={() => handlePeriodChange("due_tomorrow")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    periodFilter === "due_tomorrow"
                      ? "bg-emerald-600 text-white shadow-2xs shadow-emerald-200"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tomorrow</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${
                      periodFilter === "due_tomorrow" ? "bg-white/25 text-white" : "bg-emerald-200 text-emerald-900"
                    }`}
                  >
                    {stats.dueTomorrow}
                  </span>
                </button>

                {/* 3. This Month */}
                <button
                  onClick={() => handlePeriodChange("this_month")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    periodFilter === "this_month"
                      ? "bg-sky-600 text-white shadow-2xs shadow-sky-200"
                      : "bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>This Month</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${
                      periodFilter === "this_month" ? "bg-white/25 text-white" : "bg-sky-200 text-sky-800"
                    }`}
                  >
                    {stats.thisMonth}
                  </span>
                </button>

                {/* 4. Next Month */}
                <button
                  onClick={() => handlePeriodChange("next_month")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    periodFilter === "next_month"
                      ? "bg-indigo-600 text-white shadow-2xs shadow-indigo-200"
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Next Month</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${
                      periodFilter === "next_month" ? "bg-white/25 text-white" : "bg-indigo-200 text-indigo-800"
                    }`}
                  >
                    {stats.nextMonth}
                  </span>
                </button>

                {/* 5. Overdue */}
                <button
                  onClick={() => handlePeriodChange("overdue")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    periodFilter === "overdue"
                      ? "bg-rose-600 text-white shadow-2xs shadow-rose-200"
                      : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Overdue</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${
                      periodFilter === "overdue" ? "bg-white/25 text-white" : "bg-rose-200 text-rose-800"
                    }`}
                  >
                    {stats.overdue}
                  </span>
                </button>

                {/* 6. Custom Month */}
                <button
                  onClick={() => handlePeriodChange("month")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    periodFilter === "month"
                      ? "bg-purple-600 text-white shadow-2xs shadow-purple-200"
                      : "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Custom Month</span>
                  {periodFilter === "month" && selectedMonth && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-purple-800 text-white font-mono">
                      {selectedMonth}
                    </span>
                  )}
                </button>

                {/* 7. Custom Date */}
                <button
                  onClick={() => handlePeriodChange("range")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    periodFilter === "range"
                      ? "bg-teal-600 text-white shadow-2xs shadow-teal-200"
                      : "bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200"
                  }`}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Custom Date</span>
                  {periodFilter === "range" && (startDate || endDate) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-teal-800 text-white">
                      Active
                    </span>
                  )}
                </button>

                {/* 8. All Follow-Ups */}
                <button
                  onClick={() => handlePeriodChange("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    periodFilter === "all"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>All Follow-Ups</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-white/20 text-current font-extrabold">
                    {stats.total}
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
                  className="px-2 py-1 rounded-md border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs"
                >
                  <option value={25}>25</option>
                  <option value={35}>35 (Default)</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Extended controls for Choose Month */}
              {periodFilter === "month" && (
                <div className="w-full pt-2.5 mt-1 border-t border-slate-100 flex items-center gap-3 flex-wrap bg-purple-50/50 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>Select Specific Month:</span>
                    </span>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-purple-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Showing follow-ups scheduled in month: <strong className="text-purple-800">{selectedMonth}</strong>
                  </span>
                </div>
              )}

              {/* Extended controls for Date Range */}
              {periodFilter === "range" && (
                <div className="w-full pt-2.5 mt-1 border-t border-slate-100 flex items-center gap-3 flex-wrap bg-teal-50/50 p-2.5 rounded-lg">
                  <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Choose Date Range:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-teal-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-teal-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                    >
                      Clear Range
                    </button>
                  )}
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Showing follow-ups between <strong className="text-teal-800">{startDate || "Start"}</strong> and <strong className="text-teal-800">{endDate || "End"}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Follow-Ups Table Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-2 px-2 w-10 text-center">S.No</th>
                      <th className="py-2 px-3">Patient MRN & Name</th>
                      <th className="py-2 px-2.5">Phone & Call</th>
                      <th className="py-2 px-2.5">Branch</th>
                      <th className="py-2 px-3">Attending Doctor</th>
                      <th className="py-2 px-2.5 text-center">Follow-Up Due Date</th>
                      <th className="py-2 px-3 text-center">Action Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                            <span className="font-bold text-xs text-slate-600">Loading follow-ups roster...</span>
                          </div>
                        </td>
                      </tr>
                    ) : followUps.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <CalendarCheck className="w-8 h-8 text-slate-300" />
                            <span className="font-bold text-slate-700 text-sm">No follow-ups found</span>
                            <span className="text-xs text-slate-400 max-w-sm">
                              No patient follow-ups match the selected period, branch ({selectedBranch}), or search criteria.
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
                            <td className="py-2 px-2 text-center text-slate-400 font-bold text-[10px]">
                              {sNo}
                            </td>

                            {/* Patient MRN & Name */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {item.patientName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center gap-1 text-[11.5px]">
                                    <span>{item.patientName}</span>
                                  </div>
                                  <div className="text-[9.5px] font-mono text-slate-500 font-semibold">
                                    {item.mrn || "—"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Phone & Direct Calling */}
                            <td className="py-2 px-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-slate-700 font-semibold text-[10.5px]">
                                  {cleanPhone || "—"}
                                </span>
                                {cleanPhone && (
                                  <div className="flex items-center gap-1">
                                    {/* Direct Dial */}
                                    <a
                                      href={`tel:${cleanPhone}`}
                                      className="p-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 transition"
                                      title="Call Patient"
                                    >
                                      <PhoneOutgoing className="w-2.5 h-2.5" />
                                    </a>
                                    {/* Direct WhatsApp */}
                                    <button
                                      onClick={() => handleWhatsApp(item)}
                                      className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                                      title="WhatsApp Follow-up Message"
                                    >
                                      <MessageSquare className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Branch */}
                            <td className="py-2 px-2.5">
                              <div className="flex items-center gap-1 text-slate-600 font-semibold text-[10.5px]">
                                <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[110px]">{item.branch}</span>
                              </div>
                            </td>

                            {/* Attending Doctor */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1 text-slate-800 font-bold text-[11px]">
                                <Stethoscope className="w-3 h-3 text-sky-600 shrink-0" />
                                <span className="truncate max-w-[140px]">{item.doctorName}</span>
                              </div>
                            </td>

                            {/* Follow-Up Due Date */}
                            <td className="py-2 px-2.5 text-center">
                              <div
                                className={`inline-flex items-center gap-1 font-mono font-bold px-1.5 py-0.5 rounded border text-[10.5px] ${
                                  item.isOverdue
                                    ? "bg-rose-50 border-rose-200 text-rose-700"
                                    : item.isDueToday
                                    ? "bg-amber-50 border-amber-200 text-amber-800"
                                    : item.isDueTomorrow
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-slate-50 border-slate-200 text-slate-900"
                                }`}
                              >
                                <Calendar className="w-2.5 h-2.5 text-current opacity-70" />
                                <span>{item.dueDate}</span>
                              </div>
                            </td>

                            {/* Action Options: Reschedule & Book Appointment & Log Call */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Reschedule Button */}
                                <button
                                  onClick={() => openRescheduleModal(item)}
                                  className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                  title="Reschedule Follow-Up Date"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Reschedule</span>
                                </button>

                                {/* Book Appointment Button */}
                                <button
                                  onClick={() => openBookingModal(item)}
                                  className="px-2 py-0.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10.5px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                  title="Book Clinical Appointment for any branch"
                                >
                                  <CalendarPlus className="w-2.5 h-2.5" />
                                  <span>Book Slot</span>
                                </button>

                                {/* Log Call Button */}
                                <button
                                  onClick={() => openLogCallModal(item)}
                                  className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                  title="Record Call Outcome"
                                >
                                  <PhoneCall className="w-2.5 h-2.5" />
                                  <span>Outcome</span>
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
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
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
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BOOK APPOINTMENT DESK (SAME AS RECEPTION + EXTRA BRANCH DROPDOWN)  */}
        {/* ========================================================================= */}
        {activeTab === "book_appointment" && (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <form onSubmit={handleDeskBookingSubmit} className="space-y-6">
              {/* CARD 1: PATIENT DETAILS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0284c7] text-white flex items-center justify-center text-xs font-extrabold shadow-2xs">
                      1
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                      Patient Details
                    </h2>
                  </div>
                  {(deskPatientName || deskPhone || deskDiseases) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeskPatientName("");
                        setDeskPhone("");
                        setDeskDiseases("");
                        setDeskRegId("");
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear Details
                    </button>
                  )}
                </div>

                {/* Patient Full Name with live suggestions */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Type patient full name (auto-searches existing roster)"
                      value={deskPatientName}
                      onChange={(e) => handleDeskPatientNameChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && patientSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 max-h-56 overflow-y-auto space-y-1">
                      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
                        <span>Matching Patients ({patientSuggestions.length})</span>
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="hover:text-slate-700 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {patientSuggestions.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectSuggestion(p)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-sky-50 cursor-pointer transition text-xs"
                        >
                          <div>
                            <div className="font-extrabold text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              📞 {p.phone} {p.diseases ? `• ${p.diseases}` : ""}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold text-[10px]">
                            {p.regId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone & Diseases */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Phone (+91) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={deskPhone}
                        onChange={(e) => setDeskPhone(e.target.value.replace(/\D/g, ""))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Diseases / Symptoms / Complaints
                    </label>
                    <div className="relative">
                      <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Migraine, Allergy, Chronic Cough, Joint Pain"
                        value={deskDiseases}
                        onChange={(e) => setDeskDiseases(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                      />
                    </div>
                  </div>
                </div>

                {/* Consultation Mode & Patient Source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Consultation Mode <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CONSULTATION_MODES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setBookMode(m.id as "In-Clinic" | "Online");
                            setBookTimeSlot("");
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            bookMode === m.id
                              ? "bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500 shadow-2xs"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${bookMode === m.id ? "bg-sky-600" : "bg-slate-300"}`} />
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Patient Source <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={deskSource}
                      onChange={(e) => setDeskSource(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      {MARKETING_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* CARD 2: APPOINTMENT DETAILS (WITH EXTRA BRANCH DROPDOWN) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0284c7] text-white flex items-center justify-center text-xs font-extrabold shadow-2xs">
                    2
                  </div>
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                    Appointment Details
                  </h2>
                </div>

                {/* EXTRA BRANCH DROPDOWN AS REQUESTED */}
                {bookMode === "In-Clinic" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Target Clinic Branch <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={deskBranch}
                        onChange={(e) => {
                          setDeskBranch(e.target.value);
                          setBookBranch(e.target.value);
                          setBookTimeSlot("");
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] cursor-pointer"
                      >
                        {branches
                          .filter((b) => b !== "All Branches")
                          .map((b) => (
                            <option key={b} value={b}>
                              📍 {b}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Doctor & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Consultant Doctor <span className="text-rose-500">*</span>
                    </label>
                    {loadingBookingDoctors ? (
                      <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 font-semibold flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        <span>Loading doctor schedule...</span>
                      </div>
                    ) : bookingAvailableDoctors.length === 0 ? (
                      <div className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700 font-bold">
                        {bookMode === "Online"
                          ? "No online doctors available"
                          : `No doctors scheduled at ${deskBranch.replace(" Branch", "")} on ${getDayOfWeekAbbr(bookDate)}`}
                      </div>
                    ) : (
                      <div className="relative">
                        <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={bookDoctorId}
                          onChange={(e) => {
                            setBookDoctorId(e.target.value);
                            const doc = bookingAvailableDoctors.find((d: any) => (d.doctorId || d.id) === e.target.value);
                            if (doc) setBookDoctorName(doc.name);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] cursor-pointer"
                        >
                          {bookingAvailableDoctors.map((doc: any) => (
                            <option key={doc.doctorId || doc.id} value={doc.doctorId || doc.id}>
                              {doc.name} ({doc.specialty || "Homeopathy"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Appointment Date <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(true)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-900 flex items-center justify-between cursor-pointer transition-all shadow-2xs group text-left relative"
                    >
                      <Calendar className="w-4 h-4 text-[#0284c7] absolute left-3.5 top-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform" />
                      <span>{toDDMMYYYY(bookDate)}</span>
                      <span className="text-[10px] text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        Choose Date
                      </span>
                    </button>
                  </div>
                </div>

                {/* Time Slot Picker */}
                {bookMode === "Online" ? (
                  <div>
                    <AnalogClockPicker
                      value={bookTimeSlot}
                      onChange={setBookTimeSlot}
                      doctorName={bookDoctorName}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight">
                        Select Available Time Slot (15-min intervals) <span className="text-rose-500">*</span>
                      </label>
                      {bookTimeSlot && (
                        <span className="text-xs font-extrabold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                          Selected Slot: {bookTimeSlot}
                        </span>
                      )}
                    </div>

                    {bookingSlotSessions.length === 0 ? (
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 font-medium">
                        {bookingAvailableDoctors.length === 0
                          ? `No doctors scheduled at ${deskBranch.replace(" Branch", "")} on ${getDayOfWeekAbbr(bookDate)}.`
                          : !bookDoctorId
                          ? "Please select a consultant doctor above."
                          : `No slot sessions configured for ${bookDoctorName} on ${getDayOfWeekAbbr(bookDate)}.`}
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                        {bookingSlotSessions.map((session: any, sIdx: number) => (
                          <div key={sIdx} className="space-y-1.5">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                              {session.sessionName}
                            </span>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {session.slots.map((slot: any, slIdx: number) => {
                                const isSelected = bookTimeSlot === slot.time;
                                const isFull = slot.isFull;
                                return (
                                  <button
                                    key={slIdx}
                                    type="button"
                                    disabled={isFull}
                                    onClick={() => setBookTimeSlot(slot.time)}
                                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                                      isSelected
                                        ? "bg-sky-600 text-white border-sky-600 ring-2 ring-sky-300 font-bold shadow-2xs"
                                        : isFull
                                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                                        : "bg-white border-slate-200 text-slate-700 hover:border-sky-400 hover:bg-sky-50/50"
                                    }`}
                                  >
                                    <span className="text-[10.5px] font-bold">{slot.time}</span>
                                    <span
                                      className={`text-[8.5px] font-black uppercase mt-0.5 px-1 py-0.2 rounded ${
                                        isSelected
                                          ? "bg-white/20 text-white"
                                          : slot.isNoShow
                                          ? "bg-rose-100 text-rose-800"
                                          : slot.isPast
                                          ? "bg-slate-200 text-slate-500"
                                          : slot.bookedCount >= 3
                                          ? "bg-rose-100 text-rose-800"
                                          : "bg-emerald-50 text-emerald-700"
                                      }`}
                                    >
                                      {slot.isNoShow
                                        ? "Doctor Off"
                                        : slot.isPast
                                        ? "Passed"
                                        : slot.bookedCount >= 3
                                        ? "Full"
                                        : `${slot.bookedCount}/3`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Booking Remarks / Notes
                  </label>
                  <textarea
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    rows={2}
                    placeholder="Enter any specific notes from telecaller..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => router.push("/telecaller/dashboard")}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Back to Follow-ups
                  </button>
                  <button
                    type="submit"
                    disabled={savingBooking || !bookDate || !bookTimeSlot}
                    className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold flex items-center gap-2 shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {savingBooking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Confirming Slot...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm &amp; Book Slot</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STANDALONE CALL LOGS DESK WITH PATIENT SEARCH & DELETE OPTION       */}
        {/* ========================================================================= */}
        {activeTab === "log_call" && (
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Top Form Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                    <PhoneCall className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm tracking-tight">Log Patient Call &amp; Discussion Outcome</h2>
                    <p className="text-[11.5px] text-emerald-100 font-medium">
                      Record telecalling feedback, notes &amp; disposition. Saves and returns to Follow-Ups roster.
                    </p>
                  </div>
                </div>

                <Link
                  href="/telecaller/dashboard"
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Follow-Ups</span>
                </Link>
              </div>

              <form onSubmit={handleStandaloneCallLog} className="p-6 space-y-5 text-xs font-medium text-slate-700">
                {/* Patient Search & Phone & Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Patient Name with Auto-Search */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Patient Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Type name (auto-searches roster)"
                        value={logPatientName}
                        onChange={(e) => handleLogPatientNameChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    {/* Autocomplete suggestions */}
                    {showLogSuggestions && logSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 max-h-56 overflow-y-auto space-y-1">
                        <div className="flex items-center justify-between px-2 py-1 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
                          <span>Matching Patients ({logSuggestions.length})</span>
                          <button
                            type="button"
                            onClick={() => setShowLogSuggestions(false)}
                            className="hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {logSuggestions.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectLogSuggestion(p)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition text-xs"
                          >
                            <div>
                              <div className="font-extrabold text-slate-900">{p.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                📞 {p.phone} {p.diseases ? `• ${p.diseases}` : ""}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                              {p.regId}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mobile Number (+91) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={logPhone}
                        onChange={(e) => setLogPhone(e.target.value.replace(/\D/g, ""))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Hospital Branch */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Clinic Branch <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={logBranch}
                        onChange={(e) => setLogBranch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {branches
                          .filter((b) => b !== "All Branches")
                          .map((b) => (
                            <option key={b} value={b}>
                              📍 {b}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Call Outcome Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Call Outcome / Disposition <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {CALL_OUTCOMES.map((oc) => {
                      const isSelected = callOutcome === oc.id;
                      return (
                        <button
                          key={oc.id}
                          type="button"
                          onClick={() => setCallOutcome(oc.id)}
                          className={`p-2.5 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? `${oc.color} ring-2 ring-emerald-500 shadow-2xs font-extrabold scale-[1.02]`
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-xs">{oc.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-current shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Remarks Chips */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">
                    Quick Suggestions (Click to append):
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      "Requested callback tomorrow",
                      "Medicine running, will visit next week",
                      "Out of station, traveling",
                      "Wants Sunday appointment",
                      "Not answering phone",
                      "Interested in online consult",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setCallRemarks((prev) => (prev ? `${prev} • ${chip}` : chip));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-[11px] font-semibold text-slate-600 transition cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discussion Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Call Discussion &amp; Outcome Notes
                  </label>
                  <textarea
                    value={callRemarks}
                    onChange={(e) => setCallRemarks(e.target.value)}
                    rows={3}
                    placeholder="Enter discussion notes: patient condition, requested callback time, medicine status..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Link
                    href="/telecaller/dashboard"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel &amp; Return
                  </Link>
                  <button
                    type="submit"
                    disabled={savingCallLog}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {savingCallLog ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Update...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save Call Log &amp; Return to Roster</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Card: Logged Call Updates List with DELETE Option */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-700" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Logged Call Updates ({recentCallLogs.length})
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Live Records
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchRecentLogs}
                  disabled={loadingRecentLogs}
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRecentLogs ? "animate-spin text-emerald-600" : ""}`} />
                  <span>Refresh Logs</span>
                </button>
              </div>

              {loadingRecentLogs ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Loading call log records...</span>
                </div>
              ) : recentCallLogs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <PhoneCall className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">No call log updates recorded yet</p>
                  <p className="text-[11px] text-slate-400">Use the form above to log patient call outcomes.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4">Patient Info</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3">Call Outcome</th>
                        <th className="py-2.5 px-4">Notes &amp; Discussion</th>
                        <th className="py-2.5 px-3">Logged Date / Agent</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentCallLogs.map((log: any) => {
                        const ocObj = CALL_OUTCOMES.find((o) => o.id === log.callOutcome);
                        const badgeColor = ocObj ? ocObj.color : "text-slate-700 bg-slate-100 border-slate-300";
                        return (
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
                                className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold border ${badgeColor}`}
                              >
                                {log.callOutcome}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-xs text-slate-600 text-[11px] break-words">
                              {log.notes || "—"}
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                              <div className="font-medium text-slate-700">
                                {log.dateTime ? new Date(log.dateTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{log.agentName || "Telecaller"}</div>
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDeleteCallLog(log.id, log.patientName)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                title="Delete this call log update"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Delete</span>
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
          </div>
        )}
      </main>

      {/* POPUP MODAL 1: Reschedule Follow-up */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Reschedule Follow-Up</h3>
                  <p className="text-[11px] text-blue-100">
                    Patient: {rescheduleItem.patientName} ({rescheduleItem.mrn})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-medium text-slate-700">
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between">
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Follow-Up Interval
                </label>
                <select
                  value={newInterval}
                  onChange={(e) => setNewInterval(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReschedule}
                  disabled={savingReschedule || !newDueDate}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {savingReschedule ? "Updating..." : "Save Rescheduled Date"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: Book Appointment from Table (UNLOCKED MULTI-BRANCH) */}
      {bookingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Book Follow-Up Slot (Any Branch)</h3>
                  <p className="text-[11px] text-sky-100">
                    Patient: {bookingItem.patientName} • {bookingItem.mrn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookingItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs font-medium text-slate-700 max-h-[82vh] overflow-y-auto">
              {/* Patient info bar */}
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-between text-sky-950">
                <div>
                  <span className="font-black text-slate-900">{bookingItem.patientName}</span>
                  <span className="ml-2 text-slate-500 font-mono">({bookingItem.phone})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-sky-200 text-sky-900 font-bold text-[10px]">
                    {bookingItem.mrn || "SPH-PAT"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-sky-800 font-bold text-[10px] border border-sky-200">
                    Registered: {bookingItem.branch}
                  </span>
                </div>
              </div>

              {/* Consultation Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Consultation Mode <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CONSULTATION_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setBookMode(m.id as "In-Clinic" | "Online");
                        setBookTimeSlot("");
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        bookMode === m.id
                          ? "bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${bookMode === m.id ? "bg-sky-600" : "bg-slate-300"}`} />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Branch Selector */}
              {bookMode === "In-Clinic" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Select Target Clinic Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bookBranch}
                    onChange={(e) => {
                      setBookBranch(e.target.value);
                      setBookTimeSlot("");
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {branches
                      .filter((b) => b !== "All Branches")
                      .map((b) => (
                        <option key={b} value={b}>
                          📍 {b}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Doctor & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Consultant Doctor <span className="text-rose-500">*</span>
                  </label>
                  {loadingBookingDoctors ? (
                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                      <span>Loading doctors...</span>
                    </div>
                  ) : bookingAvailableDoctors.length === 0 ? (
                    <div className="w-full px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-[11px] text-rose-700 font-bold">
                      {bookMode === "Online"
                        ? "No online doctors available"
                        : `No doctors scheduled at ${bookBranch.replace(" Branch", "")} on ${getDayOfWeekAbbr(bookDate)}`}
                    </div>
                  ) : (
                    <select
                      value={bookDoctorId}
                      onChange={(e) => {
                        setBookDoctorId(e.target.value);
                        const doc = bookingAvailableDoctors.find((d: any) => (d.doctorId || d.id) === e.target.value);
                        if (doc) setBookDoctorName(doc.name);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      {bookingAvailableDoctors.map((doc: any) => (
                        <option key={doc.doctorId || doc.id} value={doc.doctorId || doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Appointment Date <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(true)}
                    className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer transition-all shadow-2xs group text-left"
                  >
                    <span>{toDDMMYYYY(bookDate)}</span>
                    <Calendar className="w-4 h-4 text-[#0284c7] group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Time Slot Picker */}
              {bookMode === "Online" ? (
                <div>
                  <AnalogClockPicker
                    value={bookTimeSlot}
                    onChange={setBookTimeSlot}
                    doctorName={bookDoctorName}
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Select Time Slot (15-min intervals) *
                    </label>
                    {bookTimeSlot && (
                      <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        Selected: {bookTimeSlot}
                      </span>
                    )}
                  </div>

                  {bookingSlotSessions.length === 0 ? (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-800 font-medium">
                      {bookingAvailableDoctors.length === 0
                        ? `No doctors scheduled at ${bookBranch.replace(" Branch", "")} on ${getDayOfWeekAbbr(bookDate)}.`
                        : !bookDoctorId
                        ? "Please select a consultant doctor above."
                        : `No slot sessions configured for ${bookDoctorName} on ${getDayOfWeekAbbr(bookDate)}.`}
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                      {bookingSlotSessions.map((session: any, sIdx: number) => (
                        <div key={sIdx} className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            {session.sessionName}
                          </span>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                            {session.slots.map((slot: any, slIdx: number) => {
                              const isSelected = bookTimeSlot === slot.time;
                              const isFull = slot.isFull;
                              return (
                                <button
                                  key={slIdx}
                                  type="button"
                                  disabled={isFull}
                                  onClick={() => setBookTimeSlot(slot.time)}
                                  className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                                    isSelected
                                      ? "bg-sky-600 text-white border-sky-600 ring-2 ring-sky-300 font-bold"
                                      : isFull
                                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                                      : "bg-white border-slate-200 text-slate-700 hover:border-sky-400 hover:bg-sky-50/50"
                                  }`}
                                >
                                  <span className="text-[10px] font-semibold">{slot.time}</span>
                                  <span
                                    className={`text-[8.5px] font-black uppercase mt-0.5 px-1 py-0.2 rounded ${
                                      isSelected
                                        ? "bg-white/20 text-white"
                                        : slot.isNoShow
                                        ? "bg-rose-100 text-rose-800"
                                        : slot.isPast
                                        ? "bg-slate-200 text-slate-500"
                                        : slot.bookedCount >= 3
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {slot.isNoShow
                                      ? "Doctor Off"
                                      : slot.isPast
                                      ? "Passed"
                                      : slot.bookedCount >= 3
                                      ? "Full"
                                      : `${slot.bookedCount}/3`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Diseases / Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Reason for Visit / Symptoms
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
                  placeholder="Notes from telecaller..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookingItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModalBooking}
                  disabled={savingBooking || !bookDate || !bookTimeSlot}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {savingBooking ? "Booking..." : "Confirm & Book Slot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 3: Log Call Outcome from Table */}
      {logCallItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Record Call Outcome</h3>
                  <p className="text-[11px] text-emerald-100">
                    Patient: {logCallItem.patientName} ({logCallItem.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLogCallItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">
                  Call Outcome <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_OUTCOMES.map((oc) => (
                    <button
                      key={oc.id}
                      type="button"
                      onClick={() => setCallOutcome(oc.id)}
                      className={`p-2 rounded-lg border text-left font-bold transition flex items-center justify-between cursor-pointer ${
                        callOutcome === oc.id
                          ? `${oc.color} ring-2 ring-emerald-500 shadow-2xs`
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-xs">{oc.label}</span>
                      {callOutcome === oc.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Call Notes &amp; Discussion
                </label>
                <textarea
                  value={callRemarks}
                  onChange={(e) => setCallRemarks(e.target.value)}
                  rows={3}
                  placeholder="Patient asked for Saturday slot, traveling out of town, medicine still running..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLogCallItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCallLog}
                  disabled={savingCallLog}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {savingCallLog ? "Saving..." : "Save Call Log"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE CALENDAR MODAL (SAME AS RECEPTION) */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            {/* Header: Month Year & Nav */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold">Select Appointment Date</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(() => {
                  const now = new Date();
                  const isCurrentMonthOrPast =
                    calYear < now.getFullYear() ||
                    (calYear === now.getFullYear() && calMonth <= now.getMonth());
                  return (
                    <button
                      type="button"
                      disabled={isCurrentMonthOrPast}
                      onClick={() => {
                        if (isCurrentMonthOrPast) return;
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear((y) => y - 1);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      className={`w-7 h-7 rounded-lg text-slate-600 flex items-center justify-center transition-colors ${
                        isCurrentMonthOrPast
                          ? "opacity-25 cursor-not-allowed text-slate-300"
                          : "hover:bg-slate-100 cursor-pointer"
                      }`}
                      title={isCurrentMonthOrPast ? "Past months cannot be selected" : "Previous Month"}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d} className="text-[11px] font-extrabold text-slate-400 py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const formatted = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected =
                  bookDate === formatted ||
                  toDDMMYYYY(bookDate) ===
                    `${String(day).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                const isToday = (() => {
                  const t = new Date();
                  return day === t.getDate() && calMonth === t.getMonth() && calYear === t.getFullYear();
                })();
                const isPastDate = (() => {
                  const t = new Date();
                  t.setHours(0, 0, 0, 0);
                  const cellDate = new Date(calYear, calMonth, day);
                  cellDate.setHours(0, 0, 0, 0);
                  return cellDate.getTime() < t.getTime();
                })();

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPastDate}
                    onClick={() => {
                      if (isPastDate) return;
                      setBookDate(formatted);
                      setIsCalendarOpen(false);
                    }}
                    title={isPastDate ? "Past dates cannot be booked" : formatted}
                    className={`h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                      isPastDate
                        ? "text-slate-300 bg-slate-50/50 cursor-not-allowed line-through opacity-50"
                        : isSelected
                        ? "bg-[#0284c7] text-white shadow-md shadow-sky-500/30 font-extrabold scale-105 cursor-pointer"
                        : isToday
                        ? "border-2 border-[#0284c7] text-[#0284c7] font-extrabold hover:bg-sky-50 cursor-pointer"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer Quick Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, "0");
                  const d = String(now.getDate()).padStart(2, "0");
                  setBookDate(`${y}-${m}-${d}`);
                  setCalMonth(now.getMonth());
                  setCalYear(y);
                  setIsCalendarOpen(false);
                }}
                className="text-xs font-extrabold text-[#0284c7] hover:underline cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 4: Appointment Booked Success Token Modal */}
      {showSuccessModal && bookedSuccessDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4 animate-scaleIn">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Confirmed &amp; Scheduled
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">Appointment Booked!</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Token generated and clinical slot successfully reserved.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Token Number:</span>
                <span className="text-base font-black text-[#0284c7] font-mono">
                  {bookedSuccessDetails.token}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient:</span>
                <span className="font-extrabold text-slate-900">{bookedSuccessDetails.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Reg ID (MRN):</span>
                <span className="font-mono font-bold text-slate-700">{bookedSuccessDetails.regId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-800">{bookedSuccessDetails.doctor}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Branch:</span>
                <span className="font-bold text-slate-800">{bookedSuccessDetails.branch}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Date &amp; Slot:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                  {bookedSuccessDetails.date} • {bookedSuccessDetails.time}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                setBookedSuccessDetails(null);
                router.push("/telecaller/dashboard");
              }}
              className="w-full py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
            >
              Done &amp; View Follow-up Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TelecallerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-slate-400 font-semibold text-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading Telecaller Follow-Ups Roster...</span>
          </div>
        </div>
      }
    >
      <TelecallerDashboardContent />
    </Suspense>
  );
}
