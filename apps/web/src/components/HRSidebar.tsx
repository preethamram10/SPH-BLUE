"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Clock,
  DollarSign,
  CalendarCheck,
  CalendarX,
  Sparkles,
  FileCheck2,
  UserCheck,
  Briefcase,
  LayoutDashboard,
  Target,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Stethoscope,
  BarChart3,
  Globe,
  Crown,
  PhoneCall,
  Headphones,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

interface HRSidebarProps {
  currentPath?: string;
}

export default function HRSidebar({ currentPath }: HRSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = currentPath || pathname;

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hr_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hr_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("branch_name");
    localStorage.removeItem("auth_token");
    router.replace("/login");
  };

  const menuSections = [
    {
      title: "OVERVIEW & CLINIC",
      items: [
        { label: "Dashboard", href: "/hr/dashboard", icon: LayoutDashboard },
        { label: "Branch Management", href: "/hr/branch-management", icon: Building2 },
        { label: "Staff Management", href: "/hr/employee-management", icon: Users },
        { label: "Doctor Timings", href: "/hr/doctor-timings", icon: Clock },
        { label: "Global Patients List", href: "/hr/global-patients", icon: Globe },
      ],
    },
    {
      title: "FINANCE & REVENUE",
      items: [
        { label: "Total Revenue", href: "/hr/total-revenue", icon: DollarSign },
        { label: "Pay Later Dues", href: "/hr/pay-later", icon: Clock },
        { label: "Reports & Visual Analytics", href: "/hr/reports-analytics", icon: BarChart3 },
        { label: "Target Management", href: "/hr/target-management", icon: Target },
        { label: "Fee Requests", href: "/hr/fee-requests", icon: FileCheck2 },
        { label: "Package Members", href: "/hr/package-members", icon: Crown },
      ],
    },
    {
      title: "TELECALLING & FOLLOW-UPS",
      items: [
        { label: "All Follow-Ups", href: "/hr/all-follow-ups", icon: CalendarCheck },
        { label: "Telecaller Accounts", href: "/hr/telecaller-accounts", icon: Headphones },
        { label: "Telecaller Updates", href: "/hr/telecaller-updates", icon: PhoneCall },
      ],
    },
    {
      title: "HR & DAILY OPERATIONS",
      items: [
        { label: "Leave Requests", href: "/hr/leave-requests", icon: CalendarX },
        { label: "Employee Attendance", href: "/hr/employee-attendance", icon: UserCheck },
        { label: "Employee Daily Works", href: "/hr/employee-daily-works", icon: Briefcase },
        { label: "Staff Payroll & Penalties", href: "/hr/payroll", icon: DollarSign },
        { label: "Miscellaneous Pay Cuts", href: "/hr/pay-cuts", icon: DollarSign },
        { label: "Branch Cleaning", href: "/hr/branch-cleaning", icon: Sparkles },
      ],
    },
    {
      title: "MARKETING & SYSTEM",
      items: [
        { label: "Manage Banners", href: "/hr/manage-banners", icon: ImageIcon },
        { label: "Delete Profiles (Phone)", href: "/hr/delete-profiles", icon: Trash2 },
      ],
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? "w-16" : "w-56"
      } bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs h-full z-20 select-none transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo Branding + Collapse Toggle */}
        <div
          className={`p-3 border-b border-slate-100 flex items-center ${
            isCollapsed ? "flex-col justify-center gap-2" : "justify-between"
          } shrink-0`}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <img
                src="/assets/SH logo.png"
                alt="Spiritual Homeopathy"
                className="h-7 w-auto max-w-[130px] object-contain shrink-0"
              />
              <span className="text-[8.5px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                HR Portal
              </span>
            </div>
          ) : (
            <div
              className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-white"
              title="Spiritual Homeopathy HR"
            >
              <img
                src="/assets/SH logo.png"
                alt="SH Logo"
                className="h-6 w-auto object-contain"
              />
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin">
          {menuSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-2.5 text-[9.5px] font-extrabold text-slate-400 tracking-wider">
                  {sec.title}
                </p>
              ) : (
                <div className="w-full h-px bg-slate-100 my-1" />
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePath.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Sign Out (Inside side navigation, not fixed) */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ${
                isCollapsed ? "justify-center px-0" : ""
              }`}
              title={isCollapsed ? "Sign Out" : undefined}
            >
              <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

