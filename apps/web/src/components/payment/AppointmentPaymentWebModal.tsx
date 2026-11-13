"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  Lock,
  Clock,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  Layers,
  ArrowRight,
  RefreshCw,
  Share2,
} from "lucide-react";
import { RazorpayQRModal } from "./RazorpayQRModal";

export type PaymentMethod =
  | "Cash"
  | "Counter UPI"
  | "UPI / QR Code"
  | "Card"
  | "Split"
  | "Send Pay to app";

export interface MedicineItem {
  id: string;
  name: string;
  type: "Pills" | "Drops" | "Dilution" | "Reserve" | "Syrup" | "Powder" | "Ointment" | "Oil" | "Tablet" | "Other" | string;
  timing: "M-A-N" | "M--E" | "M--N" | "M-A-" | "M---" | "-A-" | "--E-" | "--N" | "Reserve" | string;
  amount: number;
}

interface AppointmentPaymentWebModalProps {
  isOpen: boolean;
  appointment: any;
  onClose: () => void;
  onPaymentSuccess: (updatedAppt: any) => void;
  onOpenPatientFile?: () => void;
}

export function AppointmentPaymentWebModal({
  isOpen,
  appointment,
  onClose,
  onPaymentSuccess,
  onOpenPatientFile,
}: AppointmentPaymentWebModalProps) {
  const rxImages = appointment?.prescriptionImages || [];
  const isPkg = Boolean(
    appointment?.hasPackage ||
    (appointment?.packageTotalAmount && appointment.packageTotalAmount > 0) ||
    appointment?.activePackage
  );
  const hasPrescription =
    rxImages.length > 0 ||
    isPkg ||
    Boolean(appointment?.isSentToReception) ||
    Boolean(appointment?.diagnosisNotes) ||
    Boolean(appointment?.consultationFee);

  const initialFee =
    typeof appointment?.consultationFee === "number" && appointment.consultationFee > 0
      ? appointment.consultationFee
      : 0;

  const [targetAmount, setTargetAmount] = useState<string>(initialFee > 0 ? String(initialFee) : "");
  const [paymentType, setPaymentType] = useState<"consultation" | "consult_and_med" | "split" | "package">(
    "consultation"
  );

  // Breakdown
  const [includeConsult, setIncludeConsult] = useState(true);
  const [consultationFee, setConsultationFee] = useState<number>(initialFee);

  const [includeMedicine, setIncludeMedicine] = useState(false);
  const [medicineFee, setMedicineFee] = useState<number>(0);

  const [includeDiet, setIncludeDiet] = useState(false);
  const [dietFee, setDietFee] = useState<number>(0);

  // Medicines
  const [medicineDuration, setMedicineDuration] = useState<string>("1 Month");
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    {
      id: "med-1",
      name: "",
      type: "Pills",
      timing: "M-A-N",
      amount: 0,
    },
  ]);

  // Package member installment state
  const isPackageMember = Boolean(
    appointment?.hasPackage ||
    (appointment?.packageTotalAmount && appointment.packageTotalAmount > 0) ||
    appointment?.activePackage
  );
  const pkgTotal = appointment?.packageTotalAmount ?? appointment?.activePackage?.totalAmount ?? 0;
  const pkgPaid = appointment?.packagePaidAmount ?? appointment?.activePackage?.paidAmount ?? 0;
  const pkgPending = typeof appointment?.packagePendingAmount === "number"
    ? appointment.packagePendingAmount
    : (typeof appointment?.activePackage?.pendingAmount === "number"
      ? appointment.activePackage.pendingAmount
      : Math.max(0, pkgTotal - pkgPaid));
  const pkgName = appointment?.packageName || appointment?.activePackage?.packageName || `${appointment?.packageDurationMonths || 3} Months Treatment Package`;
  const pkgEndDate = appointment?.packageEndDate || appointment?.activePackage?.endDate || "N/A";

  const [billingMode, setBillingMode] = useState<"package" | "regular">("package");
  const [packageInstallmentAmount, setPackageInstallmentAmount] = useState<number>(0);

  // Discount
  const [discountStatus, setDiscountStatus] = useState<"NONE" | "PENDING" | "APPROVED" | "REJECTED">(
    appointment?.discountStatus || "NONE"
  );
  const [discountApprovedAmount, setDiscountApprovedAmount] = useState<number>(
    appointment?.discountApproved || 0
  );
  const [discountRequestedAmount, setDiscountRequestedAmount] = useState<string>("");
  const [discountNotes, setDiscountNotes] = useState<string>("");
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isRequestingDiscount, setIsRequestingDiscount] = useState(false);

  // Method & Submitting
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Split payment breakdown state
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCounterUpi, setSplitCounterUpi] = useState<number>(0);
  // Opted split payment modes: "cash" | "counterUpi" | "upi" | "card"
  const [optedSplitModes, setOptedSplitModes] = useState<string[]>(["cash", "upi"]);
  const [isSplitUpiPaid, setIsSplitUpiPaid] = useState<boolean>(false);
  const [splitUpiRef, setSplitUpiRef] = useState<string>("");
  const [isSplitCardPaid, setIsSplitCardPaid] = useState<boolean>(false);
  const [splitCardRef, setSplitCardRef] = useState<string>("");

  // Card details state
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");
  const [isCardProcessing, setIsCardProcessing] = useState<boolean>(false);

  // Razorpay Dynamic QR Modal state
  const [isRazorpayQROpen, setIsRazorpayQROpen] = useState(false);
  const [razorpayQRAmount, setRazorpayQRAmount] = useState(0);

  useEffect(() => {
    if (isOpen && appointment) {
      const docFee =
        typeof appointment.consultationFee === "number" && appointment.consultationFee > 0
          ? appointment.consultationFee
          : 0;
      setTargetAmount(docFee > 0 ? String(docFee) : "");
      setConsultationFee(docFee);
      setMedicineFee(0);
      setIncludeConsult(true);
      setIncludeMedicine(false);
      setIncludeDiet(false);

      if (isPackageMember) {
        setBillingMode("package");
        setPaymentType("package");
        setIncludeConsult(false);
        setConsultationFee(0);
        setIncludeMedicine(false);
        setMedicineFee(0);
        setIncludeDiet(false);
        setPackageInstallmentAmount(pkgPending > 0 ? pkgPending : 0);
      } else {
        setBillingMode("regular");
        setPaymentType("consultation");
      }

      setSelectedMethod(null);
      setSplitUpi(0);
      setSplitCash(0);
      setSplitCard(0);
      setSplitCounterUpi(0);
      setOptedSplitModes(["cash", "upi"]);
      setIsSplitUpiPaid(false);
      setSplitUpiRef("");
      setIsSplitCardPaid(false);
      setSplitCardRef("");
      setDiscountStatus(appointment.discountStatus || "NONE");
      setDiscountApprovedAmount(appointment.discountApproved || 0);
    }
  }, [isOpen, appointment]);

  const handlePaymentTypeChange = (type: "consultation" | "consult_and_med" | "split" | "package") => {
    setPaymentType(type);
    const target = parseFloat(targetAmount) || 0;

    if (type === "consultation") {
      setIncludeConsult(true);
      setConsultationFee(target);
      setIncludeMedicine(false);
      setMedicineFee(0);
    } else if (type === "consult_and_med") {
      setIncludeConsult(true);
      setIncludeMedicine(true);
      const half = Math.round(target / 2);
      setConsultationFee(half);
      setMedicineFee(target - half);
      setMedicines([
        {
          id: "med-1",
          name: "",
          type: "Pills",
          timing: "M-A-N",
          amount: target - half,
        },
      ]);
    } else if (type === "split") {
      setIncludeConsult(true);
      setIncludeMedicine(true);
      const half = Math.round(target / 2);
      setConsultationFee(half);
      setMedicineFee(target - half);
      setMedicines([
        {
          id: "med-1",
          name: "",
          type: "Pills",
          timing: "M-A-N",
          amount: target - half,
        },
      ]);
    } else if (type === "package") {
      setIncludeConsult(false);
      setConsultationFee(0);
      setIncludeMedicine(false);
      setMedicineFee(0);
      setIncludeDiet(false);
      if (!packageInstallmentAmount) {
        setPackageInstallmentAmount(pkgPending > 0 ? pkgPending : 0);
      }
    }
  };

  const handleTargetAmountChange = (text: string) => {
    setTargetAmount(text);
    const parsed = parseFloat(text) || 0;
    if (paymentType === "consultation" || paymentType === "package") {
      setConsultationFee(parsed);
      setMedicineFee(0);
    } else {
      const half = Math.round(parsed / 2);
      setConsultationFee(half);
      setMedicineFee(parsed - half);
      if (medicines.length === 1) {
        setMedicines([{ ...medicines[0], amount: parsed - half }]);
      }
    }
  };

  const handleConsultationFeeChange = (val: number) => {
    if (paymentType === "consultation" || paymentType === "package") {
      setConsultationFee(val);
      setTargetAmount(val > 0 ? String(val) : "");
      return;
    }
    const target = parseFloat(targetAmount) || 0;
    const safeConsult = Math.max(0, Math.min(val, target));
    setConsultationFee(safeConsult);
    if (includeMedicine) {
      const remainingMed = Math.max(0, target - safeConsult);
      setMedicineFee(remainingMed);
      if (medicines.length === 1) {
        setMedicines([{ ...medicines[0], amount: remainingMed }]);
      }
    }
  };

  const handleAddMedicine = () => {
    const newId = `med-${Date.now()}-${medicines.length + 1}`;
    setMedicines((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        type: "Pills",
        timing: "M-A-N",
        amount: 0,
      },
    ]);
  };

  const handleRemoveMedicine = (id: string) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMedicine = (id: string, field: keyof MedicineItem, value: any) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return { ...m, [field]: value };
        }
        return m;
      })
    );
  };

  const isPackageMode = isPackageMember ? billingMode === "package" : paymentType === "package";
  const totalMedicinesItemized = medicines.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const isMedicineAmountMatched = isPackageMode || !includeMedicine || totalMedicinesItemized === medicineFee;

  const subTotal =
    (includeConsult ? consultationFee : 0) +
    (includeMedicine ? medicineFee : 0) +
    (includeDiet ? dietFee : 0);

  const totalAmountDue = isPackageMode
    ? Math.max(0, packageInstallmentAmount)
    : Math.max(
        0,
        subTotal - (discountStatus === "APPROVED" ? discountApprovedAmount : 0)
      );

  const handleRequestDiscount = async () => {
    const reqAmount = parseFloat(discountRequestedAmount);
    if (!reqAmount || reqAmount <= 0) {
      alert("Please enter a valid discount amount.");
      return;
    }
    if (reqAmount > medicineFee && medicineFee > 0) {
      alert(`Discount cannot exceed prescribed medicine fee (₹${medicineFee}).`);
      return;
    }

    setIsRequestingDiscount(true);
    try {
      const res = await fetch("/api/reception/discount-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          discountAmount: reqAmount,
          notes: discountNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDiscountStatus("PENDING");
        setIsDiscountModalOpen(false);
        alert("Discount request sent to HR & Admin for approval!");
      } else {
        alert(data.error || "Failed to submit discount request.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to connect to server.");
    } finally {
      setIsRequestingDiscount(false);
    }
  };

  const handleOpenRazorpayCard = async (customAmount?: number) => {
    setIsCardProcessing(true);
    const chargeAmount = customAmount || totalAmountDue;
    try {
      const res = await fetch("/api/reception/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          amount: chargeAmount,
          patientName: appointment.patientName,
          phone: appointment.phoneNumber || appointment.phone,
          description: `Card payment (₹${chargeAmount}) for ${appointment.patientName || "Patient"}`,
        }),
      });
      const orderData = await res.json();
      if (!orderData.success) {
        alert(orderData.error || "Failed to initialize Razorpay Card payment.");
        setIsCardProcessing(false);
        return;
      }

      if (!(window as any).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: "INR",
        name: "Spiritual Homeopathy",
        description: `Consultation Card (₹${chargeAmount}) - ${appointment.patientName || "Patient"}`,
        order_id: orderData.orderId,
        prefill: {
          name: appointment.patientName || "",
          contact: (appointment.phoneNumber || appointment.phone || "").replace(/\D/g, "").slice(-10),
        },
        theme: { color: "#0284c7" },
        handler: async function (response: any) {
          alert(`Razorpay Card Payment of ₹${chargeAmount} authorized! Ref ID: ${response.razorpay_payment_id}`);
          if (selectedMethod === "Split") {
            setIsSplitCardPaid(true);
            setSplitCardRef(response.razorpay_payment_id || "PAID");
          } else {
            await handleConfirmPayment("Card");
          }
        },
        modal: {
          ondismiss: function () {
            setIsCardProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay card checkout error:", err);
      alert(err.message || "Failed to open Razorpay Card gateway.");
    } finally {
      setIsCardProcessing(false);
    }
  };

  const handleConfirmPayment = async (overrideMethod?: PaymentMethod) => {
    if (!hasPrescription) {
      alert("Prescription is mandatory before collecting payment. Please upload prescription in Patient File.");
      return;
    }

    const effectiveMethod = overrideMethod || selectedMethod;
    if (!effectiveMethod) {
      alert("Please select a payment method before completing payment.");
      return;
    }

    if (!isPackageMode && includeMedicine && !isMedicineAmountMatched) {
      alert(
        `Medicine itemization mismatch: Allocated medicine fee is ₹${medicineFee}, but itemized total is ₹${totalMedicinesItemized}. Please adjust medicine amounts.`
      );
      return;
    }

    if (effectiveMethod === "Split") {
      const activeCash = optedSplitModes.includes("cash") ? (splitCash || 0) : 0;
      const activeCounterUpi = optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0;
      const activeUpi = optedSplitModes.includes("upi") ? (splitUpi || 0) : 0;
      const activeCard = optedSplitModes.includes("card") ? (splitCard || 0) : 0;
      const splitAllocated = activeCash + activeCounterUpi + activeUpi + activeCard;

      if (splitAllocated !== totalAmountDue) {
        alert(
          `Split payment amounts (₹${splitAllocated}) must equal the total amount due (₹${totalAmountDue}). Difference: ₹${Math.abs(totalAmountDue - splitAllocated)}.`
        );
        return;
      }

      if (optedSplitModes.includes("upi") && splitUpi > 0 && !isSplitUpiPaid) {
        alert(`Online UPI payment of ₹${splitUpi} has not been completed. Please scan Razorpay QR or verify payment.`);
        return;
      }

      if (optedSplitModes.includes("card") && splitCard > 0 && !isSplitCardPaid) {
        alert(`Card payment of ₹${splitCard} has not been authorized. Please process via Razorpay Card or swipe on POS terminal.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const validMeds = (Array.isArray(medicines) ? medicines : []).filter(
        (m) =>
          (m.name && m.name.trim().length > 0) ||
          Number(m.amount) > 0 ||
          (m.type && m.type.toLowerCase() === "reserve") ||
          (m.timing && m.timing.toLowerCase() === "reserve")
      );
      const medsToSend = validMeds.length > 0
        ? validMeds
        : (!isPackageMode && includeMedicine ? medicines : []);

      const payload = {
        appointmentId: appointment.id,
        targetAmount: parseFloat(targetAmount) || 0,
        consultationFee: isPackageMode ? 0 : (includeConsult ? consultationFee : 0),
        medicineFee: isPackageMode ? 0 : (includeMedicine ? medicineFee : 0),
        dietPlanFee: isPackageMode ? 0 : (includeDiet ? dietFee : 0),
        totalAmountDue,
        totalPaid: totalAmountDue,
        hasPackage: isPackageMode,
        packageInstallmentPaid: isPackageMode ? totalAmountDue : undefined,
        isRegularBilling: isPackageMember && billingMode === "regular",
        skipPackagePayment: isPackageMember && billingMode === "regular",
        paymentMethod: effectiveMethod,
        paymentMode: effectiveMethod,
        status: "COMPLETED",
        isFeeCollected: true,
        splitDetails: effectiveMethod === "Split" ? {
          upi: optedSplitModes.includes("upi") ? splitUpi : 0,
          cash: optedSplitModes.includes("cash") ? splitCash : 0,
          card: optedSplitModes.includes("card") ? splitCard : 0,
          counterUpi: optedSplitModes.includes("counterUpi") ? splitCounterUpi : 0,
          upiTxId: splitUpiRef || undefined,
          cardTxId: splitCardRef || undefined,
        } : undefined,
        medicineDuration: (!isPackageMode && includeMedicine) ? medicineDuration : undefined,
        medicinesList: medsToSend,
        medicines: medsToSend,
      };

      const res = await fetch("/api/reception/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        const splitMsg = effectiveMethod === "Split" ? ` (UPI: ₹${splitUpi}, Cash: ₹${splitCash}${splitCard ? `, Card: ₹${splitCard}` : ""})` : "";
        alert(`Payment of ₹${totalAmountDue} recorded successfully via ${effectiveMethod}${splitMsg}! Consultation completed.`);
        onPaymentSuccess(data.appointment);
        onClose();
      } else {
        alert(data.error || "Failed to record payment.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to communicate with server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods: { label: PaymentMethod; icon: any }[] = [
    { label: "Counter UPI", icon: Smartphone },
    { label: "UPI / QR Code", icon: QrCode },
    { label: "Cash", icon: Banknote },
    { label: "Card", icon: CreditCard },
    { label: "Split", icon: Layers },
    { label: "Send Pay to app", icon: ArrowRight },
  ];

  if (!isOpen || !appointment) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              Appointment Payment
            </h2>
            <p className="text-xs text-slate-500 font-medium">Review and complete payment</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 space-y-4 text-xs">
          {/* Target Amount & Presets Card */}
          <div className="bg-sky-50/60 rounded-xl border border-sky-200 p-3.5 space-y-3">
            <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider block">
              Select Payment Type
            </span>

            <div className="bg-white rounded-lg p-3 border border-sky-100 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-xs block">
                    Target Amount (Consultation + Medicine):
                  </span>
                  {isPackageMode && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[9.5px] font-black uppercase">
                      Covered Under Package
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  {isPackageMode
                    ? "Consultation & medicines are bundled into package. Switch to Regular Visit below to edit."
                    : "Split & presets calculate strictly within this target"}
                </span>
              </div>
              <div className={`flex items-center gap-1 border rounded-lg px-2.5 py-1.5 ${
                isPackageMode ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed" : "bg-slate-50 border-slate-300 focus-within:ring-2 focus-within:ring-sky-500"
              }`}>
                <span className="text-slate-600 font-bold text-xs">₹</span>
                <input
                  type="number"
                  placeholder="0"
                  disabled={isPackageMode}
                  value={targetAmount}
                  onChange={(e) => handleTargetAmountChange(e.target.value)}
                  className={`w-20 font-black text-sm focus:outline-none bg-transparent ${
                    isPackageMode ? "text-slate-400 cursor-not-allowed" : "text-slate-900"
                  }`}
                />
              </div>
            </div>

            {/* Payment Type Tabs */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "consultation", label: "Consultation" },
                { id: "consult_and_med", label: "Consultation & Medicine" },
                { id: "split", label: "Split" },
                { id: "package", label: "Package" },
              ].map((tab) => {
                const isSelected = paymentType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handlePaymentTypeChange(tab.id as any)}
                    className={`py-2 px-1 text-center rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-sky-500 text-sky-700 shadow-2xs ring-1 ring-sky-500"
                        : "bg-white/80 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PACKAGE MEMBER BANNER & MODE TOGGLE */}
          {isPackageMember && (
            <div className="rounded-xl border border-sky-300 p-4 bg-linear-to-r from-sky-50 to-blue-50/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#0284c7] text-white text-[10px] font-black uppercase tracking-wider">
                    PKG MEMBER
                  </span>
                  <span className="font-extrabold text-xs text-sky-950">
                    {pkgName}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  Valid till: {pkgEndDate}
                </span>
              </div>

              {/* Mode Toggle: Package Installment vs Regular Visit */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBillingMode("package");
                    setPaymentType("package");
                    setIncludeConsult(false);
                    setConsultationFee(0);
                    setIncludeMedicine(false);
                    setMedicineFee(0);
                    setIncludeDiet(false);
                    if (!packageInstallmentAmount) {
                      setPackageInstallmentAmount(pkgPending > 0 ? pkgPending : 0);
                    }
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                    billingMode === "package"
                      ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                      : "bg-white text-sky-800 border-sky-200 hover:bg-sky-50"
                  }`}
                >
                  <span>✓</span>
                  <span>Pay Package Installment</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBillingMode("regular");
                    setPaymentType("consultation");
                    const docFee =
                      typeof appointment.consultationFee === "number" && appointment.consultationFee > 0
                        ? appointment.consultationFee
                        : 0;
                    setTargetAmount(docFee > 0 ? String(docFee) : "");
                    setIncludeConsult(docFee > 0);
                    setConsultationFee(docFee);
                    setIncludeMedicine(false);
                    setMedicineFee(0);
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                    billingMode === "regular"
                      ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                      : "bg-white text-sky-800 border-sky-200 hover:bg-sky-50"
                  }`}
                >
                  <span>⚡</span>
                  <span>Regular Visit / Extra Medicine</span>
                </button>
              </div>

              {billingMode === "package" ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/80 p-2 rounded-lg border border-sky-100">
                      <div className="text-[9.5px] font-bold text-slate-500 uppercase">Total Package</div>
                      <div className="text-xs font-black text-slate-800">₹{pkgTotal.toLocaleString()}</div>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <div className="text-[9.5px] font-bold text-emerald-600 uppercase">Paid So Far</div>
                      <div className="text-xs font-black text-emerald-700">₹{pkgPaid.toLocaleString()}</div>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-sky-100">
                      <div className="text-[9.5px] font-bold text-sky-600 uppercase">Balance Pending</div>
                      <div className="text-xs font-black text-sky-700">₹{pkgPending.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-sky-200">
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      Pay Package Installment For This Visit (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={packageInstallmentAmount}
                        onChange={(e) => setPackageInstallmentAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full pl-7 pr-3 py-2 rounded-lg border border-sky-300 bg-white font-extrabold text-sky-950 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        placeholder="Enter installment amount to collect..."
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Doctor consultation & medicines are covered under package. Balance after this payment: ₹{Math.max(0, pkgPending - (Number(packageInstallmentAmount) || 0)).toLocaleString()}
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 font-medium">
                  ⚡ <strong>Package Installment Paused for This Visit:</strong> Target amount & regular consultation/medicines are enabled below. The patient's package remains active with balance ₹{pkgPending.toLocaleString()} and will not be deducted for this visit.
                </div>
              )}
            </div>
          )}

          {!isPackageMode && (
            <>
              {/* Consultation Fee Item */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIncludeConsult(!includeConsult)}
                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                  includeConsult ? "bg-[#0284c7] border-[#0284c7] text-white" : "border-slate-300 bg-white"
                }`}
              >
                {includeConsult && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
              <div>
                <span className="font-extrabold text-slate-900 text-xs block">Consultation Fee</span>
                <span className="text-[10px] text-slate-500">Doctor Requested Consultation Fee</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <span className="text-slate-500 font-bold">₹</span>
              <input
                type="number"
                disabled={!includeConsult}
                placeholder="0"
                value={consultationFee > 0 ? consultationFee : ""}
                onChange={(e) => handleConsultationFeeChange(parseFloat(e.target.value) || 0)}
                className="w-16 font-black text-slate-900 text-right bg-transparent focus:outline-none disabled:text-slate-400"
              />
            </div>
          </div>

          {/* Prescribed Medicines Item */}
          <div
            className={`bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2.5 transition-opacity ${
              paymentType === "consultation" ? "opacity-55" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={paymentType === "consultation"}
                  onClick={() => {
                    if (paymentType === "consultation") return;
                    const next = !includeMedicine;
                    setIncludeMedicine(next);
                    if (!next) setMedicineFee(0);
                    else {
                      const target = parseFloat(targetAmount) || 0;
                      const rem = Math.max(0, target - consultationFee);
                      setMedicineFee(rem);
                    }
                  }}
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                    paymentType === "consultation"
                      ? "border-slate-200 bg-slate-100 cursor-not-allowed"
                      : includeMedicine
                      ? "bg-[#0284c7] border-[#0284c7] text-white cursor-pointer"
                      : "border-slate-300 bg-white cursor-pointer"
                  }`}
                >
                  {includeMedicine && paymentType !== "consultation" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-xs block">Prescribed Medicines</span>
                    {paymentType === "consultation" && (
                      <span className="text-[9.5px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        (Disabled in Consultation)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">Prescribed Remedies / Pharmacy Fee</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                <span className="text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  disabled={paymentType === "consultation" || !includeMedicine}
                  value={paymentType === "consultation" ? 0 : medicineFee}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setMedicineFee(val);
                  }}
                  className="w-16 font-black text-slate-900 text-right bg-transparent focus:outline-none disabled:text-slate-400"
                />
              </div>
            </div>

            {includeMedicine && paymentType !== "consultation" && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                {/* Duration */}
                <div>
                  <span className="font-bold text-slate-700 text-[10.5px] block mb-1.5">
                    Medicine Duration:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["1 Month", "2 Months", "3 Months", "4 Months", "5 Months", "6 Months"].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setMedicineDuration(dur)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                          medicineDuration === dur
                            ? "bg-sky-50 border-sky-500 text-sky-700 shadow-2xs ring-1 ring-sky-500"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Itemized Medicines Header */}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-extrabold text-slate-800 text-[11px]">
                    Itemized Medicines ({medicines.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-[#0284c7] hover:bg-sky-100 border border-sky-200 font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                {/* Match indicator */}
                <div
                  className={`p-2 rounded-lg border text-[10.5px] font-bold flex items-center justify-between ${
                    isMedicineAmountMatched
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  <span>
                    Allocated Medicine: ₹{medicineFee} | Itemized: ₹{totalMedicinesItemized}
                  </span>
                  <span>{isMedicineAmountMatched ? "✓ Total Matches" : "⚠️ Amount Mismatch"}</span>
                </div>

                {/* Medicine Rows */}
                <div className="space-y-2">
                  {medicines.map((med, idx) => (
                    <div
                      key={med.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-200 text-slate-700 font-black text-[9.5px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder="Enter Medicine Name (e.g. Arnica 30C)"
                          value={med.name}
                          onChange={(e) => handleUpdateMedicine(med.id, "name", e.target.value)}
                          className="flex-1 p-1.5 rounded-md border border-slate-300 bg-white font-bold text-slate-800 text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(med.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Type */}
                        <select
                          value={med.type}
                          onChange={(e) => handleUpdateMedicine(med.id, "type", e.target.value as any)}
                          className="p-1.5 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 text-[10px] focus:outline-none"
                        >
                          {["Pills", "Drops", "Dilution", "Reserve", "Syrup", "Powder", "Ointment", "Oil", "Tablet", "Other"].map(
                            (t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            )
                          )}
                        </select>

                        {/* Timing */}
                        <select
                          value={med.timing}
                          onChange={(e) => handleUpdateMedicine(med.id, "timing", e.target.value as any)}
                          className="p-1.5 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 text-[10px] focus:outline-none"
                        >
                          {["M-A-N", "M--E", "M--N", "M-A-", "M---", "-A-", "--E-", "--N", "Reserve"].map((tm) => (
                            <option key={tm} value={tm}>
                              {tm}
                            </option>
                          ))}
                        </select>

                        {/* Amount */}
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1">
                          <span className="text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={med.amount}
                            onChange={(e) =>
                              handleUpdateMedicine(med.id, "amount", parseFloat(e.target.value) || 0)
                            }
                            className="w-full font-bold text-slate-800 text-right bg-transparent focus:outline-none text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Diet Plan Fee */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const next = !includeDiet;
                  setIncludeDiet(next);
                  if (!next) setDietFee(0);
                }}
                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                  includeDiet ? "bg-[#0284c7] border-[#0284c7] text-white" : "border-slate-300 bg-white"
                }`}
              >
                {includeDiet && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
              <div>
                <span className="font-extrabold text-slate-900 text-xs block">Diet Plan Fee</span>
                <span className="text-[10px] text-slate-500">Diet & Nutrition Fee</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <span className="text-slate-500 font-bold">₹</span>
              <input
                type="number"
                disabled={!includeDiet}
                value={dietFee}
                onChange={(e) => setDietFee(parseFloat(e.target.value) || 0)}
                className="w-16 font-black text-slate-900 text-right bg-transparent focus:outline-none disabled:text-slate-400"
              />
            </div>
          </div>

          {/* Medicine Discount Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
            <span className="font-extrabold text-slate-900 text-xs block">Medicine Discount Status</span>

            {discountStatus === "APPROVED" ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-[11px]">
                  Discount Approved: -₹{discountApprovedAmount} (Applied to Total Due)
                </span>
              </div>
            ) : discountStatus === "PENDING" ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-amber-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-[11px]">Pending HR / Admin Approval...</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="text-xs text-amber-900 underline font-bold"
                >
                  Edit Request
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10.5px] text-slate-500">HR Approval Required • Locked until approved</p>
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 text-center transition-colors cursor-pointer"
                >
                  Request Discount
                </button>
              </div>
            )}
          </div>
        </>
      )}

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-xs">
                Select Payment Method <span className="text-rose-500 font-black">* (Mandatory)</span>
              </span>
            </div>
            <p className="text-[10.5px] text-amber-700 font-semibold flex items-center gap-1">
              <span>⚠️</span> Please tap an option below to select how the patient is paying:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((m) => {
                const isSelected = selectedMethod === m.label;
                const Icon = m.icon;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(m.label);
                      if (m.label === "UPI / QR Code") {
                        setRazorpayQRAmount(totalAmountDue);
                        setIsRazorpayQROpen(true);
                      } else if (m.label === "Split") {
                        if (splitUpi === 0 && splitCash === 0 && splitCard === 0) {
                          const half = Math.round(totalAmountDue / 2);
                          setSplitUpi(half);
                          setSplitCash(totalAmountDue - half);
                          setSplitCard(0);
                        }
                      }
                    }}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 border-[#0284c7] text-[#0284c7] ring-2 ring-[#0284c7] shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-[#0284c7]" : "text-slate-500"}`} />
                    <span className="font-extrabold text-[11px] text-center leading-tight">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* RAZORPAY DYNAMIC QR CODE DISPLAY - ONLY FOR ONLINE UPI / QR CODE */}
            {selectedMethod === "UPI / QR Code" && (
              <div className="bg-sky-50/90 border-2 border-sky-400 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0284c7] text-white flex items-center justify-center shadow-xs">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 text-xs block">
                        Razorpay Dynamic UPI QR Code
                      </span>
                      <span className="text-[10.5px] text-slate-500 font-medium">
                        Amount: <strong className="text-slate-900">₹{totalAmountDue.toLocaleString()}</strong> • Auto-detects payment when scanned
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRazorpayQRAmount(totalAmountDue);
                      setIsRazorpayQROpen(true);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-[#0284c7] hover:bg-sky-700 text-white font-extrabold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Open Full Screen QR</span>
                  </button>
                </div>

                {/* Inline QR preview */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-sky-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(
                      `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${totalAmountDue.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Payment for ' + (appointment?.patientName || 'Patient'))}`
                    )}`}
                    alt="Razorpay UPI QR"
                    className="w-36 h-36 object-contain rounded-lg border border-slate-200 shadow-2xs"
                  />
                  <div className="flex-1 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                      <span>Ready to scan with any UPI app</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Patient can open <strong>Google Pay, PhonePe, Paytm, CRED</strong> or any UPI app and scan this QR code to pay <strong>₹{totalAmountDue.toLocaleString()}</strong>.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRazorpayQRAmount(totalAmountDue);
                          setIsRazorpayQROpen(true);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Live Status Tracker</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanPh = (appointment?.phoneNumber || appointment?.phone || "").replace(/\D/g, "").slice(-10);
                          const upiUri = `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${totalAmountDue.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Payment for ' + (appointment?.patientName || 'Patient'))}`;
                          const msg = encodeURIComponent(`Hello ${appointment?.patientName || 'Patient'},\nPlease pay ₹${totalAmountDue} for your consultation at Spiritual Homeopathy using this UPI link:\n${upiUri}`);
                          window.open(`https://wa.me/91${cleanPh}?text=${msg}`, "_blank");
                        }}
                        className="py-1.5 px-3 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>WhatsApp Link</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COUNTER UPI (SAME AS CASH) */}
            {selectedMethod === "Counter UPI" && (
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 shadow-sm space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 text-xs block">
                        Counter UPI (Clinic Desk QR)
                      </span>
                      <span className="text-[10.5px] text-slate-500 font-medium">
                        Patient scans static printed QR on counter • Handled same as Cash
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    MANUAL DESK
                  </span>
                </div>
                <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100 text-xs text-indigo-900 font-medium leading-relaxed">
                  • Patient scans clinic counter static QR code directly. Collect <strong>₹{totalAmountDue.toLocaleString()}</strong> at reception.
                  <br />
                  • Click <strong>&quot;Complete &amp; Print Bill&quot;</strong> below to record this payment (No gateway popup).
                </div>
              </div>
            )}

            {/* CARD PAYMENT DETAILS (RAZORPAY CARD / POS) */}
            {selectedMethod === "Card" && (
              <div className="bg-fuchsia-50/80 border-2 border-fuchsia-300 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shadow-xs">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 text-xs block">
                        Razorpay Card / POS Payment
                      </span>
                      <span className="text-[10.5px] text-slate-500 font-medium">
                        Enter card details or pay via Razorpay Card Gateway
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200">
                    CARD
                  </span>
                </div>

                {/* Card input fields */}
                <div className="bg-white p-3 rounded-xl border border-fuchsia-200 space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, "").slice(0, 16);
                        const formatted = clean.match(/.{1,4}/g)?.join(" ") || clean;
                        setCardNumber(formatted);
                      }}
                      placeholder="4532 •••• •••• ••••"
                      maxLength={19}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 tracking-wider"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
                          const formatted = clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
                          setCardExpiry(formatted);
                        }}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-hidden focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                      />
                    </div>
                  </div>

                  <div className="pt-1 space-y-2">
                    <button
                      type="button"
                      disabled={isCardProcessing}
                      onClick={() => handleOpenRazorpayCard()}
                      className="w-full py-2 px-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isCardProcessing ? "Opening Razorpay Gateway..." : "Pay via Razorpay Card Gateway (Card Details & OTP)"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleConfirmPayment("Card")}
                      className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSubmitting ? "Completing Appointment..." : "Confirm Card Payment & Complete Appointment"}</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-fuchsia-800 font-semibold text-center">
                  Enter card details above or swipe on clinic POS machine, then click Complete below.
                </p>
              </div>
            )}

            {/* SPLIT PAYMENT BREAKDOWN OPTIONS */}
            {selectedMethod === "Split" && (
              <div className="bg-sky-50/80 border-2 border-sky-400 rounded-2xl p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#0284c7] text-white flex items-center justify-center font-black text-xs">
                      ⚡
                    </span>
                    <div>
                      <span className="font-black text-slate-900 text-xs block">
                        Split Payment Allocation
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Total Due: <strong className="text-slate-900">₹{totalAmountDue.toLocaleString()}</strong> — Opt-in modes, allocate amounts, and verify online payments
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setOptedSplitModes(["cash", "upi"]);
                        const half = Math.round(totalAmountDue / 2);
                        setSplitUpi(half);
                        setSplitCash(totalAmountDue - half);
                        setSplitCounterUpi(0);
                        setSplitCard(0);
                        setIsSplitUpiPaid(false);
                        setIsSplitCardPaid(false);
                      }}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-white border border-sky-300 text-sky-800 hover:bg-sky-100 transition shadow-2xs cursor-pointer"
                    >
                      Cash + UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOptedSplitModes(["cash", "card"]);
                        const half = Math.round(totalAmountDue / 2);
                        setSplitCard(half);
                        setSplitCash(totalAmountDue - half);
                        setSplitUpi(0);
                        setSplitCounterUpi(0);
                        setIsSplitUpiPaid(false);
                        setIsSplitCardPaid(false);
                      }}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-white border border-sky-300 text-sky-800 hover:bg-sky-100 transition shadow-2xs cursor-pointer"
                    >
                      Cash + Card
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOptedSplitModes(["cash", "counterUpi"]);
                        const half = Math.round(totalAmountDue / 2);
                        setSplitCounterUpi(half);
                        setSplitCash(totalAmountDue - half);
                        setSplitUpi(0);
                        setSplitCard(0);
                        setIsSplitUpiPaid(false);
                        setIsSplitCardPaid(false);
                      }}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-white border border-sky-300 text-sky-800 hover:bg-sky-100 transition shadow-2xs cursor-pointer"
                    >
                      Cash + Counter UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOptedSplitModes(["cash", "counterUpi", "upi", "card"]);
                        const quarter = Math.round(totalAmountDue / 4);
                        setSplitCash(quarter);
                        setSplitCounterUpi(quarter);
                        setSplitUpi(quarter);
                        setSplitCard(totalAmountDue - (quarter * 3));
                      }}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-white border border-sky-300 text-sky-800 hover:bg-sky-100 transition shadow-2xs cursor-pointer"
                    >
                      All 4 Options
                    </button>
                  </div>
                </div>

                {/* OPT-IN SELECTOR BUTTONS */}
                <div className="bg-white/90 p-3 rounded-xl border border-sky-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700">
                      Step 1: Choose Modes to Split Between (Tap to Opt-in / Opt-out)
                    </span>
                    <span className="text-[10px] font-bold text-sky-700">
                      {optedSplitModes.length} mode{optedSplitModes.length > 1 ? "s" : ""} opted
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "cash", label: "Cash", icon: Banknote },
                      { id: "counterUpi", label: "Counter UPI", icon: Smartphone },
                      { id: "upi", label: "Online UPI (QR)", icon: QrCode },
                      { id: "card", label: "Card / POS", icon: CreditCard },
                    ].map((opt) => {
                      const isOpted = optedSplitModes.includes(opt.id);
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            if (isOpted) {
                              if (optedSplitModes.length === 1) {
                                alert("At least one payment mode must be selected in Split.");
                                return;
                              }
                              setOptedSplitModes(optedSplitModes.filter((m) => m !== opt.id));
                              if (opt.id === "cash") setSplitCash(0);
                              if (opt.id === "counterUpi") setSplitCounterUpi(0);
                              if (opt.id === "upi") { setSplitUpi(0); setIsSplitUpiPaid(false); setSplitUpiRef(""); }
                              if (opt.id === "card") { setSplitCard(0); setIsSplitCardPaid(false); setSplitCardRef(""); }
                            } else {
                              const newOpted = [...optedSplitModes, opt.id];
                              setOptedSplitModes(newOpted);
                              const currentSum =
                                (newOpted.includes("cash") ? splitCash : 0) +
                                (newOpted.includes("counterUpi") ? splitCounterUpi : 0) +
                                (newOpted.includes("upi") ? splitUpi : 0) +
                                (newOpted.includes("card") ? splitCard : 0);
                              const rem = Math.max(0, totalAmountDue - currentSum);
                              if (rem > 0) {
                                if (opt.id === "cash") setSplitCash(rem);
                                else if (opt.id === "counterUpi") setSplitCounterUpi(rem);
                                else if (opt.id === "upi") setSplitUpi(rem);
                                else if (opt.id === "card") setSplitCard(rem);
                              }
                            }
                          }}
                          className={`py-2 px-2.5 rounded-xl border flex items-center justify-between text-xs font-black transition-all cursor-pointer ${
                            isOpted
                              ? "bg-sky-50 border-sky-500 text-sky-950 shadow-xs ring-1 ring-sky-500"
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isOpted ? "text-sky-600" : "text-slate-400"}`} />
                            <span>{opt.label}</span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-black ${
                              isOpted ? "bg-sky-600 text-white" : "border border-slate-300 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* OPTED INPUT CARDS */}
                <div className="space-y-1">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 block">
                    Step 2: Enter Amounts for Opted Modes
                  </span>

                  <div className={`grid grid-cols-1 ${optedSplitModes.length === 1 ? "sm:grid-cols-1" : optedSplitModes.length === 2 ? "sm:grid-cols-2" : optedSplitModes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"} gap-2.5`}>
                    {/* 1. Cash (if opted) */}
                    {optedSplitModes.includes("cash") && (
                      <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash (Desk)
                          </label>
                          {(() => {
                            const alloc = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                            return totalAmountDue - alloc !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const rem = totalAmountDue - splitUpi - splitCard - splitCounterUpi;
                                  setSplitCash(Math.max(0, rem));
                                }}
                                className="text-[9.5px] font-bold text-sky-700 underline cursor-pointer"
                              >
                                Fill Remaining
                              </button>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-1 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus-within:ring-2 focus-within:ring-sky-500 bg-white">
                          <span className="text-slate-500 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={totalAmountDue}
                            value={splitCash || ""}
                            onChange={(e) => setSplitCash(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full font-black text-slate-900 text-sm focus:outline-none bg-transparent"
                          />
                        </div>
                        <span className="text-[9.5px] text-slate-400 block">
                          Counter Desk Cash
                        </span>
                      </div>
                    )}

                    {/* 2. Counter UPI (if opted) */}
                    {optedSplitModes.includes("counterUpi") && (
                      <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> Counter UPI
                          </label>
                          {(() => {
                            const alloc = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                            return totalAmountDue - alloc !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const rem = totalAmountDue - splitUpi - splitCard - splitCash;
                                  setSplitCounterUpi(Math.max(0, rem));
                                }}
                                className="text-[9.5px] font-bold text-sky-700 underline cursor-pointer"
                              >
                                Fill Remaining
                              </button>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-1 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus-within:ring-2 focus-within:ring-sky-500 bg-white">
                          <span className="text-slate-500 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={totalAmountDue}
                            value={splitCounterUpi || ""}
                            onChange={(e) => setSplitCounterUpi(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full font-black text-slate-900 text-sm focus:outline-none bg-transparent"
                          />
                        </div>
                        <span className="text-[9.5px] text-slate-400 block">
                          Static printed QR (Same as Cash)
                        </span>
                      </div>
                    )}

                    {/* 3. Online UPI (if opted) */}
                    {optedSplitModes.includes("upi") && (
                      <div className={`p-3 rounded-xl border shadow-2xs space-y-2 ${
                        isSplitUpiPaid ? "bg-emerald-50/70 border-emerald-300" : "bg-white border-sky-300"
                      }`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5 text-sky-600" /> Online UPI (QR)
                          </label>
                          {!isSplitUpiPaid && (() => {
                            const alloc = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                            return totalAmountDue - alloc !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const rem = totalAmountDue - splitCash - splitCard - splitCounterUpi;
                                  setSplitUpi(Math.max(0, rem));
                                }}
                                className="text-[9.5px] font-bold text-sky-700 underline cursor-pointer"
                              >
                                Fill Remaining
                              </button>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-1 border border-sky-300 rounded-lg px-2.5 py-1.5 bg-sky-50 focus-within:ring-2 focus-within:ring-sky-500">
                          <span className="text-sky-700 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={totalAmountDue}
                            disabled={isSplitUpiPaid}
                            value={splitUpi || ""}
                            onChange={(e) => setSplitUpi(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full font-black text-slate-900 text-sm focus:outline-none bg-transparent disabled:opacity-60"
                          />
                        </div>

                        {/* Status / Trigger for Split UPI */}
                        {isSplitUpiPaid ? (
                          <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-[11px]">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>✓ ₹{splitUpi} UPI Paid</span>
                              {splitUpiRef && <span className="text-[9.5px] font-bold text-emerald-700">({splitUpiRef.slice(-6)})</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setIsSplitUpiPaid(false); setSplitUpiRef(""); }}
                              className="text-[9.5px] font-bold text-emerald-800 underline cursor-pointer hover:text-emerald-950"
                            >
                              Reset
                            </button>
                          </div>
                        ) : splitUpi > 0 ? (
                          <div className="space-y-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRazorpayQRAmount(splitUpi);
                                setIsRazorpayQROpen(true);
                              }}
                              className="w-full py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[10.5px] shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <QrCode className="w-3 h-3" />
                              <span>Pay ₹{splitUpi} via Razorpay QR</span>
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSplitUpiPaid(true);
                                  setSplitUpiRef(`MANUAL-${Date.now().toString().slice(-4)}`);
                                }}
                                className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9.5px] transition cursor-pointer"
                              >
                                Mark Paid ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cleanPh = (appointment?.phoneNumber || appointment?.phone || "").replace(/\D/g, "").slice(-10);
                                  const upiUri = `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${splitUpi.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Split Payment for ' + (appointment?.patientName || 'Patient'))}`;
                                  const msg = encodeURIComponent(`Hello ${appointment?.patientName || 'Patient'},\nPlease pay ₹${splitUpi} for your consultation via this UPI link:\n${upiUri}`);
                                  window.open(`https://wa.me/91${cleanPh}?text=${msg}`, "_blank");
                                }}
                                className="py-1 px-2 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[9.5px] transition cursor-pointer flex items-center gap-1"
                              >
                                <Share2 className="w-2.5 h-2.5" />
                                <span>WA</span>
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* 4. Card / POS (if opted) */}
                    {optedSplitModes.includes("card") && (
                      <div className={`p-3 rounded-xl border shadow-2xs space-y-2 ${
                        isSplitCardPaid ? "bg-emerald-50/70 border-emerald-300" : "bg-white border-fuchsia-300"
                      }`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-fuchsia-600" /> Card / POS
                          </label>
                          {!isSplitCardPaid && (() => {
                            const alloc = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                            return totalAmountDue - alloc !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const rem = totalAmountDue - splitCash - splitUpi - splitCounterUpi;
                                  setSplitCard(Math.max(0, rem));
                                }}
                                className="text-[9.5px] font-bold text-fuchsia-700 underline cursor-pointer"
                              >
                                Fill Remaining
                              </button>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-1 border border-fuchsia-300 rounded-lg px-2.5 py-1.5 bg-fuchsia-50 focus-within:ring-2 focus-within:ring-fuchsia-500">
                          <span className="text-fuchsia-700 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={totalAmountDue}
                            disabled={isSplitCardPaid}
                            value={splitCard || ""}
                            onChange={(e) => setSplitCard(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full font-black text-slate-900 text-sm focus:outline-none bg-transparent disabled:opacity-60"
                          />
                        </div>

                        {/* Status / Trigger for Split Card */}
                        {isSplitCardPaid ? (
                          <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-[11px]">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>✓ ₹{splitCard} Card Authorized</span>
                              {splitCardRef && <span className="text-[9.5px] font-bold text-emerald-700">({splitCardRef.slice(-6)})</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setIsSplitCardPaid(false); setSplitCardRef(""); }}
                              className="text-[9.5px] font-bold text-emerald-800 underline cursor-pointer hover:text-emerald-950"
                            >
                              Reset
                            </button>
                          </div>
                        ) : splitCard > 0 ? (
                          <div className="space-y-1.5 pt-0.5">
                            <button
                              type="button"
                              disabled={isCardProcessing}
                              onClick={() => handleOpenRazorpayCard(splitCard)}
                              className="w-full py-1.5 px-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-[10.5px] shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>{isCardProcessing ? "Opening Gateway..." : `Pay ₹${splitCard} via Razorpay`}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsSplitCardPaid(true);
                                setSplitCardRef(`POS-${Date.now().toString().slice(-4)}`);
                              }}
                              className="w-full py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9.5px] transition cursor-pointer"
                            >
                              Swipe on POS / Mark Paid ✓
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status validation & auto-balance badge */}
                {(() => {
                  const activeCash = optedSplitModes.includes("cash") ? (splitCash || 0) : 0;
                  const activeCounterUpi = optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0;
                  const activeUpi = optedSplitModes.includes("upi") ? (splitUpi || 0) : 0;
                  const activeCard = optedSplitModes.includes("card") ? (splitCard || 0) : 0;
                  const allocated = activeCash + activeCounterUpi + activeUpi + activeCard;
                  const isMatch = allocated === totalAmountDue;
                  const diff = totalAmountDue - allocated;

                  const isUpiSatisfied = !optedSplitModes.includes("upi") || activeUpi === 0 || isSplitUpiPaid;
                  const isCardSatisfied = !optedSplitModes.includes("card") || activeCard === 0 || isSplitCardPaid;
                  const canComplete = isMatch && isUpiSatisfied && isCardSatisfied;

                  const parts: string[] = [];
                  if (activeCash > 0) parts.push(`Cash ₹${activeCash}`);
                  if (activeCounterUpi > 0) parts.push(`Counter UPI ₹${activeCounterUpi}`);
                  if (activeUpi > 0) parts.push(`Online UPI ₹${activeUpi}${isSplitUpiPaid ? " (✓ Paid)" : " (⏳ Pending)"}`);
                  if (activeCard > 0) parts.push(`Card ₹${activeCard}${isSplitCardPaid ? " (✓ Paid)" : " (⏳ Pending)"}`);

                  return (
                    <div className="space-y-2.5 pt-1">
                      <div
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                          isMatch
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                            : diff > 0
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "bg-rose-50 border-rose-300 text-rose-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{isMatch ? "✓" : "⚠️"}</span>
                          <span>
                            {isMatch
                              ? `Split Total Matched: ${parts.join(" + ")} = ₹${totalAmountDue.toLocaleString()}`
                              : diff > 0
                              ? `₹${diff.toLocaleString()} remaining to allocate (Total due: ₹${totalAmountDue.toLocaleString()})`
                              : `Split exceeds total due by ₹${Math.abs(diff).toLocaleString()}`}
                          </span>
                        </div>
                        {!isMatch && (
                          <button
                            type="button"
                            onClick={() => {
                              // Fill remaining into first opted mode
                              const firstMode = optedSplitModes[0] || "cash";
                              if (firstMode === "cash") {
                                const rem = totalAmountDue - activeCounterUpi - activeUpi - activeCard;
                                setSplitCash(Math.max(0, rem));
                              } else if (firstMode === "counterUpi") {
                                const rem = totalAmountDue - activeCash - activeUpi - activeCard;
                                setSplitCounterUpi(Math.max(0, rem));
                              } else if (firstMode === "upi") {
                                const rem = totalAmountDue - activeCash - activeCounterUpi - activeCard;
                                setSplitUpi(Math.max(0, rem));
                              } else if (firstMode === "card") {
                                const rem = totalAmountDue - activeCash - activeCounterUpi - activeUpi;
                                setSplitCard(Math.max(0, rem));
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-black cursor-pointer shadow-2xs"
                          >
                            Auto-Balance Remaining
                          </button>
                        )}
                      </div>

                      {/* Direct Complete Split Button */}
                      {isMatch && (
                        <button
                          type="button"
                          disabled={isSubmitting || !canComplete}
                          onClick={() => handleConfirmPayment("Split")}
                          className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            canComplete
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-amber-500 hover:bg-amber-600 text-white"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            {isSubmitting
                              ? "Completing Appointment..."
                              : !isUpiSatisfied
                              ? `Awaiting Online UPI Payment (Pay ₹${activeUpi} via QR or Mark Paid)`
                              : !isCardSatisfied
                              ? `Awaiting Card Payment (Pay ₹${activeCard} or Swipe POS)`
                              : "Complete Consultation & Record Split Payment"}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* 3. Summary & Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600 font-bold text-xs">
              <span>Target Amount (Consult + Med):</span>
              <span>₹{targetAmount}</span>
            </div>
            {discountStatus === "APPROVED" && discountApprovedAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 font-bold text-xs">
                <span>Discount Approved:</span>
                <span>-₹{discountApprovedAmount}</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <span className="font-black text-slate-900 text-xs uppercase tracking-wide">
                TOTAL AMOUNT DUE:
              </span>
              <span className="font-black text-emerald-600 text-base">₹{totalAmountDue}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-extrabold text-slate-700 transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>

            {!hasPrescription ? (
              <button
                type="button"
                onClick={() => {
                  if (onOpenPatientFile) onOpenPatientFile();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-center transition-all shadow-md active:scale-98 cursor-pointer space-y-0.5"
              >
                <div className="flex items-center justify-center gap-1.5 text-[10px] tracking-wider uppercase font-black text-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>UPLOAD PRESCRIPTION REQUIRED</span>
                </div>
                <div className="text-[11.5px] font-black underline">
                  Upload Prescription to Collect Fee (Mandatory)
                </div>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || !selectedMethod || !isMedicineAmountMatched}
                onClick={() => handleConfirmPayment()}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <span>Confirm Payment & Generate Invoice</span>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Discount Request Popup Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-200 shadow-2xl space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm">Request Medicine Discount</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Sent to Admin & HR for approval
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">Discount Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 200"
                  value={discountRequestedAmount}
                  onChange={(e) => setDiscountRequestedAmount(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">Reason / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Regular patient, financial hardship..."
                  value={discountNotes}
                  onChange={(e) => setDiscountNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-slate-300 font-bold text-slate-700 text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRequestingDiscount}
                onClick={handleRequestDiscount}
                className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-xs disabled:opacity-50"
              >
                {isRequestingDiscount ? "Sending..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Dynamic QR Modal */}
      <RazorpayQRModal
        isOpen={isRazorpayQROpen}
        appointmentId={appointment?.id}
        patientName={appointment?.patientName || "Patient"}
        phone={appointment?.phoneNumber || appointment?.phone || ""}
        amount={razorpayQRAmount || totalAmountDue}
        onClose={() => setIsRazorpayQROpen(false)}
        onPaymentSuccess={(updated) => {
          setIsRazorpayQROpen(false);
          if (selectedMethod === "Split") {
            setIsSplitUpiPaid(true);
            setSplitUpiRef(updated?.paymentId || updated?.razorpayPaymentId || `PAY-${Date.now().toString().slice(-6)}`);
            alert(`Online UPI payment of ₹${razorpayQRAmount || splitUpi} received & verified via Razorpay! Now complete any remaining split payment.`);
          } else {
            alert(`Payment of ₹${razorpayQRAmount || totalAmountDue} received & verified via Razorpay UPI! Consultation completed.`);
            onPaymentSuccess(updated);
            onClose();
          }
        }}
      />
    </div>
  );
}

