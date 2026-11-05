"use client";

import React from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";

export default function ReceptionPatientFilePage() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-xs">
      <ReceptionSidebar activePage="patient-file" />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-sm font-bold text-slate-900">Patient File</h1>
            <p className="text-[11px] text-slate-500">Reception Patient Records & Files</p>
          </div>
        </header>

        <main className="p-5 max-w-7xl w-full mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <h2 className="text-base font-bold text-slate-800 mb-1">Patient File Module</h2>
            <p className="text-xs text-slate-500">Ready to configure reception patient files and record management.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
