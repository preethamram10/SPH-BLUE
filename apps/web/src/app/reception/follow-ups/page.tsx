"use client";
import React, { useState, useEffect } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import Link from "next/navigation";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Search,
  Phone,
  CheckCircle,
  Clock,
  User,
  AlertCircle,
  Calendar,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

interface FollowUpItem {
  id: string;
  appointmentId: string;
  patientName: string;
  mrn: string;
  phone: string;
  doctorName: string;
  branch: string;
  condition: string;
  dueDate: string;
  followUpInterval: string;
  consultationFee: number;
  prescriptionImages?: string[];
  status: "DUE_TODAY" | "UPCOMING" | "OVERDUE" | "CALLED";
}

export default function ReceptionFollowUpsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);

  const [todayStr, setTodayStr] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [customDate, setCustomDate] = useState<string>("");
  const [quickDates, setQuickDates] = useState<Array<{ label: string; date: string }>>([
    { label: "All Scheduled", date: "ALL" },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) setBranchName(saved);

    const now = new Date();
    const dStr = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    setTodayStr(dStr);

    const dates: Array<{ label: string; date: string }> = [
      { label: "All Scheduled", date: "ALL" },
      { label: "Today", date: dStr },
    ];
    for (let i = 1; i <= 6; i++) {
      const nextD = new Date(now.getTime() + i * 86400000);
      const ds = `${String(nextD.getDate()).padStart(2, "0")}-${String(nextD.getMonth() + 1).padStart(2, "0")}-${nextD.getFullYear()}`;
      const dayName = nextD.toLocaleDateString("en-US", { weekday: "short" });
      dates.push({ label: `${dayName} (${nextD.getDate()})`, date: ds });
    }
    setQuickDates(dates);
  }, []);

  const loadFollowUps = async () => {
    setIsLoading(true);
    try {
      const targetDate = customDate || (selectedDate !== "ALL" ? selectedDate : "");
      const url = targetDate
        ? `/api/reception/follow-ups?date=${encodeURIComponent(targetDate)}`
        : `/api/reception/follow-ups`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.followUps)) {
        setFollowUps(data.followUps);
      } else {
        setFollowUps([]);
      }
    } catch (err) {
      console.error("Failed to load follow-ups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [selectedDate, customDate]);

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (!val) {
      setCustomDate("");
      setSelectedDate("ALL");
      return;
    }
    const [y, m, d] = val.split("-");
    const formatted = `${d}-${m}-${y}`;
    setCustomDate(formatted);
    setSelectedDate(formatted);
  };

  const handleWhatsApp = (phone: string, patientName: string, doctorName: string, dueDate: string) => {
    const clean = phone.replace(/\D/g, "").slice(-10);
    const text = encodeURIComponent(
      `Hello ${patientName},\nThis is Spiritual Homeopathy Clinic. Your follow-up consultation with ${doctorName} is scheduled on ${dueDate}.\nPlease let us know if you would like to confirm your appointment.`
    );
    window.open(`https://wa.me/91${clean}?text=${text}`, "_blank");
  };

  const filtered = followUps.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.patientName.toLowerCase().includes(q) ||
      item.mrn.toLowerCase().includes(q) ||
      item.phone.includes(searchQuery)
    );
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden text-xs">
      <ReceptionSidebar activePage="follow-ups" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-sky-600" />
              <h1 className="text-base font-extrabold text-slate-900">Patient Follow-ups & Reminders</h1>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">{branchName} • Follow-up Queue</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFollowUps}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <div className="p-5 max-w-6xl w-full mx-auto space-y-4">
          {/* Top Filter & Date Selector Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by patient name, phone, or Reg ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs font-medium"
                />
              </div>

              {/* Specific Date Picker Input */}
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-bold text-xs flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>Choose Date:</span>
                </label>
                <input
                  type="date"
                  onChange={handleCustomDateChange}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Quick Date Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1">
              <span className="text-slate-500 font-bold text-[11px] whitespace-nowrap">Quick Filter:</span>
              {quickDates.map((item) => {
                const isSelected = selectedDate === item.date && !customDate;
                return (
                  <button
                    key={item.date}
                    onClick={() => {
                      setCustomDate("");
                      setSelectedDate(item.date);
                    }}
                    className={`px-3 py-1 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                      isSelected
                        ? "bg-sky-600 border-sky-600 text-white shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follow-ups List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                <span>Scheduled Patients</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-extrabold text-[10px]">
                  {filtered.length}
                </span>
              </div>
              {selectedDate !== "ALL" && (
                <span className="text-[11px] text-sky-700 font-bold">Showing follow-ups for {selectedDate}</span>
              )}
            </div>

            {isLoading ? (
              <div className="p-16 text-center text-slate-400">Loading follow-ups...</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Calendar className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">No follow-ups found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedDate === "ALL"
                    ? "No patients are currently scheduled for follow-up."
                    : `No patients scheduled for follow-up on ${selectedDate}.`}
                </p>
                {selectedDate !== "ALL" && (
                  <button
                    onClick={() => {
                      setCustomDate("");
                      setSelectedDate("ALL");
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-700 font-bold text-xs hover:bg-sky-100"
                  >
                    Show All Follow-ups
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const cleanPhone = item.phone.replace(/\D/g, "").slice(-10);
                  const isToday = item.dueDate === todayStr;

                  return (
                    <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold text-slate-900 text-sm">{item.patientName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-700 font-extrabold text-[10px]">
                            {item.mrn}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              isToday
                                ? "bg-amber-100 border border-amber-300 text-amber-800"
                                : "bg-sky-100 border border-sky-300 text-sky-800"
                            }`}
                          >
                            {isToday ? "Due Today" : item.dueDate}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                          <span>
                            <strong>Phone:</strong> {cleanPhone || "No Mobile"}
                          </span>
                          <span>
                            <strong>Doctor:</strong> {item.doctorName}
                          </span>
                          <span>
                            <strong>Interval:</strong>{" "}
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                              {item.followUpInterval}
                            </span>
                          </span>
                          <span>
                            <strong>Branch:</strong> {item.branch}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Open Patient File Button */}
                        <button
                          onClick={() =>
                            router.push(
                              `/reception/patient-file?id=${encodeURIComponent(item.appointmentId)}&name=${encodeURIComponent(item.patientName)}&phone=${encodeURIComponent(item.phone)}&registrationId=${encodeURIComponent(item.mrn)}&branch=${encodeURIComponent(item.branch)}`
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1 shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Patient File</span>
                        </button>

                        {/* Call */}
                        <a
                          href={`tel:${cleanPhone}`}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>

                        {/* WhatsApp */}
                        <button
                          onClick={() => handleWhatsApp(item.phone, item.patientName, item.doctorName, item.dueDate)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
