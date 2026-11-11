import { NextRequest, NextResponse } from "next/server";
import { RAZORPAY_CONFIG, getRazorpayAuthHeader } from "@/utils/razorpay";
import { appointmentService } from "@spiritualhomeo/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, amount, patientName, phone, description } = body;

    const parsedAmount = Math.max(1, Math.round(Number(amount) || 0));
    const amountInPaise = parsedAmount * 100;

    let appt: any = null;
    if (appointmentId) {
      appt = await appointmentService.getAppointmentById(appointmentId);
    }

    const cleanName = (patientName || appt?.patientName || "Patient").trim();
    const rawPhone = (phone || appt?.phoneNumber || appt?.phone || "9849012345").replace(/\D/g, "");
    const cleanPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : "9849012345";
    const paymentDesc = description || `Card Payment for ${cleanName} - Spiritual Homeopathy`;

    let orderId = "";
    try {
      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: getRazorpayAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${(appointmentId || Date.now()).toString().slice(-14)}`,
          notes: {
            appointment_id: appointmentId || "",
            patient_name: cleanName,
            phone: cleanPhone,
            payment_type: "card",
          },
        }),
      });

      const orderJson = await orderRes.json();
      if (orderRes.ok && orderJson.id) {
        orderId = orderJson.id;
      } else {
        console.warn("Razorpay orders API error:", orderJson);
      }
    } catch (orderErr) {
      console.warn("Razorpay orders fetch error:", orderErr);
    }

    // Also generate a payment link in case client needs direct URL
    let paymentLinkUrl = "";
    try {
      const plinkRes = await fetch("https://api.razorpay.com/v1/payment_links", {
        method: "POST",
        headers: {
          Authorization: getRazorpayAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          description: paymentDesc,
          customer: {
            name: cleanName,
            contact: `+91${cleanPhone}`,
          },
          notify: {
            sms: false,
            email: false,
            whatsapp: false,
          },
          notes: {
            appointment_id: appointmentId || "",
            patient_name: cleanName,
            payment_type: "card",
          },
        }),
      });

      const plinkJson = await plinkRes.json();
      if (plinkRes.ok && plinkJson.short_url) {
        paymentLinkUrl = plinkJson.short_url;
      }
    } catch (plinkErr) {
      console.warn("Razorpay payment link error:", plinkErr);
    }

    return NextResponse.json({
      success: true,
      orderId: orderId || `order_${Date.now()}`,
      keyId: RAZORPAY_CONFIG.keyId,
      amount: parsedAmount,
      amountInPaise,
      currency: "INR",
      paymentLinkUrl,
      merchantName: RAZORPAY_CONFIG.merchantName,
      customer: {
        name: cleanName,
        phone: cleanPhone,
      },
    });
  } catch (error: any) {
    console.error("Create Razorpay Order error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create Razorpay Order" },
      { status: 500 }
    );
  }
}

