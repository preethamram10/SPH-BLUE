"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TelecallerSidebar from "@/components/telecaller/TelecallerSidebar";
import {
  Headset,
  PhoneCall,
  CalendarPlus,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Phone,
  Building2,
  RefreshCw,
  Plus,
  ArrowRight,
  X,
  Sparkles,
  Stethoscope,
  ChevronDown,
  PhoneOutgoing,
} from "lucide-react";

type TelecallerTab = "followups" | "book_appointment" | "log_call";

interface DoctorOption {
  id: string;
  name: string;
  specialty?: string;
}

const DEFAULT_BOOKING_BRANCHES = [
  "KPHB Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

const TIME_SLOTS = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
];

const CALL_OUTCOMES = [
  { id: "Interested", label: "Interested", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { id: "Callback Requested", label: "Callback", color: "text-sky-700 bg-sky-50 border-sky-200" },
  { id: "Not Interested", label: "Not Interested", color: "text-rose-700 bg-rose-50 border-rose-200" },
  { id: "No Response", label: "No Response", color: "text-slate-700 bg-slate-100 border-slate-200" },
];

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return trimmed;
}

export default function TelecallerDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TelecallerTab>("followups");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "book_appointment" || tabParam === "log_call" || tabParam === "followups") {
      setActiveTab(tabParam as TelecallerTab);
    }
  }, [searchParams]);

  // Telecaller Profile
  const [telecallerProfile, setTelecallerProfile] = useState({
    name: "Telecaller Agent",
    telecallerId: "TC01",
    assignedBranch: "All Branches",
    bookedCount: 0,
  });

  // Base Data
  const [branches, setBranches] = useState<string[]>(DEFAULT_BOOKING_BRANCHES);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);

  // Follow-ups state
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [followUpSearch, setFollowUpSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [periodFilter, setPeriodFilter] = useState("all");

  // Call Logs state
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  // Booking Form State
  const [bookFollowUpId, setBookFollowUpId] = useState<string | null>(null);
  const [bookPatientName, setBookPatientName] = useState("");
  const [bookMobileNumber, setBookMobileNumber] = useState("");
  const [bookBranch, setBookBranch] = useState("KPHB Branch");
  const [bookDoctor, setBookDoctor] = useState("Dr. Prashant K Vaidya");
  const [bookDoctorId, setBookDoctorId] = useState("1793864791241");
  const [bookDate, setBookDate] = useState("");
  const [bookSlot, setBookSlot] = useState("11:00 AM");
  const [bookMode, setBookMode] = useState<"In-Clinic" | "Online">("In-Clinic");
  const [bookDisease, setBookDisease] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Modals
  const [logCallModalOpen, setLogCallModalOpen] = useState(false);
  const [activeCallPatient, setActiveCallPatient] = useState<any>(null);
  const [callOutcome, setCallOutcome] = useState("Interested");
  const [callNextDate, setCallNextDate] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [activeReschedulePatient, setActiveReschedulePatient] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("11:00 AM");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Load Profile
  useEffect(() => {
    const savedName = localStorage.getItem("telecaller_name") || localStorage.getItem("user_name");
    const savedId = localStorage.getItem("telecaller_id");
    const savedBranch = localStorage.getItem("branch_name") || localStorage.getItem("user_assigned_branch");

    setTelecallerProfile((prev) => ({
      ...prev,
      name: savedName || prev.name,
      telecallerId: savedId || prev.telecallerId,
      assignedBranch: savedBranch || prev.assignedBranch,
    }));

    // Today's date default for booking
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setBookDate(`${y}-${m}-${d}`);
  }, []);

  // Fetch Branches & Doctors
  useEffect(() => {
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.branches) ? data.branches : [];
        if (list.length > 0) {
          const names: string[] = list
            .map((b: any) => (typeof b === "string" ? b.trim() : b.name?.trim()))
            .filter(Boolean);
          if (names.length > 0) {
            setBranches(Array.from(new Set(names)));
            setBookBranch(names[0]);
          }
        }
      })
      .catch(() => {});

    fetch("/api/admin/employees?category=DOCTOR")
      .then((res) => res.json())
      .then((data) => {
        const empList = Array.isArray(data?.employees) ? data.employees : [];
        if (empList.length > 0) {
          const mapped: DoctorOption[] = empList.map((d: any) => ({
            id: d.id,
            name: d.name,
            specialty: d.designation || d.specialty || "Homeopathic Consultant",
          }));
          setDoctors(mapped);
          const prashant = mapped.find((d) => d.name.toLowerCase().includes("prashant"));
          if (prashant) {
            setBookDoctor(prashant.name);
            setBookDoctorId(prashant.id);
          } else if (mapped[0]) {
            setBookDoctor(mapped[0].name);
            setBookDoctorId(mapped[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Follow-Ups
  const fetchFollowUps = useCallback(async () => {
    try {
      setLoadingFollowUps(true);
      let url = "/api/admin/all-follow-ups";
      const params: string[] = [];
      if (selectedBranch && selectedBranch !== "All Branches") {
        params.push(`branch=${encodeURIComponent(selectedBranch)}`);
      }
      if (periodFilter && periodFilter !== "all") {
        params.push(`period=${encodeURIComponent(periodFilter)}`);
      }
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.followUps) ? data.followUps : Array.isArray(data) ? data : [];
        setFollowUps(list);
      }
    } catch (e) {
      console.warn("Failed to fetch follow-ups:", e);
    } finally {
      setLoadingFollowUps(false);
    }
  }, [selectedBranch, periodFilter]);

  // Fetch Call Logs
  const fetchCallLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/telecaller/call-logs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : [];
        setCallLogs(list);
      }
    } catch (e) {
      console.warn("Failed to fetch call logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "followups") {
      fetchFollowUps();
    } else if (activeTab === "log_call") {
      fetchCallLogs();
    }
  }, [activeTab, fetchFollowUps, fetchCallLogs]);

  // Filtered Follow-ups
  const filteredFollowUps = useMemo(() => {
    return followUps.filter((item) => {
      if (!followUpSearch.trim()) return true;
      const q = followUpSearch.toLowerCase().trim();
      const name = (item.patientName || "").toLowerCase();
      const phone = (item.phone || item.mobileNumber || "").toLowerCase();
      const regId = (item.registrationId || item.regId || "").toLowerCase();
      const disease = (item.diseases || item.disease || item.notes || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || regId.includes(q) || disease.includes(q);
    });
  }, [followUps, followUpSearch]);

  // Filtered Call Logs
  const filteredLogs = useMemo(() => {
    return callLogs.filter((log) => {
      const q = logSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (log.patientName || "").toLowerCase().includes(q) ||
        (log.phoneNumber || "").includes(q) ||
        (log.notes || "").toLowerCase().includes(q);
      const matchesOutcome =
        outcomeFilter === "all" || (log.outcome || "").toLowerCase() === outcomeFilter.toLowerCase();
      return matchesSearch && matchesOutcome;
    });
  }, [callLogs, logSearch, outcomeFilter]);

  // Trigger Booking for Follow-Up Patient
  const handleStartBookingForPatient = (patient: any) => {
    setBookFollowUpId(patient.id || patient.appointmentId);
    setBookPatientName(patient.patientName || "");
    setBookMobileNumber((patient.phone || patient.mobileNumber || "").replace(/\D/g, ""));
    if (patient.branch) setBookBranch(patient.branch);
    if (patient.doctorName) {
      setBookDoctor(patient.doctorName);
      const found = doctors.find((d) => d.name === patient.doctorName);
      if (found) setBookDoctorId(found.id);
    }
    if (patient.diseases) setBookDisease(patient.diseases);
    setActiveTab("book_appointment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit Appointment Booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookPatientName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    const cleanPhone = bookMobileNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!bookDate.trim()) {
      alert("Please select appointment date.");
      return;
    }

    try {
      setBookingLoading(true);
      const matchedDoctor = doctors.find((d) => d.name === bookDoctor) || doctors[0];

      const res = await fetch("/api/admin/all-follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpAppointmentId: bookFollowUpId,
          patientName: bookPatientName.trim(),
          phoneNumber: cleanPhone,
          branch: bookBranch,
          doctorId: matchedDoctor?.id || bookDoctorId || "1793864791241",
          doctorName: matchedDoctor?.name || bookDoctor,
          appointmentDate: bookDate,
          selectedTimeSlot: bookSlot,
          consultationMode: bookMode,
          diseases: bookDisease.trim() || "Follow-up Consultation",
          notes: bookNotes.trim() || "Booked by telecaller desk",
          bookedByTelecallerId: telecallerProfile.telecallerId,
          bookedByTelecallerName: telecallerProfile.name,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTelecallerProfile((prev) => ({
          ...prev,
          bookedCount: prev.bookedCount + 1,
        }));
        if (bookFollowUpId) {
          setFollowUps((prev) =>
            prev.filter((f) => f.id !== bookFollowUpId && f.appointmentId !== bookFollowUpId)
          );
        }
        setBookingSuccessMsg(
          `Appointment confirmed for ${bookPatientName} with ${bookDoctor} on ${formatDisplayDate(
            bookDate
          )} at ${bookSlot} (${bookBranch}). Token: ${data.appointment?.token || "SPH-CONFIRMED"}`
        );

        // Reset
        setBookFollowUpId(null);
        setBookPatientName("");
        setBookMobileNumber("");
        setBookDisease("");
        setBookNotes("");
        fetchFollowUps();
      } else {
        alert("Booking Failed: " + (data.error || "Unable to confirm appointment slot."));
      }
    } catch (err: any) {
      alert("Error: " + (err.message || "Failed to book appointment."));
    } finally {
      setBookingLoading(false);
    }
  };

  // Submit Call Log Modal
  const handleSubmitCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCallPatient) return;
    try {
      setSubmittingLog(true);
      const res = await fetch("/api/telecaller/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: activeCallPatient.patientName,
          phoneNumber: activeCallPatient.phone || activeCallPatient.mobileNumber,
          branch: activeCallPatient.branch || "KPHB Branch",
          outcome: callOutcome,
          nextFollowUpDate: callNextDate || undefined,
          notes: callNotes.trim(),
          agentName: telecallerProfile.name,
          telecallerId: telecallerProfile.telecallerId,
        }),
      });

      if (res.ok) {
        alert("Call log recorded successfully!");
        setLogCallModalOpen(false);
        setActiveCallPatient(null);
        setCallNotes("");
        setCallNextDate("");
        fetchCallLogs();
      } else {
        const err = await res.json();
        alert("Failed to log call: " + (err.error || "Please retry"));
      }
    } catch (err: any) {
      alert("Error: " + (err.message || "Failed to record call log"));
    } finally {
      setSubmittingLog(false);
    }
  };

  // Submit Reschedule Follow-Up Modal
  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReschedulePatient || !rescheduleDate) {
      alert("Please select a new follow-up date.");
      return;
    }
    try {
      setSubmittingReschedule(true);
      const appointmentId = activeReschedulePatient.id || activeReschedulePatient.appointmentId;
      const res = await fetch("/api/admin/all-follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          newFollowUpDate: rescheduleDate,
          newSlot: rescheduleSlot,
          agentId: telecallerProfile.telecallerId,
          agentName: telecallerProfile.name,
        }),
      });

      if (res.ok) {
        alert("Follow-up rescheduled successfully!");
        setRescheduleModalOpen(false);
        setActiveReschedulePatient(null);
        fetchFollowUps();
      } else {
        const err = await res.json();
        alert("Reschedule failed: " + (err.error || "Please retry"));
      }
    } catch (err: any) {
      alert("Error: " + (err.message || "Failed to reschedule"));
    } finally {
      setSubmittingReschedule(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* Sleek Telecaller Sidebar */}
      <TelecallerSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Work Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <div className="w-full max-w-[1500px] mx-auto p-4 sm:p-6 space-y-4">
          {/* Top Telecaller Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shadow-2xs border border-sky-100">
                <Headset className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Telecaller Calling Portal
                  </h1>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    {telecallerProfile.telecallerId}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged in as <span className="font-bold text-slate-700">{telecallerProfile.name}</span> • Branch:{" "}
                  <span className="font-semibold text-slate-700">{telecallerProfile.assignedBranch}</span>
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Follow-ups
                </span>
                <span className="text-sm font-black text-slate-800">{followUps.length}</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200/70 text-center">
                <span className="block text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                  Booked by Me
                </span>
                <span className="text-sm font-black text-emerald-700">{telecallerProfile.bookedCount}</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200/70 text-center">
                <span className="block text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                  Call Logs
                </span>
                <span className="text-sm font-black text-purple-700">{callLogs.length}</span>
              </div>
            </div>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl w-fit border border-slate-300/60 shadow-2xs">
            <button
              onClick={() => setActiveTab("followups")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "followups"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Follow-ups Calling Queue ({followUps.length})
            </button>
            <button
              onClick={() => setActiveTab("book_appointment")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "book_appointment"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Book Appointment {bookFollowUpId ? "(Pre-filled)" : ""}
            </button>
            <button
              onClick={() => setActiveTab("log_call")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "log_call"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Call Logs & Outcomes ({callLogs.length})
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: FOLLOW-UPS CALLING QUEUE                                          */}
          {/* ========================================================================= */}
          {activeTab === "followups" && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="bg-white p-3.5 px-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient name, phone, Reg ID, condition..."
                    value={followUpSearch}
                    onChange={(e) => setFollowUpSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 font-medium"
                  />
                  {followUpSearch && (
                    <button
                      onClick={() => setFollowUpSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  {/* Branch selector */}
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="All Branches">All Clinic Branches</option>
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  {/* Period Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                    {[
                      { id: "all", label: "All" },
                      { id: "overdue", label: "Overdue" },
                      { id: "today", label: "Today" },
                      { id: "tomorrow", label: "Tomorrow" },
                      { id: "this_month", label: "This Month" },
                      { id: "next_month", label: "Next Month" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPeriodFilter(p.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                          periodFilter === p.id
                            ? "bg-white text-sky-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={fetchFollowUps}
                    disabled={loadingFollowUps}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title="Refresh List"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingFollowUps ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Follow-Ups Table / Cards */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-3.5 px-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 text-xs uppercase tracking-wider">
                      Patient Follow-Up Queue
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                      {filteredFollowUps.length} patients
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-500 text-[10.5px] uppercase font-black border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Patient / Reg ID</th>
                        <th className="py-3 px-4">Phone Number</th>
                        <th className="py-3 px-4">Branch & Doctor</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Disease / Notes</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11.5px] text-slate-700">
                      {loadingFollowUps ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-sky-600" />
                            Loading follow-up patient records...
                          </td>
                        </tr>
                      ) : filteredFollowUps.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                            No follow-up patients found for the selected branch & period.
                          </td>
                        </tr>
                      ) : (
                        filteredFollowUps.map((p, idx) => {
                          const isOverdue =
                            p.isOverdue || (p.followUpDate && p.followUpDate < new Date().toISOString().split("T")[0]);
                          return (
                            <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 text-slate-400 font-semibold">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <div className="font-black text-slate-900 text-xs">{p.patientName}</div>
                                <div className="text-[10px] font-mono font-bold text-sky-700">
                                  {p.registrationId || p.regId || "SPH-PAT"}
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <a
                                  href={`tel:${p.phone || p.mobileNumber}`}
                                  className="inline-flex items-center gap-1.5 font-bold text-sky-700 hover:text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100"
                                >
                                  <Phone className="w-3 h-3" />
                                  {p.phone || p.mobileNumber || "N/A"}
                                </a>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-800">{p.branch || "KPHB Branch"}</div>
                                <div className="text-[10.5px] text-slate-500">
                                  {p.doctorName || "Dr. Prashant K Vaidya"}
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                    isOverdue
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {formatDisplayDate(p.followUpDate || p.appointmentDate)}
                                  {isOverdue ? " (Overdue)" : ""}
                                </span>
                              </td>
                              <td className="py-3 px-4 max-w-xs truncate text-slate-600 font-medium">
                                {p.diseases || p.notes || "Follow-up Consultation"}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* 1. Book Appointment */}
                                  <button
                                    onClick={() => handleStartBookingForPatient(p)}
                                    className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-xs transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <CalendarPlus className="w-3 h-3" />
                                    Book
                                  </button>

                                  {/* 2. Log Call */}
                                  <button
                                    onClick={() => {
                                      setActiveCallPatient(p);
                                      setLogCallModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <PhoneOutgoing className="w-3 h-3 text-slate-500" />
                                    Log Call
                                  </button>

                                  {/* 3. Reschedule */}
                                  <button
                                    onClick={() => {
                                      setActiveReschedulePatient(p);
                                      setRescheduleModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] border border-amber-200 transition cursor-pointer"
                                  >
                                    Reschedule
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
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BOOK APPOINTMENT FORM                                             */}
          {/* ========================================================================= */}
          {activeTab === "book_appointment" && (
            <div className="max-w-3xl mx-auto bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Book Patient Appointment
                    </h2>
                    <p className="text-xs text-slate-500">
                      Schedule consultation slot across hospital branches
                    </p>
                  </div>
                </div>

                {bookFollowUpId && (
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
                    Linked to Follow-Up
                  </span>
                )}
              </div>

              {bookingSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-emerald-900">Appointment Confirmed!</p>
                    <p className="mt-0.5">{bookingSuccessMsg}</p>
                  </div>
                  <button onClick={() => setBookingSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Patient Name */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Patient Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={bookPatientName}
                      onChange={(e) => setBookPatientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium text-slate-800"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      10-Digit Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={bookMobileNumber}
                      onChange={(e) => setBookMobileNumber(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hospital Branch */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Hospital Branch <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bookBranch}
                      onChange={(e) => setBookBranch(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-bold text-slate-800"
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Doctor */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Consulting Doctor <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bookDoctor}
                      onChange={(e) => {
                        setBookDoctor(e.target.value);
                        const match = doctors.find((d) => d.name === e.target.value);
                        if (match) setBookDoctorId(match.id);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-bold text-slate-800"
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.specialty || "Consultant"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Appointment Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-bold text-slate-800"
                    />
                  </div>

                  {/* Slot */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Time Slot <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bookSlot}
                      onChange={(e) => setBookSlot(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-bold text-slate-800"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Consultation Mode
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setBookMode("In-Clinic")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                          bookMode === "In-Clinic"
                            ? "bg-white text-sky-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        In-Clinic
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookMode("Online")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                          bookMode === "Online"
                            ? "bg-white text-purple-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Online
                      </button>
                    </div>
                  </div>
                </div>

                {/* Disease / Subject */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Chief Complaint / Disease
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Migraine, Hair Fall, Gastritis, Skin Allergy"
                    value={bookDisease}
                    onChange={(e) => setBookDisease(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium text-slate-800"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Telecaller Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Patient agreed to morning slot, requested direct doctor consultation"
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium text-slate-800 resize-none"
                  />
                </div>

                {/* Submit */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBookFollowUpId(null);
                      setBookPatientName("");
                      setBookMobileNumber("");
                      setBookDisease("");
                      setBookNotes("");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black shadow-md shadow-sky-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {bookingLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Confirming Slot...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm & Book Appointment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: CALL LOGS & OUTCOMES HISTORY                                      */}
          {/* ========================================================================= */}
          {activeTab === "log_call" && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="bg-white p-3.5 px-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search logs by patient name, phone, notes..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={outcomeFilter}
                    onChange={(e) => setOutcomeFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="all">All Call Outcomes</option>
                    <option value="Interested">Interested</option>
                    <option value="Callback Requested">Callback</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="No Response">No Response</option>
                  </select>

                  <button
                    onClick={fetchCallLogs}
                    disabled={loadingLogs}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-3.5 px-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 text-xs uppercase tracking-wider">
                      Telecaller Call Logs & Patient Updates
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {filteredLogs.length} logged
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-500 text-[10.5px] uppercase font-black border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Patient / Mobile</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Call Outcome</th>
                        <th className="py-3 px-4">Next Follow-Up</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4">Agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11.5px] text-slate-700">
                      {loadingLogs ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-sky-600" />
                            Loading call logs...
                          </td>
                        </tr>
                      ) : filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                            No call logs recorded matching this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((l, idx) => (
                          <tr key={l.id || idx} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 text-slate-400 font-semibold">{idx + 1}</td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {formatDisplayDate(l.callDate || l.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{l.patientName}</div>
                              <div className="text-[10.5px] text-slate-500">{l.phoneNumber}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700">
                              {l.branch || "KPHB Branch"}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border ${
                                  l.outcome?.toLowerCase().includes("interested") &&
                                  !l.outcome?.toLowerCase().includes("not")
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : l.outcome?.toLowerCase().includes("callback")
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : l.outcome?.toLowerCase().includes("not")
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {l.outcome || "General Call"}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-semibold">
                              {l.nextFollowUpDate ? formatDisplayDate(l.nextFollowUpDate) : "—"}
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                              {l.notes || "No call notes"}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                {l.telecallerId || l.agentName || "TC01"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: LOG CALL OUTCOME                                                 */}
      {/* ========================================================================= */}
      {logCallModalOpen && activeCallPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <PhoneOutgoing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Record Call Outcome</h3>
                  <p className="text-[11px] text-slate-500">{activeCallPatient.patientName}</p>
                </div>
              </div>
              <button
                onClick={() => setLogCallModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCallLog} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Call Outcome *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_OUTCOMES.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => setCallOutcome(o.id)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                        callOutcome === o.id
                          ? `${o.color} ring-2 ring-sky-500/30`
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Next Follow-Up Date (Optional)
                </label>
                <input
                  type="date"
                  value={callNextDate}
                  onChange={(e) => setCallNextDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Call Notes / Discussion</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Patient is feeling better, agreed to come next Saturday for renewal"
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium text-slate-800 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLogCallModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingLog ? "Saving..." : "Save Call Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESCHEDULE FOLLOW-UP                                            */}
      {/* ========================================================================= */}
      {rescheduleModalOpen && activeReschedulePatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Reschedule Follow-Up</h3>
                  <p className="text-[11px] text-slate-500">{activeReschedulePatient.patientName}</p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReschedule} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 font-bold mb-1">New Follow-Up Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Preferred Time Slot</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-bold text-slate-800"
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReschedule}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingReschedule ? "Updating..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
