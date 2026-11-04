"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Trash2,
  Search,
  AlertTriangle,
  Phone,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export default function DeleteProfilesPage() {
  const [phoneQuery, setPhoneQuery] = useState("");
  const [searchDone, setSearchDone] = useState(false);
  const [foundProfile, setFoundProfile] = useState<any>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteSuccess(null);
    if (!phoneQuery.trim()) return;

    setSearchDone(true);
    // Demonstration profile match
    if (phoneQuery.includes("9848") || phoneQuery.includes("9700") || phoneQuery.length >= 8) {
      setFoundProfile({
        name: "K. Ramesh Kumar",
        phone: "+91 " + phoneQuery.replace(/\D/g, ""),
        registeredBranch: "KPHB Branch",
        registrationDate: "14 Feb 2024",
        totalVisits: 6,
        lastConsultation: "Dr. Prashanth k vaidya (22 Oct 2026)",
        role: "Patient Record",
      });
    } else {
      setFoundProfile(null);
    }
  };

  const handleDelete = () => {
    if (!foundProfile) return;
    if (
      confirm(
        `DANGER: Are you sure you want to permanently delete profile for ${foundProfile.name} (${foundProfile.phone})? This will archive all associated clinical records.`
      )
    ) {
      setDeleteSuccess(`Profile for ${foundProfile.name} (${foundProfile.phone}) successfully deleted from clinic database.`);
      setFoundProfile(null);
      setPhoneQuery("");
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <AdminSidebar currentPath="/admin/delete-profiles" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900">Delete Profiles (Phone Search)</h1>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Audit and remove duplicate, test, or requested deletion patient accounts by mobile number
              </p>
            </div>
          </div>
        </header>

        <div className="p-7 max-w-3xl space-y-6">
          {/* Warning banner */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">Administrative Guardrail</p>
              <p className="mt-0.5 text-amber-800">
                Deleting a profile will permanently purge patient contact cards, follow-up queues, and appointment entries. Please verify the mobile number carefully before proceeding.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Search Profile By Phone Number
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter 10-digit mobile number (e.g. 9848012345)"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:border-[#0284c7] focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Search Account
              </button>
            </div>
          </form>

          {/* Success Banner */}
          {deleteSuccess && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{deleteSuccess}</span>
            </div>
          )}

          {/* Search Results */}
          {searchDone && !foundProfile && !deleteSuccess && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center text-xs text-slate-400">
              No active patient or staff profile found for &quot;{phoneQuery}&quot;.
            </div>
          )}

          {foundProfile && (
            <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-200">
                    Profile Found
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-2">{foundProfile.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{foundProfile.phone}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400">Branch: </span>
                  <span className="font-bold text-slate-800">{foundProfile.registeredBranch}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400">Registered On: </span>
                  <span className="font-bold text-slate-800">{foundProfile.registrationDate}</span>
                </div>
                <div>
                  <span className="text-slate-400">Total Visits: </span>
                  <span className="font-bold text-slate-800">{foundProfile.totalVisits}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Last Doctor: </span>
                  <span className="font-bold text-slate-800">{foundProfile.lastConsultation}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFoundProfile(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Profile Permanently</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

