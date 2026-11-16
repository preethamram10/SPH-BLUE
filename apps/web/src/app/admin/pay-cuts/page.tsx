"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
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
  ExternalLink,
  Eye,
  Loader2,
  Image as ImageIcon,
  Share2,
  Copy,
  Download,
} from "lucide-react";
import {
  downloadPayCutPDF,
  sharePayCutPDF,
  printPayCutSlip,
} from "@/utils/generatePayCutPDF";

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
  const [uploadingImage, setUploadingImage] = useState(false);

  // Attachment Full-Screen Preview Modal
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Printable Notice State
  const [selectedSlip, setSelectedSlip] = useState<PayCutItem | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);

  const currentSlipEmp = selectedSlip
    ? employees.find((e) => e.id === selectedSlip.employeeId || e.name === selectedSlip.employeeName)
    : null;
  const empPhone = currentSlipEmp?.phone || currentSlipEmp?.phoneNumber || "";
  const baseSalary = Number(currentSlipEmp?.salary || currentSlipEmp?.baseSalary || 25000);
  const deductionAmount = Number(selectedSlip?.amount || 0);
  const netSalary = Math.max(0, baseSalary - deductionAmount);

  const [sharingPdf, setSharingPdf] = useState(false);

  const handleSharePdfAttachment = async () => {
    if (!selectedSlip) return;
    setSharingPdf(true);
    try {
      await sharePayCutPDF(selectedSlip, currentSlipEmp);
    } catch (err) {
      console.error("Error sharing PDF memo:", err);
      downloadPayCutPDF(selectedSlip, currentSlipEmp);
    } finally {
      setSharingPdf(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedSlip) return;
    downloadPayCutPDF(selectedSlip, currentSlipEmp);
  };

  const handlePrintSlip = () => {
    if (!selectedSlip) return;
    printPayCutSlip(selectedSlip, currentSlipEmp);
  };

  const handleCopyMemo = () => {
    if (!selectedSlip) return;
    const text = `SPIRITUAL HOMEOPATHY CLINICS - SALARY DEDUCTION NOTICE
Ref: ${selectedSlip.id}
Employee: ${selectedSlip.employeeName} (${selectedSlip.branch})
Mobile: ${empPhone || "On File"}
Month: ${selectedSlip.month} | Date: ${selectedSlip.date}
Gross Base: ₹${baseSalary.toLocaleString("en-IN")}
Deduction: -₹${deductionAmount.toLocaleString("en-IN")}
Net Adjusted: ₹${netSalary.toLocaleString("en-IN")}
Reason: ${selectedSlip.reason}
Approved By: ${selectedSlip.issuedBy}
${selectedSlip.image ? `Proof: ${selectedSlip.image}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      if (selectedEmpId) {
        formData.append("employeeId", selectedEmpId);
      }

      const res = await fetch("/api/admin/pay-cuts/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setCutImage(data.url);
      } else {
        alert(data.error || "Failed to upload file to AWS S3.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Network error while uploading proof to AWS S3.");
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    setCutMonth(new Date().toLocaleString("en-US", { month: "short", year: "numeric" }));
    setCutDate(new Date().toISOString().split("T")[0]);
  }, []);

  const fetchPayCuts = async () => {
    try {
      setLoading(true);
      const [pcRes, empRes, branchRes] = await Promise.all([
        fetch("/api/admin/pay-cuts"),
        fetch("/api/admin/employees"),
        fetch("/api/branches").catch(() => null),
      ]);
      const pcData = await pcRes.json();
      const empData = await empRes.json();

      if (branchRes && branchRes.ok) {
        try {
          const bData = await branchRes.json();
          const list = Array.isArray(bData.data) ? bData.data : [];
          if (list.length > 0) {
            const names: string[] = list.map((b: any) => String(b.name || "").trim()).filter(Boolean);
            setBranches(["All Branches", ...Array.from(new Set(names))]);
          }
        } catch (_) {}
      }

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
      <AdminSidebar currentPath="/admin/pay-cuts" />

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
                            <button
                              type="button"
                              onClick={() => setPreviewImageModal(cut.image!)}
                              className="text-[10px] text-sky-600 hover:text-sky-800 underline font-semibold mt-1 flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> View Proof / Memo
                            </button>
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

              {/* Attachment Proof Upload & Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attachment Proof / Image File (AWS S3)
                </label>

                {cutImage ? (
                  <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {cutImage.match(/\.(jpeg|jpg|png|gif|webp)($|\?)/i) || cutImage.startsWith("data:image") ? (
                        <img
                          src={cutImage}
                          alt="Proof"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPreviewImageModal(cutImage)}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">Proof Uploaded (AWS S3)</p>
                        <button
                          type="button"
                          onClick={() => setPreviewImageModal(cutImage)}
                          className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Preview Attachment
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCutImage("")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Remove Attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className={`flex flex-col items-center justify-center w-full px-4 py-3.5 rounded-xl border-2 border-dashed ${uploadingImage ? "border-rose-400 bg-rose-50/50" : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"} transition cursor-pointer`}>
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
                          <span className="text-xs font-bold text-rose-700">Uploading proof to AWS S3...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-center">
                          <Upload className="w-5 h-5 text-slate-400 mb-0.5" />
                          <span className="text-xs font-bold text-slate-700">Upload Photo or Document Proof</span>
                          <span className="text-[10px] text-slate-400">JPG, PNG, PDF up to 10MB (stored securely in AWS S3)</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={uploadingImage}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
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
      {/* FORMAL SALARY DEDUCTION SLIP & INVOICE PRINT/SHARE MODAL            */}
      {/* =================================================================== */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 my-auto">
            {/* Action Bar (Hidden on print) */}
            <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 no-print">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> Disciplinary Pay Cut Invoice Memo
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Share PDF Attachment (Native File Share / WhatsApp Attachment with NO TEXT) */}
                <button
                  type="button"
                  onClick={handleSharePdfAttachment}
                  disabled={sharingPdf}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Share official PDF memo attachment directly (no plain text)"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{sharingPdf ? "Sharing PDF..." : `Share PDF ${empPhone ? `(${empPhone.slice(-4)})` : ""}`}</span>
                </button>

                {/* Direct Download PDF */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Download Salary Deduction Memo PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {/* Print / Save as PDF */}
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Open Printable A4 Invoice Sheet"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => setSelectedSlip(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="printable-pay-cut-slip" className="p-6 sm:p-8 bg-white space-y-4 text-slate-800">
              {/* Upper Header with Logo */}
              <div className="flex items-start justify-between border-b-2 border-rose-600 pb-3.5">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/SH logo.png" alt="Clinic Logo" className="h-12 w-auto object-contain" />
                  <h3 className="font-black text-slate-900 text-sm tracking-tight mt-1">
                    Spiritual Homeopathy Clinics
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Center of Excellence in Classical Homeopathy
                  </p>
                </div>
                <div className="text-right text-[10.5px] text-slate-600 space-y-0.5">
                  <div className="font-extrabold text-xs text-rose-600 uppercase tracking-wide">
                    {selectedSlip.branch}
                  </div>
                  <div>Tel: +91 99999 99999</div>
                  <div>Email: hr@spiritualhomeo.com</div>
                  <div className="text-[10px] text-slate-400">GSTIN / Reg Clinic Entity</div>
                </div>
              </div>

              {/* Notice Title Banner */}
              <div className="text-center py-1 border-b border-slate-100">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                  Official Salary Deduction &amp; Disciplinary Memo
                </h2>
                <div className="flex items-center justify-center gap-4 text-[10.5px] text-slate-400 font-medium mt-0.5">
                  <span>Ref No: <strong className="text-slate-700">{selectedSlip.id}</strong></span>
                  <span>•</span>
                  <span>Date Generated: <strong className="text-slate-700">{selectedSlip.date}</strong></span>
                </div>
              </div>

              {/* Employee & Incident Information Box */}
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10.5px] text-slate-400 font-bold uppercase block">Employee Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedSlip.employeeName}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 font-bold uppercase block">Employee ID / Category</span>
                  <span className="font-bold text-slate-800">{currentSlipEmp?.id || selectedSlip.employeeId} ({currentSlipEmp?.category || "Staff"})</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 font-bold uppercase block">Branch Location</span>
                  <span className="font-bold text-slate-800">{selectedSlip.branch}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 font-bold uppercase block">Mobile Number</span>
                  <span className="font-bold text-slate-800">{empPhone || "On File (+91)"}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 font-bold uppercase block">Applicable Salary Month</span>
                  <span className="font-extrabold text-rose-600">{selectedSlip.month}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 font-bold uppercase block">Deduction / Incident Date</span>
                  <span className="font-bold text-slate-800">{selectedSlip.date}</span>
                </div>
              </div>

              {/* Invoice-Style Salary Impact Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Salary Component / Description</th>
                      <th className="py-2.5 px-4 text-center">Type</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        Monthly Gross Base Salary
                        <div className="text-[10.5px] text-slate-400 font-normal">Applicable for {selectedSlip.month}</div>
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500 font-semibold">Credit</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        ₹{baseSalary.toLocaleString("en-IN")}.00
                      </td>
                    </tr>
                    <tr className="bg-rose-50/50">
                      <td className="py-2.5 px-4 font-bold text-rose-900">
                        Disciplinary Penalty / Pay Cut
                        <div className="text-[10.5px] text-rose-700 font-normal">Ref: {selectedSlip.id}</div>
                      </td>
                      <td className="py-2.5 px-4 text-center text-rose-700 font-bold">Deduction</td>
                      <td className="py-2.5 px-4 text-right font-black text-rose-600 text-sm">
                        - ₹{deductionAmount.toLocaleString("en-IN")}.00
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td className="py-3 px-4 uppercase tracking-wider" colSpan={2}>
                        Net Adjusted Payout for {selectedSlip.month}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                        ₹{netSalary.toLocaleString("en-IN")}.00
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Reason / Incident Description Box */}
              <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/80 text-xs space-y-1">
                <span className="text-[10.5px] font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Reason for Pay Cut &amp; HR Findings
                </span>
                <p className="text-slate-800 leading-relaxed font-medium pt-0.5">
                  {selectedSlip.reason}
                </p>
                <div className="text-[10.5px] text-slate-500 pt-1 font-semibold">
                  Approved &amp; Logged by: <strong className="text-slate-800">{selectedSlip.issuedBy}</strong>
                </div>
              </div>

              {/* Proof Image Embedded (If present) */}
              {selectedSlip.image && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-600 uppercase flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Attached Incident Proof (AWS S3)
                    </span>
                    <a
                      href={selectedSlip.image}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-sky-600 font-semibold underline flex items-center gap-1"
                    >
                      Open Original <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  {selectedSlip.image.match(/\.(jpeg|jpg|png|gif|webp)($|\?)/i) || selectedSlip.image.startsWith("data:image") ? (
                    <div className="flex justify-center max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedSlip.image}
                        alt="Proof"
                        className="max-h-48 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 flex items-center gap-2 py-1">
                      <FileText className="w-4 h-4 text-rose-500" />
                      <span>Document attachment stored on AWS S3: {selectedSlip.image}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Lower Clinic Footer & Sign-Off */}
              <div className="pt-5 border-t border-slate-200 grid grid-cols-2 items-end text-[10px] text-slate-500">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-700">Spiritual Homeopathy Administration</p>
                  <p className="italic">Computer-generated official disciplinary &amp; salary deduction memo.</p>
                  <p>Retain this notice for personal accounting and tax filing purposes.</p>
                </div>
                <div className="text-right">
                  <div className="inline-block text-center min-w-36">
                    <div className="w-36 border-b border-slate-400 mb-1" />
                    <p className="font-extrabold text-slate-800 text-[11px]">Authorized Signatory</p>
                    <p className="text-[9.5px] text-slate-400">HR &amp; Finance Department</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print isolation styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-pay-cut-slip, #printable-pay-cut-slip * {
            visibility: visible;
          }
          #printable-pay-cut-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* =================================================================== */}
      {/* ATTACHMENT PROOF LIGHTBOX PREVIEW MODAL                              */}
      {/* =================================================================== */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-rose-400" /> Pay Cut Attachment Proof (AWS S3)
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImageModal}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Open Full
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-auto">
              {previewImageModal.match(/\.(pdf)($|\?)/i) ? (
                <iframe src={previewImageModal} className="w-full h-[65vh] rounded-lg" title="PDF Proof" />
              ) : (
                <img
                  src={previewImageModal}
                  alt="Attachment Proof"
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

