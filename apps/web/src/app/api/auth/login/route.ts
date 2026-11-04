import { NextResponse } from "next/server";
import { prisma, branchService } from "@spiritualhomeo/database";

export async function POST(request: Request) {
  try {
    const { identifier, password, requestedRole } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: "Phone number or email is required" },
        { status: 400 }
      );
    }

    // Reception login must match an active clinic branch's registered number
    if (requestedRole === "RECEPTION" || requestedRole === "doctor_reception") {
      const matchedBranch = await branchService.findBranchByPhone(identifier);

      if (!matchedBranch) {
        return NextResponse.json(
          {
            error:
              "Not Authorized: This phone number is not registered with any clinic branch. Only registered branch contact numbers can login as Reception.",
          },
          { status: 403 }
        );
      }

      // Generate authorized token for this specific branch reception
      const token = Buffer.from(
        JSON.stringify({
          userId: `reception-branch-${matchedBranch.id}`,
          role: "RECEPTION",
          branchId: matchedBranch.id,
          branchName: matchedBranch.name,
          identifier,
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
      ).toString("base64");

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: `reception-branch-${matchedBranch.id}`,
          name: `${matchedBranch.name} (Reception)`,
          role: "RECEPTION",
          branch: {
            id: matchedBranch.id,
            name: matchedBranch.name,
            phone: matchedBranch.phone,
          },
          identifier,
        },
      });
    }

    // Fallback for other roles (Admin, HR, Telecaller, Doctor)
    let user = null;
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [{ phone: identifier }, { email: identifier }],
        },
      });
    } catch (dbErr) {
      console.warn("User lookup:", dbErr);
    }

    const role = user?.role || requestedRole || "DOCTOR";
    const userName = user?.name || `Staff Member (${role})`;
    const userId = user?.id || `dev-${role.toLowerCase()}-1`;

    const token = Buffer.from(
      JSON.stringify({
        userId,
        role,
        identifier,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    ).toString("base64");

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        name: userName,
        role,
        identifier,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Authentication error" },
      { status: 500 }
    );
  }
}
