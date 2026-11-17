"use client";

import React from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { ShiprocketDashboard } from "@/components/shiprocket/ShiprocketDashboard";

export default function AdminShiprocketPage() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminSidebar currentPath="/admin/shiprocket" />
      <ShiprocketDashboard role="ADMIN" />
    </div>
  );
}
