"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Sparkles,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Plus,
} from "lucide-react";

export default function BranchCleaningPage() {
  const [selectedBranch, setSelectedBranch] = useState("KPHB Branch");

  const branches = ["KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const checklists = [
    { area: "Reception & Waiting Lounge", status: "Cleaned & Inspected", time: "08:30 AM", staff: "Ramesh (Sanitation)", verified: true },
    { area: "Doctor Consultation Rooms 1 & 2", status: "Cleaned & Sanitized", time: "08:50 AM", staff: "Ramesh (Sanitation)", verified: true },
    { area: "Homeopathy Pharmacy & Dispense Counter", status: "Cleaned & Inspected", time: "09:10 AM", staff: "Ramesh (Sanitation)", verified: true },
    { area: "Restrooms & Handwash Stations", status: "Cleaned", time: "09:30 AM", staff: "Laxmi (Housekeeping)", verified: true },
    { area: "Waste Disposal & Biomedical Bin Clearance", status: "Pending Inspection", time: "Scheduled 01:00 PM", staff: "Laxmi (Housekeeping)", verified: false },
    { area: "Evening Dusting & Floor Mopping", status: "Scheduled", time: "Scheduled 07:30 PM", staff: "Ramesh (Sanitation)", verified: false },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/branch-cleaning" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Branch Cleaning &amp; Sanitation</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Hygiene checklists, sanitization audits &amp; daily housekeeping logs
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg shadow-xs transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>Log Sanitation Audit</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-7 space-y-6 max-w-5xl">
          {/* Status summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase">Hygiene Compliance</p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">92% Met</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Daily checklist completion</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase">Last Sanitization</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">09:30 AM</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Verified by Reception Admin</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase">Pending Audits</p>
              <h3 className="text-xl font-extrabold text-amber-600 mt-1">2 Checks</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Afternoon &amp; night shift</p>
            </div>
          </div>

          {/* Checklist Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Today&apos;s Sanitation Audit — {selectedBranch}
            </h3>

            <div className="space-y-3">
              {checklists.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        c.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.verified ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{c.area}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Staff: {c.staff}</span>
                        <span>•</span>
                        <span>{c.time}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                      c.verified
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

