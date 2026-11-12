"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Share2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface RazorpayQRModalProps {
  isOpen: boolean;
  appointmentId: string;
  patientName: string;
  phone: string;
  amount: number;
  onClose: () => void;
  onPaymentSuccess: (appointment: any) => void;
}

export const RazorpayQRModal: React.FC<RazorpayQRModalProps> = ({
  isOpen,
  appointmentId,
  patientName,
  phone,
  amount,
  onClose,
  onPaymentSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{
    qrId: string;
    paymentLinkId: string;
    qrImageUrl: string;
    upiIntentUri: string;
    shortUrl: string;
    amount: number;
    merchantName: string;
    vpa: string;
  } | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paidInfo, setPaidInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(900); // 15 mins

  const pollIntervalRef = useRef<any>(null);

  // 1. Generate QR Code when modal opens
  useEffect(() => {
    if (!isOpen || amount <= 0) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setIsPaid(false);
    setPaidInfo(null);
    setSecondsRemaining(900);

    const initQR = async () => {
      try {
        const res = await fetch("/api/reception/razorpay/create-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId,
            amount,
            patientName,
            phone,
          }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (data.success) {
          setQrData(data);
        } else {
          setError(data.error || "Failed to generate dynamic Razorpay QR.");
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to connect to Razorpay server.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initQR();

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, appointmentId, amount, patientName, phone]);

  // 2. Poll Razorpay every 2.5 seconds to auto-detect payment
  useEffect(() => {
    if (!isOpen || !qrData || isPaid) return;

    const checkPayment = async () => {
      try {
        const params = new URLSearchParams({
          qrId: qrData.qrId || "",
          paymentLinkId: qrData.paymentLinkId || "",
          appointmentId: appointmentId || "",
          amount: String(amount),
        });

        const res = await fetch(`/api/reception/razorpay/check-status?${params.toString()}`);
        const data = await res.json();

        if (data.success && data.isPaid) {
          setIsPaid(true);
          setPaidInfo(data.payment);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            onPaymentSuccess(data.appointment);
            onClose();
          }, 1800);
        }
      } catch (err) {
        // Silent poll error
      }
    };

    // Immediate check
    checkPayment();

    pollIntervalRef.current = setInterval(checkPayment, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, qrData, isPaid, appointmentId, amount, onPaymentSuccess, onClose]);

  // 3. Countdown timer
  useEffect(() => {
    if (!isOpen || isPaid) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isPaid]);

  const handleManualCheck = async (force: boolean = false) => {
    if (!qrData) return;
    setIsVerifying(true);
    try {
      const params = new URLSearchParams({
        qrId: qrData.qrId || "",
        paymentLinkId: qrData.paymentLinkId || "",
        appointmentId: appointmentId || "",
        amount: String(amount),
        forceVerify: force ? "true" : "false",
      });

      const res = await fetch(`/api/reception/razorpay/check-status?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.isPaid) {
        setIsPaid(true);
        setPaidInfo(data.payment);
        setTimeout(() => {
          onPaymentSuccess(data.appointment);
          onClose();
        }, 1500);
      } else {
        alert(
          "Payment not detected yet in Razorpay.\n\nIf the patient has already paid or money was debited on their UPI app, click 'Confirm Payment Received' below to complete immediately."
        );
      }
    } catch (err: any) {
      alert(err.message || "Could not verify payment status.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmManual = async () => {
    setIsVerifying(true);
    try {
      const params = new URLSearchParams({
        appointmentId: appointmentId || "",
        amount: String(amount),
        confirmManual: "true",
      });

      const res = await fetch(`/api/reception/razorpay/check-status?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.isPaid) {
        setIsPaid(true);
        setPaidInfo(data.payment);
        setTimeout(() => {
          onPaymentSuccess(data.appointment);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      alert(err.message || "Failed to confirm payment.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyLink = () => {
    if (!qrData) return;
    const targetUrl = qrData.shortUrl || qrData.upiIntentUri;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!qrData) return;
    const cleanPh = (phone || "").replace(/\D/g, "").slice(-10);
    const link = qrData.shortUrl || qrData.upiIntentUri;
    const msg = encodeURIComponent(
      `Hello ${patientName},\n\nPlease complete your consultation / treatment payment of *₹${amount}* for *Spiritual Homeopathy* using this secure UPI link:\n${link}\n\nThank you!`
    );
    window.open(`https://wa.me/91${cleanPh}?text=${msg}`, "_blank");
  };

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-sky-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0284c7] text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Scan UPI QR to Pay
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Spiritual Homeopathy • Powered by Razorpay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col items-center space-y-4 text-center">
          {/* Amount Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-2.5 w-full">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Payment Amount Due
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-0.5">
              <span className="text-lg font-bold text-emerald-700">₹</span>
              <span className="text-3xl font-black text-emerald-950">
                {amount.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 font-medium mt-1">
              For {patientName} • VPA: {qrData?.vpa || "sseomni9k9v0j291124pos@mairtel"}
            </p>
          </div>

          {/* Dynamic QR Code Card */}
          <div className="w-64 h-64 rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-inner flex items-center justify-center relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-[#0284c7]" />
                <span className="text-xs font-bold text-slate-600">Generating Razorpay QR...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-rose-500 px-3">
                <AlertCircle className="w-8 h-8" />
                <span className="text-xs font-bold">{error}</span>
              </div>
            ) : isPaid ? (
              <div className="flex flex-col items-center justify-center space-y-2 animate-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>
                <span className="text-sm font-black text-emerald-800">Payment Received!</span>
                {paidInfo?.id && (
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    ID: {paidInfo.id}
                  </span>
                )}
                <span className="text-[11px] font-bold text-emerald-600">Completing consultation...</span>
              </div>
            ) : (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrData?.qrImageUrl}
                  alt="Razorpay UPI QR Code"
                  className="w-56 h-56 object-contain rounded-xl"
                />
                {/* Center UPI logo badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-sky-600" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Radar & Expiry */}
          {!isPaid && !loading && !error && (
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-sky-800 bg-sky-50 py-1.5 px-3 rounded-full border border-sky-200">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                <span>Waiting for patient to scan &amp; pay...</span>
                <span className="text-slate-400">|</span>
                <span className="font-mono text-slate-600">{timerStr}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Scan with any app: Google Pay, PhonePe, Paytm, CRED, BHIM UPI
              </p>
            </div>
          )}

          {/* Actions & Sharing */}
          {!isPaid && qrData && (
            <div className="space-y-2 w-full pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleManualCheck(true)}
                  disabled={isVerifying}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                  <span>{isVerifying ? "Checking..." : "Verify Status"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp Link</span>
                </button>
              </div>

              {/* Instant Confirmation Button */}
              <button
                type="button"
                onClick={handleConfirmManual}
                disabled={isVerifying}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Patient Paid / Confirm Receipt</span>
              </button>
            </div>
          )}

          {/* Copy payment link */}
          {qrData && (
            <div className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600">
              <span className="text-[10px] truncate max-w-[240px] font-mono">
                {qrData.shortUrl || qrData.vpa}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[10.5px] font-black text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
