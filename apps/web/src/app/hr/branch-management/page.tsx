"use client";

import React, { useState, useEffect, useCallback } from "react";
import HRSidebar from "@/components/HRSidebar";
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
  Pencil,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Branch Creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("20:30");
  const [workingDays, setWorkingDays] = useState("Mon - Sat");
  const [newPhotoName, setNewPhotoName] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  // Modal State for Branch Editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBranchId, setEditBranchId] = useState("");
  const [editBranchName, setEditBranchName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editOpenTime, setEditOpenTime] = useState("09:00");
  const [editCloseTime, setEditCloseTime] = useState("20:30");
  const [editWorkingDays, setEditWorkingDays] = useState("Mon - Sat");
  const [editPhotoName, setEditPhotoName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Modal State for Delete Confirmation Popup
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
  const editFormattedTimings = `${formatTime12h(editOpenTime)} - ${formatTime12h(
    editCloseTime
  )} (${editWorkingDays})`;

  // Helper to parse timings string back into 24h clock times & days
  const parseTimingsToFields = (timingsStr?: string) => {
    let open = "09:00";
    let close = "20:30";
    let days = "Mon - Sat";
    if (!timingsStr) return { open, close, days };

    const daysMatch = timingsStr.match(/\((.*?)\)/);
    if (daysMatch) {
      days = daysMatch[1].trim();
    }

    const timePart = timingsStr.replace(/\(.*?\)/, "").trim();
    const parts = timePart.split("-").map((s) => s.trim());

    const parse12hTo24h = (raw?: string) => {
      if (!raw) return "";
      const m = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!m) return "";
      let h = parseInt(m[1], 10);
      const min = m[2];
      const ampm = (m[3] || "").toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return `${h.toString().padStart(2, "0")}:${min}`;
    };

    if (parts.length >= 2) {
      const parsedOpen = parse12hTo24h(parts[0]);
      const parsedClose = parse12hTo24h(parts[1]);
      if (parsedOpen) open = parsedOpen;
      if (parsedClose) close = parsedClose;
    }

    return { open, close, days };
  };

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

  // Open Edit Branch Modal
  const handleOpenEditModal = (branch: Branch) => {
    setEditBranchId(branch.id);
    setEditBranchName(branch.name);
    setEditPhone(branch.phone);
    setEditAddress(branch.address);
    setEditPhotoName(branch.photoName || "");
    setEditPhotoUrl(branch.photoUrl || "");
    setEditIsActive(branch.isActive !== false);

    const { open, close, days } = parseTimingsToFields(branch.timings);
    setEditOpenTime(open);
    setEditCloseTime(close);
    setEditWorkingDays(days);
    setIsEditModalOpen(true);
  };

  // Update Branch Handler
  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranchName || !editPhone || !editAddress) {
      alert("Please fill in Branch Name, Phone Number, and Address.");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editBranchId,
          name: editBranchName,
          phone: editPhone,
          address: editAddress,
          city: "Hyderabad",
          timings: editFormattedTimings,
          photoUrl: editPhotoUrl,
          photoName: editPhotoName,
          isActive: editIsActive,
        }),
      });

      if (res.ok) {
        await fetchBranches();
        setIsEditModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update branch");
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleRequestDelete = (branch: Branch) => {
    setBranchToDelete({ id: branch.id, name: branch.name });
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Branch Handler
  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/branches?id=${branchToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchBranches();
        setIsDeleteModalOpen(false);
        setBranchToDelete(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete branch");
      }
    } catch (err: any) {
      alert("Failed to delete branch: " + err.message);
    } finally {
      setDeleting(false);
    }
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
      <HRSidebar currentPath="/hr/branch-management" />

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
                  <span className="text-[10px] text-slate-400">Synced: {lastSyncTime}</span>
                )}
              </div>

              <button
                onClick={() => fetchBranches(true)}
                disabled={isRefreshing}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all ${
                  isRefreshing ? "opacity-75" : ""
                }`}
                title="Refresh branches data from database"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#268ec8] ${isRefreshing ? "animate-spin" : ""}`}
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
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between"
                >
                  {/* Branch Top Image & Badges */}
                  <div>
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

                      {/* Status Badge */}
                      <div
                        className={`absolute top-3 right-3 font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm flex items-center space-x-1 ${
                          branch.isActive !== false
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-500 text-white"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        <span>{branch.isActive !== false ? "ACTIVE" : "INACTIVE"}</span>
                      </div>

                      {branch.photoName && (
                        <div className="absolute bottom-2 left-2 bg-slate-900/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded flex items-center space-x-1">
                          <ImageIcon className="w-3 h-3 text-[#a8ce3a]" />
                          <span className="truncate max-w-[180px]">{branch.photoName}</span>
                        </div>
                      )}
                    </div>

                    {/* Branch Info */}
                    <div className="p-5">
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

                      <div className="inline-block text-xs bg-[#268ec8]/10 text-[#268ec8] font-semibold px-2.5 py-1 rounded-md">
                        {branch.doctorsCount} Doctors Available
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions: Edit & Delete Buttons */}
                  <div className="p-4 pt-3 border-t border-slate-100 flex items-center gap-2 bg-slate-50/50">
                    <button
                      onClick={() => handleOpenEditModal(branch)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white hover:bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs hover:border-sky-300 transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Branch</span>
                    </button>

                    <button
                      onClick={() => handleRequestDelete(branch)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs hover:border-rose-300 transition"
                      title="Delete Branch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* ADD BRANCH MODAL                                                          */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
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
                  placeholder="Door/Plot No., Street, Landmark, City & PIN code"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#268ec8]/30 focus:border-[#268ec8]"
                />
              </div>

              {/* Working Hours with Clock Pickers */}
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
                      Opening Time
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
                      Closing Time
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

                {/* Days Selector & Presets */}
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

      {/* ========================================================================= */}
      {/* EDIT BRANCH MODAL                                                         */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-sky-50/50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit Clinic Branch</h3>
                  <p className="text-[11px] text-slate-500">Update clinic details, timings and status</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateBranch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Branch Status
                  </label>
                  <select
                    value={editIsActive ? "active" : "inactive"}
                    onChange={(e) => setEditIsActive(e.target.value === "active")}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 bg-white"
                  >
                    <option value="active">Active (Operational)</option>
                    <option value="inactive">Inactive (Closed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                />
              </div>

              {/* Working Hours with Clock Pickers */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-sky-600" />
                    <span>Working Hours (Clock) *</span>
                  </label>
                  <span className="text-[11px] font-bold text-sky-700 bg-white border border-sky-300 px-2 py-0.5 rounded-md shadow-xs">
                    {editFormattedTimings}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-600" />
                      Opening Time
                    </label>
                    <input
                      type="time"
                      required
                      value={editOpenTime}
                      onChange={(e) => setEditOpenTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      Closing Time
                    </label>
                    <input
                      type="time"
                      required
                      value={editCloseTime}
                      onChange={(e) => setEditCloseTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Days Selector & Presets */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-medium">Days:</span>
                    {["Mon - Sat", "Mon - Sun", "Mon - Fri"].map((dayOpt) => (
                      <button
                        key={dayOpt}
                        type="button"
                        onClick={() => setEditWorkingDays(dayOpt)}
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-all ${
                          editWorkingDays === dayOpt
                            ? "bg-sky-600 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {dayOpt}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditOpenTime("09:00");
                        setEditCloseTime("20:30");
                        setEditWorkingDays("Mon - Sat");
                      }}
                      className="text-[10px] text-sky-600 hover:underline font-semibold"
                    >
                      Reset (9AM - 8:30PM)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editSubmitting ? "Saving Changes..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION POPUP / MODAL                                         */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Warning Icon & Header */}
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <AlertTriangle className="w-7 h-7 text-rose-600" />
              </div>

              <h3 className="text-lg font-extrabold text-slate-900">
                Confirm Branch Deletion
              </h3>

              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to delete branch:
              </p>

              <div className="my-3 p-3 bg-rose-50 border border-rose-200/80 rounded-xl">
                <div className="font-extrabold text-rose-900 text-sm">
                  {branchToDelete.name}
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                This action cannot be undone. The clinic location will be removed across Admin and Mobile Staff apps.
              </p>
            </div>

            {/* Modal Actions (OK / Cancel) */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setBranchToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm hover:shadow transition disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? "Deleting..." : "OK, Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
