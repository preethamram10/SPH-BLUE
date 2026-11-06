"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import CleaningAdminHrView from "@/components/cleaning/CleaningAdminHrView";

export default function HrBranchCleaningPage() {
  const [userName, setUserName] = useState("HR Operations");

  useEffect(() => {
    const stored = localStorage.getItem("user_name");
    if (stored) setUserName(stored);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
        <Link
          href="/hr/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to HR Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
            HR
          </div>
          <span className="text-xs font-extrabold text-slate-700">Spiritual Homeopathy HR Portal</span>
        </div>
      </div>

      <CleaningAdminHrView currentRole="HR" currentUserName={userName} />
    </div>
  );
}

