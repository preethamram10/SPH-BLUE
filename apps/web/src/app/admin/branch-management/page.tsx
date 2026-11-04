"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Building2,
  Plus,
  Phone,
  MapPin,
  Clock,
  Image as ImageIcon,
  CheckCircle,
  X,
  Shield,
  Search,
  RefreshCw,
  Trash2,
  BarChart3,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Branch {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  timings: string;
  photoUrl: string;
  photoName?: string;
  doctorsCount: number;
  isActive?: boolean;
}

export default function BranchManagementPage() {
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  // Modal State for Branch Creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [newBranchName, setNewBranchName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  // Clock time picker state
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("20:30");
  const [workingDays, setWorkingDays] = useState("Mon - Sat");
  const [newPhotoName, setNewPhotoName] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  // Helper to format 24h clock time to 12h display
  const formatTime12h = (time24: string) => {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
  };

  const formattedTimings = `${formatTime12h(openTime)} - ${formatTime12h(closeTime)} (${workingDays})`;

  // Fetch Branches from API
  const fetchBranches = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/branches", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setBranches(data.data);
          const now = new Date();
          setLastSyncTime(
            now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
        }
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, []);
  // Initial fetch + Automatic Background Sync (every 5 seconds)
  useEffect(() => {
    fetchBranches();
    const interval = setInterval(() => {
      fetchBranches();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchBranches]);

  // Create Branch Handler
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newPhone || !newAddress) {
      alert("Please fill in the Branch Name, Phone Number, and Address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBranchName,
          phone: newPhone,
          address: newAddress,
          city: "Hyderabad",
          timings: formattedTimings,
          photoUrl:
            newPhotoUrl ||
            "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&q=80",
          photoName: newPhotoName || "branch_main_photo.jpg",
        }),
      });

      if (res.ok) {
        await fetchBranches();
        setIsModalOpen(false);
        setNewBranchName("");
        setNewPhone("");
        setNewAddress("");
        setOpenTime("09:00");
        setCloseTime("20:30");
        setWorkingDays("Mon - Sat");
        setNewPhotoName("");
        setNewPhotoUrl("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create branch");
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Branch Handler
  const handleDeleteBranch = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete branch "${name}"?`)) return;

    try {
      const res = await fetch(`/api/branches?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchBranches();
      }
    } catch (err: any) {
      alert("Failed to delete branch");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    router.replace("/login");
  };

  // Filtered branches
  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* UNIFIED ADMIN SIDEBAR */}
      <AdminSidebar currentPath="/admin/branch-management" />

      {/* RIGHT MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-[#268ec8]" />
                <h2 className="text-xl font-bold text-slate-900">Branch Management</h2>
                <span className="bg-[#a8ce3a]/20 text-[#268ec8] font-semibold text-xs px-2.5 py-0.5 rounded-full border border-[#a8ce3a]/40">
                  {branches.length} Locations
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Live multi-device sync • Staff Mobile &amp; Admin Web Portal
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Auto-Sync status & Manual Refresh button */}
              <div className="hidden sm:flex flex-col items-end mr-1 text-right">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Auto-sync active
                </span>
                {lastSyncTime && (
                  <span className="text-[10px] text-slate-400">
                    Synced: {lastSyncTime}
                  </span>
                )}
              </div>

              <button
                onClick={() => fetchBranches(true)}
                disabled={isRefreshing}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all ${isRefreshing ? "opacity-75" : ""
                  }`}
                title="Refresh branches data from database"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#268ec8] ${isRefreshing ? "animate-spin" : ""
                    }`}
                />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Branch</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-6 py-8 max-w-7xl w-full mx-auto">
          {/* Search & Overview Banner */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branch name, phone or address..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8] transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm">
              <Shield className="w-4 h-4 text-[#a8ce3a]" />
              <span>Automatic 5s Background Sync with Staff Mobile App</span>
            </div>
          </div>

          {/* Branches Grid */}
          {loading && branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 text-[#268ec8] animate-spin mb-3" />
              <p className="text-sm">Loading clinic branches...</p>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl p-8">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">No branches registered yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No branch matching "${searchQuery}". Try a different keyword.`
                  : "Click 'Add New Branch' above to register your first clinic location."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {filteredBranches.map((branch) => (
                <div
                  key={branch.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
                >
                  {/* Branch Image */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        branch.photoUrl ||
                        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&q=80"
                      }
                      alt={branch.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&q=80";
                      }}
                    />
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      <span>ACTIVE</span>
                    </div>

                    <button
                      onClick={() => handleDeleteBranch(branch.id, branch.name)}
                      className="absolute top-3 left-3 bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg shadow-sm transition-colors"
                      title="Delete Branch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {branch.photoName && (
                      <div className="absolute bottom-2 left-2 bg-slate-900/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded flex items-center space-x-1">
                        <ImageIcon className="w-3 h-3 text-[#a8ce3a]" />
                        <span className="truncate max-w-[180px]">{branch.photoName}</span>
                      </div>
                    )}
                  </div>

                  {/* Branch Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug mb-3">
                        {branch.name}
                      </h3>

                      <div className="space-y-2 text-xs text-slate-600 mb-4">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-[#268ec8] shrink-0" />
                          <span className="font-semibold text-slate-800">{branch.phone}</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-[#268ec8] shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{branch.address}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-[#a8ce3a] shrink-0" />
                          <span className="text-slate-600 font-medium">{branch.timings}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs bg-[#268ec8]/10 text-[#268ec8] font-semibold px-2.5 py-1 rounded-md">
                        {branch.doctorsCount} Doctors Available
                      </span>
                      <span className="text-xs font-semibold text-[#268ec8] hover:underline cursor-pointer">
                        Manage Staff →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#268ec8]" />
                <h3 className="font-bold text-slate-900">Add New Clinic Branch</h3>
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Spiritual Homeopathy - Gachibowli Branch"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +91 90301 76176"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Door/Plot No., Street, Landmark, City &amp; PIN code"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              {/* Working Hours with Interactive Clock Pickers */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#268ec8]" />
                    <span>Branch Timings (Clock) *</span>
                  </label>
                  <span className="text-[11px] font-bold text-[#268ec8] bg-white border border-[#268ec8]/30 px-2 py-0.5 rounded-md shadow-xs">
                    {formattedTimings}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#268ec8]" />
                      Opening Time (Clock)
                    </label>
                    <input
                      type="time"
                      required
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#a8ce3a]" />
                      Closing Time (Clock)
                    </label>
                    <input
                      type="time"
                      required
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Days Selector & Quick Presets */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-medium">Days:</span>
                    {["Mon - Sat", "Mon - Sun", "Mon - Fri"].map((dayOpt) => (
                      <button
                        key={dayOpt}
                        type="button"
                        onClick={() => setWorkingDays(dayOpt)}
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-all ${
                          workingDays === dayOpt
                            ? "bg-[#268ec8] text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {dayOpt}
                      </button>
                    ))}
                  </div>

                  {/* Quick Timing Presets */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenTime("09:00");
                        setCloseTime("20:30");
                        setWorkingDays("Mon - Sat");
                      }}
                      className="text-[10px] text-[#268ec8] hover:underline font-semibold"
                    >
                      Reset (9AM - 8:30PM)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Photo File Name
                </label>
                <input
                  type="text"
                  value={newPhotoName}
                  onChange={(e) => setNewPhotoName(e.target.value)}
                  placeholder="e.g. branch_exterior.jpg"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://... (leave empty for default clinic image)"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              {/* Action Buttons */}
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
                  disabled={submitting}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white rounded-lg text-sm font-semibold shadow transition-colors disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{submitting ? "Saving..." : "Save Branch"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
