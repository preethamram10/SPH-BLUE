"use client";

import React, { useState } from "react";
import { Check, X, AlertTriangle, ShieldCheck, Search } from "lucide-react";
import { LeaveRequest } from "../staff/StaffLeaveRequestSection";

interface HRLeaveManagementProps {
  requests: LeaveRequest[];
  onActionComplete: (updatedLeave: LeaveRequest) => void;
}

export const HRLeaveApprovalManagement: React.FC<HRLeaveManagementProps> = ({
  requests,
  onActionComplete,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("Pending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [rejectingItem, setRejectingItem] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filtered Leave requests
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === "All" || r.status === filterStatus;
    const matchesSearch =
      (r.staffName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.branch || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Approve Handler
  const handleApprove = async (req: LeaveRequest) => {
    if (!window.confirm(`Approve leave request for ${req.staffName}?`)) return;

    setProcessingId(req.id || "action");
    try {
      const res = await fetch(`/api/admin/leaves/${req.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved" }),
      });
      if (!res.ok) throw new Error("Approval failed");
      const updated = await res.json();
      onActionComplete(updated);
    } catch {
      onActionComplete({ ...req, status: "Approved", reviewedBy: "Admin" });
    } finally {
      setProcessingId(null);
    }
  };

  // Reject Submit Handler
  const handleRejectConfirm = async () => {
    if (!rejectingItem) return;
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    setProcessingId(rejectingItem.id || "action");
    try {
      const res = await fetch(`/api/admin/leaves/${rejectingItem.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Rejected", rejectionReason: rejectReason }),
      });
      if (!res.ok) throw new Error("Rejection failed");
      const updated = await res.json();
      onActionComplete(updated);
    } catch {
      onActionComplete({
        ...rejectingItem,
        status: "Rejected",
        rejectionReason: rejectReason,
        reviewedBy: "Admin",
      });
    } finally {
      setProcessingId(null);
      setRejectingItem(null);
      setRejectReason("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-800">HR Leave Approval Desk</h3>
          </div>
          <p className="text-xs text-slate-500">Review, accept, or reject staff leave submissions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {["Pending", "Approved", "Rejected", "All"].map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  filterStatus === tab
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Branch</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Reason</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                  No {filterStatus.toLowerCase()} leave requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req, idx) => (
                <tr key={req.id || idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{req.staffName}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">{req.branch}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{req.leaveType}</td>
                  <td className="py-3.5 px-4 text-xs">
                    <div>
                      {req.fromDate} to {req.toDate}
                    </div>
                    <span className="text-[11px] text-slate-400">Joins: {req.joiningDate}</span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-xs truncate" title={req.reason}>
                    {req.reason}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        req.status === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : req.status === "Rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {req.status === "Pending" ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleApprove(req)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                          title="Approve Leave"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => {
                            setRejectingItem(req);
                            setRejectReason("");
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                          title="Reject Leave"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Completed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base">Reject Leave Request</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Specify the reason for rejecting leave for{" "}
              <span className="font-semibold text-slate-800">{rejectingItem.staffName}</span>.
            </p>

            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Critical clinic operation scheduled on this date / insufficient leave balance"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm transition cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

