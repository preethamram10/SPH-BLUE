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
  Crown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ReceptionSidebarProps {
  activePage: "dashboard" | "appointments" | "all-patients" | "follow-ups" | "branch-cleaning" | "doctor-no-show" | string;
}

export default function ReceptionSidebar({ activePage }: ReceptionSidebarProps) {
  const router = useRouter();
  const [branchName, setBranchName] = useState<string>("Clinic Branch");
  const [branchPhone, setBranchPhone] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("reception_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}

    const savedName = localStorage.getItem("branch_name");
    const savedPhone = localStorage.getItem("branch_phone");
    if (savedName) setBranchName(savedName);
    if (savedPhone) setBranchPhone(savedPhone);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("reception_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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
      id: "package-members",
      name: "Package Members",
      href: "/reception/package-members",
      icon: Crown,
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
    <aside
      className={`${
        isCollapsed ? "w-14" : "w-52"
      } bg-white flex flex-col justify-between shrink-0 shadow-xs h-full z-20 select-none transition-all duration-300 ease-in-out`}
    >
      <div>
        {/* Brand Header with < / > collapse toggle */}
        <div
          className={`pt-6 px-2.5 pb-2.5 flex items-center ${
            isCollapsed ? "flex-col justify-center gap-2" : "justify-between gap-1.5"
          }`}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
              <img
                src="/assets/SH logo.png"
                alt="Spiritual Homeopathy"
                className="h-7 w-auto max-w-[125px] object-contain shrink-0"
              />
              <span className="text-[8px] font-black text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                Reception
              </span>
            </div>
          ) : (
            <div
              className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
              title="Spiritual Homeopathy Reception"
            >
              <img
                src="/assets/SH logo.png"
                alt="SH Logo"
                className="h-6 w-auto max-w-none object-contain"
              />
            </div>
          )}

          {/* < / > Collapse Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand sidebar (>)" : "Collapse sidebar (<)"}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Active Branch Pill - Shown when expanded */}
        {!isCollapsed && (
          <div className="mx-2.5 mt-1.5 p-2 bg-slate-50/80 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="truncate">{branchName}</span>
            </div>
            {branchPhone && (
              <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5">
                <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                <span className="truncate">{branchPhone}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-1.5 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? "justify-center px-1.5" : "gap-2.5 px-2.5"
                } py-1.5 rounded-lg text-[11px] transition-all ${
                  isActive
                    ? "text-[#0284c7] font-extrabold bg-transparent"
                    : "text-slate-600 font-semibold hover:text-slate-900 bg-transparent"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? "text-[#0284c7]" : "text-slate-400"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}

          {/* Sign Out (Inside side navigation, not fixed) */}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? "justify-center px-1.5" : "gap-2.5 px-2.5"
            } py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/60 transition-colors cursor-pointer mt-2`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </nav>
      </div>
    </aside>
  );
}
