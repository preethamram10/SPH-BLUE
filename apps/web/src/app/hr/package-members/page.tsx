"use client";

import React, { useState, useEffect, useMemo } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  Crown,
  Search,
  Calendar,
  Building2,
  Clock,
  Phone,
  ShieldCheck,
  ChevronRight,
  Eye,
  CheckCircle2,
  Plus,
  CreditCard,
  AlertCircle,
} from "lucide-react";

export default function HRPackageMembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  // Register Package Member Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [patientLookupQuery, setPatientLookupQuery] = useState("");
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [regForm, setRegForm] = useState({
    patientName: "",
    phone: "",
    registrationId: "",
    branch: "Kphb Branch",
    durationMonths: 3,
    totalAmount: "",
    initialPaidAmount: "",
    paymentMethod: "CASH",
    notes: "",
  });
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [regError, setRegError] = useState("");

  // Quick Payment Modal
  const [paymentModalMember, setPaymentModalMember] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchMembers = () => {
    setIsLoading(true);
    fetch("/api/package-members")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      })
      .catch((err) => console.error("Error loading HR package members:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchMembers();

    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const names: string[] = data.data.map((b: any) => b.name?.trim()).filter(Boolean);
          if (names.length > 0) setAvailableBranches(names);
        }
      })
      .catch(() => { });
  }, []);

  // Debounced Patient Search for Modal
  useEffect(() => {
    if (!patientLookupQuery.trim() || patientLookupQuery.trim().length < 3) {
      setPatientSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingPatient(true);
      try {
        const res = await fetch(`/api/reception/patients/by-phone?query=${encodeURIComponent(patientLookupQuery.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.profiles)) {
          setPatientSuggestions(data.profiles.slice(0, 5));
        } else {
          setPatientSuggestions([]);
        }
      } catch {
        setPatientSuggestions([]);
      } finally {
        setIsSearchingPatient(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientLookupQuery]);

  const selectPatientSuggestion = (p: any) => {
    setRegForm((prev) => ({
      ...prev,
      patientName: p.patientName || "",
      phone: p.phone || "",
      registrationId: p.registrationId || "",
      branch: p.branch || "Kphb Branch",
    }));
    setPatientSuggestions([]);
    setPatientLookupQuery(p.patientName ? `${p.patientName} (${p.phone})` : p.phone);
  };

  const handleRegisterPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regForm.patientName.trim() || !regForm.phone.trim()) {
      setRegError("Patient Name and Phone are required.");
      return;
    }
    const total = parseFloat(regForm.totalAmount) || 0;
    if (total <= 0) {
      setRegError("Please enter a valid Total Package Fee.");
      return;
    }

    const initialPaid = parseFloat(regForm.initialPaidAmount) || 0;
    if (initialPaid > total) {
      setRegError("Initial paid amount cannot exceed total package amount.");
      return;
    }

    setIsSubmittingReg(true);
    try {
      const res = await fetch("/api/package-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          registrationId: regForm.registrationId,
          patientName: regForm.patientName,
          phone: regForm.phone,
          branch: regForm.branch || "Kphb Branch",
          durationMonths: regForm.durationMonths,
          totalAmount: total,
          initialPaidAmount: initialPaid,
          paymentMethod: regForm.paymentMethod,
          notes: regForm.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsRegisterModalOpen(false);
        setRegForm({
          patientName: "",
          phone: "",
          registrationId: "",
          branch: "Kphb Branch",
          durationMonths: 3,
          totalAmount: "",
          initialPaidAmount: "",
          paymentMethod: "CASH",
          notes: "",
        });
        setPatientLookupQuery("");
        fetchMembers();
        alert(data.message || "Package registered successfully!");
      } else {
        setRegError(data.error || "Failed to register package.");
      }
    } catch (err: any) {
      setRegError(err.message || "Network error registering package.");
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalMember) return;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    if (amt > (paymentModalMember.pendingAmount || 0)) {
      alert(`Amount exceeds the remaining due balance of ₹${paymentModalMember.pendingAmount}`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch("/api/package-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment",
          packageId: paymentModalMember.id,
          amount: amt,
          paymentMethod,
          notes: paymentNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPaymentModalMember(null);
        setPaymentAmount("");
        setPaymentNotes("");
        fetchMembers();
        if (selectedMember && selectedMember.id === paymentModalMember.id) {
          setSelectedMember(data.member);
        }
        alert(data.message || `Payment of ₹${amt} recorded successfully!`);
      } else {
        alert(data.error || "Failed to record payment");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    availableBranches.forEach((b) => {
      let bName = b;
      if (bName && bName.toLowerCase().includes("chandanagar nagar")) bName = "Chandanagar Branch";
      set.add(bName);
    });
    members.forEach((m) => {
      let bName = m.branch;
      if (bName && bName.toLowerCase().includes("chandanagar nagar")) bName = "Chandanagar Branch";
      if (bName) set.add(bName);
    });
    if (set.size === 0) {
      ["Kphb Branch", "Chandanagar Branch", "Dilshuknagar Branch", "Nallagandla Branch"].forEach((b) => set.add(b));
    }
    return ["All Branches", ...Array.from(set)];
  }, [availableBranches, members]);

  const filtered = members.filter((m) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (m.patientName || "").toLowerCase().includes(q) ||
      (m.phone || "").includes(q) ||
      (m.registrationId || "").toLowerCase().includes(q) ||
      (m.packageName || "").toLowerCase().includes(q) ||
      (m.branch || "").toLowerCase().includes(q);

    const mNorm = (m.branch || "").toLowerCase().replace(/spiritual|homeopathy|clinic|branch/gi, "").replace(/[^a-z0-9]/g, "").trim();
    const sNorm = selectedBranch.toLowerCase().replace(/spiritual|homeopathy|clinic|branch/gi, "").replace(/[^a-z0-9]/g, "").trim();
    const matchesBranch =
      selectedBranch === "All Branches" ||
      mNorm === sNorm ||
      (mNorm === "kpb" && sNorm === "kphb") ||
      (mNorm === "kphb" && sNorm === "kpb");

    return matchesSearch && matchesBranch;
  });

  const totalMembers = members.length;
  const totalValue = members.reduce((sum, m) => sum + (m.totalAmount || 0), 0);
  const totalCollected = members.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
  const totalPending = members.reduce((sum, m) => sum + (m.pendingAmount || 0), 0);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/package-members" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Crown className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Package Members &amp; Subscriptions</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Overview of active long-term treatment packages, revenues, &amp; pending balances
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search member, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {branchOptions.map((b: string) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setRegError("");
                  setIsRegisterModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Package</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-7 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Package Members</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalMembers}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Across clinic branches</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Package Value</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₹{totalValue.toLocaleString()}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Combined contract value</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Total Collected</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">₹{totalCollected.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-600/80 mt-0.5">Total installments received</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-2xs">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Total Pending Balance</div>
              <div className="text-2xl font-black text-amber-700 mt-1">₹{totalPending.toLocaleString()}</div>
              <div className="text-[11px] text-amber-600/80 mt-0.5">Receivables from patients</div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="font-extrabold text-sm text-slate-900">
                Registered Package Members ({filtered.length})
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{selectedBranch}</span>
            </div>

            {isLoading ? (
              <div className="p-16 text-center text-slate-400 font-medium text-xs">Loading package members...</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center text-slate-400 font-medium text-xs flex flex-col items-center justify-center gap-3">
                <Crown className="w-8 h-8 text-slate-300" />
                <p>No package members found.</p>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  + Register Package Member
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Patient &amp; Contact</th>
                      <th className="py-3 px-4">Reg ID</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Package &amp; Duration</th>
                      <th className="py-3 px-4">Validity Range</th>
                      <th className="py-3 px-4 text-right">Total Fee</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Pending</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                    {filtered.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">{m.patientName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{m.phone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[11px] border border-sky-200">
                            {m.registrationId || "SPH-PAT"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-600 font-bold text-[11px]">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{m.branch || "Kphb Branch"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{m.packageName}</div>
                          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                            {m.durationMonths} Month{m.durationMonths > 1 ? "s" : ""} duration
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-600 text-[11px] font-medium">Start: {m.startDate}</div>
                          <div className="text-slate-400 text-[10px]">Till: {m.endDate}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-800">
                          ₹{(m.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                          ₹{(m.paidAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-amber-700">
                          ₹{(m.pendingAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${m.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                          >
                            {m.status || "ACTIVE"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedMember(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-[11px] font-bold transition-colors cursor-pointer"
                              title="View installment history"
                            >
                              <Eye className="w-3 h-3" />
                              <span>History</span>
                            </button>
                            {(m.pendingAmount || 0) > 0 && (
                              <button
                                onClick={() => {
                                  setPaymentModalMember(m);
                                  setPaymentAmount(String(m.pendingAmount || ""));
                                  setPaymentMethod("CASH");
                                  setPaymentNotes("");
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Record installment payment"
                              >
                                <CreditCard className="w-3 h-3 text-emerald-600" />
                                <span>Pay Due</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Register Package Member Modal */}
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Register Package Member</h3>
                    <p className="text-[11px] text-slate-500">Enroll patient in 1–6 Month Treatment Subscription</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRegisterPackage} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {regError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{regError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Find Existing Patient (Phone or MRN ID)
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type phone or SPH-KPB ID to auto-fill..."
                      value={patientLookupQuery}
                      onChange={(e) => setPatientLookupQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    {isSearchingPatient && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                        Searching...
                      </span>
                    )}
                  </div>

                  {patientSuggestions.length > 0 && (
                    <div className="mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-100">
                      {patientSuggestions.map((p, idx) => (
                        <div
                          key={idx}
                          onClick={() => selectPatientSuggestion(p)}
                          className="p-2 hover:bg-amber-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{p.patientName}</span>
                            <span className="text-slate-400 text-[11px] ml-1.5 font-mono">{p.phone}</span>
                          </div>
                          <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-semibold">
                            {p.registrationId || p.branch || "Profile"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Patient Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. V. Keerthana"
                      value={regForm.patientName}
                      onChange={(e) => setRegForm({ ...regForm, patientName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="10 digit mobile"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registration / MRN ID</label>
                    <input
                      type="text"
                      placeholder="e.g. SPH-KPB-17818"
                      value={regForm.registrationId}
                      onChange={(e) => setRegForm({ ...regForm, registrationId: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
                    <select
                      value={regForm.branch}
                      onChange={(e) => setRegForm({ ...regForm, branch: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    >
                      {branchOptions
                        .filter((b) => b !== "All Branches")
                        .map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Package Duration</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setRegForm({ ...regForm, durationMonths: m })}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${regForm.durationMonths === m
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    Selected: {regForm.durationMonths} Month{regForm.durationMonths > 1 ? "s" : ""} Treatment Package
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Total Package Fee (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="100"
                      placeholder="e.g. 10000"
                      value={regForm.totalAmount}
                      onChange={(e) => setRegForm({ ...regForm, totalAmount: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Initial Down Payment (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0 if pay later"
                      value={regForm.initialPaidAmount}
                      onChange={(e) => setRegForm({ ...regForm, initialPaidAmount: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-emerald-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={regForm.paymentMethod}
                      onChange={(e) => setRegForm({ ...regForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="COUNTER_UPI">COUNTER UPI (QR)</option>
                      <option value="CARD">CARD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                    <input
                      type="text"
                      placeholder="Optional notes"
                      value={regForm.notes}
                      onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-600">Pending Balance: </span>
                    <span className="font-extrabold text-amber-900">
                      ₹
                      {Math.max(
                        0,
                        (parseFloat(regForm.totalAmount) || 0) - (parseFloat(regForm.initialPaidAmount) || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold">
                    Valid for {regForm.durationMonths} Months
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReg}
                    className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReg ? "Registering..." : "Confirm & Enroll Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Payment (Pay Due) Modal */}
        {paymentModalMember && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                    ₹
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Collect Package Installment</h3>
                    <p className="text-[11px] text-slate-500">
                      {paymentModalMember.patientName} • {paymentModalMember.registrationId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentModalMember(null)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-amber-700 uppercase font-bold">Outstanding Due</div>
                    <div className="text-lg font-black text-amber-900">
                      ₹{(paymentModalMember.pendingAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Total Paid So Far</div>
                    <div className="text-sm font-black text-emerald-700">
                      ₹{(paymentModalMember.paidAmount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Amount to Collect (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={paymentModalMember.pendingAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="COUNTER_UPI">COUNTER UPI (QR)</option>
                    <option value="CARD">CARD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="Installment payment notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentModalMember(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingPayment ? "Recording..." : "Record Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Member Installment History Modal */}
        {selectedMember && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                    PKG
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{selectedMember.patientName}</h3>
                    <p className="text-[11px] text-slate-500">
                      {selectedMember.packageName} • Reg: {selectedMember.registrationId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* 3 Summary Cards */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total Package</div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      ₹{(selectedMember.totalAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">Total Paid</div>
                    <div className="text-sm font-black text-emerald-700 mt-0.5">
                      ₹{(selectedMember.paidAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-600 uppercase">Pending Balance</div>
                    <div className="text-sm font-black text-amber-700 mt-0.5">
                      ₹{(selectedMember.pendingAmount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Installments List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Payment Installments History
                    </h4>
                    {(selectedMember.pendingAmount || 0) > 0 && (
                      <button
                        onClick={() => {
                          setPaymentModalMember(selectedMember);
                          setPaymentAmount(String(selectedMember.pendingAmount || ""));
                          setPaymentMethod("CASH");
                          setPaymentNotes("");
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                      >
                        + Collect Installment
                      </button>
                    )}
                  </div>
                  {selectedMember.payments && selectedMember.payments.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedMember.payments.map((p: any, idx: number) => {
                        const d = new Date(p.paidAt);
                        const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN") : p.paidAt;
                        const timeStr = !isNaN(d.getTime())
                          ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "";
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-800">
                                {dateStr} at {timeStr}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Mode: <span className="font-semibold">{p.paymentMethod || "CASH"}</span>
                                {p.notes ? ` • ${p.notes}` : ""}
                              </div>
                            </div>
                            <div className="font-black text-emerald-700 text-sm">
                              +₹{(p.amount || 0).toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No payment installments logged yet.
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}