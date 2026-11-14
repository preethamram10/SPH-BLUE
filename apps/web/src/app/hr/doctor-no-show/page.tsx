"use client";

import React, { useState, useEffect } from "react";
import HRSidebar from "@/components/HRSidebar";
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
  Globe,
  ChevronDown,
} from "lucide-react";

interface DoctorOption {
  doctorId: string;
  doctorName: string;
  phone?: string;
  scheduledDays?: string[];
  scheduleSummary?: string;
  days?: Record<string, { isAvailable: boolean; slots: string[] }>;
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

export default function HRDoctorNoShowPage() {
  const [selectedFilterBranch, setSelectedFilterBranch] = useState<string>("ALL");
  const [branchesList, setBranchesList] = useState<string[]>([]);
  const [noShows, setNoShows] = useState<DoctorNoShowRecord[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [branchScope, setBranchScope] = useState<"SPECIFIC" | "ALL">("ALL");
  const [targetSpecificBranch, setTargetSpecificBranch] = useState<string>("KPHB Branch");
  const [dateRangeMode, setDateRangeMode] = useState<"SINGLE" | "RANGE">("SINGLE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noShowType, setNoShowType] = useState<"FULL_DAY" | "HALF_DAY" | "SPECIFIC_TIME">("FULL_DAY");
  const [halfDayType, setHalfDayType] = useState<"FIRST_HALF" | "SECOND_HALF">("FIRST_HALF");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("01:00 PM");
  const [reason, setReason] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getDayAbbrFromDate = (dStr: string) => {
    if (!dStr) return "";
    const parts = dStr.split("-");
    let dateObj: Date;
    if (parts.length === 3 && parts[0].length === 4) {
      dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else if (parts.length === 3 && parts[2].length === 4) {
      dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      dateObj = new Date(dStr);
    }
    if (isNaN(dateObj.getTime())) return "";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dateObj.getDay()];
  };

  const formatDateDDMMYYYY = (dStr: string) => {
    if (!dStr) return "";
    const parts = dStr.trim().split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  // Fetch branches from API
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);

    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const names: string[] = data.data.map((b: any) => b.name);
          setBranchesList(names);
          if (names.length > 0) {
            setTargetSpecificBranch(names[0]);
          }
        } else {
          const fallback = ["KPHB Branch", "Chandanagar Branch", "Dilsukhnagar Branch", "Nallagandla Branch"];
          setBranchesList(fallback);
          setTargetSpecificBranch(fallback[0]);
        }
      })
      .catch(() => {
        const fallback = ["KPHB Branch", "Chandanagar Branch", "Dilsukhnagar Branch", "Nallagandla Branch"];
        setBranchesList(fallback);
        setTargetSpecificBranch(fallback[0]);
      });
  }, []);

  // Load records and doctors whenever filter branch changes
  const loadData = async (branchFilter: string) => {
    try {
      setLoading(true);
      const url =
        branchFilter === "ALL"
          ? "/api/reception/doctor-no-show?branch=ALL"
          : `/api/reception/doctor-no-show?branch=${encodeURIComponent(branchFilter)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNoShows(data.noShows || []);
          setDoctorsList(data.doctors || []);
          if (data.doctors && data.doctors.length > 0 && !selectedDoctorId) {
            setSelectedDoctorId(data.doctors[0].doctorId);
          }
        }
      }
    } catch {
      showToast("Error loading doctor no-show records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedFilterBranch);
  }, [selectedFilterBranch]);

  const handleCreateNoShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      alert("Please select a doctor.");
      return;
    }
    const doc = doctorsList.find((d) => d.doctorId === selectedDoctorId);
    if (!doc) {
      alert("Selected doctor could not be found.");
      return;
    }

    try {
      setSaving(true);
      const targetBranch = branchScope === "ALL" ? "ALL" : targetSpecificBranch;
      const payload = {
        doctorId: doc.doctorId,
        doctorName: doc.doctorName,
        branch: targetBranch,
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
        showToast(
          `Doctor No-Show assigned to ${doc.doctorName} (${
            branchScope === "ALL" ? "All Branches" : targetSpecificBranch
          })!`
        );
        setIsModalOpen(false);
        setReason("");
        loadData(selectedFilterBranch);
      } else {
        alert(data.error || "Failed to assign doctor no-show");
      }
    } catch {
      alert("Network error while creating doctor no-show");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNoShow = async (id: string, doctorName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove the No-Show for ${doctorName}? Their appointment slots will be reactivated.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/reception/doctor-no-show?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`No-Show record removed for ${doctorName}`);
        setNoShows((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Failed to delete no-show record");
      }
    } catch {
      alert("Error deleting doctor no-show");
    }
  };

  const filteredNoShows = noShows.filter((item) => {
    const matchesSearch =
      item.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.branch.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "ALL" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const fullDayCount = noShows.filter((n) => n.type === "FULL_DAY").length;
  const halfDayCount = noShows.filter((n) => n.type === "HALF_DAY").length;
  const specificTimeCount = noShows.filter((n) => n.type === "SPECIFIC_TIME").length;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased overflow-hidden">
      {/* HR Sidebar */}
      <HRSidebar currentPath="/hr/doctor-no-show" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-200">
              <UserX className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                  HR Doctor No-Show Management
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Global / Multi-Branch
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Assign doctor leaves or blocked slots for a specific branch or all clinic branches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Branch Filter Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-600">Branch View:</span>
              <select
                value={selectedFilterBranch}
                onChange={(e) => setSelectedFilterBranch(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-900 focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">🌐 All Clinic Branches</option>
                {branchesList.map((b) => (
                  <option key={b} value={b}>
                    📍 {b}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (doctorsList.length > 0 && !selectedDoctorId) {
                  setSelectedDoctorId(doctorsList[0].doctorId);
                }
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Doctor No-Show</span>
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
          <div className="p-3.5 bg-gradient-to-r from-purple-50/80 to-sky-50/80 border border-purple-100 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">HR Multi-Branch Control:</span> You can assign a doctor
              as <strong>No-Show</strong> for a <strong className="text-purple-700">Specific Branch</strong> or for{" "}
              <strong className="text-purple-700">All Branches</strong> at once. When marked, their booking slots
              will be locked and marked <strong>Unavailable (Doctor No-Show)</strong> in both Web and Mobile booking
              calendars.
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="px-8 pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total No-Shows</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{noShows.length}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <UserX className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Full Day Leaves</p>
              <p className="text-xl font-black text-rose-600 mt-0.5">{fullDayCount}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Half Day Absences</p>
              <p className="text-xl font-black text-amber-600 mt-0.5">{halfDayCount}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Specific Hours</p>
              <p className="text-xl font-black text-sky-600 mt-0.5">{specificTimeCount}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto px-8 py-5 space-y-4">
          {/* Controls Bar: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by doctor, branch or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Type:</span>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="FULL_DAY">Full Day</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="SPECIFIC_TIME">Specific Time</option>
              </select>

              <button
                onClick={() => loadData(selectedFilterBranch)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                title="Refresh Records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                <span className="text-xs font-bold">Loading Doctor No-Show records...</span>
              </div>
            ) : filteredNoShows.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <UserX className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-600">No Doctor No-Show records found.</p>
                <p className="text-[11px] text-slate-400">
                  {selectedFilterBranch === "ALL"
                    ? "Doctors are currently available across all clinic branches."
                    : `No active no-show records recorded for ${selectedFilterBranch}.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Doctor Name</th>
                      <th className="py-3 px-4">Branch Scope</th>
                      <th className="py-3 px-4">Absence Type</th>
                      <th className="py-3 px-4">Date / Duration</th>
                      <th className="py-3 px-4">Time Window</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredNoShows.map((item) => {
                      const isGlobal =
                        item.branch.toUpperCase() === "ALL" || item.branch.toLowerCase() === "all branches";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[11px]">
                                {item.doctorName.charAt(0)}
                              </div>
                              <span className="font-bold text-slate-900">{item.doctorName}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {isGlobal ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                <Globe className="w-3 h-3" />
                                All Branches (Global)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Building2 className="w-3 h-3 text-purple-600" />
                                {item.branch}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {item.type === "FULL_DAY" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Full Day
                              </span>
                            )}
                            {item.type === "HALF_DAY" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Half Day ({item.halfDayType === "FIRST_HALF" ? "1st Half" : "2nd Half"})
                              </span>
                            )}
                            {item.type === "SPECIFIC_TIME" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                Specific Hours
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatDateDDMMYYYY(item.startDate)}</span>
                              {item.endDate && item.endDate !== item.startDate && (
                                <>
                                  <span className="text-slate-400 font-normal">to</span>
                                  <span>{formatDateDDMMYYYY(item.endDate)}</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {item.type === "FULL_DAY" ? (
                              <span className="text-slate-400 text-[11px]">All Day OPD Slots</span>
                            ) : item.type === "HALF_DAY" ? (
                              <span className="text-slate-600 font-bold">
                                {item.halfDayType === "FIRST_HALF"
                                  ? "10:00 AM – 02:00 PM"
                                  : "02:00 PM – 09:00 PM"}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 text-slate-700 font-bold">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {item.startTime} – {item.endTime}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-600 italic">
                              {item.reason || <span className="text-slate-400 not-italic">No reason given</span>}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteNoShow(item.id, item.doctorName)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center"
                              title="Delete / Cancel No-Show"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </main>
      </div>

      {/* ==================== ASSIGN NO-SHOW MODAL ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Assign Doctor No-Show
                  </h3>
                  <span className="text-[11px] text-purple-700 font-bold">
                    HR Central Portal
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
            <form onSubmit={handleCreateNoShow} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Branch Scope Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Clinic Branch Scope <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBranchScope("SPECIFIC")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                      branchScope === "SPECIFIC"
                        ? "border-purple-600 bg-purple-50 text-purple-800 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Specific Branch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBranchScope("ALL")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                      branchScope === "ALL"
                        ? "border-rose-500 bg-rose-50 text-rose-700 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>All Branches (Global)</span>
                  </button>
                </div>

                {/* If Specific Branch is picked, show branch dropdown */}
                {branchScope === "SPECIFIC" && (
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Choose Clinic Branch:
                    </label>
                    <select
                      value={targetSpecificBranch}
                      onChange={(e) => setTargetSpecificBranch(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                    >
                      {branchesList.map((b) => (
                        <option key={b} value={b}>
                          📍 {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Doctor Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Doctor <span className="text-rose-500">*</span>
                </label>
                {doctorsList.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
                    No doctor records available.
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => {
                        setSelectedDoctorId(e.target.value);
                        const doc = doctorsList.find((d) => d.doctorId === e.target.value);
                        const day = getDayAbbrFromDate(startDate);
                        if (doc?.days?.[day]?.slots?.[0]) {
                          const slotStr = doc.days[day].slots[0];
                          const parts = slotStr.split(/[-–—]|to/i);
                          if (parts.length === 2) {
                            setStartTime(parts[0].trim());
                            setEndTime(parts[1].trim());
                          }
                        }
                      }}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                    >
                      {doctorsList.map((doc) => (
                        <option key={doc.doctorId} value={doc.doctorId}>
                          {doc.doctorName}{" "}
                          {doc.scheduledDays && doc.scheduledDays.length > 0
                            ? `[${doc.scheduledDays.join(", ")}]`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {/* Active Doctor Schedule Badge */}
                    {(() => {
                      const doc = doctorsList.find((d) => d.doctorId === selectedDoctorId);
                      if (!doc) return null;
                      return (
                        <div className="mt-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Scheduled Days:</span>
                          <span className="font-bold text-purple-700">
                            {doc.scheduledDays && doc.scheduledDays.length > 0
                              ? doc.scheduledDays.join(", ")
                              : "All Days (General)"}
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Date Scope Mode: Single Day vs Date Range */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Date Selection</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDateRangeMode("SINGLE")}
                    className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                      dateRangeMode === "SINGLE"
                        ? "border-purple-600 bg-purple-50 text-purple-800"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    Single Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRangeMode("RANGE")}
                    className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                      dateRangeMode === "RANGE"
                        ? "border-purple-600 bg-purple-50 text-purple-800"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    Date Range (Multiple Days)
                  </button>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {dateRangeMode === "RANGE" ? "Start Date" : "Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (dateRangeMode === "SINGLE") {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>

                {dateRangeMode === "RANGE" ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Day of Week</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                      {getDayAbbrFromDate(startDate) || "Select a date"}
                    </div>
                  </div>
                )}
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Absence / No-Show Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoShowType("FULL_DAY")}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all ${
                      noShowType === "FULL_DAY"
                        ? "border-rose-500 bg-rose-50 text-rose-700 shadow-2xs"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    Full Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoShowType("HALF_DAY")}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all ${
                      noShowType === "HALF_DAY"
                        ? "border-amber-500 bg-amber-50 text-amber-800 shadow-2xs"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    Half Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoShowType("SPECIFIC_TIME")}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all ${
                      noShowType === "SPECIFIC_TIME"
                        ? "border-sky-500 bg-sky-50 text-sky-800 shadow-2xs"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    Specific Hours
                  </button>
                </div>
              </div>

              {/* Dynamic Half-Day Selection */}
              {noShowType === "HALF_DAY" && (
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-amber-900">Choose Half</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="radio"
                        name="halfDayType"
                        value="FIRST_HALF"
                        checked={halfDayType === "FIRST_HALF"}
                        onChange={() => setHalfDayType("FIRST_HALF")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div className="text-[11px]">
                        <span className="font-bold text-slate-800 block">First Half</span>
                        <span className="text-slate-500">10:00 AM – 02:00 PM</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="radio"
                        name="halfDayType"
                        value="SECOND_HALF"
                        checked={halfDayType === "SECOND_HALF"}
                        onChange={() => setHalfDayType("SECOND_HALF")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div className="text-[11px]">
                        <span className="font-bold text-slate-800 block">Second Half</span>
                        <span className="text-slate-500">02:00 PM – 09:00 PM</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Dynamic Specific Time Selection */}
              {noShowType === "SPECIFIC_TIME" && (
                <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-sky-900">Unavailable Time Window</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">From Time</span>
                      <input
                        type="text"
                        placeholder="e.g. 10:00 AM"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-sky-200 rounded-lg text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">To Time</span>
                      <input
                        type="text"
                        placeholder="e.g. 01:00 PM"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-sky-200 rounded-lg text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reason / Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Absence / No-Show <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Family emergency, conference, personal leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600 resize-none"
                />
              </div>

              {/* Footer Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white text-xs font-black shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Block Slots</span>
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
