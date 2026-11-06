import React from "react";
import { PatientFileView } from "../../../components/patient-file/PatientFileView";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";

export default function DoctorPatientFileScreen() {
  return (
    <PatientFileView
      role="DOCTOR"
      bottomNav={<DoctorBottomNav activeTab="dashboard" />}
    />
  );
}
