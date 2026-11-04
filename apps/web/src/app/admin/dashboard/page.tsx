"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  LogOut,
  Shield,
  Building2,
  Users,
  BarChart3,
  Settings,
  Plus,
  Phone,
  MapPin,
  Clock,
  Image as ImageIcon,
  CheckCircle,
  X,
  Search,
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  timings: string;
  photoUrl: string;
  photoName: string;
  doctorsCount: number;
}

export default function AdminDashboardPage() {
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "branches" | "staff" | "settings">("branches");

  // Existing Branches
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: "1",
      name: "Spiritual Homeopathy - Kukatpally Branch",
      phone: "+91 90301 76176",
      address: "Plot 102, Metro Pillar A784, KPHB Main Road, Hyderabad - 500072",
      city: "Hyderabad",
      timings: "9:00 AM - 8:30 PM",
      photoUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=500&q=80",
      photoName: "kukatpally_exterior.jpg",
      doctorsCount: 4,
    },
    {
      id: "2",
      name: "Spiritual Homeopathy - Banjara Hills Branch",
      phone: "+91 81252 60176",
      address: "Road No. 12, Near MLA Colony, Banjara Hills, Hyderabad - 500034",
      city: "Hyderabad",
      timings: "9:30 AM - 8:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500&q=80",
      photoName: "banjara_clinic_front.jpg",
      doctorsCount: 3,
    },
    {
      id: "3",
      name: "Spiritual Homeopathy - Dilsukhnagar Branch",
      phone: "+91 98480 12345",
      address: "Opp. Konark Theatre, Main Road, Dilsukhnagar, Hyderabad - 500060",
      city: "Hyderabad",
      timings: "10:00 AM - 7:30 PM",
      photoUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&q=80",
      photoName: "dilsukhnagar_opd.jpg",
      doctorsCount: 2,
    },
  ]);

  // Modal State for Branch Creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newTimings, setNewTimings] = useState("9:00 AM - 8:00 PM");
  const [newPhotoName, setNewPhotoName] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    window.location.href = "/login";
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newPhone || !newAddress) {
      alert("Please fill in the Branch Name, Phone Number, and Address.");
      return;
    }

    const created: Branch = {
      id: Date.now().toString(),
      name: newBranchName,
      phone: newPhone,
      address: newAddress,
      city: "Hyderabad",
      timings: newTimings,
      photoUrl: newPhotoUrl || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&q=80",
      photoName: newPhotoName || "branch_main_photo.jpg",
      doctorsCount: 1,
    };

    setBranches([created, ...branches]);
    setIsModalOpen(false);

    // Reset Form
    setNewBranchName("");
    setNewPhone("");
    setNewAddress("");
    setNewPhotoName("");
    setNewPhotoUrl("");
    alert(`Branch "${created.name}" created successfully!`);
  };

  return (
    <div className="h-screen bg-[#f8fafc] flex overflow-hidden">
      {/* Left Sidebar Menu */}
      <AdminSidebar currentPath="/admin/dashboard" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {activeMenu === "branches" && "Clinic Branch Management"}
              {activeMenu === "dashboard" && "Clinical Overview & Analytics"}
              {activeMenu === "staff" && "Doctors & Clinical Staff"}
              {activeMenu === "settings" && "Master Configuration"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Spiritual Homeopathy • Multi-branch Administration
            </p>
          </div>

          {activeMenu === "branches" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#268ec8] hover:bg-[#1f7bb0] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Branch</span>
            </button>
          )}
        </header>

        {/* Content Body */}
        <main className="p-8 max-w-7xl w-full">
          {activeMenu === "branches" ? (
            /* =================== CLINIC BRANCHES SECTION =================== */
            <div>
              {/* Branch Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Branches</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{branches.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#268ec8] flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Active OPDs Today</p>
                    <p className="text-2xl font-bold text-[#a8ce3a] mt-1">{branches.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#a8ce3a] flex items-center justify-center font-bold">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Consulting Doctors</p>
                    <p className="text-2xl font-bold text-[#268ec8] mt-1">9</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#268ec8] flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Branches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo Thumbnail */}
                      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                        <img
                          src={branch.photoUrl}
                          alt={branch.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 right-3 bg-[#a8ce3a] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                          Active
                        </span>
                        <span className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>{branch.photoName}</span>
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="font-bold text-slate-800 text-base leading-snug">
                          {branch.name}
                        </h3>

                        {/* Phone */}
                        <div className="flex items-center gap-2 mt-3 text-xs text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-[#268ec8] shrink-0" />
                          <span className="font-semibold text-slate-700">{branch.phone}</span>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-2 mt-2 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-[#268ec8] shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{branch.address}</span>
                        </div>

                        {/* Working Timings */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-[#a8ce3a] shrink-0" />
                          <span className="font-medium">{branch.timings}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        {branch.doctorsCount} Active Doctors
                      </span>
                      <button className="text-[#268ec8] hover:underline font-bold">
                        Edit Branch →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Placeholder for other views */
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <BarChart3 className="w-12 h-12 text-[#268ec8] mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Section Active</h3>
              <p className="text-xs text-slate-500 mt-1">This section is ready for future widgets.</p>
            </div>
          )}
        </main>
      </div>

      {/* =================== ADD BRANCH MODAL =================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800">Register New Clinic Branch</h3>
                <p className="text-xs text-slate-500">Add branch details, contact number, and photo</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Branch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Spiritual Homeopathy - Madhapur Branch"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#268ec8]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contact Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 90301 76176 / 040-23456789"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#268ec8]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Branch Full Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Plot/Door No, Metro Pillar, Street, Landmark, City & Pincode"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#268ec8]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Working Hours
                  </label>
                  <input
                    type="text"
                    value={newTimings}
                    onChange={(e) => setNewTimings(e.target.value)}
                    placeholder="9:00 AM - 8:00 PM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#268ec8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Photo Name / Label
                  </label>
                  <input
                    type="text"
                    value={newPhotoName}
                    onChange={(e) => setNewPhotoName(e.target.value)}
                    placeholder="e.g. madhapur_reception.jpg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#268ec8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Branch Photo Image URL (or file path)
                </label>
                <input
                  type="text"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#268ec8]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#268ec8] hover:bg-[#1f7bb0] text-white text-xs font-bold shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save &amp; Publish Branch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
