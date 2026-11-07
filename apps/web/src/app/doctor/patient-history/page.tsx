"use client";

import React, { Suspense } from "react";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import PatientHistoryWebView from "@/components/patient-history/PatientHistoryWebView";

function DoctorPatientHistoryContent() {
  return (
    <PatientHistoryWebView
      role="DOCTOR"
      sidebar={<DoctorSidebar activePage="all-patients" />}
    />
  );
}

export default function DoctorPatientHistoryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading Patient History...</div>}>
      <DoctorPatientHistoryContent />
    </Suspense>
  );
}

