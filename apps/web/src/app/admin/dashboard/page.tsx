"use client";

import React, { useState, useEffect, useMemo } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Building2,
  Users,
  Search,
  IndianRupee,
  Clock,
  Calendar,
  RotateCcw,
  Phone,
  UserCheck,
  CalendarX,
  ArrowUpRight,
} from "lucide-react";

interface BranchStat {
  id: string;
  name: string;
  shortName: string;
  phone: string;
  address: string;
  timings: string;
  status: string;
  todayPatients: number;
  todayRevenue: number;
  presentStaff: number;
  leaveStaff: number;
  totalStaff: number;
}

interface TodayAttendanceItem {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  branch: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  workingHours: string;
  status: "Present" | "Late" | "Half Day" | "Absent" | "On Leave" | "In Clinic";
  punchInLocation?: string;
}

interface DashboardSummary {
  totalBranches: number;
  totalTodayPatients: number;
  totalTodayRevenue: number;
  totalPresentStaff: number;
  totalLeaveStaff: number;
  totalDoctors: number;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalBranches: 0,
    totalTodayPatients: 0,
    totalTodayRevenue: 0,
    totalPresentStaff: 0,
    totalLeaveStaff: 0,
    totalDoctors: 0,
  });
  const [branches, setBranches] = useState<BranchStat[]>([]);
  const [attendance, setAttendance] = useState<TodayAttendanceItem[]>([]);
  const [todayDateStr, setTodayDateStr] = useState<string>("");

  // Filters for Attendance Table
  const [searchStaff, setSearchStaff] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSummary(data.summary || {});
          setBranches(data.branchStats || []);
          setAttendance(data.todayAttendance || []);
          setTodayDateStr(data.todayStr || "");
        }
      }
    } catch (err) {
      console.warn("Failed to load live dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filtered Attendance List
  const filteredAttendance = useMemo(() => {
    return attendance.filter((item) => {
      // Search Query
      if (searchStaff.trim()) {
        const q = searchStaff.toLowerCase().trim();
        const matches =
          item.staffName.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q) ||
          item.branch.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Branch filter
      if (selectedBranch !== "all") {
        if (!item.branch.toLowerCase().includes(selectedBranch.toLowerCase())) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "in_clinic" && item.status !== "In Clinic") return false;
        if (selectedStatus === "present" && item.status !== "Present" && item.status !== "In Clinic") return false;
        if (selectedStatus === "late" && item.status !== "Late") return false;
        if (selectedStatus === "leave" && item.status !== "On Leave") return false;
        if (selectedStatus === "absent" && item.status !== "Absent") return false;
      }

      return true;
    });
  }, [attendance, searchStaff, selectedBranch, selectedStatus]);

  // Clean branch name helper
  const cleanBranch = (name: string) => {
    return (name || "")
      .replace(/Spiritual Homeopathy/gi, "")
      .replace(/Branch/gi, "")
      .replace(/Clinic/gi, "")
      .replace(/-/g, "")
      .trim() || name;
  };

  return (
    <div className="h-screen bg-[#f8fafc] flex overflow-hidden font-sans text-slate-800">
      {/* Unified Collapsible Sidebar */}
      <AdminSidebar currentPath="/admin/dashboard" />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Clinic Master Dashboard
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live Overview
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Multi-branch real-time operations, patient footfalls, and today&apos;s staff punch-in/out ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>{todayDateStr || "Today"}</span>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#0284c7] ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Branches */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Active Branches
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-slate-900">
                    {loading ? "..." : summary.totalBranches}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">All Live</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Today's Patients */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Today&apos;s Total Patients
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-slate-900">
                    {loading ? "..." : summary.totalTodayPatients}
                  </span>
                  <span className="text-[11px] font-bold text-sky-600">Consultations</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0284c7] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Today's Revenue */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Today&apos;s Total Revenue
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xs font-bold text-slate-400">₹</span>
                  <span className="text-2xl font-black text-slate-900">
                    {loading ? "..." : summary.totalTodayRevenue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Staff Present Today */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Staff On Duty Today
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-600">
                    {loading ? "..." : summary.totalPresentStaff}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Present</span>
                  {summary.totalLeaveStaff > 0 && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      {summary.totalLeaveStaff} on Leave
                    </span>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* 1. ALL BRANCH REAL-TIME OVERVIEW BOXES                           */}
          {/* =============================================================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>🏥</span>
                  <span>Branch-Wise Real-Time Operations</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Live metrics for each clinic branch: today&apos;s patients, revenue, active staff on duty, and approved leaves.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {branches.length} Registered Clinics
              </span>
            </div>

            {/* Branch Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-3"
                  >
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="h-14 bg-slate-100 rounded-xl"></div>
                      <div className="h-14 bg-slate-100 rounded-xl"></div>
                      <div className="h-14 bg-slate-100 rounded-xl"></div>
                      <div className="h-14 bg-slate-100 rounded-xl"></div>
                    </div>
                  </div>
                ))
              ) : branches.length === 0 ? (
                <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                  No active branches found. Add branches in Branch Management.
                </div>
              ) : (
                branches.map((b) => {
                  const isCurrentFilter = selectedBranch.toLowerCase() === b.shortName.toLowerCase();
                  return (
                    <div
                      key={b.id}
                      className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                        isCurrentFilter
                          ? "border-[#0284c7] ring-2 ring-[#0284c7]/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Branch Header */}
                      <div className="p-4 border-b border-slate-100/90 bg-slate-50/50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-black uppercase text-[#0284c7] tracking-wider block">
                              Clinic Branch
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                              {b.name}
                            </h4>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                            Active OPD
                          </span>
                        </div>

                        {/* Contact & Hours */}
                        <div className="mt-2.5 space-y-1 text-[11px] text-slate-600">
                          {b.phone && (
                            <div className="flex items-center gap-1.5 font-medium">
                              <Phone className="w-3 h-3 text-[#0284c7] shrink-0" />
                              <span>{b.phone}</span>
                            </div>
                          )}
                          {b.timings && (
                            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{b.timings}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4 Metric Boxes Inside Each Branch Card */}
                      <div className="p-4 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Box 1: Patients Today */}
                          <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-100 flex flex-col justify-between">
                            <span className="text-[9.5px] font-extrabold text-sky-700 uppercase tracking-wide">
                              Today Patients
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <Users className="w-3.5 h-3.5 text-[#0284c7]" />
                              <span className="text-lg font-black text-slate-900">
                                {b.todayPatients}
                              </span>
                            </div>
                          </div>

                          {/* Box 2: Revenue Today */}
                          <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-between">
                            <span className="text-[9.5px] font-extrabold text-emerald-700 uppercase tracking-wide">
                              Today Revenue
                            </span>
                            <div className="flex items-baseline gap-0.5 mt-1">
                              <span className="text-[11px] font-bold text-emerald-600">₹</span>
                              <span className="text-lg font-black text-slate-900 truncate">
                                {b.todayRevenue.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Box 3: Present Staff */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                            <span className="text-[9.5px] font-extrabold text-slate-600 uppercase tracking-wide">
                              Present Members
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              <span className="text-lg font-black text-slate-900">
                                {b.presentStaff}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                / {b.totalStaff}
                              </span>
                            </div>
                          </div>

                          {/* Box 4: Staff on Leave */}
                          <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 flex flex-col justify-between">
                            <span className="text-[9.5px] font-extrabold text-rose-700 uppercase tracking-wide">
                              Staff on Leave
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <CalendarX className="w-3.5 h-3.5 text-rose-600" />
                              <span className="text-lg font-black text-rose-900">
                                {b.leaveStaff}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Quick filter punch timings table below */}
                      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (isCurrentFilter) {
                              setSelectedBranch("all");
                            } else {
                              setSelectedBranch(b.shortName);
                            }
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold text-[#0284c7] hover:bg-sky-100/60 transition-colors cursor-pointer"
                        >
                          <span>{isCurrentFilter ? "Showing in Table Below ✓" : "View Punch Timings"}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* =============================================================== */}
          {/* 2. TODAY'S ALL BRANCHES STAFF PUNCH-IN & PUNCH-OUT TIMINGS     */}
          {/* =============================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden pt-1">
            {/* Table Header & Controls */}
            <div className="p-5 border-b border-slate-200/80 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>⏱️</span>
                    <span>Today&apos;s Staff Punch-In &amp; Punch-Out Timings</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    All branches biometric check-in log: actual punch-in and punch-out time recorded today.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {filteredAttendance.length} Records
                  </span>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search staff name or role..."
                    value={searchStaff}
                    onChange={(e) => setSearchStaff(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20"
                  />
                </div>

                {/* Branch Quick Pills */}
                <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedBranch("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedBranch === "all"
                        ? "bg-white text-[#0284c7] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Branches
                  </button>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBranch(b.shortName)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedBranch.toLowerCase() === b.shortName.toLowerCase()
                          ? "bg-white text-[#0284c7] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {b.shortName}
                    </button>
                  ))}
                </div>

                {/* Status Dropdown Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20"
                >
                  <option value="all">All Status</option>
                  <option value="in_clinic">In Clinic (Active)</option>
                  <option value="present">Present (Completed)</option>
                  <option value="late">Late Arrival</option>
                  <option value="leave">On Leave</option>
                  <option value="absent">Not Punched In</option>
                </select>

                {/* Reset Filters */}
                {(searchStaff || selectedBranch !== "all" || selectedStatus !== "all") && (
                  <button
                    onClick={() => {
                      setSearchStaff("");
                      setSelectedBranch("all");
                      setSelectedStatus("all");
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline px-2"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-[11px] font-bold text-slate-700 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">STAFF NAME</th>
                    <th className="px-6 py-3.5">BRANCH</th>
                    <th className="px-6 py-3.5">TODAY PUNCH IN</th>
                    <th className="px-6 py-3.5">TODAY PUNCH OUT</th>
                    <th className="px-6 py-3.5">SHIFT DURATION</th>
                    <th className="px-6 py-3.5 text-center">STATUS</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Loading today&apos;s punch records...
                      </td>
                    </tr>
                  ) : filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No staff punch records found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((item) => {
                      const isInClinic = item.status === "In Clinic";
                      const isLate = item.status === "Late";
                      const isOnLeave = item.status === "On Leave";
                      const isAbsent = item.status === "Absent";

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. STAFF NAME & ROLE */}
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-xs">
                                {item.staffName}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  item.role === "Doctor"
                                    ? "bg-slate-100 text-slate-800 border border-slate-300"
                                    : item.role === "HR Staff"
                                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                                    : "bg-sky-50 text-[#0284c7] border border-sky-200"
                                }`}
                              >
                                {item.role}
                              </span>
                            </div>
                            {item.punchInLocation && (
                              <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium">
                                📍 {item.punchInLocation}
                              </p>
                            )}
                          </td>

                          {/* 2. BRANCH */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="font-bold text-slate-800 text-xs">
                              {cleanBranch(item.branch)}
                            </span>
                          </td>

                          {/* 3. TODAY PUNCH IN */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            {item.punchInTime ? (
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                                <span className="text-emerald-500">▶</span>
                                <span>{item.punchInTime}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium text-xs">-</span>
                            )}
                          </td>

                          {/* 4. TODAY PUNCH OUT */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            {item.punchOutTime ? (
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                                <span className="text-rose-500">⏹</span>
                                <span>{item.punchOutTime}</span>
                              </div>
                            ) : isInClinic ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-extrabold border border-emerald-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>In Clinic Now</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium text-xs">-</span>
                            )}
                          </td>

                          {/* 5. SHIFT DURATION */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-700 text-xs">
                              {item.workingHours}
                            </span>
                          </td>

                          {/* 6. STATUS */}
                          <td className="px-6 py-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold ${
                                isInClinic
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : isLate
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : isOnLeave
                                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                                  : isAbsent
                                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isInClinic && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>}
                              <span>{item.status}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
