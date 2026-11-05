"use client";

import React, { useState, useEffect } from "react";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import {
  Package,
  Plus,
  Users,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Search,
  Check,
  X,
} from "lucide-react";

export default function DoctorPackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  // New enrollment form state
  const [patientName, setPatientName] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctor/packages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPackages(data.packages || []);
          setMembers(data.members || []);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !patientName) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/doctor/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          patientName,
          registrationId: registrationId || "SPH-GEN",
          phone,
        }),
      });
      const data = await res.json();
      if (data.success && data.member) {
        setMembers([data.member, ...members]);
        setFeedback(`Patient ${patientName} enrolled into ${selectedPackage.name}!`);
        setIsModalOpen(false);
        setPatientName("");
        setRegistrationId("");
        setPhone("");
      }
    } catch (err: any) {
      alert("Failed to enroll patient: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.registrationId || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <DoctorSidebar activePage="packages" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Doctor Treatment Packages</h2>
                <p className="text-[10px] text-slate-400">Clinical Courses &amp; Membership Management</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-3.5 max-w-7xl w-full mx-auto space-y-3.5">
          {feedback && (
            <div className="p-2.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{feedback}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-[10px] underline hover:opacity-75 cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Treatment Packages Catalog Cards */}
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-2">Available Clinical Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                        {pkg.category}
                      </span>
                      <span className="text-xs font-black text-[#0284c7]">₹{pkg.price.toLocaleString("en-IN")}</span>
                    </div>
                    <h4 className="text-[11.5px] font-bold text-slate-900 leading-tight">{pkg.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{pkg.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-[9.5px] text-slate-500">
                      <span>⏳ {pkg.duration}</span>
                      <span>•</span>
                      <span>🩺 {pkg.totalVisits} Consultations</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setIsModalOpen(true);
                    }}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10.5px] font-extrabold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Prescribe / Enroll</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Enrolled Patients Under Packages */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Enrolled Package Members</h3>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-sky-50 text-[#0284c7] border border-sky-200">
                  {filteredMembers.length}
                </span>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search member or package..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 text-[10.5px] rounded-lg border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-[#0284c7]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Member ID</th>
                    <th className="py-2 px-3">Patient Details</th>
                    <th className="py-2 px-3">Package Enrolled</th>
                    <th className="py-2 px-3">Visits Used / Total</th>
                    <th className="py-2 px-3">Validity</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-[#0284c7] text-[10px]">{m.id}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 text-xs block">{m.patientName}</span>
                        <span className="text-[10px] text-slate-400">{m.registrationId} • 📞 {m.phone}</span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">{m.packageName}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[#0284c7]">{m.visitsUsed}</span>
                          <span className="text-slate-400">/ {m.totalVisits}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[10px] text-slate-500">
                        <span>{m.enrolledDate} → {m.expiryDate}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Enroll Patient Modal */}
      {isModalOpen && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-bold text-slate-900 text-xs">Enroll Patient in Package</h3>
                <p className="text-[10px] text-slate-500">{selectedPackage.name} (₹{selectedPackage.price})</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleEnroll} className="p-3.5 space-y-2.5">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M. Rajeshwar Rao"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0284c7] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Patient ID / MRN</label>
                <input
                  type="text"
                  placeholder="e.g. SPH-KPB-0012"
                  value={registrationId}
                  onChange={(e) => setRegistrationId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0284c7] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9848011223"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0284c7] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-[10.5px] font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-extrabold text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Enrolling..." : "Confirm Enrollment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

