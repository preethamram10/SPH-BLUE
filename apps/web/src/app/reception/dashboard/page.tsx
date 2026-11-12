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
  ArrowUp,
  ArrowDown,
  CalendarRange,
  FileText,
  History,
  Play,
  Target,
  TrendingUp,
  Activity,
  CreditCard,
  Receipt,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FeeCheckoutAndInvoiceModal } from "@/components/payment/FeeCheckoutAndInvoiceModal";
import ReceptionCleaningLockoutView from "@/components/cleaning/ReceptionCleaningLockoutView";

const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 2C6.495 2 2 6.494 2 12.029c0 1.83.493 3.555 1.348 5.048L2 22l5.06-1.328a9.98 9.98 0 0 0 4.971 1.323h.004c5.534 0 10.029-4.494 10.029-10.028A9.99 9.99 0 0 0 12.031 2zM12.03 20.31h-.003a8.31 8.31 0 0 1-4.237-1.156l-.304-.18-3.146.825.84-3.067-.198-.315a8.297 8.297 0 0 1-1.272-4.388c0-4.587 3.732-8.319 8.32-8.319 2.222 0 4.312.866 5.883 2.438a8.28 8.28 0 0 1 2.435 5.88c0 4.588-3.732 8.32-8.318 8.32zm4.557-6.223c-.25-.125-1.477-.728-1.706-.81-.228-.083-.395-.125-.562.125-.166.25-.644.81-.79 1-.145.187-.291.208-.541.083-.25-.125-1.054-.388-2.008-1.238-.742-.662-1.243-1.48-1.389-1.73-.146-.25-.016-.385.109-.51.113-.112.25-.291.375-.437.125-.145.166-.25.25-.416.083-.167.041-.312-.021-.437-.063-.125-.563-1.354-.77-1.854-.203-.487-.41-.42-.563-.428l-.48-.009c-.166 0-.437.062-.666.312-.229.25-.875.854-.875 2.083 0 1.229.896 2.416 1.021 2.583.125.166 1.761 2.688 4.266 3.769.596.257 1.061.41 1.424.526.6.19 1.144.163 1.576.1.481-.072 1.477-.604 1.685-1.187.208-.583.208-1.083.146-1.187-.063-.105-.23-.167-.479-.292z" />
  </svg>
);

const renderVisitBadge = (appt: any) => {
  const badge = appt.visitBadge || (appt.hasPackage ? "In-Dur" : appt.isReback ? "Revisit" : "New");
  return (
    <div className="inline-flex items-center gap-1">
      {badge === "New" && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
          NEW
        </span>
      )}
      {badge === "In-Dur" && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200 shadow-xs">
          <Clock className="w-2.5 h-2.5 text-sky-600" />
          IN-DUR
        </span>
      )}
      {badge === "Revisit" && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
          <RotateCcw className="w-2.5 h-2.5 text-amber-600" />
          REVISIT
        </span>
      )}
      {appt.hasPackage && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-black tracking-wide bg-amber-500 text-white shadow-xs">
          <Package className="w-2.5 h-2.5 text-white" />
          PKG
        </span>
      )}
    </div>
  );
};

