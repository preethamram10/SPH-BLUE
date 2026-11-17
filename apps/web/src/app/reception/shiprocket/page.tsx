"use client";

import React from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import { ShiprocketDashboard } from "@/components/shiprocket/ShiprocketDashboard";

export default function ReceptionShiprocketPage() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ReceptionSidebar activePage="shiprocket" />
      <ShiprocketDashboard role="RECEPTION" />
    </div>
  );
}
