"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  Stethoscope,
  Calendar,
  Phone,
  RefreshCw,
  Search,
  RotateCcw,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 2C6.495 2 2 6.494 2 12.029c0 1.83.493 3.555 1.348 5.048L2 22l5.06-1.328a9.98 9.98 0 0 0 4.971 1.323h.004c5.534 0 10.029-4.494 10.029-10.028A9.99 9.99 0 0 0 12.031 2zM12.03 20.31h-.003a8.31 8.31 0 0 1-4.237-1.156l-.304-.18-3.146.825.84-3.067-.198-.315a8.297 8.297 0 0 1-1.272-4.388c0-4.587 3.732-8.319 8.32-8.319 2.222 0 4.312.866 5.883 2.438a8.28 8.28 0 0 1 2.435 5.88c0 4.588-3.732 8.32-8.318 8.32zm4.557-6.223c-.25-.125-1.477-.728-1.706-.81-.228-.083-.395-.125-.562.125-.166.25-.644.81-.79 1-.145.187-.291.208-.541.083-.25-.125-1.054-.388-2.008-1.238-.742-.662-1.243-1.48-1.389-1.73-.146-.25-.016-.385.109-.51.113-.112.25-.291.375-.437.125-.145.166-.25.25-.416.083-.167.041-.312-.021-.437-.063-.125-.563-1.354-.77-1.854-.203-.487-.41-.42-.563-.428l-.48-.009c-.166 0-.437.062-.666.312-.229.25-.875.854-.875 2.083 0 1.229.896 2.416 1.021 2.583.125.166 1.761 2.688 4.266 3.769.596.257 1.061.41 1.424.526.6.19 1.144.163 1.576.1.481-.072 1.477-.604 1.685-1.187.208-.583.208-1.083.146-1.187-.063-.105-.23-.167-.479-.292z" />
  </svg>
);

const CreditCardIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const renderVisitBadge = (appt: any) => {
  const badge = appt.visitBadge || (appt.isReback ? "Revisit" : "New");
  return (
    <div className="inline-flex items-center gap-1">
      {badge === "New" && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
          NEW
        </span>
      )}
      {badge === "In-Dur" && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200 shadow-xs">
          IN-DUR
        </span>
      )}
      {badge === "Revisit" && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
          REVISIT
        </span>
      )}
      {appt.hasPackage && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-black tracking-wide bg-amber-500 text-white shadow-xs">
          PKG
        </span>
      )}
    </div>
  );
};

const DEFAULT_BRANCHES = [
  "All Branches",
  "Kphb Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

const toDDMMYYYY = (date: Date) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

const getYesterdayStr = () => {
  const prev = new Date();
  prev.setDate(prev.getDate() - 1);
  return toDDMMYYYY(prev);
};

const getTomorrowStr = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return toDDMMYYYY(next);
};

const toISODate = (ddmmyyyy: string) => {
  if (!ddmmyyyy || ddmmyyyy === "ALL") return "";
  const parts = ddmmyyyy.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) return ddmmyyyy;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return "";
};