export default function ReceptionDashboardPage() {
  const router = useRouter();
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
    if (!ddmmyyyy) return "";
    const parts = ddmmyyyy.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) return ddmmyyyy;
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ddmmyyyy;
  };

  const fromISODate = (yyyymmdd: string) => {
    if (!yyyymmdd) return "";
    const parts = yyyymmdd.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return yyyymmdd;
  };

  const [todayStr, setTodayStr] = useState("");
  const [tomorrowStr, setTomorrowStr] = useState("");

  // Selected Date Filter for Appointments (Default: Today, initialized in useEffect)
  const [selectedDate, setSelectedDate] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "ACTIVE" | "COLLECT_FEE" | "COMPLETED">("ALL");

  // 24-Hour Restore Modal State (Reception view)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [deletedAppointments, setDeletedAppointments] = useState<any[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Appointment Payment Modal State (Orange COLLECT FEE)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentAppt, setSelectedPaymentAppt] = useState<any>(null);

  // Branch Target & Monthly Revenue State
  const [branchTarget, setBranchTarget] = useState<{
    targetGoal: number;
    targetReached: number;
    percentage: number;
    remaining: number;
    status: string;
  } | null>(null);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<any>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState("");
  const [newRescheduleSlot, setNewRescheduleSlot] = useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Mandatory Cleaning Lockout State
  const [cleaningLockoutTask, setCleaningLockoutTask] = useState<any>(null);

  const checkCleaningLockout = async (targetBranch: string) => {
    try {
      const res = await fetch(`/api/cleaning/lockout?branchName=${encodeURIComponent(targetBranch)}`);
      const data = await res.json();
      if (data.success && data.lockout && data.task) {
        setCleaningLockoutTask(data.task);
      } else {
        setCleaningLockoutTask(null);
      }
    } catch {}
  };

  // Start Consultation: Updates status to IN_CONSULTATION and immediately opens Patient File
  const handleStartConsultation = async (appt: any) => {
    try {
      // 1. Optimistic update
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: "IN_CONSULTATION" } : a))
      );
      // 2. Switch tab to Active Consultation so the patient is visible in Active list
      setActiveFilter("ACTIVE");
      setFeedback({
        type: "success",
        message: `Consultation started for ${appt.patientName}! Opening Patient File...`,
      });

      // 3. Persist to API
      fetch("/api/reception/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_STATUS",
          id: appt.id,
          status: "IN_CONSULTATION",
        }),
      }).catch((err) => console.error("Failed to update status:", err));

      // 4. Immediately open Patient File for Reception
      const cleanPhone = (appt.phoneNumber || appt.phone || "").replace(/\D/g, "");
      router.push(
        `/reception/patient-file?id=${appt.id}&name=${encodeURIComponent(appt.patientName || appt.name || "")}&phone=${encodeURIComponent(cleanPhone)}&branch=${encodeURIComponent(branchName)}&registrationId=${encodeURIComponent(appt.registrationId || appt.patientId || "SPH-GEN")}`
      );
    } catch (err: any) {
      console.error("Failed to start consultation:", err);
      setFeedback({ type: "error", message: "Failed to update appointment status." });
    }
  };

  // Queue reorder: Move UP
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const nextList = [...filteredAppointments];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    setAppointments(nextList);

    try {
      await fetch("/api/reception/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REORDER",
          orderedIds: nextList.map((a) => a.id),
        }),
      });
    } catch (err) {
      console.error("Failed to reorder queue:", err);
    }
  };

  // Queue reorder: Move DOWN
  const handleMoveDown = async (index: number) => {
    if (index >= filteredAppointments.length - 1) return;
    const nextList = [...filteredAppointments];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    setAppointments(nextList);

    try {
      await fetch("/api/reception/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REORDER",
          orderedIds: nextList.map((a) => a.id),
        }),
      });
    } catch (err) {
      console.error("Failed to reorder queue:", err);
    }
  };

  // Direct WhatsApp Launcher
  const handleWhatsApp = (phone: string, patientName: string, doctorName: string, timeSlot: string) => {
    const clean = (phone || "").replace(/\D/g, "").slice(-10);
    if (!clean) {
      setFeedback({ type: "error", message: "Patient does not have a valid mobile number." });
      return;
    }
    const msg = `Hello ${patientName || "Patient"}, regarding your appointment with Dr. ${doctorName || "Doctor"} at Spiritual Homeopathy (${timeSlot || "today"}). Please let us know if you need any assistance.`;
    const url = `https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const openRescheduleModal = (appt: any) => {
    setRescheduleAppt(appt);
    setNewRescheduleDate(toISODate(appt.appointmentDate || selectedDate));
    setNewRescheduleSlot(appt.timeSlot || appt.selectedTimeSlot || "10:00 AM");
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleAppt || !newRescheduleDate || !newRescheduleSlot) return;
    setIsSubmittingReschedule(true);
    try {
      const formattedDate = fromISODate(newRescheduleDate);
      const res = await fetch("/api/reception/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESCHEDULE",
          id: rescheduleAppt.id,
          appointmentDate: formattedDate,
          timeSlot: newRescheduleSlot,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Appointment for ${rescheduleAppt.patientName} rescheduled to ${formattedDate} (${newRescheduleSlot})!`,
        });
        setRescheduleModalOpen(false);
        fetchAppointments(branchName, selectedDate);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to reschedule appointment." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to communicate with server." });
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  useEffect(() => {
    const today = getTodayStr();
    const tomorrow = getTomorrowStr();
    setTodayStr(today);
    setTomorrowStr(tomorrow);
    setSelectedDate(today);

    const saved = localStorage.getItem("branch_name") || "Kphb Branch";
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const allNames: string[] = data.data.map((b: any) => b.name);
          const cleanSaved = (saved || "")
            .toLowerCase()
            .replace(/spiritual|homeopathy|branch/gi, "")
            .replace(/[^a-z0-9]/g, "")
            .trim();
          const matched = allNames.find((b) => {
            const cb = b.toLowerCase().replace(/spiritual|homeopathy|branch/gi, "").replace(/[^a-z0-9]/g, "").trim();
            const isKpbMatch = (cleanSaved === "kpb" || cleanSaved === "kphb") && (cb === "kpb" || cb === "kphb");
            return cb === cleanSaved || isKpbMatch;
          });
          const canonical = matched || allNames[0] || saved;
          setBranchName(canonical);
          try {
            localStorage.setItem("branch_name", canonical);
          } catch {}
          checkCleaningLockout(canonical);
        } else {
          setBranchName(saved);
          checkCleaningLockout(saved);
        }
      })
      .catch(() => {
        setBranchName(saved);
        checkCleaningLockout(saved);
      });

    const todayDate = new Date();
    setCurrentDate(
      todayDate.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  // Fetch appointments live from API
  const fetchAppointments = async (branch: string, dt: string, isSilent: boolean = false) => {
    if (!dt) return;
    if (!isSilent) {
      setIsLoadingAppointments(true);
    }
    try {
      const cleanBranch = branch.replace(/Spiritual Homeopathy/gi, "").trim();
      const res = await fetch(`/api/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dt)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else if (!isSilent) {
        setAppointments([]);
      }
    } catch (err) {
      console.warn("Failed to fetch dashboard appointments:", err);
      if (!isSilent) setAppointments([]);
    } finally {
      if (!isSilent) {
        setIsLoadingAppointments(false);
      }
    }
  };

  // Fetch branch target & live revenue
  const fetchBranchTarget = async (bName: string) => {
    try {
      const cleanBranch = (bName || "KPHB")
        .toLowerCase()
        .replace(/spiritual|homeopathy|clinic|branch/gi, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
      const res = await fetch("/api/admin/targets?role=ADMIN");
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && Array.isArray(data.branches)) {
        const match = data.branches.find((b: any) => {
          const bNorm = (b.branch || "")
            .toLowerCase()
            .replace(/spiritual|homeopathy|clinic|branch/gi, "")
            .replace(/[^a-z0-9]/g, "")
            .trim();
          return bNorm === cleanBranch || bNorm.includes(cleanBranch) || cleanBranch.includes(bNorm);
        });
        if (match) {
          setBranchTarget(match);
        } else if (data.branches.length > 0) {
          setBranchTarget(data.branches[0]);
        }
      }
    } catch (err) {
      console.warn("Branch target fetch unavailable:", err);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    // Initial fetch for the selected date & branch target
    fetchAppointments(branchName, selectedDate, appointments.length > 0);
    fetchBranchTarget(branchName);

    // Auto-sync silently in the background every 10 seconds without showing loading spinner or flashing the table
    const interval = setInterval(() => {
      fetchAppointments(branchName, selectedDate, true);
      fetchBranchTarget(branchName);
    }, 10000);

    const handleFocus = () => {
      fetchAppointments(branchName, selectedDate, true);
      fetchBranchTarget(branchName);
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
  const inConsultationCount = useMemo(
    () => appointments.filter((a) => a.status === "IN_CONSULTATION").length,
    [appointments]
  );
  const collectFeeCount = useMemo(
    () => appointments.filter((a) => !a.isFeeCollected && a.status !== "COMPLETED" && (a.status === "COLLECT_FEE" || !!a.isSentToReception)).length,
    [appointments]
  );
  const activeCount = inConsultationCount;
  const completedCount = useMemo(
    () => appointments.filter((a) => a.status === "COMPLETED" || !!a.isFeeCollected).length,
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
    if (activeFilter === "COLLECT_FEE") {
      return appointments.filter(
        (a) => !a.isFeeCollected && a.status !== "COMPLETED" && (a.status === "COLLECT_FEE" || !!a.isSentToReception)
      );
    }
    if (activeFilter === "COMPLETED") {
      return appointments.filter((a) => a.status === "COMPLETED" || !!a.isFeeCollected);
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
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Reception Dashboard</h2>
                <span className="bg-[#a8ce3a]/20 text-[#268ec8] font-bold text-[9.5px] px-2 py-0.5 rounded-full border border-[#a8ce3a]/40">
                  Front Desk Active
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-0.5">
                {branchName} • {currentDate}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                href="/reception/appointments"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
              >
                <Calendar className="w-3 h-3 text-[#268ec8]" />
                <span>View Appointments</span>
              </Link>

              <Link
                href="/reception/all-patients"
                className="flex items-center space-x-1.5 bg-[#268ec8] hover:bg-[#1f75a6] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Register Patient</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Overview & Target Header Cards (Compact Side-by-Side on Desktop) */}
        <main className="flex-1 px-4 py-3 max-w-7xl w-full mx-auto space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {/* 1. Compact Branch Target Card */}
            <div className="bg-white rounded-xl border border-sky-100 p-3 shadow-2xs bg-gradient-to-r from-sky-50/40 via-white to-emerald-50/30 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#0284c7]/10 text-[#0284c7] flex items-center justify-center font-bold">
                    <Target className="w-3.5 h-3.5 text-[#0284c7]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 tracking-wide flex items-center gap-1.5">
                      <span>{branchName.replace(/Spiritual Homeopathy/gi, "").trim() || "Clinic"} Branch Target</span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                    <TrendingUp className="w-3 h-3 text-[#0284c7]" />
                    <span>{branchTarget ? `${branchTarget.percentage}% Achieved` : "0% Achieved"}</span>
                  </span>
                  {branchTarget?.status && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border ${
                        branchTarget.status === "Achieved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : branchTarget.status === "On Track"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : branchTarget.status === "In Progress"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {branchTarget.status}
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Metric Columns */}
              <div className="grid grid-cols-3 gap-2 bg-white/95 p-2 rounded-lg border border-slate-100 shadow-2xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    TARGET GOAL
                  </span>
                  <span className="text-xs font-black text-slate-900">
                    ₹{branchTarget?.targetGoal ? branchTarget.targetGoal.toLocaleString() : "0"}
                  </span>
                </div>

                <div className="border-x border-slate-100 px-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    TARGET REACHED
                  </span>
                  <span className="text-xs font-black text-emerald-600">
                    ₹{branchTarget?.targetReached ? branchTarget.targetReached.toLocaleString() : "0"}
                  </span>
                </div>

                <div className="pl-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    REMAINING
                  </span>
                  <span className="text-xs font-black text-amber-600">
                    ₹{branchTarget?.remaining ? branchTarget.remaining.toLocaleString() : "0"}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (branchTarget?.percentage || 0) >= 100
                      ? "bg-emerald-500"
                      : (branchTarget?.percentage || 0) >= 75
                      ? "bg-[#0284c7]"
                      : (branchTarget?.percentage || 0) >= 40
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, branchTarget?.percentage || 0)}%` }}
                />
              </div>
            </div>

            {/* 2. Compact Overview Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Overview</h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>LIVE</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-[#0284c7]">
                  <Calendar className="w-3 h-3" />
                  <span>{selectedDate}</span>
                </div>
              </div>

              {/* Top 5 Stats in 1 row */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 text-center">
                  <span className="text-sm font-black text-[#0284c7] block leading-tight">{totalCount}</span>
                  <span className="text-[9px] font-bold text-slate-500 truncate block">Total</span>
                </div>

                <div className="bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 text-center">
                  <span className="text-sm font-black text-[#0284c7] block leading-tight">{waitingCount}</span>
                  <span className="text-[9px] font-bold text-slate-500 truncate block">Waiting</span>
                </div>

                <div className="bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 text-center">
                  <span className="text-sm font-black text-sky-600 block leading-tight">{inConsultationCount}</span>
                  <span className="text-[9px] font-bold text-slate-500 truncate block">In Consult</span>
                </div>

                <div className="bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 text-center">
                  <span className="text-sm font-black text-amber-500 block leading-tight">{collectFeeCount}</span>
                  <span className="text-[9px] font-bold text-slate-500 truncate block">Collect Fee</span>
                </div>
              </div>

              {/* Bottom 3 Sub-Stats in 1 row */}
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter("COLLECT_FEE")}
                  className="py-1 px-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100 flex items-center justify-between text-left transition-all cursor-pointer"
                >
                  <span className="text-[9.5px] font-bold text-amber-800">Pay Pending</span>
                  <span className="text-[11px] font-black text-amber-600">{collectFeeCount}</span>
                </button>

                <Link
                  href="/reception/follow-ups"
                  className="py-1 px-2 rounded-lg border border-sky-100 bg-sky-50/40 hover:bg-sky-50 flex items-center justify-between text-left transition-all"
                >
                  <span className="text-[9.5px] font-bold text-sky-700">Follow-up Opted</span>
                  <span className="text-[11px] font-black text-[#0284c7]">
                    {appointments.filter((a) => a.followUpDate && a.followUpInterval !== "No Follow-up").length}
                  </span>
                </Link>

                <Link
                  href="/reception/follow-ups"
                  className="py-1 px-2 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100 flex items-center justify-between text-left transition-all"
                >
                  <span className="text-[9.5px] font-bold text-slate-600">Not Opted</span>
                  <span className="text-[11px] font-black text-slate-600">
                    {appointments.filter((a) => !a.followUpDate || a.followUpInterval === "No Follow-up").length}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* FEEDBACK BANNER */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-[11px] font-bold flex items-center justify-between transition-all ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-[11px] underline hover:opacity-75 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* UPCOMING APPOINTMENTS SECTION */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            {/* Header Row: Title & Count left, Restore (24h) right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Appointments Schedule
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-sky-50 text-[#0284c7] border border-sky-200">
                  {appointments.length}
                </span>
              </div>

              <button
                type="button"
                onClick={handleRestoreRefresh}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold text-[#0284c7] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer w-fit"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingDeleted ? "animate-spin" : ""}`} />
                <span>Restore (24h)</span>
              </button>
            </div>

            {/* DATE FILTER BELOW RESTORE OPTION */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all ${
                    selectedDate === todayStr
                      ? "bg-[#0284c7] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all ${
                    selectedDate === tomorrowStr
                      ? "bg-[#0284c7] text-white shadow-xs"
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
                    className={`pl-2 pr-1.5 py-0.8 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
                      selectedDate !== todayStr && selectedDate !== tomorrowStr
                        ? "bg-[#0284c7] text-white border-[#0284c7]"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("UPCOMING")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeFilter === "UPCOMING" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Upcoming ({waitingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("ACTIVE")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeFilter === "ACTIVE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  In Consult ({inConsultationCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("COLLECT_FEE")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeFilter === "COLLECT_FEE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Collect Fee ({collectFeeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("COMPLETED")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeFilter === "COMPLETED" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Completed ({completedCount})
                </button>
              </div>
            </div>

            {/* Appointments List or Empty State */}
            {isLoadingAppointments && appointments.length === 0 ? (
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
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Queue &amp; ID</th>
                      <th className="py-2.5 px-3">Patient Details</th>
                      <th className="py-2.5 px-3">Consultant Doctor</th>
                      <th className="py-2.5 px-3">Slot &amp; Mode</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Queue Order</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((appt, index) => {
                      const status = (appt.status || "WAITING").toUpperCase();
                      const isCompleted = status === "COMPLETED" || !!appt.isFeeCollected;
                      const isWaiting = !isCompleted && (status === "WAITING" || status === "SCHEDULED");
                      const isActive = !isCompleted && status === "IN_CONSULTATION";
                      const isSentToReception = !isCompleted && (status === "COLLECT_FEE" || !!appt.isSentToReception);
                      const isFirst = index === 0;
                      const isLast = index === filteredAppointments.length - 1;
                      const isRevisit = !!appt.isReback;
                      const cleanPhone = (appt.phone || appt.phoneNumber || "").replace(/\D/g, "").slice(-10);

                      return (
                        <tr key={appt.id || appt.token || `appt-${index}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              {/* Queue Number Box starting from 1 */}
                              <div className="w-7 h-7 rounded-md bg-sky-50 border border-sky-200 flex flex-col items-center justify-center shrink-0">
                                <span className="text-[7px] font-black text-[#0369a1] leading-none">Q</span>
                                <span className="text-[11px] font-black text-[#0284c7] leading-none">{index + 1}</span>
                              </div>
                              <div>
                                <span className="px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                                  {appt.registrationId || appt.patientId || "ID: N/A"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isCompleted ? (
                                  <Link
                                    href={`/reception/patient-history?id=${appt.registrationId || appt.patientId || appt.id}&name=${encodeURIComponent(appt.patientName || "")}&phone=${encodeURIComponent(cleanPhone)}&branch=${encodeURIComponent(branchName)}`}
                                    className="font-bold text-slate-900 text-xs hover:text-[#0284c7] hover:underline"
                                  >
                                    {appt.patientName}
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/reception/patient-file?id=${appt.id}&name=${encodeURIComponent(appt.patientName || "")}&phone=${encodeURIComponent(cleanPhone)}&branch=${encodeURIComponent(branchName)}&registrationId=${encodeURIComponent(appt.registrationId || appt.patientId || "")}`}
                                    className="font-bold text-slate-900 text-xs hover:text-[#0284c7] hover:underline"
                                  >
                                    {appt.patientName}
                                  </Link>
                                )}
                                {renderVisitBadge(appt)}
                              </div>
                              <div className="text-slate-400 text-[10.5px] flex items-center gap-1.5 mt-0.5">
                                <span>📞 {cleanPhone || "No Mobile"}</span>
                                {appt.diseases && (
                                  <span className="text-slate-400 truncate max-w-[130px]">• {appt.diseases}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800 text-[11px]">{appt.doctorName}</div>
                            <div className="text-[10px] text-slate-400">{branchName}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{appt.timeSlot || appt.selectedTimeSlot}</span>
                            </div>
                            <div className="mt-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                                {appt.consultationMode || "In-Clinic"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {isWaiting ? (
                              <button
                                type="button"
                                onClick={() => handleStartConsultation(appt)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10.5px] font-black text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                title="Click to start prescription and open Patient File"
                              >
                                <Play className="w-3 h-3 fill-white" />
                                <span>Start Prescription</span>
                              </button>
                            ) : isActive ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const cleanPhone = (appt.phoneNumber || appt.phone || "").replace(/\D/g, "");
                                  router.push(
                                    `/reception/patient-file?id=${appt.id}&name=${encodeURIComponent(appt.patientName || appt.name || "")}&phone=${encodeURIComponent(cleanPhone)}&branch=${encodeURIComponent(branchName)}&registrationId=${encodeURIComponent(appt.registrationId || appt.patientId || "SPH-GEN")}`
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10.5px] font-black text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                title="Currently In Consultation - Click to view Patient File"
                              >
                                <Activity className="w-3 h-3 text-white" />
                                <span>In Consultation</span>
                              </button>
                            ) : isCompleted ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPaymentAppt(appt);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs active:scale-95"
                                title="View & Print Payment Receipt / Invoice"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>COMPLETED</span>
                              </button>
                            ) : isSentToReception ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaymentAppt(appt);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10.5px] font-black text-white bg-amber-500 hover:bg-amber-600 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                  title="Collect Fee & Complete Consultation"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>COLLECT FEE</span>
                                </button>
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-600">
                                {status.replace("_", " ")}
                              </span>
                            )}
                          </td>
                          {/* Queue Order Movers: Up & Down Arrows */}
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-md border border-slate-200">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveUp(index)}
                                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                                  isFirst
                                    ? "bg-slate-200/50 text-slate-300 cursor-not-allowed"
                                    : "bg-white text-[#0284c7] hover:bg-[#0284c7] hover:text-white shadow-xs cursor-pointer"
                                }`}
                                title="Move Up in Queue Line"
                              >
                                <ArrowUp className="w-3 h-3 font-bold" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveDown(index)}
                                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                                  isLast
                                    ? "bg-slate-200/50 text-slate-300 cursor-not-allowed"
                                    : "bg-white text-[#0284c7] hover:bg-[#0284c7] hover:text-white shadow-xs cursor-pointer"
                                }`}
                                title="Move Down in Queue Line"
                              >
                                <ArrowDown className="w-3 h-3 font-bold" />
                              </button>
                            </div>
                          </td>
                          {/* Action Buttons: Patient File, WhatsApp, Reschedule, Delete */}
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Open Patient History */}
                              <Link
                                href={`/reception/patient-history?id=${appt.registrationId || appt.patientId || appt.id}&name=${encodeURIComponent(appt.patientName || "")}&phone=${encodeURIComponent(cleanPhone)}&branch=${encodeURIComponent(branchName)}`}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition-all cursor-pointer"
                                title="Open Patient History (All Visits, Prescriptions, Payments)"
                              >
                                <History className="w-3.5 h-3.5" />
                              </Link>

                              {/* View Receipt for Completed Visits */}
                              {isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaymentAppt(appt);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all cursor-pointer"
                                  title="View & Print Official Receipt / Tax Invoice"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Open Patient File (Only for pending / in-consultation, NOT completed) */}
                              {!isCompleted && (
                                <Link
                                  href={`/reception/patient-file?id=${appt.id}&name=${encodeURIComponent(appt.patientName || "")}&phone=${encodeURIComponent(cleanPhone)}&branch=${encodeURIComponent(branchName)}&registrationId=${encodeURIComponent(appt.registrationId || appt.patientId || "")}`}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-sky-700 bg-sky-50 hover:bg-[#0284c7] hover:text-white border border-sky-200 transition-all cursor-pointer"
                                  title="Open Patient File (Prescription, Diet, Fees)"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </Link>
                              )}

                              {/* Direct WhatsApp Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleWhatsApp(
                                    cleanPhone,
                                    appt.patientName,
                                    appt.doctorName,
                                    appt.timeSlot || appt.selectedTimeSlot
                                  )
                                }
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all cursor-pointer"
                                title="Send WhatsApp Message"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                              </button>

                              {/* Reschedule Button */}
                              <button
                                type="button"
                                onClick={() => openRescheduleModal(appt)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#0284c7] bg-sky-50 hover:bg-[#0284c7] hover:text-white border border-sky-200 transition-all cursor-pointer"
                                title="Reschedule Date & Time"
                              >
                                <CalendarRange className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete / Cancel Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteAppointment(appt.id, appt.token, appt.patientName)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer"
                                title="Cancel / Delete Appointment (24h Restore available)"
                              >
                                <Trash2 className="w-3 h-3" />
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

          {/* 24-HOUR RESTORE DELETED APPOINTMENTS MODAL */}
          {isRestoreModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Restore Deleted Appointments (24h Window)
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Reception retention limit: <strong>24 Hours</strong>. Recover cancelled bookings.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRestoreModalOpen(false)}
                    className="w-7 h-7 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-3.5 overflow-y-auto flex-1 space-y-2">
                  {isLoadingDeleted ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 font-semibold">
                      Loading deleted appointments...
                    </div>
                  ) : deletedAppointments.length === 0 ? (
                    <div className="p-8 text-center space-y-1.5">
                      <Calendar className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No deleted appointments</p>
                      <p className="text-[10.5px] text-slate-400">
                        There are no appointments deleted within the last 24 hours for {branchName}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deletedAppointments.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#0284c7]/40 shadow-xs flex items-center justify-between gap-3 transition-all"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded font-black bg-sky-50 text-[#0284c7] border border-sky-200 text-[10px]">
                                {item.token}
                              </span>
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {item.patientName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">({item.registrationId})</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
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

                            <div className="flex items-center gap-1.5 text-[9.5px] text-amber-700 font-bold">
                              <Clock className="w-2.5 h-2.5 text-amber-500" />
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
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>Audited by Admin (48h retention).</span>
                  <button
                    type="button"
                    onClick={() => setIsRestoreModalOpen(false)}
                    className="px-3 py-1 rounded-lg border border-slate-200 font-bold hover:bg-slate-100 transition-all cursor-pointer text-[10.5px]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RESCHEDULE APPOINTMENT MODAL */}
          {rescheduleModalOpen && rescheduleAppt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center">
                      <CalendarRange className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-xs">Reschedule Appointment</h3>
                      <p className="text-[10px] text-slate-500">
                        {rescheduleAppt.patientName} • {rescheduleAppt.registrationId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setRescheduleModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3.5 space-y-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      New Appointment Date *
                    </label>
                    <input
                      type="date"
                      value={newRescheduleDate}
                      onChange={(e) => setNewRescheduleDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0284c7] text-[11px] font-bold text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      New Time Slot *
                    </label>
                    <select
                      value={newRescheduleSlot}
                      onChange={(e) => setNewRescheduleSlot(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0284c7] text-[11px] font-bold text-slate-800 outline-none transition-all cursor-pointer"
                    >
                      {[
                        "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
                        "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
                        "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM",
                        "01:00 PM", "05:00 PM", "05:15 PM", "05:30 PM",
                        "05:45 PM", "06:00 PM", "06:15 PM", "06:30 PM",
                        "06:45 PM", "07:00 PM", "07:15 PM", "07:30 PM",
                      ].map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-[10.5px] font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingReschedule}
                    onClick={handleConfirmReschedule}
                    className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-extrabold text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReschedule ? "Rescheduling..." : "Confirm Reschedule"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Official Payment & Invoice Modal (Collect Fee or View Receipt) */}
          {isPaymentModalOpen && selectedPaymentAppt && (
            <FeeCheckoutAndInvoiceModal
              isOpen={isPaymentModalOpen}
              appointment={selectedPaymentAppt}
              onClose={() => {
                setIsPaymentModalOpen(false);
                setSelectedPaymentAppt(null);
              }}
              onSubmitPayment={async (invoiceData) => {
                const res = await fetch("/api/reception/payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(invoiceData),
                });
                const data = await res.json();
                if (!data.success) {
                  throw new Error(data.error || "Payment failed");
                }
                fetchAppointments(branchName, selectedDate);
                fetchBranchTarget(branchName);
                return data;
              }}
            />
          )}
          {/* Mandatory Branch Cleaning Lockout View */}
          {cleaningLockoutTask && (
            <ReceptionCleaningLockoutView
              initialTask={cleaningLockoutTask}
              branchName={branchName}
              onUnlocked={() => {
                setCleaningLockoutTask(null);
                fetchAppointments(branchName, selectedDate);
              }}
              isFullLockoutScreen={true}
            />
          )}
        </main>
      </div>
    </div>
  );
}
