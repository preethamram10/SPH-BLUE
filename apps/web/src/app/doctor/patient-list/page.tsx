"use client";
import React, { useState, useEffect } from "react";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import {
  Users,
  Search,
  Phone,
  Calendar,
  FileText,
  Clock,
  RotateCcw,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function DoctorPatientListPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/doctor/patients")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.patients)) {
          setPatients(data.patients);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      (p.patientName || "").toLowerCase().includes(q) ||
      (p.registrationId || "").toLowerCase().includes(q) ||
      (p.phone || "").includes(q) ||
      (p.diseases || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <DoctorSidebar activePage="patient-list" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Doctor Patient Directory</h2>
                <p className="text-[10px] text-slate-400">Clinical History &amp; Longitudinal Records</p>
              </div>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, ID, phone, condition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[10.5px] rounded-lg border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-[#0284c7]"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-3.5 max-w-7xl w-full mx-auto space-y-3.5">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">All Doctor Consulted Patients</h3>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-sky-50 text-[#0284c7] border border-sky-200">
                  {filteredPatients.length} Records
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-5 h-5 border-2 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px]">Loading patient records...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No patient records match &quot;{searchTerm}&quot;
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Patient ID</th>
                      <th className="py-2 px-3">Patient Name</th>
                      <th className="py-2 px-3">Primary Diagnosis / Disease</th>
                      <th className="py-2 px-3">Last Visit Date</th>
                      <th className="py-2 px-3 text-center">Total Visits</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.map((p, idx) => (
                      <tr key={p.registrationId || `p-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                            {p.registrationId}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 text-xs block">{p.patientName}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {p.phone || "No Mobile"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-slate-700">{p.diseases}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          <span>{p.lastVisitDate}</span>
                          {p.lastSlot && <span className="text-[10px] text-slate-400 block">@ {p.lastSlot}</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {p.totalVisits > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-[#0284c7] border border-sky-100">
                              {p.totalVisits} {p.totalVisits === 1 ? "Visit" : "Visits"}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const clean = (p.phone || "").replace(/\D/g, "").slice(-10);
                              if (clean) {
                                window.open(
                                  `https://wa.me/91${clean}?text=${encodeURIComponent(
                                    `Hello ${p.patientName}, this is regarding your homeopathic follow-up visit with Dr. Prashanth K Vaidya.`
                                  )}`,
                                  "_blank"
                                );
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-[#0284c7] bg-sky-50 hover:bg-[#0284c7] hover:text-white border border-sky-200 transition-all cursor-pointer"
                          >
                            <span>WhatsApp Follow-up</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

