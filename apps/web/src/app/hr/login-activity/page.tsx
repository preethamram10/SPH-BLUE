"use client";

import React, { useState, useEffect, useMemo } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  History,
  Search,
  Calendar,
  Building2,
  Clock,
  Phone,
  RefreshCw,
  Smartphone,
  Globe,
  Filter,
  CheckCircle2,
  Radio,
  ArrowRight,
  ShieldCheck,
  User,
  Activity,
  X,
  ChevronRight,
  Info,
} from "lucide-react";

export default function HRLoginActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("TARGETED"); // TARGETED = Reception, Staff, HR
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [currentIstTime, setCurrentIstTime] = useState("");

  // Live 12-Hour IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istStr = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);
      setCurrentIstTime(istStr);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRole && selectedRole !== "ALL") params.append("role", selectedRole);
      if (selectedPlatform && selectedPlatform !== "ALL") params.append("platform", selectedPlatform);
      if (selectedBranch && selectedBranch !== "ALL") params.append("branch", selectedBranch);
      if (selectedStatus && selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (selectedDate) params.append("date", selectedDate);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/auth/login-activity?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.activities)) {
        setActivities(data.activities);
      }
    } catch (err) {
      console.error("Failed to load HR login activities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Auto-refresh every 15 seconds for live activity monitoring
    const pollInterval = setInterval(() => {
      fetchActivities();
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [selectedRole, selectedPlatform, selectedBranch, selectedStatus, selectedDate]);

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const names: string[] = data.data.map((b: any) => b.name?.trim()).filter(Boolean);
          if (names.length > 0) setAvailableBranches(names);
        }
      })
      .catch(() => {});
  }, []);

  // Filtered in memory for debounced search
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase().trim();
    return activities.filter(
      (a) =>
        (a.userName || "").toLowerCase().includes(q) ||
        (a.phone || "").includes(q) ||
        (a.branchName || "").toLowerCase().includes(q) ||
        (a.userRole || "").toLowerCase().includes(q) ||
        (a.platform || "").toLowerCase().includes(q) ||
        (a.loginTimeIst || "").toLowerCase().includes(q) ||
        (a.logoutTimeIst || "").toLowerCase().includes(q)
    );
  }, [activities, searchQuery]);

  // Metrics
  const activeNowCount = useMemo(
    () => activities.filter((a) => a.status === "ACTIVE").length,
    [activities]
  );
  const receptionCount = useMemo(
    () => activities.filter((a) => a.userRole === "RECEPTION").length,
    [activities]
  );
  const staffAppCount = useMemo(
    () => activities.filter((a) => a.userRole === "STAFF" || a.platform === "STAFF_APP").length,
    [activities]
  );
  const hrCount = useMemo(
    () => activities.filter((a) => a.userRole === "HR").length,
    [activities]
  );

  const getRoleBadge = (role: string) => {
    const r = (role || "").toUpperCase();
    if (r === "RECEPTION") {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }
    if (r === "STAFF") {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (r === "HR") {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (r === "ADMIN") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getPlatformBadge = (platform: string) => {
    if (platform === "STAFF_APP") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Smartphone className="w-3 h-3 text-indigo-500" /> Staff App
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <Globe className="w-3 h-3 text-blue-500" /> Web Portal
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/login-activity" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Staff Login &amp; Logout Activity
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  IST 12-Hour
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Live IST: <span className="font-bold text-slate-700">{currentIstTime || "Connecting..."}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchActivities}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 space-y-5 flex-1">
          {/* Top 4 KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Sessions Now
                </span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">{activeNowCount}</span>
                <span className="text-xs text-slate-400 font-semibold">Currently Logged In</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Reception Desk
                </span>
                <div className="w-6 h-6 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                  <Globe className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-sky-700">{receptionCount}</span>
                <span className="text-xs text-slate-400 font-semibold">Web &amp; App Sessions</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Staff Mobile App
                </span>
                <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-700">{staffAppCount}</span>
                <span className="text-xs text-slate-400 font-semibold">Clinic Staff Users</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  HR Portal
                </span>
                <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-700">{hrCount}</span>
                <span className="text-xs text-slate-400 font-semibold">HR Team Access</span>
              </div>
            </div>
          </div>

          {/* Role Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedRole("TARGETED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedRole === "TARGETED"
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                All (Reception, Staff &amp; HR)
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole("RECEPTION")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedRole === "RECEPTION"
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Reception
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole("STAFF")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedRole === "STAFF"
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Staff App
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole("HR")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedRole === "HR"
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                HR
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedRole === "ALL"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                All Roles
              </button>
            </div>

            {/* Platform & Status dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              >
                <option value="ALL">All Branches</option>
                {availableBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              >
                <option value="ALL">All Platforms</option>
                <option value="WEB">Web Browser</option>
                <option value="STAFF_APP">Staff Mobile App</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Now</option>
                <option value="LOGGED_OUT">Logged Out</option>
              </select>
            </div>
          </div>

          {/* Search bar & Live Info note */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff name, phone, branch, or time..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7] bg-white shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] font-bold text-amber-900">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Timestamps are strictly recorded and rendered in 12-Hour IST (AM/PM)</span>
            </div>
          </div>

          {/* Activity Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff / User</th>
                    <th className="py-3 px-4">Role &amp; Branch</th>
                    <th className="py-3 px-4">Platform / Client</th>
                    <th className="py-3 px-4">Login Time (12-hr IST)</th>
                    <th className="py-3 px-4">Logout Time (12-hr IST)</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading && filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        Loading login activities...
                      </td>
                    </tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center space-y-2">
                        <History className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-700">No login activity records found</p>
                        <p className="text-slate-400 text-[11px]">
                          Try adjusting your role or branch filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act) => {
                      const isActive = act.status === "ACTIVE";

                      return (
                        <tr
                          key={act.id}
                          onClick={() => setSelectedItem(act)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          {/* User */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                {act.userName ? act.userName.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 truncate">
                                  {act.userName || "Staff Member"}
                                </p>
                                {act.phone && (
                                  <p className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-2.5 h-2.5" /> +91 {act.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role & Branch */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getRoleBadge(
                                  act.userRole
                                )}`}
                              >
                                {act.userRole}
                              </span>
                              <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{act.branchName || "KPHB Branch"}</span>
                              </div>
                            </div>
                          </td>

                          {/* Platform */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {getPlatformBadge(act.platform)}
                              {act.ipAddress && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  IP: {act.ipAddress}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Login Time */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-slate-800 text-[11.5px] flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                                {act.loginTimeIst}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded inline-block">
                                IST 12-hr
                              </span>
                            </div>
                          </td>

                          {/* Logout Time */}
                          <td className="py-3 px-4">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Now
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-700 text-[11.5px] flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  {act.logoutTimeIst || "—"}
                                </span>
                                {act.logoutTimeIst && (
                                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.2 rounded inline-block">
                                    IST 12-hr
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Duration */}
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs font-extrabold ${
                                isActive ? "text-emerald-600" : "text-slate-600"
                              }`}
                            >
                              {act.duration || "—"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                Logged Out
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-800">{filteredActivities.length}</strong> activity logs
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Sorted by latest session first • Times converted to Asia/Kolkata (IST)
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* Details Slideover Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Session Audit Detail</h3>
                  <p className="text-[11px] text-slate-500">ID: {selectedItem.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Staff Name</span>
                  <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedItem.userName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Role</span>
                  <p className="mt-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getRoleBadge(
                        selectedItem.userRole
                      )}`}
                    >
                      {selectedItem.userRole}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                  <p className="font-bold text-slate-700 mt-0.5">{selectedItem.phone || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Branch</span>
                  <p className="font-bold text-slate-700 mt-0.5">{selectedItem.branchName || "—"}</p>
                </div>
              </div>

              {/* Time Details strictly in 12-hour IST */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                  Session Timestamps (12-Hour IST)
                </h4>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800">Login Time (IST):</span>
                    <span className="text-xs font-black text-emerald-900">{selectedItem.loginTimeIst}</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-mono">ISO: {selectedItem.loginTimeIso}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">Logout Time (IST):</span>
                    <span className="text-xs font-black text-slate-900">
                      {selectedItem.logoutTimeIst || "Active Session (Not Logged Out Yet)"}
                    </span>
                  </div>
                  {selectedItem.logoutTimeIso && (
                    <p className="text-[10px] text-slate-400 font-mono">ISO: {selectedItem.logoutTimeIso}</p>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                  <span className="text-[11px] font-bold text-sky-800">Total Duration:</span>
                  <span className="text-xs font-black text-sky-900">{selectedItem.duration || "—"}</span>
                </div>
              </div>

              {/* Client info */}
              <div className="border-t border-slate-100 pt-3 space-y-1 text-slate-600">
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Platform:</span>
                  <span className="font-bold">{selectedItem.platform}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Client / Device:</span>
                  <span className="font-mono text-[11px]">{selectedItem.deviceInfo || "—"}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono text-[11px]">{selectedItem.ipAddress || "—"}</span>
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
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
