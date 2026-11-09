"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Globe,
  Search,
  Filter,
  Download,
  Phone,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  RefreshCw,
  Activity,
  FileText,
  Stethoscope,
  X,
  MessageCircle,
  Clock,
  ShieldCheck,
  Lock,
} from "lucide-react";
import Link from "next/link";

export interface PatientDirectoryItem {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  ageGender: string;
  registeredBranch: string;
  lastDoctor: string;
  totalVisits: number;
  lastVisitDate: string;
  condition: string;
  email?: string;
}

function GlobalPatientsContent() {
  const [patients, setPatients] = useState<PatientDirectoryItem[]>([]);
  const [branches, setBranches] = useState<string[]>([
    "All Branches",
    "KPHB Branch",
    "Chandanagar Branch",
    "Nallagandla Branch",
    "Dilshuknagar Branch",
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientDirectoryItem | null>(null);

  // Server-side Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch real patient data from the API (paginated on server)
  const fetchGlobalPatients = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("pageSize", String(pageSize));
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (selectedBranch && selectedBranch !== "All Branches") params.set("branch", selectedBranch);

        const res = await fetch(`/api/admin/global-patients?${params.toString()}`, {
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.patients)) {
            setPatients(data.patients);
            setTotalCount(data.totalCount || 0);
            setTotalPages(data.totalPages || 1);
            if (Array.isArray(data.branches) && data.branches.length > 0) {
              setBranches(data.branches);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load global patients directory:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, searchTerm, selectedBranch]
  );

  useEffect(() => {
    fetchGlobalPatients();
  }, [fetchGlobalPatients]);

  // Reset to page 1 on search or branch change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Real Full CSV Export from Server
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.set("export", "true");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedBranch && selectedBranch !== "All Branches") params.set("branch", selectedBranch);

      const res = await fetch(`/api/admin/global-patients?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;
      const data = await res.json();
      const exportList: PatientDirectoryItem[] = data.patients || patients;

      if (exportList.length === 0) return;

      const headers = [
        "MRN",
        "Patient Name",
        "Phone",
        "Age / Gender",
        "Registered Branch",
        "Doctor Treated",
        "Total Visits",
        "Last Visit Date",
        "Clinical Condition",
        "Email",
      ];

      const rows = exportList.map((p) => [
        `"${p.mrn}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.phone}"`,
        `"${p.ageGender}"`,
        `"${p.registeredBranch}"`,
        `"${p.lastDoctor}"`,
        p.totalVisits,
        `"${p.lastVisitDate}"`,
        `"${p.condition.replace(/"/g, '""')}"`,
        `"${p.email || ""}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      const nowStr = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SPH_Master_Patients_Directory_${nowStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn("Failed to export patients CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/global-patients" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Global Patients Directory
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Master Index
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Hospital-wide master patient index across all clinic branches with real-time consultation records
              </p>
            </div>

            {/* Actions: Search, Branch Filter, Refresh, Export */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search MRN, Name, Phone..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-52 sm:w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Branch Selector */}
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => fetchGlobalPatients(true)}
                disabled={loading || refreshing}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
                title="Refresh master directory"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${refreshing ? "animate-spin" : ""}`} />
              </button>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                disabled={totalCount === 0 || exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
              >
                <Download className={`w-3.5 h-3.5 ${exporting ? "animate-bounce" : ""}`} />
                <span>{exporting ? "Exporting..." : "Export Master List"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area - Full Width */}
        <div className="p-5 md:p-6 w-full space-y-4">
          {/* Master Table Card - Expanded Full Width */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">S.No</th>
                    <th className="py-3 px-4">Patient MRN / ID</th>
                    <th className="py-3 px-4">Patient Name &amp; Phone</th>
                    <th className="py-3 px-4">Registered Branch</th>
                    <th className="py-3 px-4">Doctor Treated</th>
                    <th className="py-3 px-3 text-center">Visits</th>
                    <th className="py-3 px-4">Last Visit</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                          <span className="text-xs font-semibold">Loading master patient directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : patients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <User className="w-6 h-6 text-slate-300" />
                          <p className="font-bold text-slate-600 text-sm">No patients found</p>
                          <p className="text-[11px] text-slate-400">
                            Try adjusting your search query or selected branch filter
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    patients.map((item, idx) => {
                      const sNo = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr
                          key={item.id || item.mrn || idx}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* S.No */}
                          <td className="py-3 px-3 text-center font-bold text-slate-400 text-xs">
                            {sNo}
                          </td>

                          {/* Patient MRN / ID */}
                          <td className="py-3 px-4">
                            <span className="text-[10.5px] font-mono font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                              {item.mrn}
                            </span>
                          </td>

                          {/* Patient Name & Phone */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                              {item.name}
                            </span>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-[#0284c7]" />
                              <span>{item.phone}</span>
                            </p>
                          </td>

                          {/* Registered Branch */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800 bg-slate-100/80 px-2 py-0.5 rounded text-[11px]">
                              {item.registeredBranch}
                            </span>
                          </td>

                          {/* Doctor Treated */}
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.lastDoctor}</span>
                            </div>
                          </td>

                          {/* Visits */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-[#0284c7] bg-sky-50 px-2.5 py-0.5 rounded-full text-xs border border-sky-100">
                              {item.totalVisits}
                            </span>
                          </td>

                          {/* Last Visit */}
                          <td className="py-3 px-4 font-semibold text-slate-600">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{item.lastVisitDate}</span>
                            </div>
                          </td>

                          {/* Actions: History of Rx, Quick View */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* History of Rx (Read-Only in Admin Context) */}
                              <Link
                                href={`/admin/patient-history?regId=${encodeURIComponent(String(item.mrn || ""))}&name=${encodeURIComponent(String(item.name || ""))}&phone=${encodeURIComponent(String(item.phone || ""))}&branch=${encodeURIComponent(String(item.registeredBranch || ""))}&tab=prescriptions&readOnly=true`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-md text-[11px] font-bold transition shadow-2xs"
                                title="Open History of Rx (Admin View • Read-Only)"
                              >
                                <Activity className="w-3 h-3" />
                                <span>History of Rx</span>
                              </Link>

                              {/* Quick View Modal Button */}
                              <button
                                onClick={() => setSelectedPatient(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                                title="Quick Profile Overview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Server-Side Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50/70 text-xs">
              <div className="text-slate-500 font-medium">
                {totalCount > 0 ? (
                  <>
                    Showing <b className="text-slate-800">{(currentPage - 1) * pageSize + 1}</b> to{" "}
                    <b className="text-slate-800">{Math.min(currentPage * pageSize, totalCount)}</b> of{" "}
                    <b className="text-slate-800">{totalCount}</b> patients
                  </>
                ) : (
                  <span>0 patients recorded</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Per Page Selector: 25, 50, 75, 100 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-2 py-1 rounded-md border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={75}>75 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="px-2 font-bold text-slate-700 text-xs">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || loading}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Quick Details Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{selectedPatient.name}</h3>
                    <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                      MRN: {selectedPatient.mrn}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Read-Only Clinical Badge */}
              <div className="mx-4 mt-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-[11px] font-semibold text-amber-800">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Read-Only Administrative View • Editing &amp; Modifying Disabled</span>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</span>
                    <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-sky-600" />
                      <span>{selectedPatient.phone}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demographics</span>
                    <div className="font-bold text-slate-900 mt-0.5">{selectedPatient.ageGender}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Clinic</span>
                    <div className="font-bold text-slate-900 mt-0.5">{selectedPatient.registeredBranch}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor Treated</span>
                    <div className="font-bold text-slate-900 mt-0.5">{selectedPatient.lastDoctor}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Primary Clinical Condition / Symptoms
                  </span>
                  <div className="p-2.5 rounded-lg bg-sky-50/50 border border-sky-100 text-slate-800 font-semibold">
                    {selectedPatient.condition}
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 text-[11px]">
                  <span>
                    Total Visits: <strong className="text-slate-900">{selectedPatient.totalVisits} Encounters</strong>
                  </span>
                  <span>
                    Last Recorded Visit: <strong className="text-slate-900">{selectedPatient.lastVisitDate}</strong>
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`https://wa.me/${String(selectedPatient.phone || "").replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/patient-history?regId=${encodeURIComponent(String(selectedPatient.mrn || ""))}&phone=${encodeURIComponent(String(selectedPatient.phone || ""))}&name=${encodeURIComponent(String(selectedPatient.name || ""))}&branch=${encodeURIComponent(String(selectedPatient.registeredBranch || ""))}&tab=prescriptions&readOnly=true`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg transition"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>History of Rx</span>
                  </Link>

                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                  >
                    Done
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

export default function GlobalPatientsListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans">
          <AdminSidebar currentPath="/admin/global-patients" />
          <main className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
              <span>Loading Global Patients Directory...</span>
            </div>
          </main>
        </div>
      }
    >
      <GlobalPatientsContent />
    </Suspense>
  );
}
