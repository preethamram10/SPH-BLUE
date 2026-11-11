"use client";

import React, { useState, useEffect, Suspense } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  Pill,
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Building2,
  Phone,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Send,
  Share2,
  ArrowLeft,
  Eye,
} from "lucide-react";
import {
  generateMedicineRequestPDF,
  MedicineRequestPDFPreviewModal,
  getBranchPhone,
} from "./pdf";
import { CLINIC_LOGO_BASE64 } from "./pdf/logoBase64";

// --- OPTIONS CONSTANTS ---
const DOSAGE_TIMING_OPTIONS = [
  { value: "", label: "Select Timing" },
  { value: "M - A - N", label: "M - A - N (Morning - Afternoon - Night)" },
  { value: "M - - E", label: "M - - E (Morning - Evening)" },
  { value: "M - - N", label: "M - - N (Morning - Night)" },
  { value: "M - A -", label: "M - A - (Morning - Afternoon)" },
  { value: "- A - N", label: "- A - N (Afternoon - Night)" },
  { value: "M - - -", label: "M - - - (Morning Only)" },
  { value: "- - N", label: "- - N (Night Only)" },
  { value: "1-0-1", label: "1-0-1 (Morning & Night)" },
  { value: "1-1-1", label: "1-1-1 (Morning, Afternoon, Night)" },
  { value: "SOS", label: "SOS (As Needed / Emergency)" },
];

const MEDICINE_TYPE_OPTIONS = [
  { value: "Pills", label: "Pills / Globules" },
  { value: "Drops", label: "Drops / Liquid Dilution" },
  { value: "Mother Tincture", label: "Mother Tincture (Q)" },
  { value: "Tablet", label: "Tablet / Biochemic" },
  { value: "Syrup", label: "Syrup" },
  { value: "Powder", label: "Powder / Trituration" },
  { value: "Ointment", label: "Ointment / Cream" },
];

const DURATION_OPTIONS = [
  "15 Days",
  "1 Month",
  "2 Months",
  "3 Months",
  "4 Months",
  "6 Months",
];

