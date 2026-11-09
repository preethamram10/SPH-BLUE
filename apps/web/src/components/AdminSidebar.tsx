"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
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
  Crown,
  Trash2,
  Globe,
  Image as ImageIcon,
  BarChart3,
  PhoneCall,
  Headphones,
  Settings,
  LogOut,
  LayoutDashboard,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AdminSidebarProps {
  currentPath?: string;
}

export default function AdminSidebar({ currentPath }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = currentPath || pathname;

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
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
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Branch Management", href: "/admin/branch-management", icon: Building2 },
        { label: "Staff Management", href: "/admin/employee-management", icon: Users },
        { label: "Doctor Timings", href: "/admin/doctor-timings", icon: Clock },
        { label: "Global Patients List", href: "/admin/global-patients", icon: Globe },
      ],
    },
    {
      title: "FINANCE & REVENUE",
      items: [
        { label: "Total Revenue", href: "/admin/total-revenue", icon: DollarSign },
        { label: "Reports & Visual Analytics", href: "/admin/reports-analytics", icon: BarChart3 },
        { label: "Target Management", href: "/admin/target-management", icon: Target },
        { label: "Fee Requests", href: "/admin/fee-requests", icon: FileCheck2 },
        { label: "Package Members", href: "/admin/package-members", icon: Crown },
      ],
    },
    {
      title: "TELECALLING & FOLLOW-UPS",
      items: [
        { label: "All Follow-Ups", href: "/admin/all-follow-ups", icon: CalendarCheck },
        { label: "Telecaller Accounts", href: "/admin/telecaller-accounts", icon: Headphones },
        { label: "Telecaller Updates", href: "/admin/telecaller-updates", icon: PhoneCall },
      ],
    },
    {
      title: "HR & DAILY OPERATIONS",
      items: [
        { label: "Leave Requests", href: "/admin/leave-requests", icon: CalendarX },
        { label: "Employee Attendance", href: "/admin/employee-attendance", icon: UserCheck },
        { label: "Employee Daily Works", href: "/admin/employee-daily-works", icon: Briefcase },
        { label: "Staff Payroll & Penalties", href: "/admin/payroll", icon: DollarSign },
        { label: "Miscellaneous Pay Cuts", href: "/admin/pay-cuts", icon: DollarSign },
        { label: "Branch Cleaning", href: "/admin/branch-cleaning", icon: Sparkles },
      ],
    },
    {
      title: "MARKETING & SETTINGS",
      items: [
        { label: "Manage Banners", href: "/admin/manage-banners", icon: ImageIcon },
        { label: "Delete Profiles (Phone)", href: "/admin/delete-profiles", icon: Trash2 },
        { label: "Clinic Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? "w-16" : "w-56"
      } bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs h-full z-20 select-none transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col h-[calc(100%-60px)]">
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
              <span className="text-[8.5px] font-black text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                Admin
              </span>
            </div>
          ) : (
            <div
              className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-white"
              title="Spiritual Homeopathy Admin"
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
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1.5 py-2 space-y-2" : "px-2.5 py-2.5 space-y-3"}`}>
          {menuSections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {!isCollapsed ? (
                <p className="px-2 text-[8.5px] font-extrabold text-slate-400 tracking-wider uppercase mb-1">
                  {sec.title}
                </p>
              ) : (
                <div className="my-1.5 border-t border-slate-100" />
              )}
              {sec.items.map((item, iIdx) => {
                const isActive = activePath === item.href || activePath.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={iIdx}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-1.5 py-2" : "gap-2.5 px-2.5 py-1.5"
                    } rounded-xl text-[11px] font-semibold transition-all ${
                      isActive
                        ? "bg-[#0284c7] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* User Info & Logout Footer */}
      <div className={`p-2.5 border-t border-slate-100 shrink-0 bg-white ${isCollapsed ? "flex flex-col items-center" : ""}`}>
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between"}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-sky-100 text-[#0284c7] flex items-center justify-center font-bold text-[10px] shrink-0">
              AD
            </div>
            {!isCollapsed && (
              <div className="text-left overflow-hidden">
                <p className="text-[11px] font-bold text-slate-800 leading-tight">Admin</p>
                <p className="text-[9px] text-slate-400 truncate max-w-[110px]">admin@spiritualhomeo.com</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors p-1.5 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

