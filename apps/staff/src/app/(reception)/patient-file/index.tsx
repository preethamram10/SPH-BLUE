import React from "react";
import { PatientFileView } from "../../../components/patient-file/PatientFileView";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";

export default function ReceptionPatientFileScreen() {
  return (
    <PatientFileView
      role="RECEPTION"
      bottomNav={<ReceptionBottomNav activeTab="dashboard" />}
    />
  );
}
