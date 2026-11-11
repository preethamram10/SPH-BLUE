import { NextRequest, NextResponse } from "next/server";
import { packageService } from "@spiritualhomeo/database";

export const dynamic = "force-dynamic";

const DEFAULT_PACKAGES = [
  {
    id: "PKG-01",
    name: "Annual Family Chronic Care Plan",
    duration: "12 Months",
    totalVisits: 12,
    price: 24000,
    category: "Chronic Illness",
    description: "Year-long constitutional homeopathic treatment for 4 family members.",
    activeMembers: 14,
  },
  {
    id: "PKG-02",
    name: "6-Month Skin & Allergy Remedy Plan",
    duration: "6 Months",
    totalVisits: 6,
    price: 14500,
    category: "Dermatology",
    description: "Deep-acting remedies for eczema, psoriasis, chronic urticaria, and allergies.",
    activeMembers: 22,
  },
  {
    id: "PKG-03",
    name: "Hair Fall & Scalp Renewal Course",
    duration: "3 Months",
    totalVisits: 4,
    price: 8000,
    category: "Trichology",
    description: "Targeted natural roots treatment and anti-dandruff constitutional support.",
    activeMembers: 19,
  },
  {
    id: "PKG-04",
    name: "Pediatric Immunity Booster Package",
    duration: "6 Months",
    totalVisits: 6,
    price: 9500,
    category: "Pediatrics",
    description: "Gentle remedies for recurrent cough, cold, tonsillitis, and poor appetite in kids.",
    activeMembers: 11,
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || undefined;
    const realMembers = await packageService.getAllPackageMembers(branch);

    const formattedMembers = realMembers.map((m: any) => ({
      id: m.id,
      packageId: m.id,
      packageName: m.packageName,
      patientName: m.patientName,
      registrationId: m.registrationId,
      phone: m.phone,
      branch: m.branch,
      enrolledDate: m.startDate,
      expiryDate: m.endDate,
      durationMonths: m.durationMonths,
      totalAmount: m.totalAmount,
      paidAmount: m.paidAmount,
      pendingAmount: m.pendingAmount,
      payments: m.payments || [],
      visitsUsed: (m.payments || []).length || 1,
      totalVisits: m.durationMonths,
      status: m.status === "ACTIVE" ? "Active" : "Completed",
    }));

    return NextResponse.json({
      success: true,
      packages: DEFAULT_PACKAGES,
      members: formattedMembers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { packageId, patientName, registrationId, phone, branch, totalAmount, durationMonths } = body;

    const pkg = DEFAULT_PACKAGES.find((p) => p.id === packageId);
    const duration = durationMonths || (pkg ? parseInt(pkg.duration) || 6 : 6);
    const total = totalAmount || (pkg ? pkg.price : 10000);

    const created = await packageService.registerPackage({
      registrationId: registrationId || "",
      patientName,
      phone,
      branch: branch || "KPHB Branch",
      durationMonths: duration,
      totalAmount: total,
    });

    return NextResponse.json({
      success: true,
      member: {
        id: created.id,
        packageId: created.id,
        packageName: created.packageName,
        patientName: created.patientName,
        registrationId: created.registrationId,
        phone: created.phone,
        enrolledDate: created.startDate,
        expiryDate: created.endDate,
        totalAmount: created.totalAmount,
        paidAmount: created.paidAmount,
        pendingAmount: created.pendingAmount,
        status: created.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
