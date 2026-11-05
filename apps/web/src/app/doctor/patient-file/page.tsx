"use client";

import React, { useState } from "react";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";

export default function DoctorPatientFilePage() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-xs">
      <DoctorSidebar activePage="patient-file" />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-sm font-bold text-slate-900">Patient File</h1>
            <p className="text-[11px] text-slate-500">Clinical records & patient files</p>
          </div>
        </header>

        <main className="p-5 max-w-7xl w-full mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <h2 className="text-base font-bold text-slate-800 mb-1">Patient File Module</h2>
            <p className="text-xs text-slate-500">Ready to configure patient file fields and clinical details.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
