import { NextRequest, NextResponse } from "next/server";
import { branchService, normalizePhone } from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, role } = body;

    if (!phone) {
      return NextResponse.json(
        { authorized: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const cleanInput = normalizePhone(phone);
    if (cleanInput.length < 10) {
      return NextResponse.json(
        { authorized: false, error: "Please enter a valid 10-digit mobile number" },
        { status: 400 }
      );
    }

    // When logging in as RECEPTION / doctor_reception
    if (role === "RECEPTION" || role === "doctor_reception") {
      const matchedBranch = await branchService.findBranchByPhone(phone);

      if (!matchedBranch) {
        return NextResponse.json(
          {
            authorized: false,
            error:
              "Not Authorized: This phone number is not registered with any clinic branch. Only registered branch numbers can log in as Reception.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        authorized: true,
        role: "RECEPTION",
        branch: {
          id: matchedBranch.id,
          name: matchedBranch.name,
          phone: matchedBranch.phone,
          address: matchedBranch.address,
        },
      });
    }

    // Other roles
    return NextResponse.json({
      authorized: true,
      role: role || "STAFF",
    });
  } catch (err: any) {
    return NextResponse.json(
      { authorized: false, error: err.message || "Failed to validate phone" },
      { status: 500 }
    );
  }
}