const fromISODate = (yyyymmdd: string) => {
  if (!yyyymmdd) return "";
  const parts = yyyymmdd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return yyyymmdd;
};

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Dr. Prashanth K Vaidya");
  const [branchName, setBranchName] = useState("All Branches");
  const [branchesList, setBranchesList] = useState<string[]>(DEFAULT_BRANCHES);
  const [selectedDate, setSelectedDate] = useState("");
  const [todayStr, setTodayStr] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "ACTIVE" | "SENT_TO_RECEPTION" | "COMPLETED">("ALL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Safe client-side date formatting
  useEffect(() => {
    const now = new Date();
    const dt = toDDMMYYYY(now);
    setTodayStr(dt);
    setSelectedDate(dt);

    const savedDoc = localStorage.getItem("doctor_name");
    const savedBranch = localStorage.getItem("branch_name");
    if (savedDoc) setDoctorName(savedDoc);
    if (savedBranch) setBranchName(savedBranch);

    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.branches) ? data.branches : []);
        if (list.length > 0) {
          const names: string[] = list.map((b: any) => (typeof b === "string" ? b.trim() : b.name?.trim())).filter(Boolean);
          if (names.length > 0) {
            setBranchesList(["All Branches", ...Array.from(new Set(names))]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handlePrevDay = () => {
    if (selectedDate === "ALL" || !selectedDate) {
      setSelectedDate(getYesterdayStr());
      return;
    }
    const iso = toISODate(selectedDate);
    const cur = iso ? new Date(iso) : new Date();
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(toDDMMYYYY(cur));
  };

  const handleNextDay = () => {
    if (selectedDate === "ALL" || !selectedDate) {
      setSelectedDate(getTomorrowStr());
      return;
    }
    const iso = toISODate(selectedDate);
    const cur = iso ? new Date(iso) : new Date();
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(toDDMMYYYY(cur));
  };

  const fetchDoctorAppointments = async (dt: string, isSilent = false) => {
    if (!dt) return;
    if (!isSilent) setIsLoading(true);
    try {
      const docParam = `doctorName=${encodeURIComponent(doctorName)}`;
      const branchParam = branchName && branchName !== "All Branches" ? `&branch=${encodeURIComponent(branchName)}` : "";
      const dateParam = dt === "ALL" ? "&date=ALL" : `&date=${encodeURIComponent(dt)}`;
      const res = await fetch(`/api/doctor/appointments?${docParam}${branchParam}${dateParam}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else if (!isSilent) {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Failed to load doctor appointments:", err);
      if (!isSilent) setAppointments([]);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    fetchDoctorAppointments(selectedDate, appointments.length > 0);

    const interval = setInterval(() => {
      fetchDoctorAppointments(selectedDate, true);
    }, 10000);

    return () => clearInterval(interval);
  }, [doctorName, branchName, selectedDate]);

  // Patient File Navigation
  const openPatientFile = (appt: any) => {
    router.push(
      `/doctor/patient-file?id=${appt.id}&name=${encodeURIComponent(appt.patientName || appt.name)}&phone=${appt.phone || appt.phoneNumber}&registrationId=${appt.registrationId || "SPH-GEN"}&branch=${encodeURIComponent(branchName)}`
    );
  };

  // Consultation Actions: Doctor only starts consultation (completion is done via Send to Reception)
  const handleUpdateStatus = async (id: string, action: "START_CONSULTATION", appt?: any) => {
    try {
      if (action === "START_CONSULTATION" && appt) {
        openPatientFile(appt);
      }
      const res = await fetch("/api/doctor/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDoctorAppointments(selectedDate, true);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to update status." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Server communication failed." });
    }
  };

  const handleWhatsApp = (phone?: string, patientName?: string, slot?: string) => {
    const clean = (phone || "").replace(/\D/g, "").slice(-10);
    if (!clean) return;
    const msg = `Hello ${patientName || "Patient"}, Dr. Prashanth K Vaidya is reviewing your consultation slot (${slot || "today"}). Please be seated outside the doctor cabin.`;
    window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filteredAppointments = useMemo(() => {
    if (activeFilter === "ALL") return appointments;
    if (activeFilter === "UPCOMING") {
      return appointments.filter((a) => !a.status || a.status === "WAITING" || a.status === "SCHEDULED");
    }
    if (activeFilter === "ACTIVE") {
      return appointments.filter((a) => a.status === "IN_CONSULTATION");
    }
    if (activeFilter === "SENT_TO_RECEPTION") {
      return appointments.filter((a) => a.status === "COLLECT_FEE" || a.isSentToReception);
    }
    if (activeFilter === "COMPLETED") {
      return appointments.filter((a) => a.status === "COMPLETED");
    }
    return appointments;
  }, [appointments, activeFilter]);

  const upcomingCount = appointments.filter((a) => !a.status || a.status === "WAITING" || a.status === "SCHEDULED").length;
  const activeCount = appointments.filter((a) => a.status === "IN_CONSULTATION").length;
  const sentCount = appointments.filter((a) => a.status === "COLLECT_FEE" || a.isSentToReception).length;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <DoctorSidebar activePage="dashboard" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Doctor Patient Queue</h2>
                <p className="text-[10px] text-slate-400">
                  {doctorName} • {branchName} • {selectedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#0284c7] font-extrabold text-[11px]">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>{doctorName}</span>
              </div>

              <select
                value={branchName}
                onChange={(e) => {
                  setBranchName(e.target.value);
                  localStorage.setItem("branch_name", e.target.value);
                }}
                className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                title="Filter by Branch"
              >
                {branchesList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <button
                onClick={() => fetchDoctorAppointments(selectedDate, false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold text-[#0284c7] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh Queue</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-3.5 max-w-7xl w-full mx-auto space-y-3">
          {feedback && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-between transition-all ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {feedback.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-[10px] underline hover:opacity-75 cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Interactive Date Navigation Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <CalendarDays className="w-4 h-4 text-[#0284c7]" />
                <span>Date:</span>
              </span>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedDate("ALL")}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    selectedDate === "ALL"
                      ? "bg-[#0284c7] text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-bold"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>All Dates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(getYesterdayStr())}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectedDate === getYesterdayStr()
                      ? "bg-[#0284c7] text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-bold"
                  }`}
                >
                  Yesterday
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectedDate === todayStr
                      ? "bg-[#0284c7] text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-bold"
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(getTomorrowStr())}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectedDate === getTomorrowStr()
                      ? "bg-[#0284c7] text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-bold"
                  }`}
                >
                  Tomorrow
                </button>
              </div>

              {/* Day Step arrows & Date Picker input */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  title="Previous Day"
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="relative flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-[#0284c7] mr-1 pointer-events-none" />
                  <input
                    type="date"
                    value={toISODate(selectedDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(fromISODate(e.target.value));
                      }
                    }}
                    className={`py-0.5 px-1 rounded text-[11px] font-bold border-0 bg-transparent text-slate-800 cursor-pointer focus:ring-0 focus:outline-none`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleNextDay}
                  title="Next Day"
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Active Date Label Pill */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#0284c7] font-bold text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {selectedDate === "ALL"
                    ? "Showing: All Booked (All Dates)"
                    : selectedDate === todayStr
                    ? `Today: ${selectedDate}`
                    : selectedDate === getTomorrowStr()
                    ? `Tomorrow: ${selectedDate}`
                    : selectedDate === getYesterdayStr()
                    ? `Yesterday: ${selectedDate}`
                    : `Date: ${selectedDate}`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                  {selectedDate === "ALL" ? "All Booked" : "Booked Patients"}
                </p>
                <Users className="w-3.5 h-3.5 text-[#0284c7]" />
              </div>
              <p className="text-lg font-black text-[#0284c7] mt-1">{appointments.length}</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-lg font-black text-amber-600 mt-1">{upcomingCount}</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Active (In Cabin)</p>
                <Stethoscope className="w-3.5 h-3.5 text-[#0284c7]" />
              </div>
              <p className="text-lg font-black text-[#0284c7] mt-1">{activeCount}</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-amber-600 uppercase tracking-wider">Sent to Reception</p>
                <CreditCardIcon className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-lg font-black text-amber-600 mt-1">{sentCount}</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-lg font-black text-emerald-600 mt-1">{completedCount}</p>
            </div>
          </div>

          {/* Doctor Appointment Queue Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Live Consultation Queue</h3>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-sky-50 text-[#0284c7] border border-sky-200">
                  {filteredAppointments.length}
                </span>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-bold flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-2 py-0.5 rounded-md transition-all ${activeFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  All ({appointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("UPCOMING")}
                  className={`px-2 py-0.5 rounded-md transition-all ${activeFilter === "UPCOMING" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Upcoming ({upcomingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("ACTIVE")}
                  className={`px-2 py-0.5 rounded-md transition-all ${activeFilter === "ACTIVE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("SENT_TO_RECEPTION")}
                  className={`px-2 py-0.5 rounded-md transition-all ${activeFilter === "SENT_TO_RECEPTION" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Sent to Reception ({sentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("COMPLETED")}
                  className={`px-2 py-0.5 rounded-md transition-all ${activeFilter === "COMPLETED" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Completed ({completedCount})
                </button>
              </div>
            </div>

            {/* Table */}
            {isLoading && appointments.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-5 h-5 border-2 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-semibold">Loading doctor queue for {selectedDate}...</span>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-8 text-center space-y-1 text-slate-400">
                <Stethoscope className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No appointments scheduled for this doctor</p>
                <p className="text-[10.5px]">Check another date or branch.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Queue &amp; ID</th>
                      <th className="py-2 px-3">Patient Name</th>
                      <th className="py-2 px-3">Symptoms / Disease</th>
                      <th className="py-2 px-3">Slot &amp; Mode</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Consultation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((appt, index) => {
                      const status = (appt.status || "WAITING").toUpperCase();
                      const isWaiting = status === "WAITING" || status === "SCHEDULED";
                      const isActive = status === "IN_CONSULTATION";
                      const isSentToReception = status === "COLLECT_FEE" || !!appt.isSentToReception;
                      const isCompleted = status === "COMPLETED";
                      const isRevisit = !!appt.isReback;
                      const cleanPhone = (appt.phone || appt.phoneNumber || "").replace(/\D/g, "").slice(-10);

                      return (
                        <tr key={appt.id || `doc-appt-${index}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-md bg-sky-50 border border-sky-200 flex flex-col items-center justify-center shrink-0">
                                <span className="text-[7px] font-black text-[#0369a1] leading-none">Q</span>
                                <span className="text-[11px] font-black text-[#0284c7] leading-none">{index + 1}</span>
                              </div>
                              <span className="px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                                {appt.registrationId || "ID: N/A"}
                              </span>
                            </div>
                          </td>

                          <td className="py-2 px-3">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs">{appt.patientName}</span>
                                {renderVisitBadge(appt)}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{cleanPhone || "No Mobile"}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-2 px-3">
                            <span className="font-medium text-slate-700 truncate max-w-[150px] block">
                              {appt.diseases || "General Homeo Consultation"}
                            </span>
                          </td>

                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{appt.timeSlot || appt.selectedTimeSlot}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                                {appt.consultationMode || "In-Clinic"}
                              </span>
                              {appt.appointmentDate && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-50 text-[#0284c7] border border-sky-100">
                                  📅 {appt.appointmentDate}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                                isWaiting
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : isActive
                                  ? "bg-sky-50 text-[#0284c7] border border-sky-200"
                                  : isSentToReception
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isSentToReception ? "Sent to Reception" : status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Call In / Start consultation */}
                              {isWaiting && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(appt.id, "START_CONSULTATION", appt)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-xs cursor-pointer transition-all"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Start Prescription</span>
                                </button>
                              )}

                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => openPatientFile(appt)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-xs cursor-pointer transition-all"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Patient File</span>
                                </button>
                              )}

                              {isSentToReception && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openPatientFile(appt)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
                                    title="View Prescription & File"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>View File</span>
                                  </button>
                                </div>
                              )}

                              {isCompleted && (
                                <span className="text-[10px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded-md border border-emerald-200">
                                  ✓ Done
                                </span>
                              )}

                              {/* WhatsApp Direct message */}
                              <button
                                type="button"
                                onClick={() => handleWhatsApp(cleanPhone, appt.patientName, appt.timeSlot)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all cursor-pointer"
                                title="Send WhatsApp Message"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
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
        </main>
      </div>
    </div>
  );
}

