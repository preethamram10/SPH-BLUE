"use client";

import React from "react";
import { LogOut, Users, CalendarCheck, Clock, Award, FileCheck2, Target } from "lucide-react";
import Link from "next/link";

export default function HRDashboardPage() {
  const handleLogout = () => {
    localStorage.removeItem("user_role");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#a8ce3a] flex items-center justify-center text-white font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Spiritual Homeopathy</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              HR Operations Portal
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-rose-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-rose-200 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Welcome, HR Manager</h2>
          <p className="text-sm text-slate-500">Employee attendance, duty rosters, and leave approvals.</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">32</p>
            <span className="text-xs text-slate-500 font-medium">Doctors, Reception &amp; Support</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Present Today</p>
            <p className="text-2xl font-bold text-[#a8ce3a] mt-2">29</p>
            <span className="text-xs text-emerald-600 font-semibold">91% Attendance</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Leaves</p>
            <p className="text-2xl font-bold text-amber-500 mt-2">3</p>
            <span className="text-xs text-slate-500 font-medium">Awaiting approval</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Shifts</p>
            <p className="text-2xl font-bold text-[#268ec8] mt-2">2</p>
            <span className="text-xs text-slate-500 font-medium">Morning &amp; Evening OPD</span>
          </div>
        </div>

        {/* Medical Discount Approvals Action Card */}
        <div className="bg-gradient-to-r from-sky-600 to-[#0284c7] rounded-2xl p-6 text-white shadow-md mb-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <FileCheck2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Medical Discount Requests</h3>
              <p className="text-xs text-sky-100 mt-0.5">
                Review, accept, or decline prescription & medicine fee discounts requested by Reception
              </p>
            </div>
          </div>
          <Link
            href="/hr/medical-discounts"
            className="px-5 py-2.5 bg-white text-sky-700 hover:bg-sky-50 font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95"
          >
            Manage Discount Requests →
          </Link>
        </div>

        {/* Branch Cleaning & Sanitation Audits Action Card */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 text-white shadow-md mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Branch Cleaning &amp; Hygiene Audits</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Assign branch cleaning dates (DD-MM-YYYY), configure inspection areas, and review or approve uploaded photos
              </p>
            </div>
          </div>
          <Link
            href="/hr/branch-cleaning"
            className="px-5 py-2.5 bg-white text-teal-800 hover:bg-teal-50 font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95"
          >
            Manage Cleaning Audits →
          </Link>
        </div>

        {/* Branch Targets & KPIs Action Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-[#16a34a] rounded-2xl p-6 text-white shadow-md mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Branch Monthly Targets</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Set monthly branch revenue targets (1 time per month) &amp; monitor real-time collections
              </p>
            </div>
          </div>
          <Link
            href="/hr/target-management"
            className="px-5 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95"
          >
            Manage Branch Targets →
          </Link>
        </div>

        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#a8ce3a] flex items-center justify-center mx-auto mb-3">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-700">HR Dashboard Ready</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Ready to implement the full UI layout and staff management tables!
          </p>
        </div>
      </main>
    </div>
  );
}

