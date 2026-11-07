import { NextRequest, NextResponse } from "next/server";
import {
  patientService,
  appointmentService,
  normalizePhone,
} from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      regId,
      name,
      phone,
      branch,
      visitDate,
      doctorName,
      doctorId,
      timeSlot,
      diseases,
      consultationFee,
      prescriptionImages,
      notes,
    } = body;

    if (!regId || !name || !phone) {
      return NextResponse.json(
        { success: false, error: "Patient ID (MRN), Name, and Mobile Number are required." },
        { status: 400 }
      );
    }

    const cleanRegId = regId.trim().toUpperCase();
    const cleanPhone = normalizePhone(phone);
    const targetBranch = branch || "Clinic Branch";
    const targetDate = visitDate || new Date().toISOString().slice(0, 10);
    const targetDoctor = doctorName || "Dr. Prashanth K Vaidya";
    const targetDoctorId = doctorId || "doc-1";
    const fee = typeof consultationFee === "number" ? consultationFee : parseInt(consultationFee, 10) || 0;
    const images = Array.isArray(prescriptionImages) ? prescriptionImages : [];

    // 1. Upsert / Create Patient Record
    const savedPatient = await patientService.upsertPatient({
      regId: cleanRegId,
      name: name.trim(),
      phone: cleanPhone,
      branch: targetBranch,
      diseases: diseases || notes || "",
    });

    // 2. Create Historical Appointment Record with Prescriptions
    const newAppt = await appointmentService.createAppointment({
      registrationId: cleanRegId,
      patientName: name.trim(),
      phone: cleanPhone,
      branch: targetBranch,
      marketingSource: "Historical / Old Record Entry",
      consultationMode: "Offline",
      doctorId: targetDoctorId,
      doctorName: targetDoctor,
      appointmentDate: targetDate,
      timeSlot: timeSlot || "10:00 AM - 01:00 PM",
      isReback: false,
      status: "COMPLETED",
      isFeeCollected: true,
      consultationFee: fee,
      totalAmountDue: fee,
      paidAt: new Date(targetDate).toISOString(),
      paymentMethod: "CASH",
      diagnosisNotes: notes || diseases || "Historical Prescription Entry",
      prescriptionImages: images,
    });

    return NextResponse.json({
      success: true,
      message: "Old prescription and patient record saved successfully!",
      patient: savedPatient,
      appointment: newAppt,
    });
  } catch (error: any) {
    console.error("Error saving old prescription entry:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save old prescription record" },
      { status: 500 }
    );
  }
}
