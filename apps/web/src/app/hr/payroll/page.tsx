"use client";

import React, { useState, useEffect, useMemo } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  DollarSign,
  Clock,
  AlertCircle,
  Settings2,
  Printer,
  Calendar,
  Building2,
  Search,
  CheckCircle2,
  FileText,
  UserCheck,
  TrendingDown,
  X,
} from "lucide-react";

export interface LateRuleConfig {
  shiftStartTime: string;
  graceMinutes: number;
  lateThresholdDays: number;
  lateThresholdMinutes: number;
  penaltyAmount: number;
}

export default function AdminPayrollPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [payCuts, setPayCuts] = useState<any[]>([]);
  const [lateConfig, setLateConfig] = useState<LateRuleConfig>({
    shiftStartTime: "09:00 AM",
    graceMinutes: 15,
    lateThresholdDays: 3,
    lateThresholdMinutes: 15,
    penaltyAmount: 500,
  });

  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Policy Settings Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [cfgStartTime, setCfgStartTime] = useState("09:00 AM");
  const [cfgGraceMins, setCfgGraceMins] = useState(15);
  const [cfgThresholdDays, setCfgThresholdDays] = useState(3);
  const [cfgThresholdMins, setCfgThresholdMins] = useState(15);
  const [cfgPenaltyAmount, setCfgPenaltyAmount] = useState(500);
  const [savingConfig, setSavingConfig] = useState(false);

  // Selected Employee for Salary Slip Modal
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilshuknagar Branch"];

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [empRes, attRes, pcRes, ruleRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch("/api/admin/attendance"),
        fetch("/api/admin/pay-cuts"),
        fetch("/api/admin/payroll/rules"),
      ]);

      const empData = await empRes.json();
      const attData = await attRes.json();
      const pcData = await pcRes.json();
      const ruleData = await ruleRes.json();

      if (empData.success && Array.isArray(empData.employees)) {
        setEmployees(empData.employees);
      }
      if (attData.success && Array.isArray(attData.records)) {
        setAttendanceRecords(attData.records);
      }
      if (pcData.success && Array.isArray(pcData.payCuts)) {
        setPayCuts(pcData.payCuts);
      }
      if (ruleData.success && ruleData.config) {
        setLateConfig(ruleData.config);
        setCfgStartTime(ruleData.config.shiftStartTime || "09:00 AM");
        setCfgGraceMins(ruleData.config.graceMinutes || 15);
        setCfgThresholdDays(ruleData.config.lateThresholdDays || 3);
        setCfgThresholdMins(ruleData.config.lateThresholdMinutes || 15);
        setCfgPenaltyAmount(ruleData.config.penaltyAmount || 500);
      }
    } catch (err) {
      console.error("Payroll data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload: LateRuleConfig = {
        shiftStartTime: cfgStartTime,
        graceMinutes: Number(cfgGraceMins),
        lateThresholdDays: Number(cfgThresholdDays),
        lateThresholdMinutes: Number(cfgThresholdMins),
        penaltyAmount: Number(cfgPenaltyAmount),
      };

      const res = await fetch("/api/admin/payroll/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setLateConfig(data.config);
        setIsConfigModalOpen(false);
      } else {
        alert("Failed to update late penalty rules");
      }
    } catch {
      alert("Error saving rules");
    } finally {
      setSavingConfig(false);
    }
  };

  // Compute calculated payroll for each employee
  const payrollList = useMemo(() => {
    return employees.map((emp) => {
      const baseSalary = Number(emp.salary) || 20000;

      // Filter attendance records for this staff member
      const staffAtt = attendanceRecords.filter((a) => a.staffId === emp.id || a.staffName === emp.name);
      const lateRecords = staffAtt.filter((a) => a.status === "Late" || (a.lateMinutes && a.lateMinutes > 0));
      const lateDaysCount = lateRecords.length;
      const totalLateMinutes = lateRecords.reduce((acc, a) => acc + (a.lateMinutes || 0), 0);

      // Late Penalty Calculation Rule:
      // If late for threshold days (e.g. 3) and total late minutes >= threshold (e.g. 15), apply penalty amount (e.g. 500)
      const latePenaltyMultiplier = Math.floor(lateDaysCount / (lateConfig.lateThresholdDays || 3));
      const hasLateThresholdMet =
        lateDaysCount >= (lateConfig.lateThresholdDays || 3) &&
        totalLateMinutes >= (lateConfig.lateThresholdMinutes || 15);

      const calculatedLateCut = hasLateThresholdMet
        ? Math.max(1, latePenaltyMultiplier) * (lateConfig.penaltyAmount || 500)
        : 0;

      // Miscellaneous Pay Cuts
      const empCuts = payCuts.filter((c) => c.employeeId === emp.id || c.employeeName === emp.name);
      const totalMiscCuts = empCuts.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

      const totalDeductions = calculatedLateCut + totalMiscCuts;
      const netPayable = Math.max(0, baseSalary - totalDeductions);

      return {
        ...emp,
        baseSalary,
        lateDaysCount,
        totalLateMinutes,
        calculatedLateCut,
        totalMiscCuts,
        totalDeductions,
        netPayable,
        miscCutsList: empCuts,
      };
    });
  }, [employees, attendanceRecords, payCuts, lateConfig]);

  const filteredPayroll = payrollList.filter((item) => {
    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.branchName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch =
      selectedBranch === "All Branches" || (item.branchName || "").toLowerCase().includes(selectedBranch.toLowerCase());
    return matchesSearch && matchesBranch;
  });

  const totalGrossSalaries = filteredPayroll.reduce((acc, p) => acc + p.baseSalary, 0);
  const totalLatePenalties = filteredPayroll.reduce((acc, p) => acc + p.calculatedLateCut, 0);
  const totalMiscDeductions = filteredPayroll.reduce((acc, p) => acc + p.totalMiscCuts, 0);
  const totalNetDisbursement = filteredPayroll.reduce((acc, p) => acc + p.netPayable, 0);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/payroll" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Staff Payroll &amp; Late Penalties</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Automated attendance late calculations (3 days &gt; 15m rule), salary cuts &amp; disbursement
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
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
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 w-44 bg-white focus:outline-none"
                />
              </div>

              {/* Configure Late Policy Button */}
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" /> Configure Late Policy
              </button>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl space-y-6">
          {/* Active Policy Notice Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Active Attendance Late Deduction Policy</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Shift Start: <span className="font-bold text-slate-900">{lateConfig.shiftStartTime}</span> (Grace: {lateConfig.graceMinutes}m) •
                  If late for <span className="font-bold text-rose-700">{lateConfig.lateThresholdDays} days</span> with ≥{" "}
                  <span className="font-bold text-rose-700">{lateConfig.lateThresholdMinutes} mins</span> mix, deduct{" "}
                  <span className="font-black text-rose-700">₹{lateConfig.penaltyAmount}</span>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 underline shrink-0 cursor-pointer"
            >
              Change Policy Settings
            </button>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Total Gross Salaries</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">₹{totalGrossSalaries.toLocaleString("en-IN")}</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Late Penalties Cut</p>
              <h3 className="text-xl font-extrabold text-amber-600 mt-1">- ₹{totalLatePenalties.toLocaleString("en-IN")}</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Misc Pay Cuts</p>
              <h3 className="text-xl font-extrabold text-rose-600 mt-1">- ₹{totalMiscDeductions.toLocaleString("en-IN")}</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Net Disbursable Salary</p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">₹{totalNetDisbursement.toLocaleString("en-IN")}</h3>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Base Salary</th>
                    <th className="py-3 px-4 text-center">Late Days</th>
                    <th className="py-3 px-4 text-center">Total Late Mins</th>
                    <th className="py-3 px-4 text-right">Late Penalty Cut</th>
                    <th className="py-3 px-4 text-right">Misc Pay Cuts</th>
                    <th className="py-3 px-4 text-right">Net Payable Salary</th>
                    <th className="py-3 px-4 text-center">Salary Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">Loading payroll calculations...</td>
                    </tr>
                  ) : filteredPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">No staff records found.</td>
                    </tr>
                  ) : (
                    filteredPayroll.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {item.branchName || "KPHB Branch"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹{item.baseSalary.toLocaleString("en-IN")}
                        </td>

                        {/* Late Days */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${item.lateDaysCount >= lateConfig.lateThresholdDays
                                ? "bg-rose-100 text-rose-800"
                                : item.lateDaysCount > 0
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                          >
                            {item.lateDaysCount} days
                          </span>
                        </td>

                        {/* Total Late Mins */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {item.totalLateMinutes} mins
                        </td>

                        {/* Late Penalty */}
                        <td className="py-3.5 px-4 text-right font-bold text-amber-600 whitespace-nowrap">
                          {item.calculatedLateCut > 0 ? `- ₹${item.calculatedLateCut.toLocaleString("en-IN")}` : "₹0"}
                        </td>

                        {/* Misc Cuts */}
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          {item.totalMiscCuts > 0 ? `- ₹${item.totalMiscCuts.toLocaleString("en-IN")}` : "₹0"}
                        </td>

                        {/* Net Payable */}
                        <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                          ₹{item.netPayable.toLocaleString("en-IN")}
                        </td>

                        {/* Action: View Slip */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedPayslip(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-xs cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>Slip</span>
                          </button>
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

      {/* =================================================================== */}
      {/* ⚙️ CONFIGURE LATE POLICY MODAL                                      */}
      {/* =================================================================== */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Attendance Late Penalty Policy</h3>
                  <p className="text-[11px] text-slate-500">Configure cutoff time, threshold &amp; salary deduction</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift Start Time</label>
                  <input
                    type="text"
                    required
                    placeholder="09:00 AM"
                    value={cfgStartTime}
                    onChange={(e) => setCfgStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grace Buffer (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={cfgGraceMins}
                    onChange={(e) => setCfgGraceMins(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Late Threshold Days</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cfgThresholdDays}
                    onChange={(e) => setCfgThresholdDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Default: 3 days</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mix Late Minutes Total</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cfgThresholdMins}
                    onChange={(e) => setCfgThresholdMins(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Default: 15 mins</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Salary Cut Penalty Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={cfgPenaltyAmount}
                  onChange={(e) => setCfgPenaltyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-black text-rose-600 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10.5px] text-slate-400 italic">
                  Configurable by HR and Admin (not constant) — default: ₹500
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 📄 FULL SALARY DISBURSEMENT SLIP PRINT MODAL                        */}
      {/* =================================================================== */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> Monthly Salary Slip
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
                  onClick={() => setSelectedPayslip(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 bg-white space-y-4 print:p-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/SH logo.png" alt="Clinic Logo" className="h-10 w-auto object-contain" />
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Spiritual Homeopathy Clinics</p>
                </div>
                <div className="text-right text-[10px] text-slate-600">
                  <div className="font-extrabold uppercase text-slate-900">{selectedPayslip.branchName || "KPHB Branch"}</div>
                  <div>support@spiritualhomeo.com</div>
                </div>
              </div>

              <div className="text-center py-1">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Employee Salary Disbursement Slip
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Employee ID: {selectedPayslip.id}</p>
              </div>

              {/* Staff Details Box */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-900">{selectedPayslip.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch Location:</span>
                  <span className="font-bold text-slate-800">{selectedPayslip.branchName || "KPHB"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Late Days Logged:</span>
                  <span className="font-bold text-slate-800">{selectedPayslip.lateDaysCount} days ({selectedPayslip.totalLateMinutes} mins)</span>
                </div>
              </div>

              {/* Salary Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-700 flex justify-between">
                  <span>Earnings &amp; Deductions</span>
                  <span>Amount (₹)</span>
                </div>
                <div className="p-3 space-y-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-800">
                    <span>Monthly Base Salary</span>
                    <span className="font-bold">₹{selectedPayslip.baseSalary.toLocaleString("en-IN")}</span>
                  </div>

                  {selectedPayslip.calculatedLateCut > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Attendance Late Penalty ({selectedPayslip.lateDaysCount} days ≥ 15m rule)</span>
                      <span className="font-bold">- ₹{selectedPayslip.calculatedLateCut.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {selectedPayslip.totalMiscCuts > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Disciplinary &amp; Misc Pay Cuts</span>
                      <span className="font-bold">- ₹{selectedPayslip.totalMiscCuts.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                    <span className="font-black text-slate-900 uppercase">Net Disbursed Salary</span>
                    <span className="font-black text-emerald-700 text-base">
                      ₹{selectedPayslip.netPayable.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-end text-[10px] text-slate-500 border-t border-slate-100">
                <div>
                  <p className="italic">Computer-generated official pay slip.</p>
                  <p>Spiritual Homeopathy Finance &amp; HR</p>
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

