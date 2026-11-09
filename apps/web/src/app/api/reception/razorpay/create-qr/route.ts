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
    const paymentDesc = description || `Payment for ${cleanName} - Spiritual Homeopathy`;

    // 1. Direct UPI URI matching Razorpay VPA
    const upiIntentUri = `upi://pay?pa=${RAZORPAY_CONFIG.vpa}&pn=${encodeURIComponent(
      RAZORPAY_CONFIG.merchantName
    )}&am=${parsedAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(paymentDesc.slice(0, 50))}`;

    // 2. Try creating Razorpay Dynamic QR Code API first
    let qrResponseData: any = null;
    try {
      const closeBy = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes
      const res = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
        method: "POST",
        headers: {
          Authorization: getRazorpayAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "upi_qr",
          name: RAZORPAY_CONFIG.merchantName,
          usage: "single_use",
          fixed_amount: true,
          payment_amount: amountInPaise,
          description: paymentDesc,
          close_by: closeBy,
          notes: {
            appointment_id: appointmentId || "",
            patient_name: cleanName,
            phone: cleanPhone,
          },
        }),
      });

      const qrJson = await res.json();
      if (res.ok && qrJson.id) {
        qrResponseData = {
          type: "qr_code",
          qrId: qrJson.id,
          imageUrl: qrJson.image_url,
          imageContent: qrJson.image_content || upiIntentUri,
          status: qrJson.status || "active",
        };
      }
    } catch (qrErr) {
      console.warn("Razorpay QR codes endpoint error:", qrErr);
    }

    // 3. If qr_codes returned error or unsupported on MID, create Razorpay Payment Link
    let paymentLinkId = "";
    let shortUrl = "";
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
          },
        }),
      });

      const plinkJson = await plinkRes.json();
      if (plinkRes.ok && plinkJson.id) {
        paymentLinkId = plinkJson.id;
        shortUrl = plinkJson.short_url;
      }
    } catch (plinkErr) {
      console.warn("Razorpay payment_links endpoint error:", plinkErr);
    }

    const primaryQrId = qrResponseData?.qrId || paymentLinkId || `RZP-QR-${Date.now()}`;
    const qrTargetData = upiIntentUri || shortUrl;
    const fallbackQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(
      qrTargetData
    )}`;
    const finalQrImageUrl = qrResponseData?.imageUrl || fallbackQrImageUrl;

    return NextResponse.json({
      success: true,
      qrId: primaryQrId,
      paymentLinkId,
      amount: parsedAmount,
      amountInPaise,
      qrImageUrl: finalQrImageUrl,
      upiIntentUri,
      shortUrl,
      merchantName: RAZORPAY_CONFIG.merchantName,
      vpa: RAZORPAY_CONFIG.vpa,
    });
  } catch (error: any) {
    console.error("Create QR error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate Razorpay QR" },
      { status: 500 }
    );
  }
}

