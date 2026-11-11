"use client";

import React, { useState } from "react";
import HRSidebar from "@/components/HRSidebar";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Upload,
} from "lucide-react";

export default function ManageBannersPage() {
  const [banners, setBanners] = useState([
    {
      id: "BN-01",
      title: "Winter Allergy & Asthma Immunity Camp",
      targetAudience: "Reception Tablet & Mobile App Home",
      validRange: "01 Nov 2026 - 30 Nov 2026",
      status: "Active",
      gradient: "from-sky-500 to-indigo-600",
      cta: "Book Free Checkup",
    },
    {
      id: "BN-02",
      title: "Family Chronic Wellness Subscription Plan",
      targetAudience: "Patient Portal Carousel",
      validRange: "15 Oct 2026 - 31 Dec 2026",
      status: "Active",
      gradient: "from-emerald-500 to-teal-700",
      cta: "Explore Packages",
    },
    {
      id: "BN-03",
      title: "Special Sunday Pediatric Homeopathy Clinic",
      targetAudience: "KPHB & Chandanagar Branches",
      validRange: "Expired Oct 2026",
      status: "Inactive",
      gradient: "from-slate-600 to-slate-800",
      cta: "View Timings",
    },
  ]);

  const toggleStatus = (id: string) => {
    setBanners((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: b.status === "Active" ? "Inactive" : "Active" } : b
      )
    );
  };

  const deleteBanner = (id: string) => {
    if (confirm("Delete this marketing banner?")) {
      setBanners((prev) => prev.filter((b) => b.id !== id));
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/manage-banners" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-7 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900">Manage Marketing &amp; App Banners</h1>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Configure promotional carousels displayed on patient app and reception screens
              </p>
            </div>

            <button className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Banner</span>
            </button>
          </div>
        </header>

        <div className="p-7 max-w-6xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {banners.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                {/* Visual Banner Preview */}
                <div className={`h-36 bg-gradient-to-r ${b.gradient} p-5 flex flex-col justify-between text-white relative`}>
                  <div className="flex items-start justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-white/20 backdrop-blur-xs">
                      {b.targetAudience}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        b.status === "Active" ? "bg-emerald-400/90 text-slate-900" : "bg-slate-300 text-slate-800"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold leading-tight text-white">{b.title}</h3>
                    <p className="text-[11px] text-white/80 mt-1 font-semibold">CTA: {b.cta}</p>
                  </div>
                </div>

                {/* Banner Controls */}
                <div className="p-4 bg-white flex items-center justify-between border-t border-slate-100">
                  <div className="text-[11px] text-slate-400 font-bold">
                    <span>Validity: </span>
                    <span className="text-slate-700">{b.validRange}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(b.id)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {b.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteBanner(b.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

