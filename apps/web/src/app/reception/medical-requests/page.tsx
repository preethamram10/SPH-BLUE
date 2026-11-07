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
  Save,
  Building2,
  Phone,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  X,
  FileText,
  AlertCircle,
  Truck,
} from "lucide-react";

// --- OPTIONS CONSTANTS (User Defined) ---
export const DOSAGE_TIMING_OPTIONS = [
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

export const MEDICINE_TYPE_OPTIONS = [
  { value: "Pills", label: "Pills / Globules" },
  { value: "Drops", label: "Drops / Liquid Dilution" },
  { value: "Mother Tincture", label: "Mother Tincture (Q)" },
  { value: "Tablet", label: "Tablet / Biochemic" },
  { value: "Syrup", label: "Syrup" },
  { value: "Powder", label: "Powder / Trituration" },
  { value: "Ointment", label: "Ointment / Cream" },
];

export const DURATION_OPTIONS = [
  "15 Days",
  "1 Month",
  "2 Months",
  "3 Months",
  "4 Months",
  "6 Months",
];

export const BRANCH_OPTIONS = [
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
  status?: "pending" | "completed" | "dispatched";
  createdAt?: string;
}

function MedicalRequestsContent() {
  const [currentBranch, setCurrentBranch] = useState("KPHB Branch");
  const [viewMode, setViewMode] = useState<"list" | "form">("list");

  // Requests List states
  const [requests, setRequests] = useState<MedicineRequestPayload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "pending" | "completed" | "dispatched">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      setCurrentBranch(saved);
      setBranchName(saved);
    }
  }, []);

  // Fetch Requests List
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

  useEffect(() => {
    fetchRequests();
  }, []);

  // Auto calculate sum of medicine rows if user enters individual prices
  useEffect(() => {
    const rowSum = medicines.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    if (rowSum > 0) {
      setTotalAmount(rowSum);
    }
  }, [medicines]);

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
  };

  // --- SUBMIT REQUEST TO BACKEND ---
  const handleSaveRequest = async () => {
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

    setIsSaving(true);
    try {
      const payload: MedicineRequestPayload = {
        patientName: patientName.trim(),
        phone: cleanPhone.slice(-10),
        age: age.trim() || undefined,
        gender,
        branchName,
        duration,
        totalAmount: Number(totalAmount) || 0,
        medicines: validMedicines,
      };

      const res = await fetch("/api/reception/medical-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save request");
      }

      setSaveSuccess(true);
      fetchRequests();
      setTimeout(() => {
        setSaveSuccess(false);
        handleClearForm();
        setViewMode("list");
      }, 1500);
    } catch (err: any) {
      console.error("Error saving medicine request:", err);
      alert(err.message || "Failed to save medicine request. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- UPDATE STATUS ---
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

  // --- DELETE REQUEST ---
  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to remove this medical request?")) return;
    try {
      const res = await fetch("/api/reception/medical-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE", id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete request");
    }
  };

  // --- PRINT OFFICIAL CLINIC CERTIFICATE SLIP ---
  const handlePrintCurrentForm = () => {
    if (!patientName.trim()) {
      alert("Please enter Patient Name before printing certificate.");
      return;
    }
    setPrintCertificateData({
      patientName: patientName.trim(),
      gender,
      age: age.trim() || undefined,
      phone: phone.replace(/\D/g, "").slice(-10),
      branchName,
      duration,
      totalAmount: Number(totalAmount) || 0,
      medicines: medicines.filter((m) => m.name.trim().length > 0),
      dateStr: new Date().toLocaleDateString("en-GB"),
    });
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintExistingRequest = (item: MedicineRequestPayload) => {
    setPrintCertificateData({
      patientName: item.patientName,
      gender: item.gender || "Mr.",
      age: item.age,
      phone: item.phone,
      branchName: item.branchName || currentBranch,
      duration: item.duration || "1 Month",
      totalAmount: item.totalAmount || 0,
      medicines: item.medicines || [],
      dateStr: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
    });
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (activeFilter !== "ALL" && (r.status || "pending") !== activeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.patientName.toLowerCase().includes(q);
      const matchPhone = r.phone.includes(q);
      const matchReqId = (r.requestId || "").toLowerCase().includes(q);
      const matchMed = (r.medicines || []).some((m) => m.name.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchReqId && !matchMed) return false;
    }
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
                Medical Requests &amp; Prescription Certificates
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{currentBranch}</span>
                <span className="text-slate-300">•</span>
                <span>Pharmacy Requests &amp; Official Letterhead Slips</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "list" ? (
              <button
                type="button"
                onClick={() => setViewMode("form")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-lime-600 hover:bg-lime-700 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Medical Request</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View All Requests ({requests.length})</span>
              </button>
            )}
          </div>
        </header>

        {/* ========================================================
            VIEW 1: REQUESTS LIST
           ======================================================== */}
        {viewMode === "list" && (
          <div className="flex-1 flex flex-col min-h-0 print:hidden">
            {/* Filter Tabs & Search Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(["ALL", "pending", "completed", "dispatched"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer capitalize ${
                      activeFilter === tab
                        ? "bg-white text-lime-800 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab === "ALL" ? `All (${requests.length})` : tab}
                  </button>
                ))}
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient, phone, remedy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:border-lime-500 font-medium transition-all"
                />
              </div>
            </div>

            {/* List Table / Cards */}
            <div className="flex-1 p-6 overflow-y-auto">
              {filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-72 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center max-w-md mx-auto mt-6">
                  <div className="w-12 h-12 rounded-2xl bg-lime-50 border border-lime-200 flex items-center justify-center text-lime-700 mb-3">
                    <Pill className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mb-1">
                    No Medical Requests Found
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mb-4">
                    Create a new request to prescribe homeopathic remedies and print official certificates.
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
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequests.map((r) => {
                        const statusColor =
                          r.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.status === "dispatched"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-amber-50 text-amber-700 border-amber-200";

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
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-black text-slate-900">
                              ₹{Number(r.totalAmount || 0).toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${statusColor}`}
                              >
                                {r.status || "pending"}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Print Certificate */}
                                <button
                                  type="button"
                                  onClick={() => handlePrintExistingRequest(r)}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                                  title="Print Official Certificate Slip"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Mark as Completed */}
                                {r.status !== "completed" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(r.id || r.requestId!, "completed")}
                                    className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                                    title="Mark Completed"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Mark as Dispatched */}
                                {r.status !== "dispatched" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(r.id || r.requestId!, "dispatched")}
                                    className="p-1.5 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                                    title="Mark Dispatched / Couriered"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRequest(r.id || r.requestId!)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 transition cursor-pointer"
                                  title="Delete Request"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
            VIEW 2: FORM CARD (Exact user design & code)
           ======================================================== */}
        {viewMode === "form" && (
          <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full print:hidden">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-100 text-lime-800 border border-lime-200 shadow-xs">
                  <Pill size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    New Medicine Request &amp; Certificate
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Prescribe remedies, manage pharmacy requests &amp; print official clinic letterhead slips
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    <Check size={14} /> Saved Successfully
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClearForm}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                >
                  <RotateCcw size={14} /> Clear
                </button>

                <button
                  type="button"
                  onClick={handlePrintCurrentForm}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
                >
                  <Printer size={14} /> Print Certificate
                </button>

                <button
                  type="button"
                  onClick={handleSaveRequest}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-sky-700 transition shadow-md shadow-sky-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={14} /> {isSaving ? "Saving..." : "Save Request"}
                </button>
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
                    Clinic Branch *
                  </label>
                  <select
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-sky-500 focus:outline-none"
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
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
                    Total Fee / Price (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={totalAmount || ""}
                    onChange={(e) => setTotalAmount(Math.max(0, Number(e.target.value)))}
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
