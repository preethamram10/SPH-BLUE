"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck, Calendar, Search, MapPin } from "lucide-react";

export default function HRAttendancePage() {
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/hr/dashboard"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">HR Staff Attendance &amp; Shift Logs</h1>
            <p className="text-xs text-slate-500">Live GPS &amp; Selfie Punches, shift timings &amp; late tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Punch In (Selfie &amp; GPS)</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <th className="py-3 px-4">Working Hours</th>
                  <th className="py-3 px-4">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">Loading attendance data...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No attendance records for {selectedDate}.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.staffName}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{item.branch}</td>
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
                                className="cursor-pointer"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.punchInPhoto}
                                  alt="Selfie"
                                  className="w-8 h-8 rounded-lg object-cover border border-emerald-300 shadow-2xs"
                                />
                              </button>
                            )}
                            <div>
                              <span className="font-bold text-slate-800">{item.punchInTime}</span>
                              {item.punchInLocation && (
                                <p className="text-[10px] text-slate-400 max-w-[150px] truncate">
                                  📍 {item.punchInLocation}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.punchOutTime || <span className="text-slate-400 font-normal italic">Active</span>}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0284c7]">
                        {item.workingHours || "In Progress"}
                      </td>
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
                          <span className="text-[10px] text-amber-600 font-bold">Late by {item.lateMinutes}m</span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

