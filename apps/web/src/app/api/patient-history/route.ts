import { NextRequest, NextResponse } from "next/server";
import { patientService, appointmentService, normalizePhone } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const phone = searchParams.get("phone");

    if (!id && !phone) {
      return NextResponse.json({ success: false, error: "Patient ID or Phone is required" }, { status: 400 });
    }

    // 1. Resolve Patient Record
    let patient: any = null;
    if (id) {
      patient = await patientService.getByRegId(id);
    }
    if (!patient && phone) {
      const byPhone = await patientService.getProfilesByPhone(phone);
      if (byPhone.length > 0) patient = byPhone[0];
    }
    if (!patient && id) {
      // Check if id was an appointment id
      const appt = await appointmentService.getAppointmentById(id);
      if (appt) {
        patient = await patientService.getByRegId(appt.registrationId);
        if (!patient) {
          patient = {
            regId: appt.registrationId,
            name: appt.patientName,
            phone: appt.phone,
            branch: appt.branch,
            diseases: appt.diseases,
          };
        }
      }
    }

    const cleanRegId = (patient?.regId || id || "").trim().toUpperCase();
    const cleanPhone = normalizePhone(patient?.phone || phone || "");

    // 2. Fetch all profiles sharing this mobile number for the Profile Switcher
    let siblingProfiles: any[] = [];
    if (cleanPhone) {
      const byPhone = await patientService.getProfilesByPhone(cleanPhone);
      siblingProfiles = byPhone.map((p) => ({
        regId: p.regId,
        name: p.name,
        phone: p.phone,
        branch: p.branch,
        diseases: p.diseases || p.subject || "",
        subject: p.subject || p.diseases || "",
        source: p.source || p.marketingSource || "Old Patient",
        appointmentCount: p.appointmentCount || 0,
        isSelected: (p.regId || "").trim().toUpperCase() === cleanRegId,
      }));
    }

    // 3. STRICT FILTERING BY UNIQUE REGISTRATION ID ONLY
    // Multiple profiles can share a phone number, but each profile's history belongs ONLY to its own ID
    const allAppts = await appointmentService.getAppointments();
    const patientAppts = allAppts.filter((a) => {
      if (a.isDeleted) return false;
      if (cleanRegId) {
        return (a.registrationId || "").trim().toUpperCase() === cleanRegId;
      }
      return false;
    });

    // Sort newest first by date and createdAt
    patientAppts.sort((a, b) => {
      const dtA = a.appointmentDate || a.createdAt || "";
      const dtB = b.appointmentDate || b.createdAt || "";
      return dtB.localeCompare(dtA);
    });

    // 3. Compute Summary Statistics
    let totalPaid = 0;
    let paidCount = 0;
    const allPrescriptionImages: Array<{
      url: string;
      date: string;
      appointmentId: string;
      index: number;
    }> = [];

    patientAppts.forEach((a) => {
      const isPaid =
        Boolean(a.isFeeCollected) ||
        Boolean(a.paidAt) ||
        a.status === "COMPLETED";

      const fee =
        typeof a.totalAmountDue === "number" && a.totalAmountDue > 0
          ? a.totalAmountDue
          : (a.consultationFee || 0) + (a.medicineFee || 0) + (a.dietPlanFee || 0);

      if (isPaid) {
        totalPaid += fee;
        paidCount++;
      }

      // Collect prescription images
      if (Array.isArray(a.prescriptionImages) && a.prescriptionImages.length > 0) {
        a.prescriptionImages.forEach((url, imgIdx) => {
          if (url && typeof url === "string") {
            allPrescriptionImages.push({
              url,
              date: a.appointmentDate || a.createdAt?.slice(0, 10) || "",
              appointmentId: a.id,
              index: imgIdx,
            });
          }
        });
      }
    });

    const latestAppointment = patientAppts[0] || null;

    return NextResponse.json({
      success: true,
      patient: {
        id: patient?.id || cleanRegId,
        regId: cleanRegId || "SPH-GEN",
        name: patient?.name || latestAppointment?.patientName || "Patient",
        phone: patient?.phone || cleanPhone,
        branch: patient?.branch || latestAppointment?.branch || "Clinic Branch",
        diseases: patient?.diseases || patient?.subject || latestAppointment?.diseases || latestAppointment?.diagnosisNotes || "",
        subject: patient?.subject || patient?.diseases || latestAppointment?.diseases || latestAppointment?.diagnosisNotes || "",
        source: patient?.source || patient?.marketingSource || latestAppointment?.marketingSource || "Old Patient",
      },
      siblingProfiles,
      stats: {
        totalPaid,
        totalVisits: patientAppts.length,
        paidCount,
        unpaidCount: Math.max(0, patientAppts.length - paidCount),
        totalImages: allPrescriptionImages.length,
      },
      latestAppointment,
      appointments: patientAppts.map((a, idx) => ({
        id: a.id,
        token: a.token || `SPH-${idx + 1}`,
        visitNumber: patientAppts.length - idx,
        appointmentDate: a.appointmentDate,
        timeSlot: a.timeSlot,
        doctorId: a.doctorId,
        doctorName: a.doctorName,
        branch: a.branch || patient?.branch,
        phone: a.phone || patient?.phone || cleanPhone,
        consultationMode: (a.consultationMode || "").toLowerCase().includes("online") ? "Online" : "In-Clinic",
        mode: (a.consultationMode || "").toLowerCase().includes("online") ? "Online" : "In-Clinic",
        marketingSource: a.marketingSource || patient?.source || "Walk-in",
        source: a.marketingSource || patient?.source || "Walk-in",
        status: a.status,
        isFeeCollected: Boolean(a.isFeeCollected || a.paidAt || a.status === "COMPLETED"),
        paymentMethod: a.paymentMethod || "CASH",
        paidAt: a.paidAt,
        consultationFee: a.consultationFee || 0,
        medicineFee: a.medicineFee || 0,
        dietPlanFee: a.dietPlanFee || 0,
        totalAmountDue: a.totalAmountDue || (a.consultationFee || 0) + (a.medicineFee || 0) + (a.dietPlanFee || 0),
        diagnosisNotes: a.diagnosisNotes || a.notes || a.diseases || "",
        subject: a.diseases || a.diagnosisNotes || a.notes || "",
        prescriptionImages: a.prescriptionImages || [],
        medicinesList: a.medicinesList || [],
        medicineDuration: a.medicineDuration || "",
      })),
      allPrescriptionImages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load patient history" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, regId, appointmentId, imageUrl, imageIndex } = body;

    if (!regId && !appointmentId) {
      return NextResponse.json(
        { success: false, error: "Patient Registration ID or Appointment ID is required" },
        { status: 400 }
      );
    }

    if (action === "ADD_IMAGE") {
      if (!imageUrl) {
        return NextResponse.json({ success: false, error: "Image URL is required" }, { status: 400 });
      }

      // Find appointment to attach to: use appointmentId if provided, or latest appointment for regId
      let targetAppt: any = null;
      if (appointmentId) {
        targetAppt = await appointmentService.getAppointmentById(appointmentId);
      }
      if (!targetAppt && regId) {
        const allAppts = await appointmentService.getAppointments();
        const matches = allAppts
          .filter((a) => !a.isDeleted && (a.registrationId || "").trim().toUpperCase() === regId.trim().toUpperCase())
          .sort((a, b) => (b.appointmentDate || "").localeCompare(a.appointmentDate || ""));
        targetAppt = matches[0];
      }

      if (targetAppt) {
        const existingImages = targetAppt.prescriptionImages || [];
        const updatedImages = [...existingImages, imageUrl];
        await appointmentService.updatePatientFile(targetAppt.id, {
          prescriptionImages: updatedImages,
        });
        return NextResponse.json({ success: true, message: "Prescription image attached successfully", images: updatedImages });
      } else {
        // If no appointment exists, create a general record appointment so the rx is preserved
        const newAppt = await appointmentService.createAppointment({
          registrationId: regId || "SPH-GEN",
          patientName: body.patientName || "Patient",
          phone: body.phone || "9999999999",
          branch: body.branch || "Clinic Branch",
          marketingSource: "Uploaded Prescription Record",
          consultationMode: "In-Clinic",
          doctorId: "doc-1",
          doctorName: "Dr. Prashanth K Vaidya",
          appointmentDate: new Date().toISOString().slice(0, 10),
          timeSlot: "10:00 AM - 01:00 PM",
          isReback: false,
          prescriptionImages: [imageUrl],
          status: "COMPLETED",
          isHistorical: true,
          isFeeCollected: false,
          consultationFee: 0,
          totalAmountDue: 0,
          totalPaid: 0,
          diagnosisNotes: "Uploaded Prescription Record",
        });
        return NextResponse.json({ success: true, message: "Created appointment and attached prescription", appointment: newAppt });
      }
    }

    if (action === "DELETE_IMAGE") {
      const { imageUrl, appointmentId, imageIndex } = body;

      // 1. If appointmentId is provided
      if (appointmentId) {
        const appt = await appointmentService.getAppointmentById(appointmentId);
        if (appt) {
          const existing = appt.prescriptionImages || [];
          let updated: string[] = [];
          if (typeof imageIndex === "number") {
            updated = existing.filter((_, idx) => idx !== imageIndex);
          } else if (imageUrl) {
            updated = existing.filter((url: string) => url !== imageUrl);
          } else {
            updated = existing;
          }
          await appointmentService.updatePatientFile(appointmentId, {
            prescriptionImages: updated,
          });
          return NextResponse.json({ success: true, message: "Prescription image deleted from database", images: updated });
        }
      }

      // 2. Fallback: Search all appointments for this regId matching the imageUrl
      if (imageUrl) {
        const allAppts = await appointmentService.getAppointments();
        for (const a of allAppts) {
          if (!a.isDeleted && Array.isArray(a.prescriptionImages) && a.prescriptionImages.includes(imageUrl)) {
            const updated = a.prescriptionImages.filter((url: string) => url !== imageUrl);
            await appointmentService.updatePatientFile(a.id, {
              prescriptionImages: updated,
            });
            return NextResponse.json({ success: true, message: "Prescription image deleted from database", images: updated });
          }
        }
      }

      return NextResponse.json({ success: false, error: "Image not found or missing parameters" }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

