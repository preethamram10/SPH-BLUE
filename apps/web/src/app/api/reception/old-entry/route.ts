import { NextRequest, NextResponse } from "next/server";
import {
  patientService,
  appointmentService,
  normalizePhone,
  normalizeDateStr,
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
      subject,
      source,
      marketingSource,
      consultationMode,
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
    const targetDate = normalizeDateStr(visitDate || new Date().toISOString().slice(0, 10));
    const targetDoctor = doctorName || "Dr. Prashanth K Vaidya";
    const targetDoctorId = doctorId || "doc-1";
    const cleanSource = (source || marketingSource || "Old Patient").trim();
    const cleanSubject = (subject || diseases || notes || "").trim();
    const cleanMode = (consultationMode || "").trim().toLowerCase().includes("online") ? "Online" : "In-Clinic";
    const fee = typeof consultationFee === "number" ? consultationFee : parseInt(consultationFee, 10) || 0;
    const images = Array.isArray(prescriptionImages) ? prescriptionImages : [];

    // 1. Upsert / Create Patient Record
    const savedPatient = await patientService.upsertPatient({
      regId: cleanRegId,
      name: name.trim(),
      phone: cleanPhone,
      branch: targetBranch,
      diseases: cleanSubject,
      subject: cleanSubject,
      source: cleanSource,
      marketingSource: cleanSource,
    });

    // 2. Create Historical Appointment Record with Prescriptions
    const newAppt = await appointmentService.createAppointment({
      registrationId: cleanRegId,
      patientName: name.trim(),
      phone: cleanPhone,
      branch: targetBranch,
      marketingSource: cleanSource,
      consultationMode: cleanMode,
      doctorId: targetDoctorId,
      doctorName: targetDoctor,
      appointmentDate: targetDate,
      timeSlot: timeSlot || "10:00 AM - 01:00 PM",
      isReback: false,
      status: "COMPLETED",
      isFeeCollected: fee > 0,
      consultationFee: fee,
      totalAmountDue: fee,
      totalPaid: fee,
      isHistorical: true,
      paidAt: fee > 0 ? new Date(targetDate).toISOString() : undefined,
      paymentMethod: fee > 0 ? "CASH" : undefined,
      diagnosisNotes: cleanSubject || "Historical Prescription Entry",
      diseases: cleanSubject,
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
