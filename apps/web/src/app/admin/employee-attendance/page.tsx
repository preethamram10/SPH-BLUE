"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  UserCheck,
  Calendar,
  Building2,
  Clock,
  Download,
  Search,
  Filter,
  Camera,
  MapPin,
  AlertCircle,
  Eye,
  CheckCircle2,
} from "lucide-react";

export default function EmployeeAttendancePage() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; location?: string } | null>(null);

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }, []);

  const fetchAttendance = async () => {
    if (!selectedDate) return;
    try {
      setLoading(true);
      const url = `/api/admin/attendance?branch=${encodeURIComponent(selectedBranch)}&date=${selectedDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedBranch, selectedDate]);

  const filteredLogs = records.filter((item) => {
    const matchesSearch =
      (item.staffName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.branch || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === "All Branches" || (item.branch || "").toLowerCase().includes(selectedBranch.toLowerCase());
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/employee-attendance" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Employee Attendance Report</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Daily GPS &amp; Selfie Punch Logs, branch attendance &amp; shift compliance
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              {/* Date Filter */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              />

              {/* Branch Filter */}
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
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 w-44 bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Total Punches Today</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">{filteredLogs.length} Records</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">On Time Present</p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
                {filteredLogs.filter((r) => r.status === "Present").length} Staff
              </h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Late Arrivals</p>
              <h3 className="text-xl font-extrabold text-amber-600 mt-1">
                {filteredLogs.filter((r) => r.status === "Late").length} Staff
              </h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Selected Date</p>
              <h3 className="text-base font-extrabold text-slate-800 mt-1">{selectedDate}</h3>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Punch In (Selfie &amp; GPS)</th>
                    <th className="py-3 px-4">Punch Out (Selfie &amp; GPS)</th>
                    <th className="py-3 px-4">Working Hours</th>
                    <th className="py-3 px-4">Shift Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">Loading attendance data...</td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No attendance punch logs for {selectedDate}.</p>
                        <p className="text-[11px] text-slate-400">Staff punches via their Selfie &amp; GPS portal will display here.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.staffName}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{item.branch}</span>
                        </td>

                        {/* Punch In */}
                        <td className="py-3.5 px-4">
                          {item.punchInTime ? (
                            <div className="flex items-center gap-2">
                              {item.punchInPhoto && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewPhoto({
                                      url: item.punchInPhoto,
                                      title: `Punch In Selfie - ${item.staffName}`,
                                      location: item.punchInLocation,
                                    })
                                  }
                                  className="relative group cursor-pointer"
                                  title="View Selfie"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.punchInPhoto}
                                    alt="In Selfie"
                                    className="w-8 h-8 rounded-lg object-cover border border-emerald-300 shadow-2xs"
                                  />
                                </button>
                              )}
                              <div>
                                <span className="font-bold text-slate-800">{item.punchInTime}</span>
                                {item.punchInLocation && (
                                  <p className="text-[10px] text-slate-400 max-w-[140px] truncate" title={item.punchInLocation}>
                                    📍 {item.punchInLocation}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Punch Out */}
                        <td className="py-3.5 px-4">
                          {item.punchOutTime ? (
                            <div className="flex items-center gap-2">
                              {item.punchOutPhoto && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewPhoto({
                                      url: item.punchOutPhoto,
                                      title: `Punch Out Selfie - ${item.staffName}`,
                                      location: item.punchOutLocation,
                                    })
                                  }
                                  className="relative group cursor-pointer"
                                  title="View Selfie"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.punchOutPhoto}
                                    alt="Out Selfie"
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-300 shadow-2xs"
                                  />
                                </button>
                              )}
                              <div>
                                <span className="font-bold text-slate-800">{item.punchOutTime}</span>
                                {item.punchOutLocation && (
                                  <p className="text-[10px] text-slate-400 max-w-[140px] truncate" title={item.punchOutLocation}>
                                    📍 {item.punchOutLocation}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Active Shift</span>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-4 font-bold text-[#0284c7]">
                          {item.workingHours || "In Progress"}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border mr-2 ${
                              item.status === "Present"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.status === "Late"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.status === "Late" && item.lateMinutes ? (
                            <span className="text-[10px] text-amber-600 font-bold">
                              Late by {item.lateMinutes}m
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">On Time</span>
                          )}
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

      {/* Selfie Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-1">{previewPhoto.title}</h4>
            {previewPhoto.location && (
              <p className="text-xs text-slate-500 mb-3 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate max-w-[260px]">{previewPhoto.location}</span>
              </p>
            )}

            <div className="w-64 h-64 mx-auto rounded-xl overflow-hidden border-2 border-slate-200 shadow-md mb-4 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewPhoto.url} alt="Selfie" className="w-full h-full object-cover" />
            </div>

            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
