"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Briefcase,
  Calendar,
  Building2,
  Search,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";

export default function EmployeeDailyWorksPage() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [searchTerm, setSearchTerm] = useState("");

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const workReports = [
    {
      id: "WR-501",
      employee: "Anil Kumar M",
      role: "Reception Desk",
      branch: "KPHB Branch",
      tasksCompleted: "Checked in 28 patients, reconciled ₹24,800 day-end cash, filed 8 lab reports",
      callsMade: 34,
      casesRegistered: 6,
      submittedAt: "08:15 PM",
      rating: "Excellent",
    },
    {
      id: "WR-502",
      employee: "Ashwini Begari",
      role: "Reception Desk",
      branch: "Chandanagar Branch",
      tasksCompleted: "Managed consultation queue, dispensed 19 homeopathy remedy kits, confirmed 14 tomorrow visits",
      callsMade: 22,
      casesRegistered: 4,
      submittedAt: "06:20 PM",
      rating: "Good",
    },
    {
      id: "WR-503",
      employee: "Salman",
      role: "Telecalling Agent",
      branch: "Nallagandla Branch",
      tasksCompleted: "Contacted 68 chronic patient leads, converted 9 new consultation bookings for Dr. Jobeadh",
      callsMade: 68,
      casesRegistered: 9,
      submittedAt: "05:45 PM",
      rating: "Top Performer",
    },
  ];

  const filtered = workReports.filter((item) => {
    const matchesSearch =
      item.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === "All Branches" || item.branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/employee-daily-works" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Employee Daily Work Submissions</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Daily task logs, caller productivity &amp; end-of-day staff reports
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                />
              </div>

              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role &amp; Branch</th>
                    <th className="py-3 px-4">Calls / Leads</th>
                    <th className="py-3 px-4">New Bookings</th>
                    <th className="py-3 px-4">Key Tasks Completed</th>
                    <th className="py-3 px-4">Submission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{item.employee}</p>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {item.rating}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{item.role}</p>
                        <p className="text-[11px] text-slate-400">{item.branch}</p>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{item.callsMade} calls</td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-600">+{item.casesRegistered} patients</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">{item.tasksCompleted}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-500">{item.submittedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

