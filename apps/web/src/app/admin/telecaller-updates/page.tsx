"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  PhoneCall,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Clock,
  PhoneForwarded,
  User,
  Building2,
  TrendingUp,
} from "lucide-react";

export default function TelecallerUpdatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState("All");

  const callUpdates = [
    {
      id: "LOG-901",
      agentName: "Salman Khan",
      patientName: "K. Ramesh Kumar",
      phone: "+91 9848012345",
      branch: "KPHB Branch",
      callTime: "Today, 11:24 AM",
      duration: "3m 45s",
      disposition: "Booked Consultation",
      notes: "Agreed to visit Dr. Prashanth on Friday 05:00 PM for chronic sinus review.",
    },
    {
      id: "LOG-902",
      agentName: "K. Bhavani",
      patientName: "G. Srilatha",
      phone: "+91 9700112233",
      branch: "Chandanagar Branch",
      callTime: "Today, 10:50 AM",
      duration: "2m 10s",
      disposition: "Callback Requested",
      notes: "Traveling currently. Requested call back tomorrow after 03:00 PM.",
    },
    {
      id: "LOG-903",
      agentName: "Salman Khan",
      patientName: "M. Vijay",
      phone: "+91 9911882233",
      branch: "Nallagandla Branch",
      callTime: "Today, 10:15 AM",
      duration: "45s",
      disposition: "Not Interested",
      notes: "Symptoms resolved, currently not taking medication.",
    },
    {
      id: "LOG-904",
      agentName: "K. Bhavani",
      patientName: "P. Rajesh",
      phone: "+91 9876543210",
      branch: "Dilshuknagar Branch",
      callTime: "Today, 09:40 AM",
      duration: "1m 30s",
      disposition: "Package Renewed",
      notes: "Renewed 6-month skin plan online payment link sent.",
    },
  ];

  const filtered = callUpdates.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);
    const matchesDisp = dispositionFilter === "All" || item.disposition === dispositionFilter;
    return matchesSearch && matchesDisp;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/telecaller-updates" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Live Telecaller Activity &amp; Call Logs</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Real-time stream of outbound patient calls, lead conversions &amp; agent notes
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search caller, patient or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                />
              </div>

              <select
                value={dispositionFilter}
                onChange={(e) => setDispositionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="All">All Dispositions</option>
                <option value="Booked Consultation">Booked Consultation</option>
                <option value="Callback Requested">Callback Requested</option>
                <option value="Package Renewed">Package Renewed</option>
                <option value="Not Interested">Not Interested</option>
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
                    <th className="py-3 px-4">Patient &amp; Phone</th>
                    <th className="py-3 px-4">Telecalling Agent</th>
                    <th className="py-3 px-4">Time &amp; Duration</th>
                    <th className="py-3 px-4">Call Outcome</th>
                    <th className="py-3 px-4">Agent Notes &amp; Follow-Up Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{item.patientName}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <PhoneCall className="w-3 h-3 text-[#0284c7]" />
                          <span>{item.phone}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{item.agentName}</p>
                        <p className="text-[11px] text-slate-400">{item.branch}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{item.callTime}</p>
                        <p className="text-[11px] text-slate-400">{item.duration}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                            item.disposition === "Booked Consultation" || item.disposition === "Package Renewed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.disposition === "Callback Requested"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {item.disposition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">{item.notes}</td>
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

