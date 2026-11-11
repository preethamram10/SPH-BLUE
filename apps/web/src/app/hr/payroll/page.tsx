"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Clock,
  Settings2,
  Printer,
  Search,
  FileText,
  X,
} from "lucide-react";
import { LateRuleConfig } from "@/app/admin/payroll/page";

export default function HRPayrollPage() {
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
      console.error("HR Payroll data loading error:", err);
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

  const payrollList = useMemo(() => {
    return employees.map((emp) => {
      const baseSalary = Number(emp.salary) || 20000;
      const staffAtt = attendanceRecords.filter((a) => a.staffId === emp.id || a.staffName === emp.name);
      const lateRecords = staffAtt.filter((a) => a.status === "Late" || (a.lateMinutes && a.lateMinutes > 0));
      const lateDaysCount = lateRecords.length;
      const totalLateMinutes = lateRecords.reduce((acc, a) => acc + (a.lateMinutes || 0), 0);

      const latePenaltyMultiplier = Math.floor(lateDaysCount / (lateConfig.lateThresholdDays || 3));
      const hasLateThresholdMet =
        lateDaysCount >= (lateConfig.lateThresholdDays || 3) &&
        totalLateMinutes >= (lateConfig.lateThresholdMinutes || 15);

      const calculatedLateCut = hasLateThresholdMet
        ? Math.max(1, latePenaltyMultiplier) * (lateConfig.penaltyAmount || 500)
        : 0;

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
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">HR Staff Payroll &amp; Late Penalties</h1>
            <p className="text-xs text-slate-500">Calculate salary deductions based on 3 days late &gt; 15 min rule</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" /> Configure Late Policy
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Policy Notice Card */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span className="text-xs text-slate-700">
              Shift Start: <strong className="text-slate-900">{lateConfig.shiftStartTime}</strong> • If late for{" "}
              <strong className="text-rose-700">{lateConfig.lateThresholdDays} days</strong> with ≥{" "}
              <strong className="text-rose-700">{lateConfig.lateThresholdMinutes} mins</strong> mix, deduct{" "}
              <strong className="text-rose-700">₹{lateConfig.penaltyAmount}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
          >
            Edit Settings
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4 text-right">Base Salary</th>
                  <th className="py-3 px-4 text-center">Late Days</th>
                  <th className="py-3 px-4 text-center">Late Mins</th>
                  <th className="py-3 px-4 text-right">Late Penalty</th>
                  <th className="py-3 px-4 text-right">Misc Cuts</th>
                  <th className="py-3 px-4 text-right">Net Payable Salary</th>
                  <th className="py-3 px-4 text-center">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">Loading payroll...</td>
                  </tr>
                ) : filteredPayroll.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.branchName || "KPHB"}</td>
                    <td className="py-3.5 px-4 text-right font-bold">₹{item.baseSalary.toLocaleString("en-IN")}</td>
                    <td className="py-3.5 px-4 text-center font-bold">{item.lateDaysCount}d</td>
                    <td className="py-3.5 px-4 text-center">{item.totalLateMinutes}m</td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-600">
                      {item.calculatedLateCut > 0 ? `- ₹${item.calculatedLateCut}` : "₹0"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                      {item.totalMiscCuts > 0 ? `- ₹${item.totalMiscCuts}` : "₹0"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                      ₹{item.netPayable.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPayslip(item)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Config Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-sm mb-3">Configure Late Penalty Policy</h3>
            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift Start Time</label>
                <input
                  type="text"
                  value={cfgStartTime}
                  onChange={(e) => setCfgStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Threshold Days</label>
                  <input
                    type="number"
                    value={cfgThresholdDays}
                    onChange={(e) => setCfgThresholdDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Threshold Mins</label>
                  <input
                    type="number"
                    value={cfgThresholdMins}
                    onChange={(e) => setCfgThresholdMins(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Salary Cut Amount (₹)</label>
                <input
                  type="number"
                  value={cfgPenaltyAmount}
                  onChange={(e) => setCfgPenaltyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-black text-rose-600 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs"
                >
                  {savingConfig ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slip Print Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> Salary Slip
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 bg-white space-y-4 print:p-8">
              <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/SH logo.png" alt="Clinic Logo" className="h-10 w-auto object-contain" />
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Spiritual Homeopathy Clinics</p>
                </div>
                <div className="text-right text-[10px] text-slate-600">
                  <div className="font-extrabold uppercase text-slate-900">{selectedPayslip.branchName || "KPHB"}</div>
                  <div>support@spiritualhomeo.com</div>
                </div>
              </div>

              <div className="text-center py-1">
                <h4 className="text-sm font-black uppercase text-slate-900">Official Salary Disbursement Slip</h4>
                <p className="text-[10px] text-slate-400">Employee ID: {selectedPayslip.id}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-900">{selectedPayslip.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Late Days Logged:</span>
                  <span className="font-bold text-slate-800">{selectedPayslip.lateDaysCount} days ({selectedPayslip.totalLateMinutes} mins)</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="p-3 space-y-2">
                  <div className="flex justify-between">
                    <span>Base Salary</span>
                    <span className="font-bold">₹{selectedPayslip.baseSalary.toLocaleString("en-IN")}</span>
                  </div>
                  {selectedPayslip.calculatedLateCut > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Late Penalty ({selectedPayslip.lateDaysCount}d ≥ 15m)</span>
                      <span className="font-bold">- ₹{selectedPayslip.calculatedLateCut.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {selectedPayslip.totalMiscCuts > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Miscellaneous Pay Cuts</span>
                      <span className="font-bold">- ₹{selectedPayslip.totalMiscCuts.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-emerald-700">
                    <span>Net Disbursed</span>
                    <span>₹{selectedPayslip.netPayable.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

