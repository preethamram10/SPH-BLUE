"use client";

import React, { useState, useEffect, useMemo } from "react";
import HRSidebar from "@/components/HRSidebar";
import Link from "next/link";
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
  Target,
  FileCheck2,
  Sparkles,
  DollarSign,
  ChevronRight,
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

export default function HRDashboardPage() {
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
      console.warn("Failed to load live dashboard stats for HR:", err);
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
        if (selectedStatus === "Present" && item.status !== "Present" && item.status !== "In Clinic") {
          return false;
        }
        if (selectedStatus === "Late" && item.status !== "Late") {
          return false;
        }
        if (selectedStatus === "Leave" && item.status !== "On Leave" && item.status !== "Absent") {
          return false;
        }
      }

      return true;
    });
  }, [attendance, searchStaff, selectedBranch, selectedStatus]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* Dedicated Synchronized HR Sidebar */}
      <HRSidebar currentPath="/hr/dashboard" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Navbar Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Clinic Master Dashboard
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                HR Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live Overview
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Multi-branch real-time operations, staff attendance ledger &amp; patient footfalls.
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
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
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
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      {summary.totalLeaveStaff} Leave
                    </span>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-lime-50 text-lime-700 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick Operations Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            <Link
              href="/hr/employee-management"
              className="bg-white p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-purple-700">Staff Mgmt</p>
                <p className="text-[10px] text-slate-400 truncate">Directory &amp; Roles</p>
              </div>
            </Link>

            <Link
              href="/hr/doctor-timings"
              className="bg-white p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-xs transition group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-sky-700">Doctor Timings</p>
                <p className="text-[10px] text-slate-400 truncate">OPD Rosters</p>
              </div>
            </Link>

            <Link
              href="/hr/total-revenue"
              className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700">Total Revenue</p>
                <p className="text-[10px] text-slate-400 truncate">Filters &amp; Ledger</p>
              </div>
            </Link>

            <Link
              href="/hr/target-management"
              className="bg-white p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-xs transition group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-700">Targets</p>
                <p className="text-[10px] text-slate-400 truncate">Monthly Goals</p>
              </div>
            </Link>

            <Link
              href="/hr/leave-requests"
              className="bg-white p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-xs transition group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                <CalendarX className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-rose-700">Leaves</p>
                <p className="text-[10px] text-slate-400 truncate">Approvals</p>
              </div>
            </Link>

            <Link
              href="/hr/branch-management"
              className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-700">Branches</p>
                <p className="text-[10px] text-slate-400 truncate">Operations</p>
              </div>
            </Link>
          </div>

          {/* Section 1: Branch-Wise Real-Time Operations */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Branch-Wise Real-Time Operations
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live snapshot of OPD footfalls, collections, and on-duty doctors &amp; staff.
                </p>
              </div>
              <Link
                href="/hr/branch-management"
                className="text-xs font-bold text-[#0284c7] hover:underline flex items-center gap-1"
              >
                <span>Manage Branches</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-xs hover:border-slate-300 transition space-y-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {b.shortName}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 mt-1">{b.name}</h4>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[9.5px] font-bold text-slate-400 uppercase">Patients</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {b.todayPatients}{" "}
                        <span className="text-[10px] font-semibold text-slate-400">today</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[9.5px] font-bold text-slate-400 uppercase">Revenue</p>
                      <p className="text-base font-black text-emerald-700 mt-0.5">
                        ₹{b.todayRevenue.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">Staff Attendance:</span>
                      <span className="font-bold text-slate-900">
                        <span className="text-emerald-600">{b.presentStaff} Present</span>
                        {b.leaveStaff > 0 && (
                          <span className="text-rose-600 ml-1">/ {b.leaveStaff} Leave</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{b.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Today's Staff Punch-In & Punch-Out Timings */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0284c7]" />
                  Today&apos;s Staff Punch-In &amp; Punch-Out Timings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live daily attendance ledger, punctuality status, and clinic shift hours.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchStaff}
                    onChange={(e) => setSearchStaff(e.target.value)}
                    placeholder="Search staff..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0284c7] w-40"
                  />
                </div>

                {/* Branch Dropdown */}
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  <option value="KPHB">KPHB Main</option>
                  <option value="Chandanagar">Chandanagar</option>
                  <option value="Dilsukhnagar">Dilsukhnagar</option>
                  <option value="Nallagandla">Nallagandla</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="Present">Present Today</option>
                  <option value="Late">Late Arrival</option>
                  <option value="Leave">On Leave / Absent</option>
                </select>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Staff Member</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Branch</th>
                    <th className="py-2.5 px-4">Punch In</th>
                    <th className="py-2.5 px-4">Punch Out</th>
                    <th className="py-2.5 px-4">Working Hours</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-4">
                          <div className="font-extrabold text-slate-900">{item.staffName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{item.staffId}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 font-medium">{item.role}</td>
                        <td className="py-2.5 px-4 text-slate-700 font-semibold">{item.branch}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                          {item.punchInTime || <span className="text-slate-400 font-normal">--:--</span>}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                          {item.punchOutTime || <span className="text-slate-400 font-normal">--:--</span>}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-600">
                          {item.workingHours || "--"}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${item.status === "Present" || item.status === "In Clinic"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : item.status === "Late"
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No staff attendance records matched the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
