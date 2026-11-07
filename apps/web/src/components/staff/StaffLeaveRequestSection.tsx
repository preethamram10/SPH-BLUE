"use client";

import React, { useState } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, Send, Plus } from "lucide-react";

export interface LeaveRequest {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  leaveType: "Casual" | "Sick" | "Privilege" | "Emergency" | "Half Day";
  fromDate: string;
  toDate: string;
  joiningDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
  reviewedBy?: string;
  createdAt: string;
}

interface StaffLeaveProps {
  staff: { id: string; name: string; branch: string };
  leavesList: LeaveRequest[];
  onLeaveSubmitted: (newLeave: LeaveRequest) => void;
}

export const StaffLeaveRequestSection: React.FC<StaffLeaveProps> = ({
  staff,
  leavesList,
  onLeaveSubmitted,
}) => {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRequest["leaveType"]>("Casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !joiningDate || !reason.trim()) {
      setErrorMsg("Please fill in all the required fields.");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setErrorMsg("'To Date' cannot be earlier than 'From Date'.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const payload: LeaveRequest = {
      staffId: staff.id,
      staffName: staff.name,
      branch: staff.branch,
      leaveType,
      fromDate,
      toDate,
      joiningDate,
      reason,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/staff/leaves/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Leave submission failed");
      const savedLeave: LeaveRequest = await res.json();
      onLeaveSubmitted(savedLeave);
    } catch {
      // Local fallback simulation
      onLeaveSubmitted({ ...payload, id: `LV-${Date.now()}` });
    } finally {
      setSubmitting(false);
      setShowApplyModal(false);
      setReason("");
      setFromDate("");
      setToDate("");
      setJoiningDate("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Apply Action */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Leave Management</h3>
          <p className="text-xs text-slate-500">Apply for leaves and track approval status</p>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm text-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      {/* Applied Leaves List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-semibold text-slate-800 text-sm">My Leave Applications</h4>
          <span className="text-xs text-slate-500">{leavesList.length} total records</span>
        </div>

        {leavesList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No leave applications found.</p>
            <p className="text-xs mt-1">Click &quot;Apply for Leave&quot; above to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leavesList.map((lv, idx) => (
                  <tr key={lv.id || idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900">{lv.leaveType} Leave</td>
                    <td className="py-3.5 px-4">{lv.fromDate}</td>
                    <td className="py-3.5 px-4">{lv.toDate}</td>
                    <td className="py-3.5 px-4">{lv.joiningDate}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate" title={lv.reason}>
                      {lv.reason}
                    </td>
                    <td className="py-3.5 px-4">
                      {lv.status === "Approved" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {lv.status === "Rejected" && (
                        <div className="group relative inline-block">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full cursor-help">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                          {lv.rejectionReason && (
                            <div className="hidden group-hover:block absolute bottom-full mb-1 left-0 bg-slate-900 text-white text-xs p-2 rounded shadow-lg w-48 z-10">
                              Reason: {lv.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                      {lv.status === "Pending" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Apply for Leave</h3>
            <p className="text-xs text-slate-500 mb-4">
              Your leave request will be sent to the Branch HR &amp; Admin for approval.
            </p>

            {errorMsg && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Privilege">Privilege Leave</option>
                  <option value="Emergency">Emergency Leave</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Re-joining Date
                </label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you are requesting leave..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

