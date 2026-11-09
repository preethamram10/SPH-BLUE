"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
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
} from "lucide-react";

export default function PackageMembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const branches = ["All Branches", "KPHB Branch", "Chandanagar Branch", "Nallagandla Branch", "Dilsukhnagar Branch"];

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/package-members")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      })
      .catch((err) => console.error("Error loading admin package members:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = members.filter((m) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (m.patientName || "").toLowerCase().includes(q) ||
      (m.phone || "").includes(q) ||
      (m.registrationId || "").toLowerCase().includes(q) ||
      (m.packageName || "").toLowerCase().includes(q);
    const matchesBranch =
      selectedBranch === "All Branches" ||
      (m.branch || "").toLowerCase().includes(selectedBranch.toLowerCase().replace("branch", "").trim());
    return matchesSearch && matchesBranch;
  });

  const totalMembers = members.length;
  const totalValue = members.reduce((sum, m) => sum + (m.totalAmount || 0), 0);
  const totalCollected = members.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
  const totalPending = members.reduce((sum, m) => sum + (m.pendingAmount || 0), 0);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/package-members" />

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
                All-branch overview of active long-term treatment packages, revenues, &amp; pending balances
              </p>
            </div>

            <div className="flex items-center gap-2.5">
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
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="p-7 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Package Members</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalMembers}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Across all clinic branches</div>
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
                Package Enrolled Members ({filtered.length})
              </div>
              <span className="text-[11px] text-slate-400 font-medium">All Branches</span>
            </div>

            {isLoading ? (
              <div className="p-16 text-center text-slate-400 font-medium text-xs">
                Loading package members...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center text-slate-400 font-medium text-xs">
                No package members found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Patient &amp; Contact</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Reg ID</th>
                      <th className="py-3 px-4">Package &amp; Duration</th>
                      <th className="py-3 px-4">Validity</th>
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
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                            {m.branch || "Clinic"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[11px] border border-sky-200">
                            {m.registrationId || "SPH-PAT"}
                          </span>
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              m.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {m.status || "ACTIVE"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedMember(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-[11px] font-bold transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>History</span>
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
                      {selectedMember.packageName} • {selectedMember.branch} • Reg: {selectedMember.registrationId}
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
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                    Payment Installments History
                  </h4>
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
