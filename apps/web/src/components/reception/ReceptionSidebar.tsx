"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarCheck,
  Sparkles,
  LogOut,
  Building2,
  Phone,
  UserX,
} from "lucide-react";

interface ReceptionSidebarProps {
  activePage: "dashboard" | "appointments" | "all-patients" | "follow-ups" | "branch-cleaning" | "doctor-no-show" | string;
}

export default function ReceptionSidebar({ activePage }: ReceptionSidebarProps) {
  const router = useRouter();
  const [branchName, setBranchName] = useState<string>("Clinic Branch");
  const [branchPhone, setBranchPhone] = useState<string>("");

  useEffect(() => {
    const savedName = localStorage.getItem("branch_name");
    const savedPhone = localStorage.getItem("branch_phone");
    if (savedName) setBranchName(savedName);
    if (savedPhone) setBranchPhone(savedPhone);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("branch_name");
    localStorage.removeItem("branch_phone");
    router.replace("/login");
  };

  const navItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      href: "/reception/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "appointments",
      name: "Appointments",
      href: "/reception/appointments",
      icon: Calendar,
    },
    {
      id: "all-patients",
      name: "All Patients List",
      href: "/reception/all-patients",
      icon: Users,
    },
    {
      id: "follow-ups",
      name: "Follow-ups",
      href: "/reception/follow-ups",
      icon: CalendarCheck,
    },
    {
      id: "doctor-no-show",
      name: "Doctor No-Show",
      href: "/reception/doctor-no-show",
      icon: UserX,
    },
    {
      id: "branch-cleaning",
      name: "Branch Cleaning",
      href: "/reception/branch-cleaning",
      icon: Sparkles,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm h-full z-20">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#268ec8] flex items-center justify-center text-white font-bold shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 text-sm leading-tight truncate">
              Spiritual Homeopathy
            </h1>
            <span className="text-[11px] font-semibold text-[#a8ce3a] uppercase tracking-wider block">
              Reception Desk
            </span>
          </div>
        </div>

        {/* Active Branch Pill */}
        <div className="mx-4 mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="truncate">{branchName}</span>
          </div>
          {branchPhone && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{branchPhone}</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#268ec8] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
