"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Headset,
  CalendarPlus,
  PhoneCall,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  ShieldCheck,
} from "lucide-react";

interface TelecallerSidebarProps {
  activeTab: "followups" | "book_appointment" | "log_call" | string;
  onTabChange?: (tab: "followups" | "book_appointment" | "log_call") => void;
}

export default function TelecallerSidebar({
  activeTab,
  onTabChange,
}: TelecallerSidebarProps) {
  const router = useRouter();
  const [agentName, setAgentName] = useState<string>("Telecaller Agent");
  const [telecallerId, setTelecallerId] = useState<string>("TC01");
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
      name: "Follow-Ups Queue",
      icon: PhoneCall,
      description: "Patient calling desk & rescheduling",
    },
    {
      id: "book_appointment",
      name: "Book Appointment",
      icon: CalendarPlus,
      description: "Schedule across clinic branches",
    },
    {
      id: "log_call",
      name: "Call Logs & History",
      icon: Clock,
      description: "Outcomes & patient updates",
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 text-white transition-all duration-300 z-30 select-none shadow-xl shrink-0 h-screen ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
            <Headset className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  Calling Desk
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-sky-500/20 text-sky-400 font-bold text-[9.5px] border border-sky-400/30">
                  {telecallerId}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">Spiritual Homeopathy</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs shrink-0 cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Telecaller Profile Card */}
      {!isCollapsed ? (
        <div className="p-3 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 truncate">{agentName}</span>
            <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-800/50">
              {telecallerId}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10.5px] text-slate-400 mt-1 truncate">
            <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="truncate">{branchName}</span>
          </div>
        </div>
      ) : (
        <div className="my-2 flex justify-center">
          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-800/50">
            {telecallerId}
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (onTabChange) {
                  onTabChange(item.id as any);
                } else {
                  router.push(`/telecaller/dashboard?tab=${item.id}`);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              {!isCollapsed && (
                <div className="text-left min-w-0">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="text-[10px] text-slate-400 truncate font-normal">
                    {item.description}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span>Logout Desk</span>}
        </button>
      </div>
    </aside>
  );
}
