"use client";

import React, { useState } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  Calendar,
  Search,
  Plus,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Building2,
  Mail,
  Megaphone,
  Radio,
  X,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

interface Appointment {
  id: string;
  patientName: string;
  mrn: string;
  phone: string;
  doctorName: string;
  time: string;
  type: "Consultation" | "Follow-up" | "Walk-in";
  status: "SCHEDULED" | "CHECKED_IN" | "IN_CONSULTATION" | "COMPLETED";
}

interface DoctorSlotOption {
  doctorId: string;
  doctorName: string;
  phone: string;
  slots: any[];
}

interface GeneratedSlot {
  time: string;
  bookedCount: number;
  maxCapacity: number;
  isFull: boolean;
  isNoShow?: boolean;
}

export default function ReceptionAppointmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [diseases, setDiseases] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [marketingSource, setMarketingSource] = useState("");
  const [modeOfConsultation, setModeOfConsultation] = useState("In-Clinic");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDoctorObj, setSelectedDoctorObj] = useState<DoctorSlotOption | null>(null);
  const [selectedDate, setSelectedDate] = useState("05-11-2026");
  const [selectedSlot, setSelectedSlot] = useState("");

  const [availableDoctors, setAvailableDoctors] = useState<DoctorSlotOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [activeNoShows, setActiveNoShows] = useState<any[]>([]);

  // Helper to get day abbr from DD-MM-YYYY
  const getDayAbbr = (dateStr: string): string => {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days[d.getDay()] || "Mon";
    }
    return "Mon";
  };

  const fetchAvailableDoctors = async (bName: string, dt: string) => {
    try {
      setLoadingDoctors(true);
      const day = getDayAbbr(dt);
      const cleanB = bName.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";
      
      const [timingsRes, noShowRes] = await Promise.all([
        fetch(`/api/admin/doctor-timings?branch=${encodeURIComponent(cleanB)}&day=${day}`),
        fetch(`/api/reception/doctor-no-show?branch=${encodeURIComponent(cleanB)}&date=${encodeURIComponent(dt)}`),
      ]);

      if (noShowRes.ok) {
        const noShowData = await noShowRes.json();
        if (noShowData.success && Array.isArray(noShowData.noShows)) {
          setActiveNoShows(noShowData.noShows);
        } else {
          setActiveNoShows([]);
        }
      }

      if (timingsRes.ok) {
        const data = await timingsRes.json();
        if (data.success && Array.isArray(data.doctors)) {
          setAvailableDoctors(data.doctors);
          return;
        }
      }
      setAvailableDoctors([]);
    } catch {
      setAvailableDoctors([]);
      setActiveNoShows([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  React.useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    const activeB = saved || "KPHB Branch";
    if (saved) setBranchName(saved);

    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    const dt = `${d}-${m}-${y}`;
    setSelectedDate(dt);
    fetchAvailableDoctors(activeB, dt);
  }, []);

  React.useEffect(() => {
    fetchAvailableDoctors(branchName, selectedDate);
  }, [branchName, selectedDate]);

  // Helper: Parse time to minutes
  const parseTimeToMin = (t: string): number => {
    const parts = t.trim().split(" ");
    if (parts.length < 2) return 600;
    const [hStr, mStr] = parts[0].split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const ap = parts[1].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const formatMinToTime = (min: number): string => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
  };

  // 15-Minute Slot Generation (Max 3 appointments per slot)
  const generatedSlots = React.useMemo((): GeneratedSlot[] => {
    if (!selectedDoctorObj) return [];
    const slots: GeneratedSlot[] = [];
    const ranges = selectedDoctorObj.slots || [];

    // Find if selected doctor has active no-show on this branch & date
    const doctorNoShow = activeNoShows.find(
      (ns) => ns.doctorId === selectedDoctorObj.doctorId || ns.doctorName === selectedDoctorObj.doctorName
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
        const startNoShow = parseTimeToMin(doctorNoShow.startTime);
        const endNoShow = parseTimeToMin(doctorNoShow.endTime);
        return curMin >= startNoShow && curMin < endNoShow;
      }
      return false;
    };

    if (ranges.length === 0) {
      for (let t = 600; t < 780; t += 15) {
        const isNoShow = checkIsSlotNoShow(t);
        slots.push({
          time: formatMinToTime(t),
          bookedCount: 0,
          maxCapacity: 3,
          isFull: isNoShow,
          isNoShow,
        });
      }
      for (let t = 960; t < 1140; t += 15) {
        const isNoShow = checkIsSlotNoShow(t);
        slots.push({
          time: formatMinToTime(t),
          bookedCount: 0,
          maxCapacity: 3,
          isFull: isNoShow,
          isNoShow,
        });
      }
      return slots;
    }

    ranges.forEach((r: any) => {
      const sMin = r.startHour
        ? parseTimeToMin(`${r.startHour}:${r.startMin} ${r.startAmPm}`)
        : parseTimeToMin(r.displayText?.split("-")[0] || "10:00 AM");
      const eMin = r.endHour
        ? parseTimeToMin(`${r.endHour}:${r.endMin} ${r.endAmPm}`)
        : parseTimeToMin(r.displayText?.split("-")[1] || "01:00 PM");

      for (let cur = sMin; cur < eMin; cur += 15) {
        const tStr = formatMinToTime(cur);
        if (!slots.some((s) => s.time === tStr)) {
          const isNoShow = checkIsSlotNoShow(cur);
          slots.push({
            time: tStr,
            bookedCount: 0,
            maxCapacity: 3,
            isFull: isNoShow,
            isNoShow,
          });
        }
      }
    });
    return slots;
  }, [selectedDoctorObj, activeNoShows]);

  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "1",
      patientName: "Venkatesh Rao",
      mrn: "SPH-2026-0842",
      phone: "+91 98480 23456",
      doctorName: "Dr. Ramesh Gupta",
      time: "10:00 AM",
      type: "Consultation",
      status: "CHECKED_IN",
    },
    {
      id: "2",
      patientName: "Ananya Sharma",
      mrn: "SPH-2026-0914",
      phone: "+91 97001 88442",
      doctorName: "Dr. Sneha Reddy",
      time: "10:30 AM",
      type: "Follow-up",
      status: "SCHEDULED",
    },
    {
      id: "3",
      patientName: "Mohammed Farooq",
      mrn: "SPH-2026-1022",
      phone: "+91 81255 44901",
      doctorName: "Dr. Ramesh Gupta",
      time: "11:00 AM",
      type: "Consultation",
      status: "SCHEDULED",
    },
    {
      id: "4",
      patientName: "Srilatha Devi",
      mrn: "SPH-2026-0789",
      phone: "+91 94401 55678",
      doctorName: "Dr. Sneha Reddy",
      time: "09:30 AM",
      type: "Follow-up",
      status: "COMPLETED",
    },
  ]);

  const handleCheckIn = (id: string) => {
    setAppointments((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: "CHECKED_IN" } : app))
    );
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !phone || !selectedDoctor || !selectedSlot) {
      alert("Please fill all required fields: Patient Name, Phone, Doctor, and Time Slot.");
      return;
    }

    const token = Math.floor(1000 + Math.random() * 9000);
    const newApp: Appointment = {
      id: String(Date.now()),
      patientName,
      mrn: `SPH-2026-${token}`,
      phone: phone.startsWith("+91") ? phone : `+91 ${phone}`,
      doctorName: selectedDoctor,
      time: selectedSlot,
      type: "Consultation",
      status: "SCHEDULED",
    };

    setAppointments([newApp, ...appointments]);
    setIsBookingOpen(false);
    setPatientName("");
    setDiseases("");
    setPhone("");
    setEmail("");
    setSelectedDoctor("");
    setSelectedSlot("");
  };

  const filtered = appointments.filter((app) => {
    const matchesSearch =
      app.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone.includes(searchQuery);

    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && app.status === statusFilter;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      <ReceptionSidebar activePage="appointments" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#268ec8]" />
                <h2 className="text-xl font-bold text-slate-900">Appointments</h2>
                <span className="bg-[#268ec8]/10 text-[#268ec8] font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {appointments.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {branchName} • Front desk patient check-in &amp; doctor appointment queue
              </p>
            </div>

            {/* Book Appointment Action Button */}
            <button
              onClick={() => setIsBookingOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, MRN or mobile number..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8] shadow-sm"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: "ALL", label: "All" },
                { id: "SCHEDULED", label: "Scheduled" },
                { id: "CHECKED_IN", label: "Checked-in" },
                { id: "COMPLETED", label: "Completed" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === tab.id
                      ? "bg-[#268ec8] text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Time</th>
                    <th className="px-6 py-3.5">Patient Details</th>
                    <th className="px-6 py-3.5">Doctor</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                        No appointments found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#268ec8]" />
                            <span>{app.time}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{app.patientName}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {app.mrn} • {app.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{app.doctorName}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {app.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {app.status === "CHECKED_IN" ? (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-[#268ec8]">
                              CHECKED IN
                            </span>
                          ) : app.status === "COMPLETED" ? (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              COMPLETED
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                              SCHEDULED
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {app.status === "SCHEDULED" ? (
                            <button
                              onClick={() => handleCheckIn(app.id)}
                              className="px-3 py-1.5 bg-[#268ec8] hover:bg-[#1f75a6] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                            >
                              Check In
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* BOOK APPOINTMENT MODAL (Matching mobile screen structure) */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f8fafc]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700">
                  <Calendar className="w-5 h-5 text-[#0284c7]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Book Appointment</h3>
              </div>
              <button
                onClick={() => setIsBookingOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200/60 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 space-y-6">
              {/* SECTION 1: Patient Details */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-full bg-[#0284c7] text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <h4 className="font-bold text-slate-900">Patient Details</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter patient's name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Diseases
                    </label>
                    <input
                      type="text"
                      placeholder="Enter diseases"
                      value={diseases}
                      onChange={(e) => setDiseases(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone (+91) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Marketing Source
                    </label>
                    <select
                      value={marketingSource}
                      onChange={(e) => setMarketingSource(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    >
                      <option value="">Select</option>
                      <option value="Google">Google Search / Maps</option>
                      <option value="Social Media">Social Media (Instagram / Facebook)</option>
                      <option value="Friend/Family">Friend / Referral</option>
                      <option value="Walk-in">Walk-in / Clinic Signboard</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mode of Consultation
                    </label>
                    <select
                      value={modeOfConsultation}
                      onChange={(e) => setModeOfConsultation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    >
                      <option value="In-Clinic">In-Clinic</option>
                      <option value="Video Consultation">Video Consultation</option>
                      <option value="Phone Consultation">Phone Consultation</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Appointment Information */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-full bg-[#0284c7] text-white flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <h4 className="font-bold text-slate-900">Appointment Information</h4>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Branch *
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold text-sm">
                    <Building2 className="w-4 h-4 text-[#0284c7]" />
                    <span>{branchName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 border-[#0284c7] bg-white text-slate-900 font-bold text-sm">
                    <Calendar className="w-4 h-4 text-[#0284c7]" />
                    <span>{selectedDate}</span>
                    <Calendar className="w-4 h-4 text-[#0284c7]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Doctor *
                  </label>
                  <select
                    required
                    value={selectedDoctor}
                    onChange={(e) => {
                      setSelectedDoctor(e.target.value);
                      const found = availableDoctors.find((d) => d.doctorName === e.target.value);
                      setSelectedDoctorObj(found || null);
                      setSelectedSlot("");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  >
                    <option value="">
                      {loadingDoctors
                        ? "Checking available doctors..."
                        : availableDoctors.length === 0
                        ? `No doctors scheduled at ${branchName} on this day`
                        : "Select Doctor"}
                    </option>
                    {availableDoctors.map((d) => {
                      const isFullDayOff = activeNoShows.some(
                        (ns) =>
                          (ns.doctorId === d.doctorId || ns.doctorName === d.doctorName) &&
                          ns.type === "FULL_DAY"
                      );
                      return (
                        <option key={d.doctorId} value={d.doctorName}>
                          {isFullDayOff ? "⛔ " : ""}{d.doctorName}
                          {isFullDayOff
                            ? " (Doctor No-Show - Unavailable)"
                            : d.slots && d.slots.length > 0
                            ? ` (${d.slots.map((s) => s.displayText).join(", ")})`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-2">
                    <Clock className="w-4 h-4 text-[#0284c7]" />
                    <span>Available 15-Minute Slots (Max 3/slot)</span>
                  </div>

                  {!selectedDoctorObj ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      <span>ℹ️</span>
                      <span>Please select a doctor and branch to check availability.</span>
                    </div>
                  ) : generatedSlots.length === 0 ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                      No consultation slots configured for this practitioner on this date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {generatedSlots.map((slot) => (
                        <button
                          type="button"
                          key={slot.time}
                          disabled={slot.isFull || slot.isNoShow}
                          onClick={() => !slot.isNoShow && setSelectedSlot(slot.time)}
                          className={`py-2 px-2.5 text-xs font-semibold rounded-lg border flex items-center justify-between transition-all ${
                            slot.isNoShow
                              ? "bg-rose-50/70 text-rose-500 border-rose-200 cursor-not-allowed opacity-80"
                              : slot.isFull
                              ? "bg-rose-50 text-rose-400 border-rose-200 cursor-not-allowed opacity-60"
                              : selectedSlot === slot.time
                              ? "bg-[#0284c7] text-white border-[#0284c7] shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span>{slot.time}</span>
                          {slot.isNoShow ? (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                              No-Show
                            </span>
                          ) : slot.isFull ? (
                            <span className="text-[10px] font-extrabold px-1 rounded bg-rose-500 text-white">Full</span>
                          ) : (
                            <span className={`text-[10px] ${selectedSlot === slot.time ? "text-sky-100" : "text-slate-400"}`}>
                              ({slot.bookedCount}/3)
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-2xl shadow-lg shadow-[#0284c7]/20 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <span>Confirm Appointment</span>
                </div>
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
