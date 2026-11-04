"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  CalendarCheck,
  Search,
  Filter,
  Phone,
  Clock,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function AllFollowUpsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [statusFilter, setStatusFilter] = useState("All");

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const followUps = [
    {
      id: "FU-1021",
      patientName: "K. Ramesh Kumar",
      phone: "+91 9848012345",
      doctorName: "Dr. Prashanth k vaidya",
      branch: "KPHB Branch",
      scheduledDate: "Today, 04:30 PM",
      status: "Scheduled",
      notes: "Post 15-day chronic allergy review",
    },
    {
      id: "FU-1022",
      patientName: "M. Sunitha Devi",
      phone: "+91 9700123456",
      doctorName: "Dr. Padma priya",
      branch: "Chandanagar Branch",
      scheduledDate: "Tomorrow, 11:00 AM",
      status: "Confirmed",
      notes: "Migraine medication course refill",
    },
    {
      id: "FU-1023",
      patientName: "B. Venkatesh",
      phone: "+91 9988776655",
      doctorName: "Dr. Jobeadh parveej",
      branch: "Nallagandla Branch",
      scheduledDate: "08 Nov 2026, 05:00 PM",
      status: "Pending Call",
      notes: "Routine follow-up check call",
    },
    {
      id: "FU-1024",
      patientName: "P. Anitha",
      phone: "+91 9123456780",
      doctorName: "Dr. Ramakrishna Chanduri",
      branch: "Dilshuknagar Branch",
      scheduledDate: "Yesterday",
      status: "Missed",
      notes: "Did not pick up telecaller call",
    },
  ];

  const filteredFollowUps = followUps.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm) ||
      item.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === "All Branches" || item.branch === selectedBranch;
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/all-follow-ups" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">All Patient Follow-Ups</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Centralized hospital follow-up queue across all practitioner branches
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-[#0284c7]"
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending Call">Pending Call</option>
                <option value="Missed">Missed</option>
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
                    <th className="py-3 px-4">Patient Info</th>
                    <th className="py-3 px-4">Doctor & Branch</th>
                    <th className="py-3 px-4">Due Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Clinical Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredFollowUps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No follow-ups matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredFollowUps.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{item.patientName}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#0284c7]" />
                            <span>{item.phone}</span>
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{item.doctorName}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{item.branch}</span>
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{item.scheduledDate}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                              item.status === "Confirmed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.status === "Scheduled"
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : item.status === "Missed"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{item.notes}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button className="px-3 py-1 bg-sky-50 text-[#0284c7] border border-sky-200 rounded-lg text-xs font-bold hover:bg-sky-100 transition-colors">
                            Call / Log
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
      </main>
    </div>
  );
}

