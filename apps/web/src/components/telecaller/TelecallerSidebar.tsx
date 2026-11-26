"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Calendar,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Headset,
  Phone,
} from "lucide-react";

interface TelecallerSidebarProps {
  activeTab: "followups" | "book_appointment" | "log_call" | "logged_calls" | string;
  onTabChange?: (tab: "followups" | "book_appointment" | "log_call" | "logged_calls") => void;
}

export default function TelecallerSidebar({
  activeTab,
  onTabChange,
}: TelecallerSidebarProps) {
  const router = useRouter();
  const [agentName, setAgentName] = useState<string>("Telecaller");
  const [telecallerId, setTelecallerId] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("All Branches");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("telecaller_sidebar_collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
    } catch {}

    const name = localStorage.getItem("telecaller_name") || localStorage.getItem("user_name");
    const id = localStorage.getItem("telecaller_id");
    const branch = localStorage.getItem("branch_name") || localStorage.getItem("user_assigned_branch");

    if (name) setAgentName(name);
    if (id) setTelecallerId(id);
    if (branch) setBranchName(branch);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("telecaller_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("user_role");
      localStorage.removeItem("telecaller_name");
      localStorage.removeItem("telecaller_id");
      localStorage.removeItem("branch_name");
      localStorage.removeItem("user_assigned_branch");
    } catch {}
    router.replace("/login");
  };

  const navItems = [
    {
      id: "followups",
      name: "Follow-ups",
      href: "/telecaller/dashboard",
      icon: CalendarCheck,
    },
    {
      id: "book_appointment",
      name: "Book Appointment",
      href: "/telecaller/dashboard?tab=book_appointment",
      icon: Calendar,
    },
    {
      id: "log_call",
      name: "Log Call Update",
      href: "/telecaller/dashboard?tab=log_call",
      icon: ClipboardList,
    },
    {
      id: "logged_calls",
      name: "Logged Call Updates",
      href: "/telecaller/logged-calls",
      icon: Phone,
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? "w-14" : "w-52"
      } bg-white flex flex-col justify-between shrink-0 shadow-xs h-full z-20 select-none transition-all duration-300 ease-in-out border-r border-slate-200/80`}
    >
      <div>
        {/* Brand Header with Collapse Toggle */}
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
                Telecaller
              </span>
            </div>
          ) : (
            <div
              className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
              title="Spiritual Homeopathy Telecaller"
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

        {/* Active Telecaller & Branch Pill - Shown when expanded */}
        {!isCollapsed && (
          <div className="mx-2.5 mt-1.5 p-2 bg-slate-50/80 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">{agentName}</span>
              </div>
              {telecallerId ? (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-100 text-sky-800 font-bold shrink-0">
                  {telecallerId}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1">
              <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <span className="truncate">{branchName}</span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-1.5 space-y-0.5 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  if (onTabChange) {
                    onTabChange(item.id as any);
                  }
                }}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? "justify-center px-1.5" : "gap-2.5 px-2.5"
                } py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                  isActive
                    ? "text-[#0284c7] font-extrabold bg-sky-50/70"
                    : "text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-50"
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

          {/* Sign Out (Inside side navigation, exact same as Reception) */}
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