const BRANCH_OPTIONS = [
  "KPHB Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

export interface MedicineItem {
  id: string;
  name: string;
  type: string;
  timing: string;
  amount: number;
}

export interface MedicineRequestPayload {
  id?: string;
  requestId?: string;
  patientName: string;
  phone: string;
  age?: string;
  gender: string;
  branchName: string;
  duration: string;
  totalAmount: number;
  medicines: MedicineItem[];
  deliveryAddress?: string;
  notes?: string;
  status?: "pending" | "completed" | "dispatched";
  createdAt?: string;
}

function MedicalRequestsContent() {
  const [currentBranch, setCurrentBranch] = useState("KPHB Branch");
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [activeTab, setActiveTab] = useState<"ALL" | "completed">("ALL");

  // Requests List
  const [requests, setRequests] = useState<MedicineRequestPayload[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Mr.");
  const [branchName, setBranchName] = useState("KPHB Branch");
  const [duration, setDuration] = useState("1 Month");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    { id: "1", name: "", type: "Pills", timing: "M - - N", amount: 0 },
  ]);
  const [notes, setNotes] = useState("");

  // Share Popup State (WhatsApp & PDF)
  const [sharePopupData, setSharePopupData] = useState<{
    patientName: string;
    gender: string;
    phone: string;
    age?: string;
    branchName: string;
    duration: string;
    totalAmount: number;
    medicines: MedicineItem[];
    notes?: string;
  } | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Active print certificate state
  const [printCertificateData, setPrintCertificateData] = useState<{
    patientName: string;
    gender: string;
    age?: string;
    phone: string;
    branchName: string;
    duration: string;
    totalAmount: number;
    medicines: MedicineItem[];
    dateStr: string;
  } | null>(null);

  // Load branch name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) {
      const formattedBranch = saved.includes("Branch") ? saved : `${saved} Branch`;
      setCurrentBranch(formattedBranch);
      setBranchName(formattedBranch);
    }
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reception/medical-requests");
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Failed to fetch medical requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Kept empty as requested until linked out later
  useEffect(() => {
    // fetchRequests();
  }, []);

  // Handle user changing Total Medicine Fee
  const handleTotalAmountChange = (val: number) => {
    setTotalAmount(val);
    // If only 1 remedy row exists, auto-sync its individual price to match total fee
    setMedicines((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], amount: val }];
      }
      return prev;
    });
  };

  const medicinesSum = medicines.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const isFeeMatched = totalAmount > 0 ? medicinesSum === totalAmount : true;

  // --- MEDICINE ROWS HANDLERS ---
  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", type: "Pills", timing: "M - - N", amount: 0 },
    ]);
  };

  const handleRemoveMedicineRow = (id: string) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMedicine = (id: string, field: keyof MedicineItem, value: any) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleClearForm = () => {
    setPatientName("");
    setPhone("");
    setAge("");
    setGender("Mr.");
    setBranchName(currentBranch);
    setDuration("1 Month");
    setTotalAmount(0);
    setMedicines([{ id: "1", name: "", type: "Pills", timing: "M - - N", amount: 0 }]);
    setNotes("");
  };

  const handleUpdateStatus = async (id: string, newStatus: "pending" | "completed" | "dispatched") => {
    try {
      const res = await fetch("/api/reception/medical-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_STATUS", id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err: any) {
      alert(err.message || "Failed to communicate with server");
    }
  };

  // --- SHARE MEDICAL REQUEST HANDLER ---
  const handleShareMedicalRequest = () => {
    if (!patientName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }
    const validMedicines = medicines.filter((m) => m.name.trim().length > 0);
    if (validMedicines.length === 0) {
      alert("Please enter at least one medicine remedy name.");
      return;
    }

    const finalTotal = Number(totalAmount) || 0;

    // If only 1 remedy exists and amount wasn't typed, auto-sync to total fee
    if (validMedicines.length === 1 && finalTotal > 0 && (!validMedicines[0].amount || Number(validMedicines[0].amount) === 0)) {
      validMedicines[0].amount = finalTotal;
    }

    const currentRemediesSum = validMedicines.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    // Enforce that prescribed remedies sum must equal the Total Medicine Fee
    if (finalTotal > 0 && currentRemediesSum !== finalTotal) {
      alert(
        `Total Medicine Fee (₹${finalTotal}) must be equal to the sum of prescribed remedies (₹${currentRemediesSum}).\nDifference: ₹${Math.abs(finalTotal - currentRemediesSum)}\n\nPlease match the amounts to proceed with sharing.`
      );
      return;
    }

    const payload = {
      patientName: patientName.trim(),
      phone: cleanPhone.slice(-10),
      age: age.trim() || undefined,
      gender,
      branchName,
      duration,
      totalAmount: finalTotal,
      medicines: validMedicines,
      notes: notes.trim() || undefined,
    };

    // Save to DB in background
    fetch("/api/reception/medical-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchRequests();
        }
      })
      .catch((err) => console.warn("Could not save medical request to DB:", err));

    // Open Share Popup Modal immediately
    setSharePopupData(payload);
    setWhatsappPhone(cleanPhone.slice(-10));
  };

  // --- WHATSAPP SHARE HANDLER ---
  const handleSendViaWhatsApp = () => {
    if (!sharePopupData) return;
    const cleanP = (whatsappPhone || sharePopupData.phone || "").replace(/\D/g, "").slice(-10);
    if (!cleanP || cleanP.length < 10) {
      alert("Please enter a valid 10-digit WhatsApp number.");
      return;
    }

    const medsList = sharePopupData.medicines
      .filter((m) => m.name.trim().length > 0)
      .map((m, i) => `  ${i + 1}. *${m.name}* (${m.type || "Pills"})\n     Dosage: ${m.timing}`)
      .join("\n\n");

    const notesBlock = sharePopupData.notes && sharePopupData.notes.trim()
      ? `${sharePopupData.notes.trim()}\n\n--------------------------------\n`
      : "";

    const text = encodeURIComponent(
      `*SPIRITUAL HOMEOPATHY CLINICS*\n` +
      `*Official Medical Request & Remedy Slip*\n` +
      `--------------------------------\n` +
      `*Patient:* ${sharePopupData.gender} ${sharePopupData.patientName} ${sharePopupData.age ? `(${sharePopupData.age}y)` : ""}\n` +
      `*Contact:* +91 ${cleanP}\n` +
      `*Clinic Branch:* ${sharePopupData.branchName}\n` +
      `*Course Duration:* ${sharePopupData.duration}\n` +
      `*Total Medicine Fee:* ₹${Number(sharePopupData.totalAmount || 0).toFixed(2)}\n` +
      `--------------------------------\n` +
      `${notesBlock}` +
      `*Prescribed Remedies:*\n\n${medsList}\n\n` +
      `--------------------------------\n` +
      `Spiritual Homeopathy Clinics (${sharePopupData.branchName || "Clinic"})\nHelpline: ${getBranchPhone(sharePopupData.branchName)} | spiritualhomeoclinic.com`
    );

    window.open(`https://wa.me/91${cleanP}?text=${text}`, "_blank");
  };

  // --- PRINT SLIP / CERTIFICATE ---
  const handlePrintSlipFromModal = () => {
    if (!sharePopupData) return;
    generateMedicineRequestPDF({
      patientName: sharePopupData.patientName,
      gender: sharePopupData.gender,
      age: sharePopupData.age,
      phone: sharePopupData.phone,
      branchName: sharePopupData.branchName,
      duration: sharePopupData.duration,
      totalAmount: sharePopupData.totalAmount,
      medicines: sharePopupData.medicines,
      notes: sharePopupData.notes,
    });
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === "completed") return r.status === "completed";
    return true;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      <ReceptionSidebar activePage="medical-requests" />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-100 text-lime-800 border border-lime-200 flex items-center justify-center font-bold">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                Medical Requests &amp; Prescriptions
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{currentBranch}</span>
                <span className="text-slate-300">•</span>
                <span>Pharmacy Requests &amp; Instant Remedy Sharing</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {viewMode === "list" ? (
              <button
                type="button"
                onClick={() => setViewMode("form")}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-white bg-lime-600 hover:bg-lime-700 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Medical Request</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Requests</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearForm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareMedicalRequest}
                  disabled={!isFeeMatched}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-white bg-lime-600 hover:bg-lime-700 disabled:opacity-50 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Medical Request</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ========================================================
            VIEW 1: REQUESTS LIST (ALL & COMPLETED TABS)
           ======================================================== */}
        {viewMode === "list" && (
          <div className="flex-1 flex flex-col min-h-0 print:hidden">
            {/* Filter Tabs Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  All Requests ({requests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("completed")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === "completed"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  Completed ({requests.filter((r) => r.status === "completed").length})
                </button>
              </div>

              <span className="text-xs text-slate-400 font-medium">
                {filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"} shown
              </span>
            </div>

            {/* List Table */}
            <div className="flex-1 p-6 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-48 text-xs text-slate-500 font-semibold">
                  Loading medical requests...
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-72 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center max-w-md mx-auto mt-6">
                  <div className="w-12 h-12 rounded-2xl bg-lime-50 border border-lime-200 flex items-center justify-center text-lime-700 mb-3">
                    <Pill className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mb-1">
                    No Medical Requests Found
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mb-4">
                    Create a new request to prescribe remedies and share instantly via WhatsApp or PDF.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode("form")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-lime-600 hover:bg-lime-700 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Request</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-extrabold uppercase text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Req ID &amp; Date</th>
                        <th className="py-3 px-4">Patient Details</th>
                        <th className="py-3 px-4">Branch &amp; Duration</th>
                        <th className="py-3 px-4">Prescribed Medicines</th>
                        <th className="py-3 px-4 text-right">Fee (₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequests.map((r) => {
                        const isCompleted = r.status === "completed";
                        return (
                          <tr key={r.id || r.requestId} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-slate-900 block">
                                {r.requestId || "MED-REQ"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "-"}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-extrabold text-slate-900 block">
                                {r.gender} {r.patientName} {r.age ? `(${r.age}y)` : ""}
                              </span>
                              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                +91 {r.phone}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800 block">
                                {r.branchName}
                              </span>
                              <span className="text-[11px] font-bold text-lime-700">
                                {r.duration}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="max-w-xs space-y-0.5">
                                {(r.medicines || []).map((m, i) => (
                                  <div key={i} className="text-[11px] text-slate-700 font-medium truncate">
                                    • <span className="font-bold text-slate-900">{m.name}</span> ({m.type || "Pills"}) - {m.timing}
                                  </div>
                                ))}
                                {r.notes && (
                                  <div className="text-[10.5px] text-sky-800 bg-sky-50 border border-sky-200/60 rounded px-1.5 py-0.5 mt-1 truncate">
                                    <span className="font-bold">Note:</span> {r.notes}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-black text-slate-900">
                              ₹{Number(r.totalAmount || 0).toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                              >
                                {isCompleted ? "COMPLETED" : "PENDING"}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    generateMedicineRequestPDF({
                                      patientName: r.patientName,
                                      gender: r.gender,
                                      age: r.age,
                                      phone: r.phone,
                                      branchName: r.branchName,
                                      duration: r.duration,
                                      totalAmount: r.totalAmount,
                                      medicines: r.medicines,
                                      notes: r.notes,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition cursor-pointer"
                                  title="Print Medicine Certificate PDF"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </button>
                                {isCompleted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Completed</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(r.id || r.requestId!, "completed")}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Mark Completed</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 2: FORM VIEW (Spacious & Clean, Locked Branch)
           ======================================================== */}
        {viewMode === "form" && (
          <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full print:hidden">
            {/* Header info banner */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  New Medical Request &amp; Remedy Slip
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Enter patient details, match remedies sum with total fee, and share directly via WhatsApp &amp; PDF.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />
                  {branchName}
                </span>
              </div>
            </div>

            {/* FORM CARD 1: PATIENT & CLINIC DETAILS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-6">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-600 text-white font-extrabold text-xs">
                  1
                </div>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Patient &amp; Clinic Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Title & Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient Full Name *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-24 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-800 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Master">Master</option>
                      <option value="Dr.">Dr.</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Enter patient full name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phone Number (+91) *
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 32"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Branch & Duration Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Clinic Branch (Locked)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={branchName}
                      disabled
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed pl-8"
                    />
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Medicine Course Duration *
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-sky-500 focus:outline-none"
                  >
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Total Medicine Fee (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={totalAmount || ""}
                    onChange={(e) => handleTotalAmountChange(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-emerald-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* FORM CARD 2: PRESCRIBED MEDICINES TABLE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-lime-600 text-white font-extrabold text-xs">
                    2
                  </div>
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Prescribed Medicines / Remedies
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-extrabold text-sky-700 hover:bg-sky-100 transition cursor-pointer"
                >
                  <Plus size={14} /> Add Medicine
                </button>
              </div>

              {/* Real-time Fee Match Indicator */}
              {totalAmount > 0 && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-xs font-bold border transition ${medicinesSum === totalAmount
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                >
                  {medicinesSum === totalAmount ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>
                    {medicinesSum === totalAmount
                      ? `Remedies Total: ₹${medicinesSum} (Equals Total Medicine Fee ₹${totalAmount} ✓)`
                      : `Remedies Total: ₹${medicinesSum} / ₹${totalAmount} (Must equal Total Fee ₹${totalAmount} • Diff: ₹${Math.abs(totalAmount - medicinesSum)})`}
                  </span>
                </div>
              )}

              {/* Medicines Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3 w-5/12">Remedy Name &amp; Potency *</th>
                      <th className="py-2.5 px-3 w-3/12">Form / Type</th>
                      <th className="py-2.5 px-3 w-3/12">Dosage &amp; Timing</th>
                      <th className="py-2.5 px-3 text-right">Price (₹)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {medicines.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>

                        {/* Remedy Name */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="e.g. Arsenicum Album 200CH"
                            value={m.name}
                            onChange={(e) => handleUpdateMedicine(m.id, "name", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-sky-500 focus:outline-none"
                          />
                        </td>

                        {/* Form Type Dropdown */}
                        <td className="py-2 px-3">
                          <select
                            value={m.type}
                            onChange={(e) => handleUpdateMedicine(m.id, "type", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:outline-none"
                          >
                            {MEDICINE_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Timing Dropdown */}
                        <td className="py-2 px-3">
                          <select
                            value={m.timing}
                            onChange={(e) => handleUpdateMedicine(m.id, "timing", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:outline-none"
                          >
                            {DOSAGE_TIMING_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Individual Price */}
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            placeholder="0"
                            value={m.amount || ""}
                            onChange={(e) =>
                              handleUpdateMedicine(m.id, "amount", Number(e.target.value))
                            }
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-xs font-bold text-slate-800 focus:border-sky-500 focus:outline-none"
                          />
                        </td>

                        {/* Delete Button */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            disabled={medicines.length <= 1}
                            onClick={() => handleRemoveMedicineRow(m.id)}
                            className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-20 transition cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FORM CARD 3: CLINICAL NOTES / SPECIAL INSTRUCTIONS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-6">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-600 text-white font-extrabold text-xs">
                  3
                </div>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Clinical Notes / Special Instructions
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Optional clinical advice, dosage precautions, diet restrictions, or special notes to be included in the certificate PDF and WhatsApp slip.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Avoid coffee and raw onion for 30 minutes before and after taking medicine. Review after 1 month..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none resize-y"
              />
            </div>

            {/* BOTTOM ACTION BAR */}
            <div className="flex items-center justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={handleClearForm}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Form</span>
              </button>
              <button
                type="button"
                onClick={handleShareMedicalRequest}
                disabled={!isFeeMatched}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white bg-lime-600 hover:bg-lime-700 disabled:opacity-50 shadow-md shadow-lime-600/20 transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Medical Request &amp; PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SHARE & PDF PREVIEW POPUP MODAL (DIRECT PREVIEW)
           ======================================================== */}
        {sharePopupData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 print:hidden animate-in fade-in duration-150 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">
                      Medical Request Ready • PDF Preview &amp; Share
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Official Clinic Letterhead Certificate &amp; Instant WhatsApp Dispatch
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSharePopupData(null);
                    setViewMode("list");
                  }}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body: Left: Full Letterhead PDF Preview, Right: Instant Sharing Controls */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/70">
                {/* LEFT: CERTIFICATE PAPER SIMULATION (A4 Aspect Ratio) */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-[500px] bg-white shadow-md border border-slate-200 rounded-lg overflow-hidden text-slate-900 font-sans flex flex-col justify-between min-h-[580px]">
                    {/* Top Header: Left White with Logo, Right Blue Banner */}
                    <div className="bg-white h-14 flex items-stretch justify-between border-b border-slate-100">
                      <div className="flex-1 bg-white px-4 flex items-center">
                        <img src={CLINIC_LOGO_BASE64} alt="Spiritual Homeopathy Logo" className="h-8 w-auto object-contain" />
                      </div>
                      <div className="bg-[#1d8ecd] px-4 flex flex-col justify-center text-right text-white">
                        <span className="text-[10px] font-bold tracking-wider uppercase block">
                          spiritualhomeoclinic.com
                        </span>
                        <span className="text-[9.5px] font-semibold text-sky-100 block">
                          📞 {getBranchPhone(sharePopupData.branchName)}
                        </span>
                      </div>
                    </div>

                    {/* Certificate Body */}
                    <div className="p-6 flex-1 text-[11px] leading-relaxed space-y-3">
                      <div className="flex justify-between items-center font-bold text-slate-800 text-[10.5px]">
                        <span>CLINIC BRANCH: <strong>{(sharePopupData.branchName || "KPHB Branch").toUpperCase()}</strong></span>
                        <span>DATE: <strong>{new Date().toLocaleDateString("en-GB")}</strong></span>
                      </div>

                      <div className="text-center font-extrabold text-xs tracking-wider uppercase underline underline-offset-4 text-slate-900 py-1">
                        TO WHOM SO EVER IT MAY CONCERN
                      </div>

                      <p className="text-slate-700 leading-5 text-justify">
                        THIS IS TO CERTIFY THAT{" "}
                        <strong className="text-slate-900 uppercase">
                          {sharePopupData.gender || "MR."} {sharePopupData.patientName}
                        </strong>
                        {sharePopupData.age ? (
                          <span>
                            {" "}
                            AGED ABOUT <strong className="text-slate-900">{sharePopupData.age} YEARS</strong>,
                          </span>
                        ) : null}{" "}
                        HAS BEEN UNDER OUR TREATMENT AT SPIRITUAL HOMEOPATHY.
                      </p>

                      <p className="text-slate-700 leading-5 text-justify">
                        {sharePopupData.duration && (
                          <span>
                            THE PATIENT NEEDED TO TAKE HOMEOPATHY MEDICINE FOR{" "}
                            <strong className="text-slate-900 uppercase">{sharePopupData.duration}</strong>.{" "}
                          </span>
                        )}
                        WE RECOMMENDED THAT{" "}
                        <strong className="text-slate-900 uppercase">
                          {sharePopupData.gender || "MR."} {sharePopupData.patientName}
                        </strong>{" "}
                        CONTINUES TO FOLLOW THE PRESCRIBED MEDICATIONS.
                      </p>

                      {sharePopupData.notes && sharePopupData.notes.trim() ? (
                        <div className="pt-2 pb-1 text-[10.5px] text-slate-800 whitespace-pre-wrap leading-relaxed font-medium text-left">
                          {sharePopupData.notes.trim()}
                        </div>
                      ) : null}

                      {/* Prescribed Remedies Table */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1 mb-1.5">
                          <span className="font-extrabold text-[#1d8ecd] uppercase tracking-wide text-[10.5px]">
                            Prescribed Medicines
                          </span>
                          {Number(sharePopupData.totalAmount) > 0 && (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                              Fee: ₹{Number(sharePopupData.totalAmount).toFixed(2)}
                            </span>
                          )}
                        </div>

                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[9.5px] uppercase font-bold text-slate-500 border-b border-slate-200">
                              <th className="py-1 px-1.5 text-center w-6">#</th>
                              <th className="py-1 px-2">Remedy Name</th>
                              <th className="py-1 px-2 text-center">Type</th>
                              <th className="py-1 px-2">Dosage &amp; Timing</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[10px]">
                            {(sharePopupData.medicines || []).map((m, idx) => (
                              <tr key={idx}>
                                <td className="py-1.5 px-1 text-center text-slate-400 font-bold">{idx + 1}</td>
                                <td className="py-1.5 px-2 font-bold text-slate-800">{m.name}</td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded text-[9.5px] font-semibold border border-sky-200">
                                    {m.type || "Pills"}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 text-slate-600 font-medium">{m.timing}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-4 text-center text-[9px] text-slate-400 italic border-t border-dashed border-slate-200">
                        This is a computer-generated document. No physical signature required.
                      </div>
                    </div>

                    {/* Bottom Green Footer */}
                    <div className="bg-[#a3cf3b] h-9 px-3 flex items-center justify-around text-white text-[9.5px] font-bold tracking-wide uppercase">
                      <span>📞 Reception: {getBranchPhone(sharePopupData.branchName)}</span>
                      <span>•</span>
                      <span>✉️ support@spiritualhomeo.com</span>
                      <span>•</span>
                      <span>📍 Branch: {(sharePopupData.branchName || "KPHB Branch").toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: SHARING & PRINT ACTIONS */}
                <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="font-extrabold text-slate-800 text-sm">
                        {sharePopupData.gender} {sharePopupData.patientName} {sharePopupData.age ? `(${sharePopupData.age}y)` : ""}
                      </div>
                      <div className="text-slate-500 font-medium">
                        {sharePopupData.branchName} • Course: {sharePopupData.duration}
                      </div>
                      <div className="font-bold text-emerald-700 pt-1">
                        Total Fee: ₹{Number(sharePopupData.totalAmount || 0).toFixed(2)} ({sharePopupData.medicines.length} remedies)
                      </div>
                      {sharePopupData.notes ? (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                          <span className="font-bold text-slate-800">Notes:</span> {sharePopupData.notes}
                        </div>
                      ) : null}
                    </div>

                    {/* WhatsApp Action */}
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                        1. Share via WhatsApp Direct:
                      </label>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl border border-slate-300 text-xs font-bold text-slate-700">
                          <span>🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="10-digit WhatsApp number"
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendViaWhatsApp}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-98"
                      >
                        <Send size={14} />
                        <span>Send Slip via WhatsApp</span>
                      </button>
                    </div>

                    {/* Print PDF Action */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                        2. Print Official PDF Letterhead:
                      </label>
                      <button
                        type="button"
                        onClick={handlePrintSlipFromModal}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-sm transition cursor-pointer active:scale-98"
                      >
                        <Printer size={14} />
                        <span>Print / Save PDF Slip</span>
                      </button>
                    </div>
                  </div>

                  {/* Done / Close Button */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        handleClearForm();
                        setSharePopupData(null);
                        setViewMode("list");
                      }}
                      className="w-full py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Done / Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            PRINTABLE CLINIC CERTIFICATE (SHOWN IN PRINT DIALOG)
           ======================================================== */}
        {printCertificateData && (
          <div className="hidden print:block font-serif text-slate-900 p-8 min-h-screen bg-white">
            {/* Banner */}
            <div className="flex justify-between items-center border-b-2 border-sky-600 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">
                  SPIRITUAL HOMEOPATHY CLINICS
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-1 font-sans">
                  Holistic Healing • Modern Homeopathic Diagnostics • {printCertificateData.branchName}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 font-sans">
                <div>
                  <strong>Date:</strong> {printCertificateData.dateStr}
                </div>
                <div>
                  <strong>Phone:</strong> +91 {printCertificateData.phone || "N/A"}
                </div>
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center font-bold text-base uppercase tracking-widest my-6 underline underline-offset-4">
              To Whomsoever It May Concern
            </div>

            <p className="text-sm leading-relaxed mb-4 text-justify">
              This is to certify that{" "}
              <strong>
                {printCertificateData.gender} {printCertificateData.patientName.toUpperCase() || "PATIENT"}
              </strong>
              {printCertificateData.age ? `, aged about ${printCertificateData.age} years,` : ""}{" "}
              has been consulting and receiving homeopathic treatment at Spiritual Homeopathy Clinic (
              {printCertificateData.branchName}).
            </p>

            <p className="text-sm leading-relaxed mb-6 text-justify">
              The patient is advised to continue with the prescribed homeopathic remedies for a period
              of <strong>{printCertificateData.duration}</strong>.
            </p>

            {/* Prescribed Medicines List */}
            <h3 className="font-bold text-xs uppercase tracking-wider mb-2 text-slate-700 font-sans">
              Prescribed Medicines / Dosage Chart:
            </h3>
            <table className="w-full text-left text-xs border border-slate-300 mb-8 border-collapse font-sans">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                  <th className="p-2 border-r border-slate-300 text-center w-12">#</th>
                  <th className="p-2 border-r border-slate-300">Medicine / Remedy Name</th>
                  <th className="p-2 border-r border-slate-300 w-36">Type</th>
                  <th className="p-2 w-48">Dosage &amp; Timing</th>
                </tr>
              </thead>
              <tbody>
                {printCertificateData.medicines
                  .filter((m) => m.name.trim())
                  .map((m, i) => (
                    <tr key={m.id || i} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{i + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold">{m.name}</td>
                      <td className="p-2 border-r border-slate-300">{m.type}</td>
                      <td className="p-2">{m.timing}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {printCertificateData.totalAmount > 0 && (
              <div className="text-right text-sm font-bold mb-8 font-sans">
                Total Medicine Fee: ₹{Number(printCertificateData.totalAmount).toFixed(2)}
              </div>
            )}

            {/* Clinic Seal & Doctor Sign Placeholder */}
            <div className="flex justify-between items-end mt-16 pt-8 border-t border-slate-200 text-xs font-sans">
              <div>
                <div className="text-slate-400">Clinic Seal:</div>
                <div className="font-bold text-slate-700 mt-1">
                  Spiritual Homeopathy - {printCertificateData.branchName}
                </div>
              </div>
              <div className="text-center">
                <div className="w-48 border-b border-slate-400 mb-1" />
                <div className="font-bold">Authorized Medical Officer</div>
                <div className="text-slate-500 text-[10px]">Spiritual Homeopathy Clinics</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MedicalRequestsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading Medical Requests...</div>}>
      <MedicalRequestsContent />
    </Suspense>
  );
}