import { NextRequest, NextResponse } from "next/server";
import { getRazorpayAuthHeader } from "@/utils/razorpay";
import { appointmentService } from "@spiritualhomeo/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qrId = searchParams.get("qrId") || "";
    const paymentLinkId = searchParams.get("paymentLinkId") || "";
    const orderId = searchParams.get("orderId") || "";
    const methodParam = searchParams.get("method") || "";
    const appointmentId = searchParams.get("appointmentId") || "";
    const amount = parseFloat(searchParams.get("amount") || "0");
    const forceVerify = searchParams.get("forceVerify") === "true";
    const allowAnyRecent = searchParams.get("allowAnyRecent") === "true";
    const confirmManual = searchParams.get("confirmManual") === "true";

    let isPaid = false;
    let paymentRecord: any = null;

    // 0. Manual confirmation by reception staff (instant guarantee)
    if (confirmManual) {
      isPaid = true;
      const isCardManual = methodParam.toLowerCase() === "card";
      paymentRecord = {
        id: `pay_manual_${Date.now().toString().slice(-8)}`,
        amount: amount || 500,
        method: isCardManual ? "CARD" : "UPI",
        status: "captured",
        source: "staff_confirmed",
      };
    }

    // 0B. Check Razorpay Order payments if orderId exists
    if (!isPaid && orderId && orderId.startsWith("order_")) {
      try {
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
          headers: { Authorization: getRazorpayAuthHeader() },
        });
        const orderPayments = await orderRes.json();
        const captured = (orderPayments.items || []).find((p: any) => p.status === "captured");
        if (captured) {
          isPaid = true;
          paymentRecord = {
            id: captured.id,
            amount: captured.amount / 100,
            method: (captured.method || "card").toUpperCase(),
            status: "captured",
            createdAt: captured.created_at,
          };
        }
      } catch (orderErr) {
        console.warn("Check order payments error:", orderErr);
      }
    }

    // 1. Check Razorpay payment_links if paymentLinkId exists
    if (!isPaid && paymentLinkId && paymentLinkId.startsWith("plink_")) {
      try {
        const res = await fetch(`https://api.razorpay.com/v1/payment_links/${paymentLinkId}`, {
          headers: { Authorization: getRazorpayAuthHeader() },
        });
        const plink = await res.json();
        if (plink.status === "paid" || (plink.amount_paid && plink.amount_paid > 0)) {
          isPaid = true;
          paymentRecord = {
            id: plink.payments?.[0]?.payment_id || `pay_${paymentLinkId.slice(-8)}`,
            amount: (plink.amount_paid || plink.amount) / 100,
            method: "UPI",
            status: "captured",
          };
        }
      } catch (err) {
        console.warn("Check payment link error:", err);
      }
    }

    // 2. Check Razorpay qr_codes if qrId exists
    if (!isPaid && qrId && qrId.startsWith("qr_")) {
      try {
        const res = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrId}`, {
          headers: { Authorization: getRazorpayAuthHeader() },
        });
        const qr = await res.json();
        if (
          qr.payments_count_received > 0 ||
          (qr.payments_amount_received && qr.payments_amount_received > 0) ||
          qr.close_reason === "paid"
        ) {
          isPaid = true;
          paymentRecord = {
            id: `pay_${qrId.slice(-8)}`,
            amount: (qr.payments_amount_received || qr.payment_amount) / 100,
            method: "UPI",
            status: "captured",
          };
        }
      } catch (err) {
        console.warn("Check QR status error:", err);
      }
    }

    // 3. Check Live Razorpay Captured Payments under /v1/payments
    // When patients scan the dynamic UPI QR or soundbox QR, payments arrive here directly as captured UPI payments!
    if (!isPaid) {
      try {
        const res = await fetch("https://api.razorpay.com/v1/payments?count=15", {
          headers: { Authorization: getRazorpayAuthHeader() },
        });
        const paymentsData = await res.json();
        const items: any[] = paymentsData.items || [];
        const nowSec = Math.floor(Date.now() / 1000);
        const targetPaise = Math.round(amount * 100);

        const isCardSearch = methodParam.toLowerCase() === "card";

        // Priority 3A: Payment matching target amount in the last 45 minutes
        let matched = items.find((p: any) => {
          if (p.status !== "captured") return false;
          const isTargetType = isCardSearch
            ? p.method === "card"
            : (p.method === "upi" || p.method === "qr" || p.method === "card" || p.description?.includes("QR"));
          const createdSec = p.created_at || 0;
          const isRecent = createdSec >= (nowSec - 2700); // 45 mins
          const isAmountMatch = targetPaise > 0 ? p.amount === targetPaise : true;
          return isTargetType && isRecent && isAmountMatch;
        });

        // Priority 3B: If test payment (e.g. ₹1) or allowAnyRecent or forceVerify
        if (!matched && (forceVerify || allowAnyRecent || targetPaise <= 100)) {
          matched = items.find((p: any) => {
            if (p.status !== "captured") return false;
            const createdSec = p.created_at || 0;
            const isRecent = createdSec >= (nowSec - 2700);
            return isRecent && (p.method === "upi" || p.method === "qr" || p.method === "card" || p.description?.includes("QR"));
          });
        }

        // Priority 3C: If forceVerify is requested, match the most recent captured payment in last 30 minutes
        if (!matched && forceVerify) {
          matched = items.find((p: any) => {
            if (p.status !== "captured") return false;
            const createdSec = p.created_at || 0;
            return createdSec >= (nowSec - 1800);
          });
        }

        if (matched) {
          isPaid = true;
          paymentRecord = {
            id: matched.id,
            amount: matched.amount / 100,
            method: (matched.method || (isCardSearch ? "card" : "upi")).toUpperCase(),
            status: "captured",
            vpa: matched.vpa || matched.upi?.vpa || (matched.method === "card" ? "Razorpay Card" : "Razorpay UPI"),
            createdAt: matched.created_at,
          };
        }
      } catch (payErr) {
        console.warn("Check live payments error:", payErr);
      }
    }

    // 4. If paid and appointmentId provided, record payment in database
    let updatedAppointment: any = null;
    if (isPaid && appointmentId) {
      try {
        const appt = await appointmentService.getAppointmentById(appointmentId);
        if (appt && !appt.isFeeCollected && appt.status !== "COMPLETED") {
          const isCardPayment =
            (paymentRecord?.method || "").toUpperCase() === "CARD" ||
            methodParam.toLowerCase() === "card";
          const paidAmount = paymentRecord?.amount || amount || appt.totalAmountDue || 500;
          updatedAppointment = await appointmentService.recordAppointmentPayment(appointmentId, {
            totalPaid: paidAmount,
            totalAmountDue: paidAmount,
            paymentMethod: isCardPayment ? "CARD" : "ONLINE_UPI",
            paymentMode: isCardPayment ? "Card" : "UPI / QR Code",
            status: "COMPLETED",
            isFeeCollected: true,
            paidAt: new Date().toISOString(),
            invoiceId: `INV-${Date.now().toString().slice(-6)}`,
          } as any);
        } else {
          updatedAppointment = appt;
        }
      } catch (dbErr) {
        console.error("DB record payment error after Razorpay verification:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      isPaid,
      payment: paymentRecord,
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    console.error("Check status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check status" },
      { status: 500 }
    );
  }
}