"use client";

import React, { useState, useEffect } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  Headphones,
  Plus,
  Search,
  Phone,
  Building2,
  CalendarCheck,
  CheckCircle2,
  X,
  RefreshCw,
  KeyRound,
  ShieldAlert,
} from "lucide-react";

interface TelecallerAccount {
  id: string;
  name: string;
  telecallerId?: string;
  phone: string;
  email?: string;
  branchName: string;
  status?: string;
  bookedCount?: number;
  password?: string;
}

const BRANCH_OPTIONS = [
  "All Branches",
  "KPHB Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

export default function HRTelecallerAccountsPage() {
  const [telecallers, setTelecallers] = useState<TelecallerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [branchOptions, setBranchOptions] = useState<string[]>([
    "All Branches",
    "KPHB Branch",
    "Chandanagar Branch",
    "Dilshuknagar Branch",
    "Nallagandla Branch",
  ]);
  const [nextId, setNextId] = useState("TC01");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    telecallerId: "TC01",
    phone: "",
    branchName: "All Branches",
    password: "sph12345",
  });
  const [formError, setFormError] = useState("");

  const fetchTelecallers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/employees?category=TELECALLER");
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        setTelecallers(data.employees);
        if (data.nextTelecallerId) {
          setNextId(data.nextTelecallerId);
          setFormData((prev) => ({ ...prev, telecallerId: data.nextTelecallerId }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch telecallers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelecallers();
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.data) ? d.data : [];
        if (list.length > 0) {
          const names: string[] = list.map((b: any) => String(b.name || "").trim()).filter(Boolean);
          setBranchOptions(["All Branches", ...Array.from(new Set(names))]);
        }
      })
      .catch(() => {});
  }, []);

  const openAddModal = () => {
    setFormData({
      name: "",
      telecallerId: nextId,
      phone: "",
      branchName: "All Branches",
      password: "sph12345",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleCreateTelecaller = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Telecaller Full Name is required.");
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!formData.telecallerId.trim()) {
      setFormError("Telecaller ID is required (e.g. TC01).");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          telecallerId: formData.telecallerId.trim().toUpperCase(),
          phone: cleanPhone,
          branchName: formData.branchName,
          category: "TELECALLER",
          password: formData.password.trim(),
          status: "Active",
          isAccessGranted: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        fetchTelecallers();
      } else {
        setFormError(data.error || "Failed to create telecaller account.");
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = telecallers.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      (t.telecallerId || "").toLowerCase().includes(q) ||
      t.phone.includes(searchTerm);
    const matchesBranch =
      branchFilter === "All" ||
      t.branchName.toLowerCase().includes(branchFilter.toLowerCase());
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/telecaller-accounts" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Headphones className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">
                  Telecaller Accounts &amp; Access (HR)
                </h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Manage telecalling agents, auto-assigned IDs, assigned branches &amp; booking counts
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search caller name, ID, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/30"
                />
              </div>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none"
              >
                {branchOptions.map((b) => (
                  <option key={b} value={b === "All Branches" ? "All" : b}>
                    {b}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchTelecallers}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Telecaller</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-7 max-w-7xl">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Telecallers</p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">{telecallers.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Appointments Booked</p>
                <p className="text-xl font-extrabold text-emerald-700 mt-1">
                  {telecallers.reduce((acc, t) => acc + (t.bookedCount || 0), 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Next Auto ID</p>
                <p className="text-xl font-extrabold text-[#0284c7] mt-1">{nextId}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Table without Actions or Daily Target */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Telecaller Agent</th>
                    <th className="py-3 px-4">Unique ID</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Assigned Branch Access</th>
                    <th className="py-3 px-4 text-center">Appts Booked</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {loading ? "Loading telecallers..." : "No telecaller accounts found."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-slate-900">{t.name}</p>
                          <p className="text-[10.5px] text-slate-400 font-mono">pwd: {t.password || "sph12345"}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-sky-50 text-[#0284c7] font-extrabold border border-sky-100 font-mono text-[11px]">
                            {t.telecallerId || "TC01"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#0284c7]" />
                          <span>{t.phone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                              t.branchName === "All Branches"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-[#0284c7] border-blue-200"
                            }`}
                          >
                            {t.branchName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {t.bookedCount || 0} Booked
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            {t.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Telecaller Modal without Daily Target */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">Add New Telecaller</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTelecaller} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Telecaller Full Name: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Srikanth Reddy"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Unique Telecaller ID: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TC01"
                      value={formData.telecallerId}
                      onChange={(e) => setFormData({ ...formData, telecallerId: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#0284c7]/30"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Prefilled automatically (editable)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Contact Phone: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit Mobile"
                      maxLength={10}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Assigned Hospital Branch: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/30"
                  >
                    {branchOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    {formData.branchName === "All Branches"
                      ? "✓ Can view follow-ups & book doctor appointments across all branches."
                      : `🔒 Restricted only to follow-ups and doctors at ${formData.branchName}.`}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Initial Password: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#0284c7]/30"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save Telecaller"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
