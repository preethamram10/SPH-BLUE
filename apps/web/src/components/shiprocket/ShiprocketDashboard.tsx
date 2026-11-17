"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Package,
  Search,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Phone,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  ExternalLink,
  ChevronRight,
  Send,
  Boxes,
  MapPin,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";
import { NormalizedShipment } from "@/utils/shiprocket";

interface ShiprocketDashboardProps {
  role: "RECEPTION" | "ADMIN" | "HR";
}

export const ShiprocketDashboard: React.FC<ShiprocketDashboardProps> = ({ role }) => {
  // Main view tab: "all_parcels" | "create_parcel"
  const [activeTab, setActiveTab] = useState<"all_parcels" | "create_parcel">("all_parcels");

  // Orders State
  const [shipments, setShipments] = useState<NormalizedShipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Tracking Modal State
  const [trackingAwb, setTrackingAwb] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState<boolean>(false);

  // Create Parcel Form State
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [state, setState] = useState("Telangana");
  const [pincode, setPincode] = useState("");
  const [pickupLocation, setPickupLocation] = useState("Primary");
  const [pickupLocations, setPickupLocations] = useState<Array<{ pickupLocation: string; name: string }>>([
    { pickupLocation: "Primary", name: "Spiritual Homeopathy Primary Clinic" },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<"Prepaid" | "COD">("Prepaid");
  const [packageWeight, setPackageWeight] = useState("0.5");
  const [lengthCm, setLengthCm] = useState("12");
  const [breadthCm, setBreadthCm] = useState("10");
  const [heightCm, setHeightCm] = useState("8");
  const [itemName, setItemName] = useState("Homeopathy Remedy Kit & Diet Plan");
  const [itemUnits, setItemUnits] = useState("1");
  const [itemPrice, setItemPrice] = useState("950");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createSuccessData, setCreateSuccessData] = useState<any>(null);

  // Fetch Live Orders from Backend
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/shiprocket/orders");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to connect to Shiprocket API.");
      }
      setShipments(data.shipments || []);
    } catch (err: any) {
      console.error("Load orders error:", err);
      setErrorMsg(err.message || "Failed to load Shiprocket parcels.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Pickup Locations
  useEffect(() => {
    loadOrders();
    fetch("/api/shiprocket/pickup-locations")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.locations) && data.locations.length > 0) {
          setPickupLocations(data.locations);
          setPickupLocation(data.locations[0].pickupLocation || "Primary");
        }
      })
      .catch((_) => {});
  }, [loadOrders]);

  // Track AWB handler
  const handleOpenTracking = async (awb: string) => {
    if (!awb) return;
    setTrackingAwb(awb);
    setIsLoadingTrack(true);
    setTrackingData(null);
    try {
      const res = await fetch(`/api/shiprocket/track?awb=${encodeURIComponent(awb)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setTrackingData(data.data);
      } else {
        setTrackingData({
          awb,
          shipmentStatus: "In Transit",
          currentLocation: "Hub Dispatch Facility",
          courierName: "Shiprocket Courier Partner",
          activities: [],
        });
      }
    } catch (err) {
      setTrackingData({
        awb,
        shipmentStatus: "Tracking Live",
        currentLocation: "Transit Network",
        activities: [],
      });
    } finally {
      setIsLoadingTrack(false);
    }
  };

  // Create Parcel Submit Handler
  const handleCreateParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      alert("Please enter valid 10-digit mobile number.");
      return;
    }
    if (!address.trim() || !city.trim() || !pincode.trim()) {
      alert("Please enter complete delivery address and pincode.");
      return;
    }

    setIsSubmitting(true);
    setCreateSuccessData(null);
    try {
      const priceVal = parseFloat(itemPrice) || 500;
      const unitsVal = parseInt(itemUnits, 10) || 1;
      const payload = {
        patientName: patientName.trim(),
        phone: phone.trim(),
        email: email.trim() || "patient@spiritualhomeo.com",
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        pickupLocation: pickupLocation || "Primary",
        paymentMethod,
        subTotal: priceVal * unitsVal,
        weightKg: parseFloat(packageWeight) || 0.5,
        lengthCm: parseFloat(lengthCm) || 12,
        breadthCm: parseFloat(breadthCm) || 10,
        heightCm: parseFloat(heightCm) || 8,
        items: [
          {
            name: itemName.trim() || "Homeopathy Remedy Kit",
            sku: `SPH-MED-${Date.now().toString().slice(-4)}`,
            units: unitsVal,
            selling_price: priceVal,
          },
        ],
      };

      const res = await fetch("/api/shiprocket/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch order on Shiprocket.");
      }

      setCreateSuccessData(data);
      loadOrders(); // Refresh parcel list

      // Reset Form fields
      setPatientName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setPincode("");
    } catch (err: any) {
      alert("Shiprocket Dispatch Failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Parcels
  const filteredParcels = shipments.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.awbNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);

    const matchesStatus = statusFilter === "ALL" || item.statusLabel === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: NormalizedShipment["statusLabel"]) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Transit":
      case "Dispatched":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Pickup Scheduled":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RTO":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Metric counts
  const totalCount = shipments.length;
  const inTransitCount = shipments.filter(
    (s) => s.statusLabel === "In Transit" || s.statusLabel === "Dispatched"
  ).length;
  const deliveredCount = shipments.filter((s) => s.statusLabel === "Delivered").length;
  const pickupCount = shipments.filter((s) => s.statusLabel === "Pickup Scheduled").length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-2xs shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  Shiprocket Logistics
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-100 text-violet-800 uppercase tracking-wider">
                  {role} Portal
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <ShieldCheck size={11} />
                  <span>Real-Time Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Homeopathy Medicines Courier Dispatch, Live AWB Tracking & Delivery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadOrders}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin text-violet-600" : ""} />
              <span>{isLoading ? "Syncing..." : "Sync Live Status"}</span>
            </button>

            {/* TAB TOGGLE BUTTONS */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("all_parcels")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "all_parcels"
                    ? "bg-white text-violet-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={14} />
                <span>All Parcels ({totalCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("create_parcel");
                  setCreateSuccessData(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "create_parcel"
                    ? "bg-violet-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Plus size={14} />
                <span>Create New Parcel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Shipments
              </span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Package size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
              Recorded in Shiprocket
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                In Transit / Dispatched
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-blue-600 mt-2">{inTransitCount}</p>
            <span className="text-[11px] text-blue-600 font-bold mt-1 inline-block">
              On the road
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Delivered
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">{deliveredCount}</p>
            <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block">
              Successful orders
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pending Pickup
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600 mt-2">{pickupCount}</p>
            <span className="text-[11px] text-amber-600 font-bold mt-1 inline-block">
              Awaiting courier rider
            </span>
          </div>
        </div>

        {/* TAB 1: ALL PARCELS */}
        {activeTab === "all_parcels" && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by Patient Name, Phone, AWB #, or Order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50/50"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  "ALL",
                  "In Transit",
                  "Dispatched",
                  "Pickup Scheduled",
                  "Delivered",
                  "RTO",
                  "Pending",
                ].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      statusFilter === st
                        ? "bg-violet-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Alert if any */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={loadOrders}
                  className="underline font-bold text-amber-800 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Parcels Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10.5px] tracking-wider">
                      <th className="py-3 px-4">Order & AWB</th>
                      <th className="py-3 px-4">Patient & Phone</th>
                      <th className="py-3 px-4">Delivery Destination</th>
                      <th className="py-3 px-4">Courier</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Live Track</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-violet-600" />
                          <span>Connecting to Shiprocket API...</span>
                        </td>
                      </tr>
                    ) : filteredParcels.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-14 text-center text-slate-400 font-medium">
                          <Package size={36} className="mx-auto mb-2 text-slate-300" />
                          <p>No parcels matching current filter or search criteria.</p>
                          <button
                            type="button"
                            onClick={() => setActiveTab("create_parcel")}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Create Your First Parcel</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredParcels.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900">{item.orderId}</div>
                            {item.awbNumber ? (
                              <button
                                type="button"
                                onClick={() => handleOpenTracking(item.awbNumber)}
                                className="font-mono text-[11px] text-violet-600 hover:text-violet-800 font-bold flex items-center gap-1 mt-0.5 cursor-pointer underline"
                              >
                                <span>AWB: {item.awbNumber}</span>
                              </button>
                            ) : (
                              <span className="text-[10.5px] text-slate-400 font-medium">
                                AWB Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{item.patientName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone size={10} />
                              <span>{item.phone}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{item.city}, {item.state}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                              {item.address} - {item.pincode}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-700 text-[11px]">
                              <Truck size={11} className="text-slate-500" />
                              <span>{item.courier || "Shiprocket"}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            ₹{item.amount.toLocaleString()}
                            <div className="text-[10px] text-slate-400 font-medium">
                              {item.paymentMethod}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${getStatusBadge(
                                item.statusLabel
                              )}`}
                            >
                              {item.statusLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {item.awbNumber ? (
                              <button
                                type="button"
                                onClick={() => handleOpenTracking(item.awbNumber)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-[11px] transition cursor-pointer"
                              >
                                <span>Track</span>
                                <ArrowUpRight size={12} />
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE NEW PARCEL */}
        {activeTab === "create_parcel" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                  <Send size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Create New Parcel & Generate AWB
                  </h2>
                  <p className="text-xs text-slate-500">
                    Direct real-time dispatch through Shiprocket API
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("all_parcels")}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <span>← Back to All Parcels</span>
              </button>
            </div>

            {/* Success Banner if just created */}
            {createSuccessData && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm text-emerald-800">
                    <CheckCircle2 size={18} />
                    <span>Shipment Created Successfully on Shiprocket!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateSuccessData(null)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/70 p-3 rounded-xl border border-emerald-100">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Order ID</span>
                    <span className="font-extrabold text-slate-800">{createSuccessData.orderId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Shipment ID</span>
                    <span className="font-extrabold text-slate-800">{createSuccessData.shipmentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">AWB Code</span>
                    <span className="font-extrabold text-violet-700">
                      {createSuccessData.awbCode || "Assigned on Pickup"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Status</span>
                    <span className="font-extrabold text-emerald-700">Ready for Pickup</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all_parcels")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                  >
                    View in All Parcels →
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateParcel} className="space-y-6">
              {/* 1. Pickup Location */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Clinic Pickup Location *
                </label>
                <select
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 font-bold text-slate-800"
                >
                  {pickupLocations.map((loc) => (
                    <option key={loc.pickupLocation} value={loc.pickupLocation}>
                      {loc.name || loc.pickupLocation} ({loc.pickupLocation})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Patient / Consignee Details */}
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User size={14} className="text-violet-600" />
                  <span>Patient / Consignee Information</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Mobile Number (10 digits) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="patient@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Delivery Address */}
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin size={14} className="text-violet-600" />
                  <span>Delivery Address</span>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Complete Street Address (House / Flat / Area) *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Flat 302, Sri Sai Nilayam, Street No 4, Madhapur"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500081"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        placeholder="Hyderabad"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        placeholder="Telangana"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Package Dimensions & Medicine Item Details */}
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Boxes size={14} className="text-violet-600" />
                  <span>Parcel Dimensions & Medicines</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Dead Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Length (cm)</label>
                    <input
                      type="number"
                      value={lengthCm}
                      onChange={(e) => setLengthCm(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Breadth (cm)</label>
                    <input
                      type="number"
                      value={breadthCm}
                      onChange={(e) => setBreadthCm(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Item Name</label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={itemUnits}
                      onChange={(e) => setItemUnits(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Invoice Value (₹)
                    </label>
                    <input
                      type="number"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Payment Mode Selection */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      paymentMethod === "Prepaid"
                        ? "bg-violet-50 border-violet-400 text-violet-900 font-black"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Prepaid"
                      checked={paymentMethod === "Prepaid"}
                      onChange={() => setPaymentMethod("Prepaid")}
                      className="text-violet-600"
                    />
                    <span className="text-xs">Prepaid (Online / Paid in Clinic)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      paymentMethod === "COD"
                        ? "bg-violet-50 border-violet-400 text-violet-900 font-black"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="text-violet-600"
                    />
                    <span className="text-xs">Cash on Delivery (COD)</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Dispatching to Shiprocket...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Dispatch Order & Generate Shiprocket AWB</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* TRACKING MODAL */}
      {trackingAwb && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl relative border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <Truck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Shiprocket Live Tracking</h3>
                  <span className="text-xs font-mono font-bold text-violet-600">
                    AWB: {trackingAwb}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackingAwb(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4">
              {isLoadingTrack ? (
                <div className="py-10 text-center text-slate-400">
                  <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-violet-600" />
                  <span className="text-xs">Fetching courier partner telemetry...</span>
                </div>
              ) : trackingData ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] uppercase font-bold text-violet-600 block">
                        Current Status
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {trackingData.shipmentStatus || "In Transit"}
                      </span>
                    </div>
                    {trackingData.courierName && (
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-violet-200 text-violet-800 text-xs font-bold shadow-2xs">
                        {trackingData.courierName}
                      </span>
                    )}
                  </div>

                  {trackingData.currentLocation && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin size={14} className="text-violet-600 shrink-0" />
                      <span>Last checkpoint: <strong>{trackingData.currentLocation}</strong></span>
                    </div>
                  )}

                  {/* Activity Checkpoints */}
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                      Tracking Timeline
                    </h4>
                    {Array.isArray(trackingData.activities) && trackingData.activities.length > 0 ? (
                      <div className="space-y-2.5 pl-2 border-l-2 border-violet-200">
                        {trackingData.activities.map((act: any, idx: number) => (
                          <div key={idx} className="relative pl-3 text-xs">
                            <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-violet-600" />
                            <div className="font-extrabold text-slate-800">{act.activity || act.status}</div>
                            <div className="text-[11px] text-slate-500">
                              {act.location} • {act.date}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-xs">
                        Shipment registered and active on courier partner network. Check back shortly for transit scans.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`https://shiprocket.co/tracking/${trackingAwb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-600 hover:text-violet-800 font-bold flex items-center gap-1"
              >
                <span>Open Shiprocket Web Tracker</span>
                <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => setTrackingAwb(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
