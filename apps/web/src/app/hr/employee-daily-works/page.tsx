"use client";
import React, { useState, useEffect } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  Briefcase,
  Calendar,
  Building2,
  Search,
  CheckCircle2,
  Clock,
  PhoneCall,
  Users,
  Star,
  Video,
  FileText,
} from "lucide-react";
import { DailyWorkReport } from "@/components/staff/StaffDailyWorkSubmission";

export default function EmployeeDailyWorksPage() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState<DailyWorkReport[]>([]);
  const [loading, setLoading] = useState(true);

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }, []);

  const fetchReports = async () => {
    if (!selectedDate) return;
    try {
      setLoading(true);
      const url = `/api/staff/daily-work?date=${selectedDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error("Failed to fetch daily work reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedDate]);

  const filtered = reports.filter((item) => {
    const matchesSearch =
      (item.staffName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.workNotes || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch =
      selectedBranch === "All Branches" || (item.branch || "").toLowerCase().includes(selectedBranch.toLowerCase());
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/employee-daily-works" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Employee Daily Work Submissions</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Daily task logs, caller metrics, reviews captured &amp; staff productivity reports
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              />

              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none w-44"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Submissions Today</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">{filtered.length} Reports</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Total Calls Made</p>
              <h3 className="text-xl font-extrabold text-blue-600 mt-1">
                {filtered.reduce((acc, r) => acc + (r.totalCalls || 0), 0)} Calls
              </h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Google Reviews Captured</p>
              <h3 className="text-xl font-extrabold text-amber-600 mt-1">
                {filtered.reduce((acc, r) => acc + (r.gReviews || 0), 0)} Reviews
              </h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Video Reviews</p>
              <h3 className="text-xl font-extrabold text-rose-600 mt-1">
                {filtered.reduce((acc, r) => acc + (r.videoReviews || 0), 0)} Videos
              </h3>
            </div>
          </div>

          {/* Submissions List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-center">Calls</th>
                    <th className="py-3 px-4 text-center">Follow-ups</th>
                    <th className="py-3 px-4 text-center">Contacts</th>
                    <th className="py-3 px-4 text-center">G-Reviews</th>
                    <th className="py-3 px-4 text-center">Video Reviews</th>
                    <th className="py-3 px-4">Work Accomplishments / Notes</th>
                    <th className="py-3 px-4">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">Loading daily reports...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No daily work reports submitted for {selectedDate}.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.staffName}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{item.branch}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-blue-600">{item.totalCalls}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{item.followUps}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-purple-600">{item.contacts}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-amber-600">{item.gReviews}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-600">{item.videoReviews}</td>
                        <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-800" title={item.workNotes}>
                          {item.workNotes || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
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
