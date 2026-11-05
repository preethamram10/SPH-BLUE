"use client";

import React, { useState, useEffect } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  UserX,
  Plus,
  Calendar,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Search,
  Filter,
  X,
  RefreshCw,
  Info,
} from "lucide-react";

interface DoctorOption {
  doctorId: string;
  doctorName: string;
  phone: string;
}

interface DoctorNoShowRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  branch: string;
  type: "FULL_DAY" | "HALF_DAY" | "SPECIFIC_TIME";
  startDate: string;
  endDate: string;
  halfDayType?: "FIRST_HALF" | "SECOND_HALF";
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt: string;
}

export default function DoctorNoShowPage() {
  const [branchName, setBranchName] = useState<string>("KPHB Branch");
  const [noShows, setNoShows] = useState<DoctorNoShowRecord[]>([]);
  const [branchDoctors, setBranchDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter / Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [dateRangeMode, setDateRangeMode] = useState<"SINGLE" | "RANGE">("SINGLE");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [noShowType, setNoShowType] = useState<"FULL_DAY" | "HALF_DAY" | "SPECIFIC_TIME">("FULL_DAY");
  const [halfDayType, setHalfDayType] = useState<"FIRST_HALF" | "SECOND_HALF">("FIRST_HALF");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("01:00 PM");
  const [reason, setReason] = useState("");

  const formatDateDDMMYYYY = (dStr: string) => {
    if (!dStr) return "";
    const parts = dStr.trim().split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  const loadData = async (activeBranch: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reception/doctor-no-show?branch=${encodeURIComponent(activeBranch)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNoShows(data.noShows || []);
          setBranchDoctors(data.doctors || []);
          if (data.doctors && data.doctors.length > 0 && !selectedDoctorId) {
            setSelectedDoctorId(data.doctors[0].doctorId);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage("Failed to load doctor no-show records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    const active = saved || "KPHB Branch";
    setBranchName(active);
    loadData(active);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateNoShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      alert("Please select a doctor.");
      return;
    }
    const doc = branchDoctors.find((d) => d.doctorId === selectedDoctorId);
    if (!doc) {
      alert("Selected doctor is not recognized for this branch.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        doctorId: doc.doctorId,
        doctorName: doc.doctorName,
        branch: branchName,
        type: noShowType,
        startDate,
        endDate: dateRangeMode === "RANGE" ? endDate : startDate,
        halfDayType: noShowType === "HALF_DAY" ? halfDayType : undefined,
        startTime: noShowType === "SPECIFIC_TIME" ? startTime : undefined,
        endTime: noShowType === "SPECIFIC_TIME" ? endTime : undefined,
        reason: reason.trim(),
      };

      const res = await fetch("/api/reception/doctor-no-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Doctor No-Show marked for ${doc.doctorName} successfully!`);
        setIsModalOpen(false);
        setReason("");
        loadData(branchName);
      } else {
        alert(data.error || "Failed to mark doctor no-show");
      }
    } catch {
      alert("Network error while creating doctor no-show");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNoShow = async (id: string, doctorName: string) => {
    if (!confirm(`Are you sure you want to remove the No-Show for ${doctorName}? Appointments can then be booked again.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/reception/doctor-no-show?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`No-Show removed for ${doctorName}`);
        setNoShows((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Failed to remove no-show record");
      }
    } catch {
      alert("Error deleting no-show record");
    }
  };

  const filteredNoShows = noShows.filter((item) => {
    const matchesSearch =
      item.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "ALL" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <ReceptionSidebar activePage="doctor-no-show" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                Doctor No-Show Management
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Set leaves, half days, or specific unavailable time slots for branch doctors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-[#268ec8]" />
              <span>{branchName}</span>
            </div>

            <button
              onClick={() => {
                if (branchDoctors.length > 0 && !selectedDoctorId) {
                  setSelectedDoctorId(branchDoctors[0].doctorId);
                }
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#268ec8] hover:bg-[#1f75a6] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Mark Doctor No-Show</span>
            </button>
          </div>
        </header>

        {/* Notification Toast */}
        {toastMessage && (
          <div className="mx-8 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-500 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Informational Callout */}
        <div className="px-8 pt-4">
          <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-[#268ec8] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Master Schedule Sync:</span> Only doctors assigned to{" "}
              <strong className="text-[#268ec8]">{branchName}</strong> under master doctor timings are eligible. When a doctor is marked as No-Show, their corresponding consultation slots in the <strong>Book Appointment</strong> screen will be locked and labeled as <strong>Unavailable (Doctor No-Show)</strong>.
            </div>
          </div>
        </div>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto px-8 py-5 space-y-5">
          {/* Controls Bar: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search doctor or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#268ec8]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Filter:</span>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All No-Show Types</option>
                <option value="FULL_DAY">Full Day</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="SPECIFIC_TIME">Particular Time Slot</option>
              </select>

              <button
                onClick={() => loadData(branchName)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Records Table / Cards */}
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs font-medium">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#268ec8] mb-2" />
              Loading doctor no-shows for {branchName}...
            </div>
          ) : filteredNoShows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                All Branch Doctors Available
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                No active or upcoming doctor no-shows found for {branchName}. All doctors are available according to their master schedule timings.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Mark Doctor No-Show</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5">Doctor Name</th>
                    <th className="py-3.5 px-4">Date / Range</th>
                    <th className="py-3.5 px-4">No-Show Type</th>
                    <th className="py-3.5 px-4">Time Impact</th>
                    <th className="py-3.5 px-4">Reason / Notes</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNoShows.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                            {item.doctorName.replace("Dr.", "").trim().charAt(0) || "D"}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 block text-xs">
                              {item.doctorName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {item.branch}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {item.startDate === item.endDate || !item.endDate
                              ? formatDateDDMMYYYY(item.startDate)
                              : `${formatDateDDMMYYYY(item.startDate)} to ${formatDateDDMMYYYY(item.endDate)}`}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.type === "FULL_DAY" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200">
                            FULL DAY
                          </span>
                        )}
                        {item.type === "HALF_DAY" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            HALF DAY ({item.halfDayType === "FIRST_HALF" ? "1st Half" : "2nd Half"})
                          </span>
                        )}
                        {item.type === "SPECIFIC_TIME" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            PARTICULAR TIME
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-600 text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {item.type === "FULL_DAY" && "All Day Unavailable"}
                            {item.type === "HALF_DAY" &&
                              (item.halfDayType === "FIRST_HALF"
                                ? "Morning Session (Until 02:00 PM)"
                                : "Evening Session (From 02:00 PM onwards)")}
                            {item.type === "SPECIFIC_TIME" &&
                              `${item.startTime || "10:00 AM"} - ${item.endTime || "01:00 PM"}`}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium max-w-xs truncate">
                        {item.reason || <span className="text-slate-300 italic">No notes</span>}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteNoShow(item.id, item.doctorName)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Revoke / Delete No-Show"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* CREATE NO-SHOW MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Mark Doctor No-Show
                  </h3>
                  <span className="text-[11px] text-[#268ec8] font-bold">
                    Target Branch: {branchName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNoShow} className="p-6 space-y-4">
              {/* Doctor Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Doctor (Available at {branchName}) <span className="text-rose-500">*</span>
                </label>
                {branchDoctors.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
                    No doctors found for this branch in master schedules.
                  </div>
                ) : (
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#268ec8]"
                  >
                    {branchDoctors.map((doc) => (
                      <option key={doc.doctorId} value={doc.doctorId}>
                        {doc.doctorName} {doc.phone ? `(${doc.phone})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date Selection: Single vs Range */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Date Configuration <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDateRangeMode("SINGLE")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        dateRangeMode === "SINGLE"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      Single Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateRangeMode("RANGE")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        dateRangeMode === "RANGE"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>

                {dateRangeMode === "SINGLE" ? (
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#268ec8]"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        From Date
                      </span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#268ec8]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        To Date
                      </span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#268ec8]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* No-Show Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No-Show Duration Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoShowType("FULL_DAY")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      noShowType === "FULL_DAY"
                        ? "border-rose-500 bg-rose-50/50 text-rose-800 shadow-sm"
                        : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-extrabold text-xs block">Full Day</span>
                    <span className="text-[10px] opacity-75">Entire day off</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoShowType("HALF_DAY")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      noShowType === "HALF_DAY"
                        ? "border-amber-500 bg-amber-50/50 text-amber-800 shadow-sm"
                        : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-extrabold text-xs block">Half Day</span>
                    <span className="text-[10px] opacity-75">1st or 2nd half</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoShowType("SPECIFIC_TIME")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      noShowType === "SPECIFIC_TIME"
                        ? "border-blue-500 bg-blue-50/50 text-blue-800 shadow-sm"
                        : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-extrabold text-xs block">Custom Time</span>
                    <span className="text-[10px] opacity-75">Specific hours</span>
                  </button>
                </div>
              </div>

              {/* Conditional options for Half Day */}
              {noShowType === "HALF_DAY" && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl">
                  <span className="text-xs font-bold text-amber-900 block mb-2">
                    Select Half Day Window:
                  </span>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="halfDay"
                        checked={halfDayType === "FIRST_HALF"}
                        onChange={() => setHalfDayType("FIRST_HALF")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>First Half (Morning to 02:00 PM)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer ml-3">
                      <input
                        type="radio"
                        name="halfDay"
                        checked={halfDayType === "SECOND_HALF"}
                        onChange={() => setHalfDayType("SECOND_HALF")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Second Half (02:00 PM onwards)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Conditional options for Specific Time */}
              {noShowType === "SPECIFIC_TIME" && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl">
                  <span className="text-xs font-bold text-blue-900 block mb-2">
                    Specify Unavailable Hours:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        From Time
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. 10:00 AM"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        To Time
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. 01:00 PM"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reason / Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reason / Notes (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Branch visit cancelled, Emergency medical conference, Personal leave"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#268ec8] resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || branchDoctors.length === 0}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm No-Show</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

