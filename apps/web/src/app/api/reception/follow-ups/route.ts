import { NextRequest, NextResponse } from "next/server";
import { appointmentService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

// Helper: Normalize date string to DD-MM-YYYY
function normalizeToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();

  // If already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}-${m}-${y}`;
  }

  // Parse Date object
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return trimmed;
}

// Convert DD-MM-YYYY to timestamp for comparison
function parseDDMMYYYYToTime(dateStr: string): number {
  const norm = normalizeToDDMMYYYY(dateStr);
  const parts = norm.split("-");
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || "";
    const branchParam = searchParams.get("branch") || "";

    const all = await appointmentService.getAppointments();

    const now = new Date();
    const todayDDMMYYYY = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Filter appointments with follow-up date
    const withFollowUp = all.filter((a) => !!a.followUpDate);

    // Normalize target filter date if provided
    const targetDateNormalized = dateParam ? normalizeToDDMMYYYY(dateParam) : "";

    const items = withFollowUp
      .map((a) => {
        const normFollowUp = normalizeToDDMMYYYY(a.followUpDate || "");
        const followUpTime = parseDDMMYYYYToTime(normFollowUp);

        let status: "DUE_TODAY" | "OVERDUE" | "UPCOMING" = "UPCOMING";
        if (normFollowUp === todayDDMMYYYY) {
          status = "DUE_TODAY";
        } else if (followUpTime < todayTime) {
          status = "OVERDUE";
        }

        return {
          id: a.id,
          appointmentId: a.id,
          patientName: a.patientName || "Patient",
          phone: a.phone || "",
          registrationId: a.registrationId || "SPH-REG",
          mrn: a.registrationId || "SPH-REG",
          doctorName: a.doctorName || "Doctor",
          branch: a.branch || "KPHB",
          condition: a.diseases || a.notes || "Follow-up Consultation",
          dueDate: normFollowUp,
          followUpInterval: a.followUpInterval || "1 Month",
          consultationFee: a.consultationFee || 0,
          prescriptionImages: a.prescriptionImages || [],
          status,
        };
      })
      .filter((item) => {
        // Match branch if provided
        if (branchParam && !item.branch.toLowerCase().includes(branchParam.toLowerCase())) {
          return false;
        }

        // If specific date requested, match exact date
        if (targetDateNormalized) {
          return item.dueDate === targetDateNormalized;
        }

        return true;
      });

    return NextResponse.json({
      success: true,
      filterDate: targetDateNormalized || "ALL",
      today: todayDDMMYYYY,
      count: items.length,
      followUps: items,
    });
  } catch (error: any) {
    console.error("Follow-ups API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch follow-ups" },
      { status: 500 }
    );
  }
}

