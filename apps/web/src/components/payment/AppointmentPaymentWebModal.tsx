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
} from "lucide-react";

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
  type: "Pills" | "Syrup" | "Powder" | "Drops" | "Ointment" | "Oil" | "Tablet" | "Other";
  timing: "M-A-N" | "M--E" | "M--N" | "M-A-" | "M---" | "-A-" | "--E-" | "--N";
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
  const hasPrescription = rxImages.length > 0;

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
      setPaymentType("consultation");
      setSelectedMethod(null);
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
      setIncludeConsult(true);
      setConsultationFee(target);
      setIncludeMedicine(false);
      setMedicineFee(0);
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

  const totalMedicinesItemized = medicines.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const isMedicineAmountMatched = !includeMedicine || totalMedicinesItemized === medicineFee;

  const subTotal =
    (includeConsult ? consultationFee : 0) +
    (includeMedicine ? medicineFee : 0) +
    (includeDiet ? dietFee : 0);

  const totalAmountDue = Math.max(
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

  const handleConfirmPayment = async () => {
    if (!hasPrescription) {
      alert("Prescription is mandatory before collecting payment. Please upload prescription in Patient File.");
      return;
    }

    if (!selectedMethod) {
      alert("Please select a payment method before completing payment.");
      return;
    }

    if (includeMedicine && !isMedicineAmountMatched) {
      alert(
        `Medicine itemization mismatch: Allocated medicine fee is ₹${medicineFee}, but itemized total is ₹${totalMedicinesItemized}. Please adjust medicine amounts.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        appointmentId: appointment.id,
        targetAmount: parseFloat(targetAmount) || 0,
        consultationFee: includeConsult ? consultationFee : 0,
        medicineFee: includeMedicine ? medicineFee : 0,
        dietPlanFee: includeDiet ? dietFee : 0,
        totalAmountDue,
        paymentMethod: selectedMethod,
        medicineDuration: includeMedicine ? medicineDuration : undefined,
        medicinesList: includeMedicine ? medicines : [],
      };

      const res = await fetch("/api/reception/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Payment of ₹${totalAmountDue} recorded successfully via ${selectedMethod}! Consultation completed.`);
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
    { label: "Cash", icon: Banknote },
    { label: "Counter UPI", icon: Smartphone },
    { label: "UPI / QR Code", icon: QrCode },
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
                <span className="font-extrabold text-slate-900 text-xs block">
                  Target Amount (Consultation + Medicine):
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Split & presets calculate strictly within this target
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-sky-500">
                <span className="text-slate-600 font-bold text-xs">₹</span>
                <input
                  type="number"
                  placeholder="0"
                  value={targetAmount}
                  onChange={(e) => handleTargetAmountChange(e.target.value)}
                  className="w-20 font-black text-slate-900 text-sm focus:outline-none bg-transparent"
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
                          {["Pills", "Syrup", "Powder", "Drops", "Ointment", "Oil", "Tablet", "Other"].map(
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
                          {["M-A-N", "M--E", "M--N", "M-A-", "M---", "-A-", "--E-", "--N"].map((tm) => (
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
                    onClick={() => setSelectedMethod(m.label)}
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
                onClick={handleConfirmPayment}
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
    </div>
  );
}

