"use client";

import React, { useState } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface CleaningTask {
  id: string;
  category: "Morning Routine" | "OPD & Rooms" | "Sanitization & Hygiene" | "Evening Closing";
  title: string;
  description: string;
  isDone: boolean;
  doneAt?: string;
}

export default function ReceptionBranchCleaningPage() {
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");

  React.useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) setBranchName(saved);
  }, []);
  const [tasks, setTasks] = useState<CleaningTask[]>([
    {
      id: "1",
      category: "Morning Routine",
      title: "Clinic Floor Mopping & Sanitization",
      description: "Mopped with hospital-grade disinfectant solution before OPD opening",
      isDone: true,
      doneAt: "08:45 AM",
    },
    {
      id: "2",
      category: "Morning Routine",
      title: "Reception Front Desk & Terminal Disinfection",
      description: "Counter tops, keyboard, mouse & payment POS sanitized",
      isDone: true,
      doneAt: "08:50 AM",
    },
    {
      id: "3",
      category: "OPD & Rooms",
      title: "Doctor Consultation Rooms 1 & 2 Prepared",
      description: "Stethoscope, examination bed fresh sheet & doctor prescription pads ready",
      isDone: true,
      doneAt: "09:00 AM",
    },
    {
      id: "4",
      category: "Sanitization & Hygiene",
      title: "Drinking Water Dispenser & Cups Refilled",
      description: "Mineral water jar checked, disposable paper cups restocked",
      isDone: true,
      doneAt: "09:05 AM",
    },
    {
      id: "5",
      category: "Sanitization & Hygiene",
      title: "Restrooms Cleaned, Handwash & Towels Restocked",
      description: "Restroom tiles disinfected, liquid soap refill and air freshener verified",
      isDone: false,
    },
    {
      id: "6",
      category: "Sanitization & Hygiene",
      title: "Patient Waiting Room Chairs Sanitized",
      description: "Wiped down all 16 waiting lobby chairs with alcohol wipes",
      isDone: false,
    },
    {
      id: "7",
      category: "Evening Closing",
      title: "Medical Waste Disposal & Trash Clearance",
      description: "Clinical waste securely bagged and disposed per protocol",
      isDone: false,
    },
    {
      id: "8",
      category: "Evening Closing",
      title: "All Lights, AC & Consultation Rooms Power Off",
      description: "Main clinic electrical switches verified before lockup",
      isDone: false,
    },
  ]);

  const toggleTask = (id: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              isDone: !t.isDone,
              doneAt: !t.isDone ? now : undefined,
            }
          : t
      )
    );
  };

  const completedCount = tasks.filter((t) => t.isDone).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      <ReceptionSidebar activePage="branch-cleaning" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#268ec8]" />
                <h2 className="text-xl font-bold text-slate-900">Branch Cleaning &amp; Hygiene</h2>
                <span className="bg-[#a8ce3a]/20 text-[#268ec8] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#a8ce3a]/40">
                  {progressPercent}% Completed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {branchName} • Daily clinic housekeeping protocol, OPD sanitation &amp; inspection checklist
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">
                {completedCount} of {tasks.length} Tasks Done
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6 max-w-5xl w-full mx-auto space-y-6">
          {/* Progress Bar Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Today&apos;s Hygiene Score
              </span>
              <span className="text-sm font-extrabold text-[#268ec8]">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#268ec8] to-[#a8ce3a] h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-4 flex items-start gap-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                  task.isDone ? "bg-emerald-50/20" : ""
                }`}
              >
                <button
                  type="button"
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                    task.isDone
                      ? "bg-[#a8ce3a] border-[#a8ce3a] text-white shadow-xs"
                      : "border-slate-300 bg-white hover:border-[#268ec8]"
                  }`}
                >
                  {task.isDone && <CheckCircle2 className="w-4 h-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-xs font-bold ${
                        task.isDone ? "line-through text-slate-400" : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {task.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{task.description}</p>
                </div>

                {task.doneAt && (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                    Done at {task.doneAt}
                  </span>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

