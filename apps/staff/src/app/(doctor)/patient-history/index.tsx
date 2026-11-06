import React from "react";
import { PatientHistoryView } from "../../../components/patient-history/PatientHistoryView";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";

export default function DoctorPatientHistoryScreen() {
  return (
    <PatientHistoryView
      role="DOCTOR"
      bottomNav={<DoctorBottomNav activeTab="patient-list" />}
    />
  );
}
