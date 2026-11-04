"use client";

import React, { useState } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  CalendarCheck,
  Search,
  Phone,
  CheckCircle,
  Clock,
  User,
  AlertCircle,
  PhoneCall,
  Calendar,
} from "lucide-react";

interface FollowUpItem {
  id: string;
  patientName: string;
  mrn: string;
  phone: string;
  doctorName: string;
  condition: string;
  dueDate: string;
  status: "DUE_TODAY" | "UPCOMING" | "OVERDUE" | "CALLED";
}

export default function ReceptionFollowUpsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("ALL");
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");

  React.useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) setBranchName(saved);
  }, []);

  const [followUps, setFollowUps] = useState<FollowUpItem[]>([
    {
      id: "1",
      patientName: "Kavitha Reddy",
      mrn: "SPH-2026-0612",
      phone: "+91 98490 11223",
      doctorName: "Dr. Ramesh Gupta",
      condition: "Chronic Migraine & Sleep Pattern",
      dueDate: "Today",
      status: "DUE_TODAY",
    },
    {
      id: "2",
      patientName: "Rajesh Kumar",
      mrn: "SPH-2026-0731",
      phone: "+91 90001 44556",
      doctorName: "Dr. Sneha Reddy",
      condition: "Allergic Rhinitis Follow-up",
      dueDate: "Today",
      status: "DUE_TODAY",
    },
    {
      id: "3",
      patientName: "Sunitha Rao",
      mrn: "SPH-2026-0520",
      phone: "+91 81211 77889",
      doctorName: "Dr. Ramesh Gupta",
      condition: "Thyroid & Weight Management",
      dueDate: "Yesterday",
      status: "OVERDUE",
    },
    {
      id: "4",
      patientName: "Pradeep Varma",
      mrn: "SPH-2026-0899",
      phone: "+91 94402 33445",
      doctorName: "Dr. Sneha Reddy",
      condition: "Psoriasis Skin Progress Review",
      dueDate: "08 Nov 2026",
      status: "UPCOMING",
    },
  ]);

  const handleMarkCalled = (id: string) => {
    setFollowUps((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "CALLED" } : item))
    );
  };

  const filtered = followUps.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery);

    if (filter === "ALL") return matchesSearch;
    return matchesSearch && item.status === filter;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      <ReceptionSidebar activePage="follow-ups" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#268ec8]" />
                <h2 className="text-xl font-bold text-slate-900">Patient Follow-ups</h2>
                <span className="bg-amber-50 text-amber-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-200">
                  {followUps.filter((f) => f.status === "DUE_TODAY").length} Due Today
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {branchName} • Front desk follow-up tracking, review reminders &amp; call logs
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, MRN or condition..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8] shadow-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: "ALL", label: "All" },
                { id: "DUE_TODAY", label: "Due Today" },
                { id: "OVERDUE", label: "Overdue" },
                { id: "UPCOMING", label: "Upcoming" },
                { id: "CALLED", label: "Called" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === tab.id
                      ? "bg-[#268ec8] text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{item.patientName}</h3>
                      <p className="text-xs text-slate-400 font-mono">
                        {item.mrn} • {item.phone}
                      </p>
                    </div>

                    {item.status === "DUE_TODAY" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        DUE TODAY
                      </span>
                    ) : item.status === "OVERDUE" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        OVERDUE
                      </span>
                    ) : item.status === "CALLED" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        CALLED
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        UPCOMING
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400">Condition:</span>{" "}
                      <span className="font-semibold text-slate-800">{item.condition}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Doctor:</span>{" "}
                      <span className="font-semibold text-slate-800">{item.doctorName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Due Date:</span>{" "}
                      <span className="font-semibold text-slate-800">{item.dueDate}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={`tel:${item.phone}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#268ec8] hover:underline"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Patient</span>
                  </a>

                  {item.status !== "CALLED" ? (
                    <button
                      onClick={() => handleMarkCalled(item.id)}
                      className="px-3 py-1.5 bg-[#a8ce3a] hover:bg-[#97ba32] text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Called</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirmed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

