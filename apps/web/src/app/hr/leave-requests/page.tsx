"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarX } from "lucide-react";
import { HRLeaveApprovalManagement } from "@/components/hr/HRLeaveApprovalManagement";
import { LeaveRequest } from "@/components/staff/StaffLeaveRequestSection";

export default function HRLeaveRequestsPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff/leaves");
      const data = await res.json();
      if (data.success && Array.isArray(data.leaves)) {
        setLeaves(data.leaves);
      }
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleActionComplete = (updated: LeaveRequest) => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/hr/dashboard"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <CalendarX className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">HR Staff Leave Requests</h1>
            <p className="text-xs text-slate-500">Review, approve, or reject employee leave requests</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading leave requests...</div>
        ) : (
          <HRLeaveApprovalManagement
            requests={leaves}
            onActionComplete={handleActionComplete}
          />
        )}
      </main>
    </div>
  );
}

