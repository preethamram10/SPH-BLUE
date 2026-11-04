"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Crown,
  Search,
  Plus,
  Calendar,
  Building2,
  Clock,
  Phone,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export default function PackageMembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const members = [
    {
      id: "PKG-201",
      patientName: "M. Rajeshwar Rao",
      phone: "+91 9848011223",
      branch: "KPHB Branch",
      packageName: "Annual Family Chronic Care Plan",
      duration: "12 Months (Valid till Oct 2027)",
      totalAmount: "₹24,000",
      paidAmount: "₹24,000",
      remainingVisits: "9 of 12 visits left",
      status: "Active",
    },
    {
      id: "PKG-202",
      patientName: "S. Swathi",
      phone: "+91 9700334455",
      branch: "Chandanagar Branch",
      packageName: "6-Month Skin & Allergy Remedy Package",
      duration: "6 Months (Valid till Apr 2027)",
      totalAmount: "₹14,500",
      paidAmount: "₹10,000 (₹4.5k Due)",
      remainingVisits: "4 of 6 visits left",
      status: "Active",
    },
    {
      id: "PKG-203",
      patientName: "K. Hariprasad",
      phone: "+91 9911223344",
      branch: "Nallagandla Branch",
      packageName: "Hair Fall & Scalp Renewal Course",
      duration: "3 Months (Expired Oct 2026)",
      totalAmount: "₹8,000",
      paidAmount: "₹8,000",
      remainingVisits: "0 left",
      status: "Expired",
    },
  ];

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === "All Branches" || m.branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/package-members" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Crown className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Package Members &amp; Subscriptions</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Active long-term treatment packages, chronic care enrollments &amp; renewals
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search member or package..."
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
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll Member</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Package &amp; Validity</th>
                    <th className="py-3 px-4">Clinic Branch</th>
                    <th className="py-3 px-4">Fees &amp; Dues</th>
                    <th className="py-3 px-4">Visit Quota Left</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{item.patientName}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#0284c7]" />
                          <span>{item.phone}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{item.packageName}</p>
                        <p className="text-[11px] text-slate-400">{item.duration}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{item.branch}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900">{item.totalAmount}</p>
                        <p className="text-[11px] text-emerald-600 font-bold">{item.paidAmount}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0284c7]">{item.remainingVisits}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                            item.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {item.status}
                        </span>
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

