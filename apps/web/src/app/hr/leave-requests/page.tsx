"use client";

import React, { useState, useEffect } from "react";
import HRSidebar from "@/components/HRSidebar";
import { HRLeaveApprovalManagement } from "@/components/hr/HRLeaveApprovalManagement";
import { LeaveRequest } from "@/components/staff/StaffLeaveRequestSection";
import { CalendarX } from "lucide-react";

export default function LeaveRequestsPage() {
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
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/leave-requests" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <CalendarX className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Staff Leave Requests</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Review, accept, or reject staff leave submissions across clinic branches
              </p>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading leave requests...</div>
          ) : (
            <HRLeaveApprovalManagement
              requests={leaves}
              onActionComplete={handleActionComplete}
            />
          )}
        </div>
      </main>
    </div>
  );
}