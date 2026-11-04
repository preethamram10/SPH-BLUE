"use client";

import React, { useState } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Calendar,
  X,
  CheckCircle,
  Clock,
  Shield,
} from "lucide-react";

interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  city: string;
  lastVisit: string;
  totalVisits: number;
}

export default function ReceptionAllPatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");

  React.useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) setBranchName(saved);
  }, []);

  // Form states for new patient
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newGender, setNewGender] = useState<"Male" | "Female" | "Other">("Male");
  const [newCity, setNewCity] = useState("Hyderabad");

  const [patients, setPatients] = useState<Patient[]>([
    {
      id: "1",
      mrn: "SPH-2026-0842",
      name: "Venkatesh Rao",
      age: 46,
      gender: "Male",
      phone: "+91 98480 23456",
      city: "Hyderabad",
      lastVisit: "Today",
      totalVisits: 4,
    },
    {
      id: "2",
      mrn: "SPH-2026-0914",
      name: "Ananya Sharma",
      age: 29,
      gender: "Female",
      phone: "+91 97001 88442",
      city: "Hyderabad",
      lastVisit: "02 Nov 2026",
      totalVisits: 2,
    },
    {
      id: "3",
      mrn: "SPH-2026-1022",
      name: "Mohammed Farooq",
      age: 38,
      gender: "Male",
      phone: "+91 81255 44901",
      city: "Hyderabad",
      lastVisit: "28 Oct 2026",
      totalVisits: 1,
    },
    {
      id: "4",
      mrn: "SPH-2026-0789",
      name: "Srilatha Devi",
      age: 52,
      gender: "Female",
      phone: "+91 94401 55678",
      city: "Hyderabad",
      lastVisit: "Today",
      totalVisits: 6,
    },
  ]);

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      alert("Please fill in patient name and phone number");
      return;
    }

    const created: Patient = {
      id: Date.now().toString(),
      mrn: `SPH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newName.trim(),
      age: parseInt(newAge) || 30,
      gender: newGender,
      phone: newPhone.trim(),
      city: newCity.trim(),
      lastVisit: "Just Registered",
      totalVisits: 1,
    };

    setPatients([created, ...patients]);
    setIsModalOpen(false);
    setNewName("");
    setNewPhone("");
    setNewAge("");
    setNewGender("Male");
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      <ReceptionSidebar activePage="all-patients" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#268ec8]" />
                <h2 className="text-xl font-bold text-slate-900">All Patients Directory</h2>
                <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {patients.length} Registered
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {branchName} • Front desk patient medical records (MRN) &amp; registration
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Patient</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, MRN or mobile number..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8] shadow-sm"
            />
          </div>

          {/* Patients Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">MRN ID</th>
                    <th className="px-6 py-3.5">Patient Name</th>
                    <th className="px-6 py-3.5">Age / Gender</th>
                    <th className="px-6 py-3.5">Mobile Phone</th>
                    <th className="px-6 py-3.5">City</th>
                    <th className="px-6 py-3.5">Last Visit</th>
                    <th className="px-6 py-3.5 text-right">Total Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                        No patients found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((patient) => (
                      <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-[#268ec8]">
                          {patient.mrn}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{patient.name}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {patient.age} yrs • {patient.gender}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{patient.phone}</td>
                        <td className="px-6 py-4 text-slate-600">{patient.city}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{patient.lastVisit}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                          {patient.totalVisits}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="e.g. 35"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8] bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="e.g. Hyderabad"
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
                  className="flex items-center space-x-1.5 px-5 py-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white rounded-lg text-sm font-semibold shadow transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Register &amp; Generate MRN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

