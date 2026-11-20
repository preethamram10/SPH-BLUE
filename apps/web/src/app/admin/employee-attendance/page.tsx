"use client";

import React, { useState, useEffect, useMemo } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { formatToIST12Hour } from "@/utils/timeFormat";
import {
  UserCheck,
  Calendar,
  Building2,
  Clock,
  Download,
  Search,
  Filter,
  Camera,
  MapPin,
  AlertCircle,
  Eye,
  CheckCircle2,
  CalendarRange,
  Layers,
  User,
  ChevronRight,
  Info,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";

interface EmployeeOption {
  id: string;
  name: string;
  category: string;
  role: string;
  branch: string;
  shiftType: "SINGLE_STRICT" | "MULTI_STRICT";
  shiftHours?: string;
  dailyHours?: string;
  shift1Start?: string;
  shift2Start?: string;
}

export default function EmployeeAttendancePage() {
  // View mode: 'daily' = across all employees for selected date, 'full' = selected employee's full multi-shift attendance history
  const [viewMode, setViewMode] = useState<"daily" | "full">("daily");

  // Common filters
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Full Attendance state
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-11");
  const [fullAttendanceData, setFullAttendanceData] = useState<any | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const [fullStatusFilter, setFullStatusFilter] = useState<string>("ALL");

  // Modals
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; location?: string; time?: string } | null>(null);
  const [previewPunchesDay, setPreviewPunchesDay] = useState<any | null>(null);

  const [branches, setBranches] = useState<string[]>([
    "All Branches",
    "Kphb Branch",
    "Chandanagar Branch",
    "Nallagandla Branch",
    "Dilshuknagar Branch",
  ]);

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);

    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.branches) ? data.branches : [];
        if (list.length > 0) {
          const names: string[] = list.map((b: any) => (typeof b === "string" ? b.trim() : b.name?.trim())).filter(Boolean);
          if (names.length > 0) {
            setBranches(["All Branches", ...Array.from(new Set(names))]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Daily Attendance
  const fetchAttendance = async () => {
    if (!selectedDate) return;
    try {
      setLoading(true);
      const url = `/api/admin/attendance?branch=${encodeURIComponent(selectedBranch)}&date=${selectedDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records);
      }
      if (data.success && Array.isArray(data.employeesList)) {
        setEmployeesList(data.employeesList);
        if (!selectedStaffId && data.employeesList.length > 0) {
          setSelectedStaffId(data.employeesList[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedBranch, selectedDate]);

  // Fetch Full Attendance for Selected Employee
  const fetchFullAttendance = async (staffId: string, month: string) => {
    if (!staffId) return;
    try {
      setFullLoading(true);
      const url = `/api/admin/attendance?view=full&staffId=${encodeURIComponent(staffId)}&month=${encodeURIComponent(month)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFullAttendanceData(data);
      }
    } catch (err) {
      console.error("Failed to fetch full attendance:", err);
    } finally {
      setFullLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "full" && selectedStaffId) {
      fetchFullAttendance(selectedStaffId, selectedMonth);
    }
  }, [viewMode, selectedStaffId, selectedMonth]);

  // Switch to Full Attendance with pre-selected staff member
  const handleOpenFullAttendance = (staffId: string) => {
    setSelectedStaffId(staffId);
    setViewMode("full");
  };

  // Filtered employees for dropdown
  const filteredEmployees = useMemo(() => {
    return employeesList.filter((emp) => {
      const normSelected = selectedBranch.toLowerCase().replace(/\s+branch$/i, "").trim();
      const normItemBranch = (emp.branch || "").toLowerCase().replace(/\s+branch$/i, "").trim();
      const matchesBranch =
        selectedBranch === "All Branches" ||
        normItemBranch === normSelected ||
        normItemBranch.includes(normSelected) ||
        normSelected.includes(normItemBranch);
      return matchesBranch;
    });
  }, [employeesList, selectedBranch]);

  // Filter daily logs
  const filteredDailyLogs = records.filter((item) => {
    const matchesSearch =
      (item.staffName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.branch || "").toLowerCase().includes(searchTerm.toLowerCase());
    const normSelected = selectedBranch.toLowerCase().replace(/\s+branch$/i, "").trim();
    const normItemBranch = (item.branch || "").toLowerCase().replace(/\s+branch$/i, "").trim();
    const matchesBranch =
      selectedBranch === "All Branches" ||
      normItemBranch === normSelected ||
      normItemBranch.includes(normSelected) ||
      normSelected.includes(normItemBranch);
    return matchesSearch && matchesBranch;
  });

  // Filter full attendance logs
  const filteredFullLogs = useMemo(() => {
    if (!fullAttendanceData?.logs) return [];
    if (fullStatusFilter === "ALL") return fullAttendanceData.logs;
    return fullAttendanceData.logs.filter((l: any) => l.status === fullStatusFilter);
  }, [fullAttendanceData, fullStatusFilter]);

  const selectedEmployeeObj = useMemo(() => {
    return employeesList.find((e) => e.id === selectedStaffId) || fullAttendanceData?.employee;
  }, [employeesList, selectedStaffId, fullAttendanceData]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/employee-attendance" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header with View Mode Switcher */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-slate-900">
                    {viewMode === "daily" ? "Employee Daily Attendance Roster" : "Employee Full Attendance & Multi-Shift History"}
                  </h1>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {viewMode === "daily"
                      ? "Daily GPS & Selfie Punch Logs, branch reporting schedule & shift compliance"
                      : "Complete punch in & punch out log, split shift breakdown & monthly attendance metrics"}
                  </p>
                </div>
              </div>
            </div>

            {/* View Mode Switcher Tabs */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("daily")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "daily"
                      ? "bg-white text-[#0284c7] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Daily Roster
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("full");
                    if (!selectedStaffId && employeesList.length > 0) {
                      setSelectedStaffId(employeesList[0].id);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "full"
                      ? "bg-[#0284c7] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  Full Attendance (Multi-Shift)
                </button>
              </div>

              {/* Branch Filter */}
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Date / Month Filters */}
              {viewMode === "daily" ? (
                <>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                  />
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search staff..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 w-40 bg-white focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Month:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* VIEW 1: DAILY ATTENDANCE ROSTER                                           */}
        {/* ========================================================================= */}
        {viewMode === "daily" && (
          <div className="p-7 max-w-7xl space-y-6">
            {/* Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Total Scheduled Staff</p>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">{filteredDailyLogs.length} Staff</h3>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">On Time Present</p>
                <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
                  {filteredDailyLogs.filter((r) => r.status === "Present").length} Staff
                </h3>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Late Arrivals</p>
                <h3 className="text-xl font-extrabold text-amber-600 mt-1">
                  {filteredDailyLogs.filter((r) => r.status === "Late").length} Staff
                </h3>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Selected Date</p>
                <h3 className="text-base font-extrabold text-slate-800 mt-1">{selectedDate}</h3>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Report Time</th>
                      <th className="py-3 px-4">Shift Type</th>
                      <th className="py-3 px-4">Punch In (Selfie &amp; GPS)</th>
                      <th className="py-3 px-4">Punch Out (Selfie &amp; GPS)</th>
                      <th className="py-3 px-4">Working Hours</th>
                      <th className="py-3 px-4">Compliance</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-slate-400">Loading attendance data...</td>
                      </tr>
                    ) : filteredDailyLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400">
                          <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600">No attendance records for {selectedDate}.</p>
                          <p className="text-[11px] text-slate-400">Staff punches and reporting schedules will display here.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDailyLogs.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{item.staffName}</div>
                            {item.role && <div className="text-[10px] text-slate-400 font-normal">{item.role}</div>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">{item.branch}</span>
                          </td>

                          {/* Report Time */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span>{formatToIST12Hour(item.reportTime || item.shiftStartTime || "09:00 AM")}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">Scheduled IST</span>
                          </td>

                          {/* Shift Type Badge */}
                          <td className="py-3.5 px-4">
                            {item.shiftType === "MULTI_STRICT" ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Multi-Shift
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Single Shift
                              </span>
                            )}
                          </td>

                          {/* Punch In */}
                          <td className="py-3.5 px-4">
                            {item.shiftType === "MULTI_STRICT" || Boolean(item.shift2PunchInTime || item.shift2PunchOutTime || item.shift2Start) ? (
                              <div className="space-y-2">
                                {/* Shift 1 Login */}
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-100 text-sky-800 border border-sky-200">S1 In</span>
                                  {item.shift1PunchInTime || item.punchInTime ? (
                                    <div className="flex items-center gap-1.5">
                                      {(item.shift1PunchInPhoto || item.punchInPhoto) && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewPhoto({
                                              url: (item.shift1PunchInPhoto || item.punchInPhoto)!,
                                              title: `Shift 1 Login - ${item.staffName}`,
                                              location: item.shift1PunchInLocation || item.punchInLocation,
                                              time: item.shift1PunchInTime || item.punchInTime!,
                                            })
                                          }
                                          className="cursor-pointer"
                                          title="View Shift 1 Selfie"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={item.shift1PunchInPhoto || item.punchInPhoto}
                                            alt="S1 In"
                                            className="w-7 h-7 rounded-md object-cover border border-emerald-400 shadow-2xs"
                                          />
                                        </button>
                                      )}
                                      <span className="font-bold text-slate-800 text-xs">
                                        {formatToIST12Hour(item.shift1PunchInTime || item.punchInTime!)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">—</span>
                                  )}
                                </div>

                                {/* Shift 2 Login */}
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">S2 In</span>
                                  {item.shift2PunchInTime ? (
                                    <div className="flex items-center gap-1.5">
                                      {item.shift2PunchInPhoto && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewPhoto({
                                              url: item.shift2PunchInPhoto!,
                                              title: `Shift 2 Login - ${item.staffName}`,
                                              location: item.shift2PunchInLocation,
                                              time: item.shift2PunchInTime!,
                                            })
                                          }
                                          className="cursor-pointer"
                                          title="View Shift 2 Selfie"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={item.shift2PunchInPhoto}
                                            alt="S2 In"
                                            className="w-7 h-7 rounded-md object-cover border border-purple-400 shadow-2xs"
                                          />
                                        </button>
                                      )}
                                      <span className="font-bold text-purple-900 text-xs">
                                        {formatToIST12Hour(item.shift2PunchInTime)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">—</span>
                                  )}
                                </div>
                              </div>
                            ) : item.punchInTime ? (
                              <div className="flex items-center gap-2">
                                {item.punchInPhoto && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewPhoto({
                                        url: item.punchInPhoto,
                                        title: `Punch In Selfie - ${item.staffName}`,
                                        location: item.punchInLocation,
                                        time: item.punchInTime,
                                      })
                                    }
                                    className="relative group cursor-pointer"
                                    title="View Selfie"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={item.punchInPhoto}
                                      alt="In Selfie"
                                      className="w-8 h-8 rounded-lg object-cover border border-emerald-300 shadow-2xs"
                                    />
                                  </button>
                                )}
                                <div>
                                  <span className="font-bold text-slate-800">{formatToIST12Hour(item.punchInTime)}</span>
                                  {item.punchInLocation && (
                                    <p className="text-[10px] text-slate-400 max-w-[140px] truncate" title={item.punchInLocation}>
                                      📍 {item.punchInLocation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>

                          {/* Punch Out */}
                          <td className="py-3.5 px-4">
                            {item.shiftType === "MULTI_STRICT" || Boolean(item.shift2PunchInTime || item.shift2PunchOutTime || item.shift2Start) ? (
                              <div className="space-y-2">
                                {/* Shift 1 Logout */}
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-100 text-sky-800 border border-sky-200">S1 Out</span>
                                  {item.shift1PunchOutTime ? (
                                    <div className="flex items-center gap-1.5">
                                      {item.shift1PunchOutPhoto && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewPhoto({
                                              url: item.shift1PunchOutPhoto!,
                                              title: `Shift 1 Logout - ${item.staffName}`,
                                              location: item.shift1PunchOutLocation,
                                              time: item.shift1PunchOutTime!,
                                            })
                                          }
                                          className="cursor-pointer"
                                          title="View Shift 1 Exit Selfie"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={item.shift1PunchOutPhoto}
                                            alt="S1 Out"
                                            className="w-7 h-7 rounded-md object-cover border border-slate-300 shadow-2xs"
                                          />
                                        </button>
                                      )}
                                      <span className="font-bold text-slate-800 text-xs">
                                        {formatToIST12Hour(item.shift1PunchOutTime)}
                                      </span>
                                    </div>
                                  ) : (item.shift1PunchInTime || item.punchInTime) ? (
                                    <span className="text-amber-600 font-semibold text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      In Clinic
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">—</span>
                                  )}
                                </div>

                                {/* Shift 2 Logout */}
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">S2 Out</span>
                                  {item.shift2PunchOutTime ? (
                                    <div className="flex items-center gap-1.5">
                                      {item.shift2PunchOutPhoto && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewPhoto({
                                              url: item.shift2PunchOutPhoto!,
                                              title: `Shift 2 Logout - ${item.staffName}`,
                                              location: item.shift2PunchOutLocation,
                                              time: item.shift2PunchOutTime!,
                                            })
                                          }
                                          className="cursor-pointer"
                                          title="View Shift 2 Exit Selfie"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={item.shift2PunchOutPhoto}
                                            alt="S2 Out"
                                            className="w-7 h-7 rounded-md object-cover border border-purple-300 shadow-2xs"
                                          />
                                        </button>
                                      )}
                                      <span className="font-bold text-purple-900 text-xs">
                                        {formatToIST12Hour(item.shift2PunchOutTime)}
                                      </span>
                                    </div>
                                  ) : item.shift2PunchInTime ? (
                                    <span className="text-purple-600 font-semibold text-[10px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                      In Clinic
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">—</span>
                                  )}
                                </div>
                              </div>
                            ) : item.punchOutTime ? (
                              <div className="flex items-center gap-2">
                                {item.punchOutPhoto && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewPhoto({
                                        url: item.punchOutPhoto,
                                        title: `Punch Out Selfie - ${item.staffName}`,
                                        location: item.punchOutLocation,
                                        time: item.punchOutTime,
                                      })
                                    }
                                    className="relative group cursor-pointer"
                                    title="View Selfie"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={item.punchOutPhoto}
                                      alt="Out Selfie"
                                      className="w-8 h-8 rounded-lg object-cover border border-slate-300 shadow-2xs"
                                    />
                                  </button>
                                )}
                                <div>
                                  <span className="font-bold text-slate-800">{formatToIST12Hour(item.punchOutTime)}</span>
                                  {item.punchOutLocation && (
                                    <p className="text-[10px] text-slate-400 max-w-[140px] truncate" title={item.punchOutLocation}>
                                      📍 {item.punchOutLocation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : item.punchInTime ? (
                              <span className="text-amber-600 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Active Shift
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>

                          {/* Duration */}
                          <td className="py-3.5 px-4 font-bold text-[#0284c7]">
                            {item.workingHours || "In Progress"}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border mr-2 ${
                                item.status === "Present"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.status === "Late"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : item.status === "On Leave"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : item.status === "Absent"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-sky-50 text-sky-700 border-sky-200"
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.status === "Late" && item.lateMinutes ? (
                              <span className="text-[10px] text-amber-600 font-bold">
                                Late by {item.lateMinutes}m
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">On Time</span>
                            )}
                          </td>

                          {/* Full Attendance Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenFullAttendance(item.staffId)}
                              className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0284c7] font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer border border-sky-200 shadow-2xs"
                              title="View Full Multi-Shift Attendance History"
                            >
                              <span>Full History</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
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

        {/* ========================================================================= */}
        {/* VIEW 2: FULL ATTENDANCE & MULTI-SHIFT HISTORY                             */}
        {/* ========================================================================= */}
        {viewMode === "full" && (
          <div className="p-7 max-w-7xl space-y-6">
            {/* Staff Selector Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Select Staff Member
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white min-w-[260px] focus:outline-sky-500 shadow-2xs"
                  >
                    {filteredEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role} • {emp.branch}) {emp.shiftType === "MULTI_STRICT" ? "✦ Split Shift" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter Tabs */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Filter Status
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    {(["ALL", "Present", "Late", "Half Day", "On Leave", "Absent"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFullStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                          fullStatusFilter === st
                            ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Back to daily roster shortcut */}
              <button
                type="button"
                onClick={() => setViewMode("daily")}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Back to Daily Roster
              </button>
            </div>

            {/* Selected Employee Profile Header Card */}
            {selectedEmployeeObj && (
              <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 text-white rounded-3xl p-6 shadow-md border border-sky-700/50">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-extrabold text-xl text-sky-200 border border-white/20 shadow-inner">
                      {selectedEmployeeObj.name?.slice(0, 2).toUpperCase() || "SP"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-black tracking-tight">{selectedEmployeeObj.name}</h2>
                        {selectedEmployeeObj.shiftType === "MULTI_STRICT" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                            Multi-Shift / Split Shift
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-sky-500/30 text-sky-200 border border-sky-400/30">
                            Single Shift
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sky-200/80 mt-1">
                        Staff ID: <span className="font-mono font-bold text-white">{selectedEmployeeObj.id}</span> • Role:{" "}
                        <span className="font-bold text-white">{selectedEmployeeObj.role}</span> • Branch:{" "}
                        <span className="font-bold text-white">{selectedEmployeeObj.branch}</span>
                      </p>
                    </div>
                  </div>

                  {/* Shift Timing Details */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 text-xs space-y-1 min-w-[280px]">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-200">Scheduled Shift Configuration</div>
                    {selectedEmployeeObj.shiftType === "MULTI_STRICT" ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-white font-medium">
                          <span className="text-sky-200">Shift 1 (Morning):</span>
                          <span className="font-bold">{selectedEmployeeObj.shift1Start || "09:00 AM"} - {selectedEmployeeObj.shift1End || "01:00 PM"}</span>
                        </div>
                        <div className="flex justify-between items-center text-white font-medium">
                          <span className="text-sky-200">Shift 2 (Evening):</span>
                          <span className="font-bold">{selectedEmployeeObj.shift2Start || "04:30 PM"} - {selectedEmployeeObj.shift2End || "08:30 PM"}</span>
                        </div>
                        <div className="text-[10px] text-purple-200 pt-1 border-t border-white/10 flex justify-between">
                          <span>Target: {selectedEmployeeObj.dailyHours || "8 hrs/day"}</span>
                          <span>Grace: {selectedEmployeeObj.graceMinutes || 15} mins</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-white font-medium">
                          <span className="text-sky-200">Shift Hours:</span>
                          <span className="font-bold">{selectedEmployeeObj.shiftHours || "09:00 AM - 06:00 PM"}</span>
                        </div>
                        <div className="flex justify-between items-center text-white font-medium">
                          <span className="text-sky-200">Report Time:</span>
                          <span className="font-bold">{selectedEmployeeObj.shift1Start || "09:00 AM"}</span>
                        </div>
                        <div className="text-[10px] text-sky-200 pt-1 border-t border-white/10 flex justify-between">
                          <span>Target: {selectedEmployeeObj.dailyHours || "9 hrs/day"}</span>
                          <span>Grace: {selectedEmployeeObj.graceMinutes || 15} mins</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Analytics Cards */}
            {fullAttendanceData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs text-center">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase">Total Days</p>
                  <h3 className="text-lg font-extrabold text-slate-800 mt-1">{fullAttendanceData.summary.totalDays}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-emerald-100 bg-emerald-50/20 p-3.5 shadow-xs text-center">
                  <p className="text-[10px] font-extrabold text-emerald-600 uppercase">Present Days</p>
                  <h3 className="text-lg font-extrabold text-emerald-700 mt-1">{fullAttendanceData.summary.presentDays}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-amber-100 bg-amber-50/20 p-3.5 shadow-xs text-center">
                  <p className="text-[10px] font-extrabold text-amber-600 uppercase">Late Days</p>
                  <h3 className="text-lg font-extrabold text-amber-700 mt-1">{fullAttendanceData.summary.lateDays}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-sky-100 bg-sky-50/20 p-3.5 shadow-xs text-center">
                  <p className="text-[10px] font-extrabold text-[#0284c7] uppercase">Half Days</p>
                  <h3 className="text-lg font-extrabold text-sky-700 mt-1">{fullAttendanceData.summary.halfDays}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-purple-100 bg-purple-50/20 p-3.5 shadow-xs text-center">
                  <p className="text-[10px] font-extrabold text-purple-600 uppercase">On Leave</p>
                  <h3 className="text-lg font-extrabold text-purple-700 mt-1">{fullAttendanceData.summary.leaveDays}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-rose-100 bg-rose-50/20 p-3.5 shadow-xs text-center">
                  <p className="text-[10px] font-extrabold text-rose-600 uppercase">Absent Days</p>
                  <h3 className="text-lg font-extrabold text-rose-700 mt-1">{fullAttendanceData.summary.absentDays}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-indigo-100 bg-indigo-50/20 p-3.5 shadow-xs text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-extrabold text-indigo-600 uppercase">Hours Worked</p>
                  <h3 className="text-sm font-black text-indigo-700 mt-1.5 truncate" title={fullAttendanceData.summary.totalWorkingHours}>
                    {fullAttendanceData.summary.totalWorkingHours}
                  </h3>
                </div>
              </div>
            )}

            {/* Comprehensive Multi-Shift Daily Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0284c7]" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Detailed Punch Log &amp; Multi-Shift Records ({filteredFullLogs.length} Days)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">All punch times in IST (12-Hour format)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Date &amp; Day</th>
                      <th className="py-3 px-4">Shift Mode</th>
                      <th className="py-3 px-4">Shift 1 / Morning (In — Out)</th>
                      <th className="py-3 px-4">Shift 2 / Evening (In — Out)</th>
                      <th className="py-3 px-4 text-center">Total Punches</th>
                      <th className="py-3 px-4">Working Hours</th>
                      <th className="py-3 px-4 text-right">Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {fullLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          <Clock className="w-6 h-6 text-sky-500 animate-spin mx-auto mb-2" />
                          Loading full attendance records...
                        </td>
                      </tr>
                    ) : filteredFullLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600">No attendance entries found for this month.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredFullLogs.map((log: any) => (
                        <tr
                          key={log.date}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            log.isToday ? "bg-sky-50/40" : log.isSunday ? "bg-slate-50/30 text-slate-400" : ""
                          }`}
                        >
                          {/* Date & Day */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-800">{log.dayNum}</span>
                              <div>
                                <div className="text-[11px] font-bold text-slate-800">
                                  {log.monthShort} {log.dayName}
                                  {log.isToday && (
                                    <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9.5px] bg-[#0284c7] text-white font-extrabold">
                                      TODAY
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-normal">{log.date}</span>
                              </div>
                            </div>
                          </td>

                          {/* Shift Mode */}
                          <td className="py-3.5 px-4">
                            {log.shiftType === "MULTI_STRICT" ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                                Split Shift
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Single Shift
                              </span>
                            )}
                          </td>

                          {/* Shift 1 Details */}
                          <td className="py-3.5 px-4">
                            {log.shift1PunchInTime || log.punchInTime ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase w-7">In:</span>
                                  <span className="font-bold text-emerald-700">
                                    {formatToIST12Hour(log.shift1PunchInTime || log.punchInTime)}
                                  </span>
                                  {(log.shift1PunchInPhoto || log.punchInPhoto) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewPhoto({
                                          url: log.shift1PunchInPhoto || log.punchInPhoto,
                                          title: `Shift 1 In Selfie - ${log.date}`,
                                          location: log.shift1PunchInLocation || log.punchInLocation,
                                          time: formatToIST12Hour(log.shift1PunchInTime || log.punchInTime),
                                        })
                                      }
                                      className="cursor-pointer text-slate-400 hover:text-sky-600"
                                      title="View Punch In Selfie"
                                    >
                                      <Camera className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase w-7">Out:</span>
                                  {log.shift1PunchOutTime || (log.shiftType === "SINGLE_STRICT" && log.punchOutTime) ? (
                                    <>
                                      <span className="font-bold text-slate-700">
                                        {formatToIST12Hour(log.shift1PunchOutTime || log.punchOutTime)}
                                      </span>
                                      {(log.shift1PunchOutPhoto || log.punchOutPhoto) && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewPhoto({
                                              url: log.shift1PunchOutPhoto || log.punchOutPhoto,
                                              title: `Shift 1 Out Selfie - ${log.date}`,
                                              location: log.shift1PunchOutLocation || log.punchOutLocation,
                                              time: formatToIST12Hour(log.shift1PunchOutTime || log.punchOutTime),
                                            })
                                          }
                                          className="cursor-pointer text-slate-400 hover:text-sky-600"
                                          title="View Punch Out Selfie"
                                        >
                                          <Camera className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-amber-600 text-[10.5px] italic">Not Punched Out</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No punches</span>
                            )}
                          </td>

                          {/* Shift 2 Details */}
                          <td className="py-3.5 px-4">
                            {log.shiftType === "MULTI_STRICT" ? (
                              log.shift2PunchInTime ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase w-7">In:</span>
                                    <span className="font-bold text-emerald-700">
                                      {formatToIST12Hour(log.shift2PunchInTime)}
                                    </span>
                                    {log.shift2PunchInPhoto && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewPhoto({
                                            url: log.shift2PunchInPhoto,
                                            title: `Shift 2 In Selfie - ${log.date}`,
                                            location: log.shift2PunchInLocation,
                                            time: formatToIST12Hour(log.shift2PunchInTime),
                                          })
                                        }
                                        className="cursor-pointer text-slate-400 hover:text-sky-600"
                                        title="View Shift 2 Selfie"
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase w-7">Out:</span>
                                    {log.shift2PunchOutTime ? (
                                      <>
                                        <span className="font-bold text-slate-700">
                                          {formatToIST12Hour(log.shift2PunchOutTime)}
                                        </span>
                                        {log.shift2PunchOutPhoto && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setPreviewPhoto({
                                                url: log.shift2PunchOutPhoto,
                                                title: `Shift 2 Out Selfie - ${log.date}`,
                                                location: log.shift2PunchOutLocation,
                                                time: formatToIST12Hour(log.shift2PunchOutTime),
                                              })
                                            }
                                            className="cursor-pointer text-slate-400 hover:text-sky-600"
                                            title="View Shift 2 Selfie"
                                          >
                                            <Camera className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-amber-600 text-[10.5px] italic">Not Punched Out</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No Shift 2 Punches</span>
                              )
                            ) : (
                              <span className="text-slate-300 italic">N/A (Single Shift)</span>
                            )}
                          </td>

                          {/* Total Punches Log Modal Trigger */}
                          <td className="py-3.5 px-4 text-center">
                            {log.punches && log.punches.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setPreviewPunchesDay(log)}
                                className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-bold text-[10px] border border-slate-200 transition cursor-pointer"
                              >
                                {log.punches.length} Punches
                              </button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Working Hours */}
                          <td className="py-3.5 px-4 font-bold text-[#0284c7]">
                            {log.workingHours || "-"}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border inline-block ${
                                log.status === "Present"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : log.status === "Late"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : log.status === "Half Day"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : log.status === "On Leave"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : log.status === "Weekly Off"
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : log.status === "Absent"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}
                            >
                              {log.status}
                            </span>
                            {log.leaveType && (
                              <div className="text-[10px] text-purple-600 font-semibold mt-0.5">
                                {log.leaveType}
                              </div>
                            )}
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
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: SELFIE PREVIEW                                                   */}
      {/* ========================================================================= */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-1">{previewPhoto.title}</h4>
            {previewPhoto.time && (
              <p className="text-[11px] font-extrabold text-[#0284c7] mb-1">
                IST Time: {previewPhoto.time}
              </p>
            )}
            {previewPhoto.location && (
              <p className="text-xs text-slate-500 mb-3 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[260px]">{previewPhoto.location}</span>
              </p>
            )}

            <div className="w-64 h-64 mx-auto rounded-xl overflow-hidden border-2 border-slate-200 shadow-md mb-4 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewPhoto.url} alt="Selfie" className="w-full h-full object-cover" />
            </div>

            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FULL MICRO-PUNCHES AUDIT TRAIL FOR A DAY                         */}
      {/* ========================================================================= */}
      {previewPunchesDay && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">All Punches Audit Trail</h4>
                <p className="text-xs text-slate-500">{previewPunchesDay.date} ({previewPunchesDay.dayName})</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPunchesDay(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2.5">
              {previewPunchesDay.punches?.map((p: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {p.photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.photo} alt="Punch" className="w-10 h-10 rounded-lg object-cover border border-slate-300" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                        {p.type?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-800 text-xs">
                        {p.type === "in" ? "Punch In" : "Punch Out"} {p.shift ? `(${p.shift})` : ""}
                      </div>
                      <span className="text-[11px] font-black text-[#0284c7]">{formatToIST12Hour(p.time)}</span>
                      {p.location && (
                        <p className="text-[10px] text-slate-400 max-w-[200px] truncate">📍 {p.location}</p>
                      )}
                    </div>
                  </div>

                  {p.photo && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhoto({
                          url: p.photo,
                          title: `${p.type === "in" ? "Punch In" : "Punch Out"} Selfie`,
                          location: p.location,
                          time: formatToIST12Hour(p.time),
                        })
                      }
                      className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 text-right">
              <button
                type="button"
                onClick={() => setPreviewPunchesDay(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
