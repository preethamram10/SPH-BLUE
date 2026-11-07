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
  FolderPlus,
  ClipboardList,
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
      id: "old-entry",
      name: "Old Entry (Rx)",
      href: "/reception/old-entry",
      icon: FolderPlus,
    },
    {
      id: "follow-ups",
      name: "Follow-ups",
      href: "/reception/follow-ups",
      icon: CalendarCheck,
    },
    {
      id: "medical-requests",
      name: "Medical Requests",
      href: "/reception/medical-requests",
      icon: ClipboardList,
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
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs h-full z-20">
      <div>
        {/* Brand Header */}
        <div className="p-3.5 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#268ec8] flex items-center justify-center text-white font-bold shadow-xs shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 text-xs leading-tight truncate">
              Spiritual Homeopathy
            </h1>
            <span className="text-[9.5px] font-bold text-[#a8ce3a] uppercase tracking-wider block">
              Reception Desk
            </span>
          </div>
        </div>

        {/* Active Branch Pill */}
        <div className="mx-2.5 mt-2.5 p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="truncate">{branchName}</span>
          </div>
          {branchPhone && (
            <div className="flex items-center gap-1 text-[9.5px] text-slate-500 mt-0.5">
              <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <span className="truncate">{branchPhone}</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#268ec8] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer */}
      <div className="p-2.5 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
