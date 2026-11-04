"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Globe,
  Search,
  Filter,
  Download,
  Phone,
  Building2,
  Calendar,
  ChevronRight,
  Eye,
  User,
} from "lucide-react";

export default function GlobalPatientsListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const patients = [
    {
      mrn: "SPH-00214",
      name: "S. Swathi Rao",
      phone: "+91 9848011111",
      ageGender: "34 / F",
      registeredBranch: "KPHB Branch",
      lastDoctor: "Dr. Prashanth k vaidya",
      totalVisits: 12,
      lastVisitDate: "28 Oct 2026",
      condition: "Chronic Allergic Rhinitis",
    },
    {
      mrn: "SPH-00215",
      name: "M. Rajesh Kumar",
      phone: "+91 9849222222",
      ageGender: "45 / M",
      registeredBranch: "Chandanagar Branch",
      lastDoctor: "Dr. Padma priya",
      totalVisits: 8,
      lastVisitDate: "02 Nov 2026",
      condition: "Cervical Spondylosis",
    },
    {
      mrn: "SPH-00216",
      name: "B. Venkatesh",
      phone: "+91 9700333333",
      ageGender: "29 / M",
      registeredBranch: "Nallagandla Branch",
      lastDoctor: "Dr. Jobeadh parveej",
      totalVisits: 4,
      lastVisitDate: "01 Nov 2026",
      condition: "Gastritis & IBS",
    },
    {
      mrn: "SPH-00217",
      name: "K. Anuradha",
      phone: "+91 9911444444",
      ageGender: "52 / F",
      registeredBranch: "Dilshuknagar Branch",
      lastDoctor: "Dr. Ramakrishna Chanduri",
      totalVisits: 15,
      lastVisitDate: "04 Nov 2026",
      condition: "Thyroid & PCOD Care",
    },
  ];

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === "All Branches" || p.registeredBranch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/global-patients" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Global Patients Directory</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Hospital-wide master patient index across all clinic branches
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search MRN, Name, Phone..."
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
                <span>Export Master List</span>
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
                    <th className="py-3 px-4">Patient MRN &amp; Name</th>
                    <th className="py-3 px-4">Age / Gender</th>
                    <th className="py-3 px-4">Registered Branch</th>
                    <th className="py-3 px-4">Primary Practitioner</th>
                    <th className="py-3 px-4">Visits</th>
                    <th className="py-3 px-4">Last Visit</th>
                    <th className="py-3 px-4 text-right">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.map((item) => (
                    <tr key={item.mrn} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {item.mrn}
                          </span>
                          <span className="font-bold text-slate-900">{item.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-[#0284c7]" />
                          <span>{item.phone}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-600">{item.ageGender}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{item.registeredBranch}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{item.lastDoctor}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded">
                          {item.totalVisits}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-600">{item.lastVisitDate}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="p-1.5 text-slate-500 hover:text-[#0284c7] hover:bg-sky-50 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
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

