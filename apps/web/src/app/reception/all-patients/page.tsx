"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  X,
  CheckCircle,
  Clock,
  History,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
} from "lucide-react";

type SessionTab = "TODAY" | "YESTERDAY" | "ALL";

interface Patient {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  source?: string;
  subject?: string;
  lastVisit: string;
  totalVisits: number;
  doctorName?: string;
  branch?: string;
}

const PAGE_SIZE = 25;

function formatLastVisitDate(lastVisit: string): string {
  if (!lastVisit || lastVisit === "Registered") return lastVisit || "Registered";
  try {
    const clean = String(lastVisit).trim().split("T")[0].replace(/\//g, "-");
    const parts = clean.split("-");
    let y = 0, m = 1, d = 1;
    if (parts.length === 3) {
      if (parts[0].length === 4 && parts[2].length === 4) {
        y = parseInt(parts[2], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[0].slice(2), 10);
      } else if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        if (y < 100) y = 2000 + y;
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else if (parts[2].length === 4 || parts[2].length === 2) {
        y = parseInt(parts[2], 10);
        if (y < 100) y = 2000 + y;
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[0], 10);
      }
      const dateObj = new Date(y, m, d);
      if (!isNaN(dateObj.getTime())) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (dateObj.toDateString() === today.toDateString()) return "Today";
        if (dateObj.toDateString() === yesterday.toDateString()) return "Yesterday";
        return dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }
    }
  } catch {}
  return lastVisit;
}

