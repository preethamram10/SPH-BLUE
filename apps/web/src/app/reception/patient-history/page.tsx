"use client";

import React, { Suspense } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import PatientHistoryWebView from "@/components/patient-history/PatientHistoryWebView";

function ReceptionPatientHistoryContent() {
  return (
    <PatientHistoryWebView
      role="RECEPTION"
      sidebar={<ReceptionSidebar activePage="all-patients" />}
    />
  );
}

export default function ReceptionPatientHistoryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading Patient History...</div>}>
      <ReceptionPatientHistoryContent />
    </Suspense>
  );
}

