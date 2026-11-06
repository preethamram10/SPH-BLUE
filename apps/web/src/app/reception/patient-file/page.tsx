"use client";

import React, { Suspense } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import PatientFileWebView from "@/components/patient-file/PatientFileWebView";

function ReceptionPatientFileContent() {
  return (
    <PatientFileWebView
      role="RECEPTION"
      sidebar={<ReceptionSidebar activePage="patient-file" />}
    />
  );
}

export default function ReceptionPatientFilePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading Patient File...</div>}>
      <ReceptionPatientFileContent />
    </Suspense>
  );
}
