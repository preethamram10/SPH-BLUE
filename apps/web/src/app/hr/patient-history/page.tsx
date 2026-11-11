"use client";

import React, { Suspense } from "react";
import HRSidebar from "@/components/HRSidebar";
import PatientHistoryWebView from "@/components/patient-history/PatientHistoryWebView";

function AdminPatientHistoryContent() {
  return (
    <PatientHistoryWebView
      role="ADMIN"
      sidebar={<HRSidebar currentPath="/hr/global-patients" />}
    />
  );
}

export default function AdminPatientHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans">
          <HRSidebar currentPath="/hr/global-patients" />
          <main className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs">
            Loading Patient Prescription History...
          </main>
        </div>
      }
    >
      <AdminPatientHistoryContent />
    </Suspense>
  );
}

