"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  UserCheck,
  Calendar,
  Building2,
  Clock,
  Download,
  Search,
  Filter,
} from "lucide-react";

export default function EmployeeAttendancePage() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedDate, setSelectedDate] = useState("Today (05 Nov 2026)");
  const [searchTerm, setSearchTerm] = useState("");

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const attendanceLogs = [
    {
      id: "ATT-01",
      name: "Dr. Prashanth k vaidya",
      role: "Doctor",
      branch: "KPHB Branch",
      inTime: "12:15 PM",
      outTime: "07:05 PM",
      workingHours: "6h 50m",
      status: "Present",
      compliance: "On Time",
    },
    {
      id: "ATT-02",
      name: "Anil Kumar M",
      role: "Staff Member",
      branch: "KPHB Branch",
      inTime: "09:58 AM",
      outTime: "08:32 PM",
      workingHours: "10h 34m",
      status: "Present",
      compliance: "On Time",
    },
    {
      id: "ATT-03",
      name: "Ashwini Begari",
      role: "Staff Member",
      branch: "Chandanagar Branch",
      inTime: "10:14 AM",
      outTime: "06:30 PM",
      workingHours: "8h 16m",
      status: "Present",
      compliance: "Late by 14m",
    },
    {
      id: "ATT-04",
      name: "Preetham Ram",
      role: "Staff Member",
      branch: "KPHB Branch",
      inTime: "—",
      outTime: "—",
      workingHours: "0h",
      status: "On Leave",
      compliance: "Approved",
    },
    {
      id: "ATT-05",
      name: "Nandini Gottelli",
      role: "Staff Member",
      branch: "Dilshuknagar Branch",
      inTime: "09:55 AM",
      outTime: "— (Active)",
      workingHours: "In Progress",
      status: "Present",
      compliance: "On Time",
    },
  ];

  const filteredLogs = attendanceLogs.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === "All Branches" || item.branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/employee-attendance" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Employee Attendance Report</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Daily clock-in/out logs, shift durations &amp; punctuality tracking
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

              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg shadow-xs transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Total Scheduled</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">18 Staff</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Present Today</p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">16 Present</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">On Approved Leave</p>
              <h3 className="text-xl font-extrabold text-sky-600 mt-1">2 Members</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Average Shift Time</p>
              <h3 className="text-xl font-extrabold text-slate-800 mt-1">9.2 hrs</h3>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role &amp; Branch</th>
                    <th className="py-3 px-4">Clock-In</th>
                    <th className="py-3 px-4">Clock-Out</th>
                    <th className="py-3 px-4">Work Duration</th>
                    <th className="py-3 px-4">Status &amp; Punctuality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{item.role}</span>
                        <p className="text-[11px] text-slate-400">{item.branch}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{item.inTime}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{item.outTime}</td>
                      <td className="py-3.5 px-4 font-bold text-[#0284c7]">{item.workingHours}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border mr-2 ${
                            item.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">{item.compliance}</span>
                      </td>
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

