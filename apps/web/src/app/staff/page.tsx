"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Briefcase,
  Calendar,
  DollarSign,
  UserCheck,
  Building2,
  LogOut,
  AlertTriangle,
  FileText,
  Printer,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  StaffAttendancePunchCard,
  AttendanceRecord,
} from "@/components/staff/StaffAttendancePunchCard";
import {
  StaffLeaveRequestSection,
  LeaveRequest,
} from "@/components/staff/StaffLeaveRequestSection";
import {
  StaffDailyWorkSubmission,
  DailyWorkReport,
} from "@/components/staff/StaffDailyWorkSubmission";

export default function StaffDashboardPage() {
  const router = useRouter();

  // Active Tab: attendance | daily_work | leaves | pay_cuts
  const [activeTab, setActiveTab] = useState<"attendance" | "daily_work" | "leaves" | "pay_cuts">("attendance");

  // Staff State
  const [staff, setStaff] = useState<{
    id: string;
    name: string;
    branch: string;
    shiftStartTime?: string;
    isAccessGranted?: boolean;
  }>({
    id: "staff-01",
    name: "Staff Member",
    branch: "KPHB Branch",
    shiftStartTime: "09:00 AM",
    isAccessGranted: true,
  });

  const [loading, setLoading] = useState(true);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState("");

  // Data States
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [leavesList, setLeavesList] = useState<LeaveRequest[]>([]);
  const [todayWorkReport, setTodayWorkReport] = useState<DailyWorkReport | null>(null);
  const [payCutsList, setPayCutsList] = useState<any[]>([]);

  // Selected Pay Cut for Printable Slip Modal
  const [selectedPayCut, setSelectedPayCut] = useState<any | null>(null);

  // Initialize staff session
  useEffect(() => {
    try {
      const storedId = localStorage.getItem("staff_id") || "staff-01";
      const storedName = localStorage.getItem("staff_name") || "Staff Member";
      const storedBranch = localStorage.getItem("staff_branch") || localStorage.getItem("user_branch") || "KPHB Branch";
      const shiftStart = localStorage.getItem("shift_start_time") || "09:00 AM";

      setStaff({
        id: storedId,
        name: storedName,
        branch: storedBranch,
        shiftStartTime: shiftStart,
        isAccessGranted: true,
      });

      // Verify access with server
      fetchStaffDetails(storedId, storedName, storedBranch, shiftStart);
    } catch {
      setLoading(false);
    }
  }, []);

  const fetchStaffDetails = async (id: string, name: string, branch: string, shiftStart: string) => {
    try {
      // 1. Fetch employee record to verify access granted
      const empRes = await fetch("/api/admin/employees");
      const empData = await empRes.json();
      if (empData.success && Array.isArray(empData.employees)) {
        const found = empData.employees.find((e: any) => e.id === id || e.phone?.includes(id));
        if (found) {
          if (found.isAccessGranted === false) {
            setAccessDeniedMsg(
              "Access Not Granted: Your staff login access has been suspended or not yet activated by HR or Admin. Please contact your Branch HR/Admin to give you access."
            );
            setLoading(false);
            return;
          }
          setStaff({
            id: found.id,
            name: found.name,
            branch: found.branchName || branch,
            shiftStartTime: found.shiftStartTime || shiftStart,
            isAccessGranted: true,
          });
        }
      }

      // 2. Fetch today's attendance
      const attRes = await fetch(`/api/staff/attendance/today?staffId=${id}`);
      const attData = await attRes.json();
      if (attData.success && attData.record) {
        setTodayAttendance(attData.record);
      }

      // 3. Fetch leaves
      const lvRes = await fetch(`/api/staff/leaves?staffId=${id}`);
      const lvData = await lvRes.json();
      if (lvData.success && Array.isArray(lvData.leaves)) {
        setLeavesList(lvData.leaves);
      }

      // 4. Fetch daily work report
      const workRes = await fetch(`/api/staff/daily-work?staffId=${id}`);
      const workData = await workRes.json();
      if (workData.success && Array.isArray(workData.reports)) {
        const todayStr = new Date().toISOString().split("T")[0];
        const match = workData.reports.find((r: any) => r.date === todayStr);
        if (match) setTodayWorkReport(match);
      }

      // 5. Fetch pay cuts
      const pcRes = await fetch(`/api/admin/pay-cuts?employeeId=${id}`);
      const pcData = await pcRes.json();
      if (pcData.success && Array.isArray(pcData.payCuts)) {
        setPayCutsList(pcData.payCuts);
      }
    } catch (err) {
      console.warn("Staff dashboard initial load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    localStorage.removeItem("staff_id");
    localStorage.removeItem("staff_name");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying staff credentials...</p>
        </div>
      </div>
    );
  }

  // Access Denied Screen (If HR/Admin has revoked or not granted access)
  if (accessDeniedMsg) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-rose-200 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Login Access Required</h2>
          <p className="text-xs text-rose-600 font-semibold mt-2 px-2 leading-relaxed">
            {accessDeniedMsg}
          </p>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900">{staff.name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  Staff Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> {staff.branch}
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">
                  Shift: {staff.shiftStartTime || "09:00 AM"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab("attendance")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === "attendance"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <Clock className="w-4 h-4" /> Attendance &amp; Punch
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("daily_work")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === "daily_work"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <Briefcase className="w-4 h-4" /> Daily Work Report
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("leaves")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === "leaves"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <Calendar className="w-4 h-4" /> Leave Applications
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pay_cuts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === "pay_cuts"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <DollarSign className="w-4 h-4" /> My Pay Cuts &amp; Slips
              {payCutsList.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {payCutsList.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: ATTENDANCE PUNCH CARD */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <StaffAttendancePunchCard
              staff={staff}
              todayRecord={todayAttendance}
              onPunchSuccess={(updated) => setTodayAttendance(updated)}
            />
          </div>
        )}

        {/* TAB 2: DAILY WORK SUBMISSION */}
        {activeTab === "daily_work" && (
          <div className="space-y-6">
            <StaffDailyWorkSubmission
              staff={staff}
              existingSubmission={todayWorkReport}
              onWorkSubmitted={(saved) => setTodayWorkReport(saved)}
            />
          </div>
        )}

        {/* TAB 3: LEAVE APPLICATION & HISTORY */}
        {activeTab === "leaves" && (
          <div className="space-y-6">
            <StaffLeaveRequestSection
              staff={staff}
              leavesList={leavesList}
              onLeaveSubmitted={(newLv) => setLeavesList((prev) => [newLv, ...prev])}
            />
          </div>
        )}

        {/* TAB 4: MY PAY CUTS & SALARY SLIPS */}
        {activeTab === "pay_cuts" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">My Pay Cuts &amp; Disciplinary Deductions</h3>
                  <p className="text-xs text-slate-500">
                    Review miscellaneous salary deductions and late penalties issued by HR / Admin.
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl text-right">
                  <span className="text-[10px] font-bold text-rose-600 uppercase block">Total Deductions</span>
                  <span className="text-lg font-black text-rose-700">
                    ₹{payCutsList.reduce((acc, c) => acc + (Number(c.amount) || 0), 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {payCutsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No Pay Cuts Recorded</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You have 0 salary penalties or deductions for this period. Great job!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Date / Month</th>
                        <th className="py-3 px-4">Reason / Description</th>
                        <th className="py-3 px-4">Issued By</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                        <th className="py-3 px-4 text-center">Formal Slip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payCutsList.map((cut) => (
                        <tr key={cut.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <div>{cut.date}</div>
                            <span className="text-[10px] text-slate-400 font-normal">{cut.month}</span>
                          </td>
                          <td className="py-3.5 px-4 max-w-sm text-slate-700">
                            <span className="font-semibold block text-slate-900">{cut.reason}</span>
                            {cut.image && (
                              <a
                                href={cut.image}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 underline font-semibold mt-1 inline-block"
                              >
                                View Attachment Proof
                              </a>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{cut.issuedBy || "Admin"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-rose-600 text-sm whitespace-nowrap">
                            - ₹{Number(cut.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPayCut(cut)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-xs cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Slip</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* FORMAL SALARY DEDUCTION MEMO / PDF PRINT MODAL                      */}
      {/* =================================================================== */}
      {selectedPayCut && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Action Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> Salary Deduction Notice
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayCut(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Memo Content */}
            <div className="p-6 bg-white space-y-4 print:p-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/SH logo.png" alt="Clinic Logo" className="h-10 w-auto object-contain" />
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Spiritual Homeopathy Clinics</p>
                </div>
                <div className="text-right text-[10px] text-slate-600">
                  <div className="font-extrabold uppercase text-slate-900">{selectedPayCut.branch}</div>
                  <div>support@spiritualhomeo.com</div>
                </div>
              </div>

              <div className="text-center py-1">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Salary Deduction / Pay Cut Slip
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Reference: {selectedPayCut.id}</p>
              </div>

              {/* Employee Details Box */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-900">{selectedPayCut.employeeName || staff.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch Location:</span>
                  <span className="font-bold text-slate-800">{selectedPayCut.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicable Month:</span>
                  <span className="font-bold text-slate-800">{selectedPayCut.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date Issued:</span>
                  <span className="font-bold text-slate-800">{selectedPayCut.date}</span>
                </div>
              </div>

              {/* Deduction Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-700 flex justify-between">
                  <span>Particulars / Reason</span>
                  <span>Deduction Amount</span>
                </div>
                <div className="p-3 flex justify-between items-start border-t border-slate-100">
                  <div className="max-w-xs">
                    <p className="font-bold text-slate-900">{selectedPayCut.reason}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Authorized by {selectedPayCut.issuedBy}</p>
                  </div>
                  <div className="font-black text-rose-600 text-base">
                    - ₹{Number(selectedPayCut.amount).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-end text-[10px] text-slate-500 border-t border-slate-100">
                <div>
                  <p className="italic">Computer-generated deduction slip.</p>
                  <p>Spiritual Homeopathy HR Department</p>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b border-slate-400 mb-1" />
                  <p className="font-bold">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

