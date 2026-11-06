import React from "react";
import { PatientHistoryView } from "../../../components/patient-history/PatientHistoryView";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";

export default function ReceptionPatientHistoryScreen() {
  return (
    <PatientHistoryView
      role="RECEPTION"
      bottomNav={<ReceptionBottomNav activeTab="patient-list" />}
    />
  );
}