export default function ReceptionAllPatientsPage() {
  const [session, setSession] = useState<SessionTab>("TODAY");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");

  // Pagination states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCounts, setSessionCounts] = useState<Record<SessionTab, number>>({
    TODAY: 0,
    YESTERDAY: 0,
    ALL: 0,
  });

  // Load branch name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) setBranchName(saved);
  }, []);

  // Fetch patients for selected session tab and page
  const fetchPatients = useCallback(
    async (tab: SessionTab, page: number) => {
      setIsLoading(true);
      try {
        const savedBranch = localStorage.getItem("branch_name") || branchName;
        const params = new URLSearchParams({
          session: tab,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (savedBranch) params.set("branch", savedBranch);

        const res = await fetch(`/api/reception/patients?${params.toString()}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.patients)) {
          setPatients(
            data.patients.map((p: any) => ({
              id: p.id || p.regId,
              mrn: p.regId || p.mrn || "SPH-GEN",
              name: p.name || p.patientName || "Unknown",
              phone: p.phone || p.phoneNumber || "",
              source: p.source || p.marketingSource || "Walk-in",
              subject: p.subject || p.diseases || "",
              lastVisit: p.lastVisitDate || p.lastVisit || "Registered",
              totalVisits: p.totalVisits || p.appointmentCount || 0,
              doctorName: p.doctorName || p.lastDoctorName || "",
              branch: p.branch || savedBranch,
            }))
          );
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          setCurrentPage(data.currentPage || 1);
        } else {
          setPatients([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      } catch (err) {
        console.error("Failed to load patients:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [branchName]
  );

  // Fetch counts for Today, Yesterday, All
  const fetchSessionCounts = useCallback(async () => {
    const savedBranch = localStorage.getItem("branch_name") || branchName;
    const tabs: SessionTab[] = ["TODAY", "YESTERDAY", "ALL"];
    const counts: Record<SessionTab, number> = { TODAY: 0, YESTERDAY: 0, ALL: 0 };

    await Promise.all(
      tabs.map(async (tab) => {
        try {
          const params = new URLSearchParams({
            session: tab,
            page: "1",
            pageSize: "1",
          });
          if (savedBranch) params.set("branch", savedBranch);
          const res = await fetch(`/api/reception/patients?${params.toString()}`);
          const data = await res.json();
          if (data.success) {
            counts[tab] = data.totalCount || 0;
          }
        } catch {}
      })
    );
    setSessionCounts(counts);
  }, [branchName]);

  // Initial load and tab change effect
  useEffect(() => {
    fetchPatients(session, 1);
    fetchSessionCounts();
  }, [session, fetchPatients, fetchSessionCounts]);

  const handleTabChange = (tab: SessionTab) => {
    setSession(tab);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchPatients(session, currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchPatients(session, currentPage + 1);
    }
  };

  const handlePageSelect = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      fetchPatients(session, page);
    }
  };

  // Form states for new patient registration
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDiseases, setNewDiseases] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert("Please fill in patient name and phone number");
      return;
    }

    try {
      setIsRegistering(true);
      const generatedMrn = `SPH-${Math.floor(1000 + Math.random() * 9000)}`;

      const res = await fetch("/api/reception/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regId: generatedMrn,
          name: newName.trim(),
          phone: newPhone.trim(),
          diseases: newDiseases.trim(),
          branch: branchName,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        setNewName("");
        setNewPhone("");
        setNewDiseases("");
        fetchPatients(session, 1);
        fetchSessionCounts();
      } else {
        alert(data.error || "Failed to register patient");
      }
    } catch {
      alert("Failed to connect to server");
    } finally {
      setIsRegistering(false);
    }
  };

  // Filter local patients on the current loaded page by search query
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }, [patients, searchQuery]);

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      <ReceptionSidebar activePage="all-patients" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#268ec8]" />
                <h2 className="text-xl font-bold text-slate-900">All Patients Directory</h2>
                <span className="bg-sky-50 text-[#0284c7] font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-sky-200">
                  {totalCount} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {branchName} • Front desk patient medical records (MRN) &amp; directory
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchPatients(session, currentPage);
                  fetchSessionCounts();
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-xs"
                title="Refresh Patients"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#0284c7]" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Register Patient</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-5 max-w-7xl w-full mx-auto space-y-4">
          {/* Top Controls: Session Tabs + Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Session Tabs (Today, Yesterday, All Patients) matching mobile app */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 w-fit">
              <button
                type="button"
                onClick={() => handleTabChange("TODAY")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  session === "TODAY"
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Today ({sessionCounts.TODAY})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("YESTERDAY")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  session === "YESTERDAY"
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Yesterday ({sessionCounts.YESTERDAY})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("ALL")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  session === "ALL"
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Patients ({sessionCounts.ALL})</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, MRN or mobile..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8] shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Patients Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between min-h-[460px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">MRN ID</th>
                    <th className="px-6 py-3.5">Patient Name</th>
                    <th className="px-6 py-3.5">Mobile Phone</th>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5">Last Visit</th>
                    <th className="px-6 py-3.5 text-center">Total Visits</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#0284c7]" />
                          <span className="text-xs font-semibold">Loading patients ({session.toLowerCase()})...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">No Patients Found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchQuery
                            ? `No records match "${searchQuery}".`
                            : session === "TODAY"
                            ? "No patients registered today."
                            : session === "YESTERDAY"
                            ? "No patients registered yesterday."
                            : "No patients registered in the directory yet."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((patient) => {
                      const cleanPhone = (patient.phone || "").replace(/\D/g, "").slice(-10);
                      const historyUrl = `/reception/patient-history?id=${encodeURIComponent(patient.mrn)}&phone=${encodeURIComponent(cleanPhone)}&name=${encodeURIComponent(patient.name)}`;
                      const patientFileUrl = `/reception/patient-file?id=${encodeURIComponent(patient.mrn)}&registrationId=${encodeURIComponent(patient.mrn)}&name=${encodeURIComponent(patient.name)}&phone=${encodeURIComponent(cleanPhone)}`;

                      return (
                        <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3.5 font-mono font-bold text-[#0284c7]">
                            <Link href={historyUrl} className="hover:underline">
                              {patient.mrn}
                            </Link>
                          </td>
                          <td className="px-6 py-3.5 font-bold text-slate-900">
                            <Link href={historyUrl} className="hover:text-[#0284c7] transition-colors">
                              {patient.name}
                            </Link>
                            {patient.subject && (
                              <p className="text-[11px] font-normal text-slate-500 truncate max-w-xs">{patient.subject}</p>
                            )}
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-slate-700">
                            {cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "No Mobile"}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {patient.source || "Walk-in"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-500 font-medium">{formatLastVisitDate(patient.lastVisit)}</td>
                          <td className="px-6 py-3.5 text-center font-bold text-slate-800">
                            {patient.totalVisits > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-50 text-[#0284c7] border border-sky-200">
                                {patient.totalVisits} {patient.totalVisits === 1 ? "Visit" : "Visits"}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end">
                              <Link
                                href={historyUrl}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-[#0284c7] font-bold text-xs transition-colors shadow-2xs"
                                title="View All History, Prescriptions and Billing"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>History &amp; Rx</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Page-wise Pagination Footer (25 per page) */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800">{startIndex}</span> to{" "}
                <span className="font-bold text-slate-800">{endIndex}</span> of{" "}
                <span className="font-bold text-slate-800">{totalCount}</span> patients (25 per page)
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1 || isLoading}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-2xs ${
                      currentPage <= 1 || isLoading
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {pageNumbers.map((p) => {
                      const isActive = p === currentPage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePageSelect(p)}
                          disabled={isLoading}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#0284c7] text-white shadow-xs"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || isLoading}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-2xs ${
                      currentPage >= totalPages || isLoading
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#268ec8]" />
                <h3 className="font-bold text-slate-900">Register New Patient</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +91 98480 12345"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Primary Symptoms / Health Concern
                </label>
                <input
                  type="text"
                  value={newDiseases}
                  onChange={(e) => setNewDiseases(e.target.value)}
                  placeholder="e.g. Chronic Migraine, Hair Fall, Skin Allergy"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white rounded-lg text-sm font-semibold shadow transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isRegistering ? "Registering..." : "Register & Generate MRN"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
