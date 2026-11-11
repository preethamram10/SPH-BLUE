"use client";

import React, { useState, useEffect } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  DollarSign,
  Plus,
  Trash2,
  Printer,
  Calendar,
  Building2,
  Search,
  FileText,
  AlertTriangle,
  Upload,
  User,
  X,
  Check,
} from "lucide-react";

export interface PayCutItem {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  amount: number;
  reason: string;
  month: string;
  date: string;
  image?: string;
  issuedBy: string;
  createdAt: string;
}

export default function AdminPayCutsPage() {
  const [payCuts, setPayCuts] = useState<PayCutItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<string[]>([
    "All Branches",
    "KPHB Branch",
    "Chandanagar Branch",
    "Nallagandla Branch",
    "Dilshuknagar Branch",
  ]);

  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [cutAmount, setCutAmount] = useState("");
  const [cutReason, setCutReason] = useState("");
  const [cutMonth, setCutMonth] = useState("");
  const [cutDate, setCutDate] = useState("");
  const [cutImage, setCutImage] = useState("");

  // Printable Notice State
  const [selectedSlip, setSelectedSlip] = useState<PayCutItem | null>(null);

  useEffect(() => {
    setCutMonth(new Date().toLocaleString("en-US", { month: "short", year: "numeric" }));
    setCutDate(new Date().toISOString().split("T")[0]);
  }, []);

  const fetchPayCuts = async () => {
    try {
      setLoading(true);
      const [pcRes, empRes] = await Promise.all([
        fetch("/api/admin/pay-cuts"),
        fetch("/api/admin/employees"),
      ]);
      const pcData = await pcRes.json();
      const empData = await empRes.json();

      if (pcData.success && Array.isArray(pcData.payCuts)) {
        setPayCuts(pcData.payCuts);
      }
      if (empData.success && Array.isArray(empData.employees)) {
        setEmployees(empData.employees);
        if (empData.employees.length > 0 && !selectedEmpId) {
          setSelectedEmpId(empData.employees[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load pay cuts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayCuts();
  }, []);

  const handleCreatePayCut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !cutAmount || !cutReason.trim()) {
      alert("Please select employee, enter amount, and provide reason.");
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmpId);
    setSubmitting(true);

    try {
      const payload = {
        employeeId: selectedEmpId,
        employeeName: emp?.name || "Staff Member",
        branch: emp?.branchName || "KPHB Branch",
        amount: Number(cutAmount),
        reason: cutReason.trim(),
        month: cutMonth,
        date: cutDate,
        image: cutImage.trim() || undefined,
        issuedBy: "Admin / HR",
      };

      const res = await fetch("/api/admin/pay-cuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.payCut) {
        setPayCuts((prev) => [data.payCut, ...prev]);
        setIsAddModalOpen(false);
        setCutAmount("");
        setCutReason("");
        setCutImage("");
      } else {
        alert(data.error || "Failed to create pay cut");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the pay cut for ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/pay-cuts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setPayCuts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      alert("Network error deleting pay cut");
    }
  };

  const filteredCuts = payCuts.filter((item) => {
    const matchesSearch =
      (item.employeeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reason || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch =
      selectedBranch === "All Branches" || (item.branch || "").toLowerCase().includes(selectedBranch.toLowerCase());
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/pay-cuts" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Miscellaneous Pay Cuts &amp; Penalties</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Issue discretionary pay cuts, property damage deductions &amp; print formal deduction slips
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
                  placeholder="Search staff or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 w-48 bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Issue Pay Cut
              </button>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-7xl space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Total Pay Cuts Logged</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">{filteredCuts.length} Records</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Total Deducted Amount</p>
              <h3 className="text-xl font-extrabold text-rose-600 mt-1">
                ₹{filteredCuts.reduce((acc, c) => acc + (Number(c.amount) || 0), 0).toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase">Active Month</p>
              <h3 className="text-base font-extrabold text-slate-800 mt-1">{cutMonth}</h3>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Month</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Issued By</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">Loading pay cuts...</td>
                    </tr>
                  ) : filteredCuts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No pay cuts issued for this filter.</p>
                        <p className="text-[11px] text-slate-400">Click &quot;Issue Pay Cut&quot; above to deduct a penalty.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCuts.map((cut) => (
                      <tr key={cut.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div>{cut.date}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{cut.month}</span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                          {cut.employeeName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {cut.branch}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs text-slate-800">
                          <p className="font-medium">{cut.reason}</p>
                          {cut.image && (
                            <a
                              href={cut.image}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-sky-600 underline font-semibold mt-0.5 inline-block"
                            >
                              View Proof / Receipt
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-rose-600 text-sm whitespace-nowrap">
                          - ₹{Number(cut.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {cut.issuedBy}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSlip(cut)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                              title="Generate PDF / Print Deduction Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(cut.id, cut.employeeName)}
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                              title="Delete Pay Cut"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
      {/* ➕ ISSUE PAY CUT MODAL                                              */}
      {/* =================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Issue Disciplinary Pay Cut</h3>
                  <p className="text-[11px] text-slate-500">Deduct salary for an employee with memo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayCut} className="space-y-3.5">
              {/* Select Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.branchName || "Main"} - {emp.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Month */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deduction Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={cutAmount}
                    onChange={(e) => setCutAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Applicable Month</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nov 2026"
                    value={cutMonth}
                    onChange={(e) => setCutMonth(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Incident / Deduction Date</label>
                <input
                  type="date"
                  required
                  value={cutDate}
                  onChange={(e) => setCutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Pay Cut *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Uninformed absence, register cash mismatch, damaged clinic equipment..."
                  value={cutReason}
                  onChange={(e) => setCutReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Optional Image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attachment Proof / Image URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://... or data:image/..."
                  value={cutImage}
                  onChange={(e) => setCutImage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Confirm & Save Pay Cut"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FORMAL SALARY DEDUCTION SLIP PRINT MODAL                            */}
      {/* =================================================================== */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> Deduction Memo Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Memo
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlip(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 bg-white space-y-4 print:p-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-rose-600 pb-3">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/SH logo.png" alt="Clinic Logo" className="h-10 w-auto object-contain" />
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Spiritual Homeopathy Clinics</p>
                </div>
                <div className="text-right text-[10px] text-slate-600">
                  <div className="font-extrabold uppercase text-slate-900">{selectedSlip.branch}</div>
                  <div>support@spiritualhomeo.com</div>
                </div>
              </div>

              <div className="text-center py-1">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Official Salary Deduction Notice
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Ref No: {selectedSlip.id}</p>
              </div>

              {/* Employee Details Box */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-900">{selectedSlip.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch Location:</span>
                  <span className="font-bold text-slate-800">{selectedSlip.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Month:</span>
                  <span className="font-bold text-slate-800">{selectedSlip.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date Issued:</span>
                  <span className="font-bold text-slate-800">{selectedSlip.date}</span>
                </div>
              </div>

              {/* Deduction Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-700 flex justify-between">
                  <span>Reason / Description</span>
                  <span>Amount Deducted</span>
                </div>
                <div className="p-3 flex justify-between items-start border-t border-slate-100">
                  <div className="max-w-xs">
                    <p className="font-bold text-slate-900">{selectedSlip.reason}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Approved by {selectedSlip.issuedBy}</p>
                  </div>
                  <div className="font-black text-rose-600 text-base">
                    - ₹{Number(selectedSlip.amount).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-end text-[10px] text-slate-500 border-t border-slate-100">
                <div>
                  <p className="italic">Computer-generated disciplinary deduction slip.</p>
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

