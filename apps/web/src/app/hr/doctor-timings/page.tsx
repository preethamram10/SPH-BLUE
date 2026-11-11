"use client";

import React, { useState, useEffect } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  Clock,
  Plus,
  Trash2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  RotateCcw,
} from "lucide-react";

export interface SlotItem {
  startHour: string;
  startMinute: string;
  startAmPm: "AM" | "PM";
  endHour: string;
  endMinute: string;
  endAmPm: "AM" | "PM";
}

export interface DayScheduleData {
  status: "Available" | "Closed";
  slots: SlotItem[];
}

export interface BranchScheduleItem {
  id: string;
  targetBranch: string;
  selectedDay: string;
  daySchedules: Record<string, DayScheduleData>;
}

export interface DoctorScheduleRecord {
  id: string;
  doctorId: string;
  name: string;
  phone: string;
  branchSchedules: BranchScheduleItem[];
}

const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BRANCHES = ["KPHB Main", "Chandanagar", "Dilsukhnagar", "Nallagandla"];

export default function HRDoctorTimingsPage() {
  const [schedules, setSchedules] = useState<DoctorScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");

  const fetchDoctorTimings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/doctor-timings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.schedules)) {
          setSchedules(data.schedules);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch doctor timings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorTimings();
  }, []);

  const filteredSchedules = schedules.filter((s) => {
    if (selectedDoctor !== "all" && s.id !== selectedDoctor) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/doctor-timings" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Doctor Timings &amp; OPD Duty Schedules
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">
                Live Roster
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Consultant shift hours, clinic branch assignments, and weekly consulting slots.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDoctorTimings}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#0284c7] ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          {/* Doctor Selector */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Select Doctor:</span>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
              >
                <option value="all">All Consultant Doctors ({schedules.length})</option>
                {schedules.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedules List */}
          <div className="space-y-4">
            {filteredSchedules.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{doc.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">+91 {doc.phone}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Active Consultant
                  </span>
                </div>

                {/* Branch Assignments */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(doc.branchSchedules || []).map((bs) => (
                    <div key={bs.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{bs.targetBranch}</span>
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      <div className="space-y-1 text-xs">
                        {DEFAULT_DAYS.map((day) => {
                          const sched = bs.daySchedules?.[day];
                          const isClosed = !sched || sched.status === "Closed" || !sched.slots?.length;
                          return (
                            <div key={day} className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500 font-medium">{day.slice(0, 3)}:</span>
                              {isClosed ? (
                                <span className="text-slate-400 font-semibold">Closed</span>
                              ) : (
                                <span className="text-emerald-700 font-bold">
                                  {sched.slots[0].startHour}:{sched.slots[0].startMinute} {sched.slots[0].startAmPm} -{" "}
                                  {sched.slots[0].endHour}:{sched.slots[0].endMinute} {sched.slots[0].endAmPm}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

