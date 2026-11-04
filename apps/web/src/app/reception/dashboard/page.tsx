"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";

export default function ReceptionDashboardPage() {
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) setBranchName(saved);

    const today = new Date();
    setCurrentDate(
      today.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      {/* Static Left Sidebar */}
      <ReceptionSidebar activePage="dashboard" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">Reception Dashboard</h2>
                <span className="bg-[#a8ce3a]/20 text-[#268ec8] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#a8ce3a]/40">
                  Front Desk Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {branchName} • {currentDate}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/reception/appointments"
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
              >
                <Calendar className="w-3.5 h-3.5 text-[#268ec8]" />
                <span>View Appointments</span>
              </Link>

              <Link
                href="/reception/all-patients"
                className="flex items-center space-x-1.5 bg-[#268ec8] hover:bg-[#1f75a6] text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Patient</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Overview Stats */}
        <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Today's Appointments */}
            <Link
              href="/reception/appointments"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Appointments</p>
                <div className="w-8 h-8 rounded-lg bg-[#268ec8]/10 text-[#268ec8] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-[#268ec8]">12</p>
                <span className="text-xs text-slate-500 font-medium">4 Checked-in • 8 Upcoming</span>
              </div>
            </Link>

            {/* Card 2: All Patients */}
            <Link
              href="/reception/all-patients"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Patients</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-slate-800">148</p>
                <span className="text-xs text-emerald-600 font-semibold">+6 Registered this week</span>
              </div>
            </Link>

            {/* Card 3: Follow-ups */}
            <Link
              href="/reception/follow-ups"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Follow-ups</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-amber-600">8</p>
                <span className="text-xs text-slate-500 font-medium">Due for review today</span>
              </div>
            </Link>

            {/* Card 4: Branch Cleaning */}
            <Link
              href="/reception/branch-cleaning"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Cleaning</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-[#a8ce3a]">Done</p>
                <span className="text-xs text-emerald-600 font-semibold">Morning checklist verified</span>
              </div>
            </Link>
          </div>

          {/* Quick Reception Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/reception/appointments"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#268ec8] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#268ec8]/10 text-[#268ec8] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Appointments</h4>
                  <p className="text-xs text-slate-400">Manage daily clinic bookings</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#268ec8] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/reception/doctor-no-show"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-rose-400 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Doctor No-Show</h4>
                  <p className="text-xs text-slate-400">Leaves &amp; unavailable times</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/reception/all-patients"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#268ec8] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">All Patients List</h4>
                  <p className="text-xs text-slate-400">Search patient records &amp; MRN</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/reception/follow-ups"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#268ec8] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Follow-ups</h4>
                  <p className="text-xs text-slate-400">Call &amp; confirm follow-up visits</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/reception/branch-cleaning"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#268ec8] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#a8ce3a]/20 text-[#268ec8] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Branch Cleaning</h4>
                  <p className="text-xs text-slate-400">Housekeeping &amp; hygiene status</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#268ec8] group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
