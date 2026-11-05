import { NextRequest, NextResponse } from "next/server";

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

const ENROLLED_MEMBERS = [
  {
    id: "MEM-101",
    packageId: "PKG-01",
    packageName: "Annual Family Chronic Care Plan",
    patientName: "M. Rajeshwar Rao",
    registrationId: "SPH-KPB-0012",
    phone: "9848011223",
    enrolledDate: "15-08-2026",
    expiryDate: "15-08-2027",
    visitsUsed: 3,
    totalVisits: 12,
    status: "Active",
  },
  {
    id: "MEM-102",
    packageId: "PKG-02",
    packageName: "6-Month Skin & Allergy Remedy Plan",
    patientName: "S. Swathi",
    registrationId: "SPH-KPB-0034",
    phone: "9700334455",
    enrolledDate: "02-10-2026",
    expiryDate: "02-04-2027",
    visitsUsed: 2,
    totalVisits: 6,
    status: "Active",
  },
  {
    id: "MEM-103",
    packageId: "PKG-03",
    packageName: "Hair Fall & Scalp Renewal Course",
    patientName: "K. Hariprasad",
    registrationId: "SPH-KPB-0056",
    phone: "9911223344",
    enrolledDate: "10-09-2026",
    expiryDate: "10-12-2026",
    visitsUsed: 3,
    totalVisits: 4,
    status: "Active",
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    packages: DEFAULT_PACKAGES,
    members: ENROLLED_MEMBERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { packageId, patientName, registrationId, phone } = body;

    const pkg = DEFAULT_PACKAGES.find((p) => p.id === packageId) || DEFAULT_PACKAGES[0];
    const newMember = {
      id: `MEM-${Date.now().toString().slice(-4)}`,
      packageId: pkg.id,
      packageName: pkg.name,
      patientName,
      registrationId,
      phone,
      enrolledDate: new Date().toLocaleDateString("en-IN"),
      expiryDate: "Valid for 6-12 Months",
      visitsUsed: 1,
      totalVisits: pkg.totalVisits,
      status: "Active",
    };

    return NextResponse.json({ success: true, member: newMember });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

