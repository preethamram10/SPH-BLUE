"use client";

import React, { Suspense } from "react";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import PatientFileWebView from "@/components/patient-file/PatientFileWebView";

function DoctorPatientFileContent() {
  return (
    <PatientFileWebView
      role="DOCTOR"
      sidebar={<DoctorSidebar activePage="patient-file" />}
    />
  );
}

export default function DoctorPatientFilePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading Patient File...</div>}>
      <DoctorPatientFileContent />
    </Suspense>
  );
}
