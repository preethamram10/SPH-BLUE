"use client";

import React, { useState } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  Headphones,
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  Lock,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function TelecallerAccountsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [telecallers, setTelecallers] = useState([
    {
      id: "TC-01",
      name: "Salman Khan",
      phone: "+91 7842836959",
      email: "salman@sph.com",
      branch: "Nallagandla Branch",
      dailyTarget: "60 calls/day",
      activeStatus: "Active",
      campaign: "Chronic Allergy Re-engagement",
    },
    {
      id: "TC-02",
      name: "K. Bhavani",
      phone: "+91 9848554433",
      email: "bhavani@sph.com",
      branch: "KPHB Branch",
      dailyTarget: "75 calls/day",
      activeStatus: "Active",
      campaign: "Post-Consultation Follow-Up 15-Day",
    },
    {
      id: "TC-03",
      name: "T. Suresh",
      phone: "+91 9988442211",
      email: "suresh@sph.com",
      branch: "Chandanagar Branch",
      dailyTarget: "50 calls/day",
      activeStatus: "On Leave",
      campaign: "Package Expiry Renewal Alerts",
    },
  ]);

  const filtered = telecallers.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.phone.includes(searchTerm) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/telecaller-accounts" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Headphones className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Telecaller Accounts &amp; Access</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Manage telecalling agents, call campaigns, daily quotas &amp; staff logins
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search caller..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                />
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Telecaller</span>
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
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Login Email &amp; Phone</th>
                    <th className="py-3 px-4">Branch Location</th>
                    <th className="py-3 px-4">Active Campaign</th>
                    <th className="py-3 px-4">Target Quota</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{t.name}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{t.email}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#0284c7]" />
                          <span>{t.phone}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{t.branch}</td>
                      <td className="py-3.5 px-4 text-[#0284c7] font-semibold">{t.campaign}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{t.dailyTarget}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                            t.activeStatus === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {t.activeStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="p-1.5 text-slate-500 hover:text-[#0284c7] hover:bg-sky-50 rounded-lg">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

