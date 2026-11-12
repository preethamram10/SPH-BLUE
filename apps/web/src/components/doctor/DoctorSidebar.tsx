"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  DollarSign,
  LogOut,
  Stethoscope,
  Building2,
  Calendar,
} from "lucide-react";

interface DoctorSidebarProps {
  activePage: "dashboard" | "packages" | "patient-list" | "total-revenue" | "fee-requests" | string;
}

export default function DoctorSidebar({ activePage }: DoctorSidebarProps) {
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Dr. Prashanth K Vaidya");
  const [branchName, setBranchName] = useState("KPHB Branch");
  const [isHeadDoctor, setIsHeadDoctor] = useState(false);

  useEffect(() => {
    const savedDoc = localStorage.getItem("doctor_name") || doctorName;
    const savedBranch = localStorage.getItem("branch_name");
    const savedIsHead = localStorage.getItem("is_head_doctor");
    const savedCategory = localStorage.getItem("doctor_category");

    if (savedDoc) setDoctorName(savedDoc);
    if (savedBranch) setBranchName(savedBranch);

    const docLower = savedDoc.toLowerCase();
    const isHead =
      savedIsHead === "true" ||
      savedCategory === "HEAD" ||
      docLower.includes("prashanth") ||
      docLower.includes("head") ||
      docLower.includes("vaidya") ||
      docLower.includes("chief");

    setIsHeadDoctor(isHead);

    // If not flagged yet, check against employee directory
    if (!isHead && savedDoc) {
      fetch("/api/admin/employees?category=DOCTOR")
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.employees || []);
          const match = list.find((e: any) => e.name && e.name.toLowerCase() === docLower);
          if (match && match.doctorCategory === "HEAD") {
            setIsHeadDoctor(true);
            localStorage.setItem("is_head_doctor", "true");
            localStorage.setItem("doctor_category", "HEAD");
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("doctor_name");
    router.replace("/login");
  };

  const navItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      href: "/doctor/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "packages",
      name: "Package Members",
      href: "/doctor/packages",
      icon: Package,
    },
    {
      id: "patient-list",
      name: "Patient List",
      href: "/doctor/patient-list",
      icon: Users,
    },
    ...(isHeadDoctor
      ? [
          {
            id: "total-revenue",
            name: "Total Revenue",
            href: "/doctor/total-revenue",
            icon: DollarSign,
          },
        ]
      : []),
  ];

  return (
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs h-full z-20 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-1.5">
          <img
            src="/assets/SH logo.png"
            alt="Spiritual Homeopathy"
            className="h-7 w-auto max-w-[130px] object-contain shrink-0"
          />
          <span className="text-[8.5px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider shrink-0">
            Doctor
          </span>
        </div>

        {/* Active Doctor Info Pill */}
        <div className="mx-2.5 mt-2.5 p-2 bg-sky-50/60 border border-sky-100 rounded-lg">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] shrink-0"></span>
            <span className="truncate">{doctorName}</span>
          </div>
          <div className="flex items-center gap-1 text-[9.5px] text-slate-500 mt-0.5">
            <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span className="truncate">{branchName}</span>
          </div>
        </div>

        {/* Navigation Items (Dashboard, Packages, Patient List, Total Revenue) */}
        <nav className="p-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive
                    ? "bg-[#0284c7] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          {/* Sign Out (Inside side navigation, not fixed) */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer mt-2"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}

