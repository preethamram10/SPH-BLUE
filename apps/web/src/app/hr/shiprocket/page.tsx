"use client";

import React from "react";
import HRSidebar from "@/components/HRSidebar";
import { ShiprocketDashboard } from "@/components/shiprocket/ShiprocketDashboard";

export default function HRShiprocketPage() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <HRSidebar currentPath="/hr/shiprocket" />
      <ShiprocketDashboard role="HR" />
    </div>
  );
}
