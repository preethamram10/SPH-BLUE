"use client";

import React, { useEffect, useState } from "react";
import HRSidebar from "@/components/HRSidebar";
import CleaningAdminHrView from "@/components/cleaning/CleaningAdminHrView";

export default function AdminBranchCleaningPage() {
  const [userName, setUserName] = useState("Clinic Admin");

  useEffect(() => {
    const stored = localStorage.getItem("user_name");
    if (stored) setUserName(stored);
  }, []);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <HRSidebar currentPath="/hr/branch-cleaning" />
      <CleaningAdminHrView currentRole="ADMIN" currentUserName={userName} />
    </div>
  );
}
