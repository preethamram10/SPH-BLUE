"use client";

import React, { useState } from "react";
import {
  Truck,
  Package,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Phone,
  User,
  Building2,
  Calendar,
} from "lucide-react";

interface ShipmentItem {
  id: string;
  orderId: string;
  patientName: string;
  phone: string;
  destination: string;
  branch: string;
  courier: string;
  awbNumber: string;
  status: "In Transit" | "Delivered" | "Pickup Scheduled" | "RTO" | "Pending";
  date: string;
  amount: number;
}

const SAMPLE_SHIPMENTS: ShipmentItem[] = [
  {
    id: "SHP-1001",
    orderId: "ORD-94812",
    patientName: "Suresh Kumar",
    phone: "9876543210",
    destination: "Madhapur, Hyderabad - 500081",
    branch: "Dilsukhnagar",
    courier: "Delhivery Air",
    awbNumber: "DEL-849201948",
    status: "In Transit",
    date: "17 Nov 2026",
    amount: 1450,
  },
  {
    id: "SHP-1002",
    orderId: "ORD-94805",
    patientName: "Ananya Reddy",
    phone: "9123456789",
    destination: "Gachibowli, Hyderabad - 500032",
    branch: "KPHB",
    courier: "Bluedart Express",
    awbNumber: "BD-992014882",
    status: "Delivered",
    date: "16 Nov 2026",
    amount: 2200,
  },
  {
    id: "SHP-1003",
    orderId: "ORD-94788",
    patientName: "Ramesh Varma",
    phone: "9988776655",
    destination: "Banjara Hills, Hyderabad - 500034",
    branch: "Chandanagar",
    courier: "DTDC Priority",
    awbNumber: "DTDC-30194821",
    status: "Pickup Scheduled",
    date: "17 Nov 2026",
    amount: 950,
  },
  {
    id: "SHP-1004",
    orderId: "ORD-94751",
    patientName: "Pooja Sharma",
    phone: "9848022338",
    destination: "Secunderabad - 500003",
    branch: "Dilsukhnagar",
    courier: "Ekart Logistics",
    awbNumber: "EKT-77291048",
    status: "In Transit",
    date: "15 Nov 2026",
    amount: 3100,
  },
];

interface ShiprocketDashboardProps {
  role: "RECEPTION" | "ADMIN" | "HR";
}

export const ShiprocketDashboard: React.FC<ShiprocketDashboardProps> = ({ role }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [shipments] = useState<ShipmentItem[]>(SAMPLE_SHIPMENTS);

  const filtered = shipments.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.awbNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);

    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ShipmentItem["status"]) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Transit":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Pickup Scheduled":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RTO":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-2xs">
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
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Homeopathy Medicine Courier, Order Dispatch & Live AWB Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => alert("Shiprocket live sync triggered.")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Sync Status</span>
            </button>
            <button
              type="button"
              onClick={() => alert("Ready to connect Shiprocket API & dispatch orders.")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-extrabold text-white transition shadow-sm cursor-pointer"
            >
              <Plus size={15} />
              <span>New Shipment</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Shipments</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Package size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">128</p>
            <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block">↑ 14 dispatched today</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Transit</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">34</p>
            <span className="text-[11px] text-blue-600 font-bold mt-1 inline-block">Live on couriers</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivered</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">89</p>
            <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block">Delivered this month</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Pickup</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">5</p>
            <span className="text-[11px] text-amber-600 font-bold mt-1 inline-block">Awaiting rider pickup</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by Patient Name, Phone, AWB #, or Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "In Transit", "Pickup Scheduled", "Delivered", "RTO"].map((st) => (
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

        {/* Shipments Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10.5px] tracking-wider">
                  <th className="py-3 px-4">Order / AWB</th>
                  <th className="py-3 px-4">Patient & Phone</th>
                  <th className="py-3 px-4">Branch & Destination</th>
                  <th className="py-3 px-4">Courier Partner</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No shipments matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{item.orderId}</div>
                        <div className="font-mono text-[11px] text-violet-600 font-bold flex items-center gap-1 mt-0.5">
                          <span>{item.awbNumber}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{item.patientName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={10} />
                          <span>{item.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{item.branch}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {item.destination}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-700 text-[11px]">
                          <Truck size={12} className="text-slate-500" />
                          <span>{item.courier}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            alert(
                              `Tracking AWB: ${item.awbNumber}\nStatus: ${item.status}\nCourier: ${item.courier}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-[11px] transition cursor-pointer"
                        >
                          <span>Track</span>
                          <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
