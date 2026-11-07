"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  User,
  Phone,
  FileText,
  Percent,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Stethoscope,
  Mail,
  Globe,
} from "lucide-react";

// --- TYPES ---
export interface MedicineItem {
  id: string;
  name: string;
  type?: string;   // Drops, Pills, Dilution, Mother Tincture
  timing?: string; // Morning-Night, 3 times a day
  amount: number;
}

export interface PatientAppointment {
  id: string;
  patientName: string;
  phoneNumber?: string;
  phone?: string;
  registrationId?: string;
  patientId?: string;
  doctorName?: string;
  branch?: string;
  appointmentDate?: string;
  timeSlot?: string;
  consultationFee?: number;
  medicineFee?: number;
  dietFee?: number;
  dietPlanFee?: number;
  otherCharges?: number;
  discount?: number;
  discountReason?: string;
  medicines?: MedicineItem[];
  medicinesList?: MedicineItem[];
  medicineDuration?: string;
  // Status and payments
  isFeeCollected?: boolean;
  totalPaid?: number;
  totalAmountDue?: number;
  paymentMode?: string;
  paymentMethod?: string;
  invoiceId?: string;
  paidAt?: string;
  prescriptionImages?: string[];
  status?: string;
}

export interface FeeCheckoutModalProps {
  isOpen: boolean;
  appointment: PatientAppointment | null;
  onClose: () => void;
  onSubmitPayment?: (invoiceData: any) => Promise<{ success: boolean; invoiceId?: string; appointment?: any }>;
}

export const FeeCheckoutAndInvoiceModal: React.FC<FeeCheckoutModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onSubmitPayment,
}) => {
  // View state: 'collect_fee' vs 'invoice_receipt'
  const [currentStep, setCurrentStep] = useState<"collect_fee" | "invoice_receipt">("collect_fee");

  // --- FORM INPUT STATES ---
  const [consultationFee, setConsultationFee] = useState<number>(500);
  const [includeConsultFee, setIncludeConsultFee] = useState<boolean>(true);

  const [medicineDuration, setMedicineDuration] = useState<string>("1 Month");
  const [includeMedicineFee, setIncludeMedicineFee] = useState<boolean>(false);

  const [medicineItems, setMedicineItems] = useState<MedicineItem[]>([
    {
      id: "1",
      name: "Prescribed Homeo Kit",
      type: "Pills",
      timing: "Morning & Night",
      amount: 1500,
    },
  ]);

  const [dietFee, setDietFee] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<string>("Counter UPI");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Completed Invoice State for Receipt View
  const [completedInvoice, setCompletedInvoice] = useState<PatientAppointment | null>(appointment);

  useEffect(() => {
    if (isOpen && appointment) {
      setCompletedInvoice(appointment);
      const isPaid = Boolean(
        appointment.isFeeCollected ||
        appointment.status === "COMPLETED" ||
        (appointment.totalPaid !== undefined && appointment.totalPaid > 0)
      );
      setCurrentStep(isPaid ? "invoice_receipt" : "collect_fee");

      const consult = typeof appointment.consultationFee === "number" ? appointment.consultationFee : 500;
      setConsultationFee(consult);
      setIncludeConsultFee(consult > 0);

      const medFee = typeof appointment.medicineFee === "number" ? appointment.medicineFee : 0;
      setIncludeMedicineFee(medFee > 0);
      setMedicineDuration(appointment.medicineDuration || "1 Month");

      const meds = appointment.medicines || appointment.medicinesList || [];
      if (meds.length > 0) {
        setMedicineItems(meds);
      } else {
        setMedicineItems([
          {
            id: "1",
            name: "Prescribed Homeo Kit",
            type: "Pills",
            timing: "Morning & Night",
            amount: medFee > 0 ? medFee : 1500,
          },
        ]);
      }

      setDietFee(appointment.dietFee ?? appointment.dietPlanFee ?? 0);
      setOtherCharges(appointment.otherCharges ?? 0);
      setDiscount(appointment.discount ?? 0);
      setDiscountReason(appointment.discountReason || "");
      setPaymentMode(appointment.paymentMode || appointment.paymentMethod || "Counter UPI");
    }
  }, [isOpen, appointment]);

  // --- DURATION OPTIONS ---
  const DURATION_OPTIONS = ["15 Days", "1 Month", "2 Months", "3 Months", "6 Months", "1 Year"];

  // --- CALCULATIONS ---
  const totalMedicineAmount = useMemo(() => {
    if (!includeMedicineFee) return 0;
    return medicineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [includeMedicineFee, medicineItems]);

  const subTotalAmount = useMemo(() => {
    const cFee = includeConsultFee ? Number(consultationFee) || 0 : 0;
    const mFee = totalMedicineAmount;
    const dFee = Number(dietFee) || 0;
    const oFee = Number(otherCharges) || 0;
    return cFee + mFee + dFee + oFee;
  }, [includeConsultFee, consultationFee, totalMedicineAmount, dietFee, otherCharges]);

  const grandTotalDue = useMemo(() => {
    return Math.max(0, subTotalAmount - (Number(discount) || 0));
  }, [subTotalAmount, discount]);

  // --- MEDICINE ITEMS HANDLERS ---
  const handleAddMedicineRow = () => {
    setMedicineItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        type: "Pills",
        timing: "Twice daily",
        amount: 0,
      },
    ]);
  };

  const handleRemoveMedicineRow = (id: string) => {
    setMedicineItems((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMedicine = (id: string, field: keyof MedicineItem, value: any) => {
    setMedicineItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // --- CONFIRM PAYMENT HANDLER ---
  const handleConfirmPayment = async () => {
    if (!appointment) return;
    setIsSubmitting(true);
    try {
      const generatedInvoiceId =
        appointment.invoiceId || `INV-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();
      const phoneNum = (appointment.phoneNumber || appointment.phone || "").replace(/\D/g, "").slice(-10);

      const invoicePayload = {
        appointmentId: appointment.id,
        patientName: appointment.patientName,
        phoneNumber: phoneNum,
        phone: phoneNum,
        registrationId: appointment.registrationId || appointment.patientId || "SPH-REC-001",
        doctorName: appointment.doctorName || "Dr. Prashanth K Vaidya",
        branch: appointment.branch || "KPHB Branch",
        appointmentDate: appointment.appointmentDate || nowIso.split("T")[0],
        timeSlot: appointment.timeSlot || "02:30 PM",
        consultationFee: includeConsultFee ? Number(consultationFee) || 0 : 0,
        medicineFee: totalMedicineAmount,
        medicineDuration: includeMedicineFee ? medicineDuration : undefined,
        medicines: includeMedicineFee ? medicineItems : [],
        medicinesList: includeMedicineFee ? medicineItems : [],
        dietFee: Number(dietFee) || 0,
        dietPlanFee: Number(dietFee) || 0,
        otherCharges: Number(otherCharges) || 0,
        discount: Number(discount) || 0,
        discountReason: discountReason || undefined,
        totalPaid: grandTotalDue,
        totalAmountDue: grandTotalDue,
        paymentMode,
        paymentMethod: paymentMode,
        paidAt: nowIso,
        invoiceId: generatedInvoiceId,
        isFeeCollected: true,
        status: "COMPLETED",
      };

      if (onSubmitPayment) {
        await onSubmitPayment(invoicePayload);
      } else {
        // Direct fallback to API
        const res = await fetch("/api/reception/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoicePayload),
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Payment recording failed");
        }
      }

      setCompletedInvoice({ ...appointment, ...invoicePayload });
      setCurrentStep("invoice_receipt");
    } catch (err: any) {
      console.error("Payment checkout error:", err);
      alert(err.message || "Failed to record payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- BROWSER PRINT RECEIPT ---
  const handlePrintReceipt = () => {
    window.print();
  };

  // Guard: ONLY return after all hooks are evaluated
  if (!isOpen || !appointment) {
    return null;
  }

  const rawPhone = appointment.phoneNumber || appointment.phone || "";
  const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
  const activeInvoice = completedInvoice || appointment;

  // --- WHATSAPP SHARE RECEIPT ---
  const handleShareWhatsApp = () => {
    const phone = cleanPhone;
    const invoiceNum = activeInvoice.invoiceId || "INV-RECEIPT";
    const totalPaidNum = Number(
      activeInvoice.totalPaid ?? activeInvoice.totalAmountDue ?? grandTotalDue
    ).toFixed(2);
    const dateStr = activeInvoice.appointmentDate || new Date().toISOString().slice(0, 10);
    const timeStr = activeInvoice.timeSlot ? ` at ${activeInvoice.timeSlot}` : "";

    const message = encodeURIComponent(
      `*SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT*\n` +
      `--------------------------------\n` +
      `Receipt No: ${invoiceNum}\n` +
      `Patient Name: ${activeInvoice.patientName}\n` +
      `Phone: +91 ${phone}\n` +
      `Doctor: ${activeInvoice.doctorName || "Dr. Prashanth K Vaidya"}\n` +
      `Branch: ${activeInvoice.branch || "KPHB Branch"}\n` +
      `Schedule: ${dateStr}${timeStr}\n` +
      `Specialty: Homeopathy\n` +
      `--------------------------------\n` +
      `*TOTAL AMOUNT PAID: ₹${totalPaidNum}*\n` +
      `Payment Mode: VIA ${activeInvoice.paymentMode || paymentMode}\n` +
      `Payment Status: PAID ✓\n` +
      `--------------------------------\n` +
      `*Fee Breakdown:*\n` +
      (Number(activeInvoice.consultationFee) > 0
        ? `• Consultation Fee: ₹${Number(activeInvoice.consultationFee).toFixed(2)}\n`
        : "") +
      (Number(activeInvoice.medicineFee) > 0
        ? `• Medicine Fee (${activeInvoice.medicineDuration || "1 Month"}): ₹${Number(activeInvoice.medicineFee).toFixed(2)}\n`
        : "") +
      (Number(activeInvoice.dietFee || activeInvoice.dietPlanFee) > 0
        ? `• Diet Plan: ₹${Number(activeInvoice.dietFee || activeInvoice.dietPlanFee).toFixed(2)}\n`
        : "") +
      (Number(activeInvoice.otherCharges) > 0
        ? `• Other Charges: ₹${Number(activeInvoice.otherCharges).toFixed(2)}\n`
        : "") +
      (Number(activeInvoice.discount) > 0
        ? `• Discount Applied: -₹${Number(activeInvoice.discount).toFixed(2)}\n`
        : "") +
      `--------------------------------\n` +
      `Helpline: 9030176176 | spiritualhomeoclinic.com\n` +
      `This is a computer-generated bill. No signature is required.`
    );

    window.open(`https://wa.me/91${phone}?text=${message}`, "_blank");
  };

  // Format issued date
  const issuedDateObj = activeInvoice.paidAt ? new Date(activeInvoice.paidAt) : new Date();
  const formattedIssuedDate = `${issuedDateObj.toLocaleDateString("en-GB")}, ${issuedDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}`;

  const displayTotal = Number(
    activeInvoice.totalPaid ?? activeInvoice.totalAmountDue ?? grandTotalDue
  ).toFixed(2);

  const displayPaymentMode = (activeInvoice.paymentMode || activeInvoice.paymentMethod || paymentMode).toUpperCase();

  return (
    <>
      {/* Global CSS for clean printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-invoice-print-area,
          #official-invoice-print-area * {
            visibility: visible;
          }
          #official-invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 print:border-none print:shadow-none print:m-0">

          {/* ========================================================
              MODAL TOP ACTION BAR (Hidden in Print)
             ======================================================== */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-3.5 no-print">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {currentStep === "collect_fee" ? "Collect Consultation & Medicine Fee" : "Payment Receipt & Tax Invoice"}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {appointment.patientName} • {appointment.registrationId || appointment.patientId || "SPH-REC"} • {appointment.branch || "KPHB Branch"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentStep === "invoice_receipt" && (
                <>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                    title="Share bill on WhatsApp"
                  >
                    <Share2 size={13} />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition cursor-pointer"
                    title="Print Receipt / Save PDF"
                  >
                    <Printer size={13} />
                    <span>Print</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ========================================================
              STEP 1: FEE COLLECTION FORM (Input Amounts)
             ======================================================== */}
          {currentStep === "collect_fee" && (
            <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">

              {/* 1. CONSULTATION FEE */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="incConsult"
                      checked={includeConsultFee}
                      onChange={(e) => setIncludeConsultFee(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="incConsult" className="text-xs font-black text-slate-800 cursor-pointer">
                      Include Consultation Fee
                    </label>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      disabled={!includeConsultFee}
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Math.max(0, Number(e.target.value)))}
                      className="w-24 rounded-lg border border-slate-300 px-2.5 py-1 text-right text-xs font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2. MEDICINE FEE & DURATION */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="incMed"
                      checked={includeMedicineFee}
                      onChange={(e) => setIncludeMedicineFee(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="incMed" className="text-xs font-black text-slate-800 cursor-pointer">
                      Prescribed Homeopathy Medicines
                    </label>
                  </div>

                  {includeMedicineFee && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500">Duration:</span>
                      <select
                        value={medicineDuration}
                        onChange={(e) => setMedicineDuration(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700"
                      >
                        {DURATION_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {includeMedicineFee && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    {medicineItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Medicine Name / Kit"
                          value={item.name}
                          onChange={(e) => handleUpdateMedicine(item.id, "name", e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 bg-white font-medium"
                        />
                        <select
                          value={item.type || "Pills"}
                          onChange={(e) => handleUpdateMedicine(item.id, "type", e.target.value)}
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          <option value="Pills">Pills</option>
                          <option value="Drops">Drops</option>
                          <option value="Dilution">Dilution</option>
                          <option value="Tincture">Tincture</option>
                          <option value="Syrup">Syrup</option>
                          <option value="Kit">Kit</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) =>
                              handleUpdateMedicine(item.id, "amount", Math.max(0, Number(e.target.value)))
                            }
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs font-bold text-slate-800 bg-white"
                          />
                        </div>
                        {medicineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(item.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={handleAddMedicineRow}
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                      >
                        <Plus size={13} /> Add Medicine Item
                      </button>
                      <span className="text-xs font-extrabold text-slate-700">
                        Total Medicines: ₹{totalMedicineAmount}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. DIET, OTHER CHARGES, AND DISCOUNT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-white flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Diet & Nutrition Fee</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      value={dietFee}
                      onChange={(e) => setDietFee(Math.max(0, Number(e.target.value)))}
                      className="w-24 rounded-lg border border-slate-300 px-2.5 py-1 text-right text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 bg-white flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Other Clinic Charges</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      value={otherCharges}
                      onChange={(e) => setOtherCharges(Math.max(0, Number(e.target.value)))}
                      className="w-24 rounded-lg border border-slate-300 px-2.5 py-1 text-right text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* DISCOUNT ROW */}
              <div className="rounded-xl border border-dashed border-red-200 bg-red-50/50 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent size={15} className="text-red-600" />
                  <span className="text-xs font-bold text-red-700">Special Discount (₹)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Reason (Optional)"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="w-36 rounded-lg border border-red-200 px-2 py-1 text-xs text-slate-700 bg-white"
                  />
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-20 rounded-lg border border-red-300 px-2 py-1 text-right text-xs font-bold text-red-700 bg-white"
                  />
                </div>
              </div>

              {/* 4. PAYMENT MODE SELECTION */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Select Payment Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "Counter UPI", label: "Counter UPI", icon: QrCode },
                    { id: "Cash", label: "Cash", icon: Banknote },
                    { id: "Card", label: "Card / POS", icon: CreditCard },
                    { id: "Google Pay", label: "UPI Direct", icon: QrCode },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const active = paymentMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPaymentMode(mode.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          active
                            ? "border-sky-600 bg-sky-50 text-sky-800 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon size={17} className={active ? "text-sky-600" : "text-slate-400"} />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. SUMMARY FOOTER & SUBMIT */}
              <div className="rounded-2xl bg-slate-900 text-white p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    Total Amount Due
                  </span>
                  <span className="text-2xl font-black text-emerald-400">
                    ₹{grandTotalDue.toFixed(2)}
                  </span>
                  {discount > 0 && (
                    <span className="text-[11px] text-red-300 block">
                      (₹{discount} discount applied)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>{isSubmitting ? "Recording..." : "Confirm & Generate Bill"}</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================
              STEP 2: OFFICIAL CLINIC INVOICE & RECEIPT VIEW
              (Matches attached media_1794005339043_6552cf8e.jpg exactly)
             ======================================================== */}
          {currentStep === "invoice_receipt" && (
            <div className="p-6 bg-white max-h-[85vh] overflow-y-auto">

              {/* RECEIPT PAPER CONTAINER */}
              <div
                id="official-invoice-print-area"
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs font-sans print:p-0 print:border-none print:shadow-none"
              >

                {/* 1. TOP HEADER: LOGO LEFT, CONTACT INFO RIGHT */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {/* Official Spiritual Homeopathy Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/assets/SH logo.png"
                      alt="Spiritual Homeopathy Logo"
                      className="h-12 w-auto object-contain"
                    />
                  </div>

                  <div className="text-right text-[11px] font-semibold text-slate-600 leading-tight">
                    <div>spiritualhomeoclinic.com</div>
                    <div className="text-slate-500">support@spiritualhomeoclinic.com</div>
                  </div>
                </div>

                {/* 2. BRIGHT GREEN HORIZONTAL ACCENT BAR */}
                <div className="h-1 bg-[#84cc16] w-full my-4 rounded-full" />

                {/* 3. TITLE & RECEIPT BADGE */}
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-lg font-black tracking-tight text-slate-900">
                    PAYMENT RECEIPT
                  </h1>
                  <span className="rounded-full bg-sky-50 px-3 py-0.5 text-[11px] font-black tracking-wider text-sky-600 border border-sky-100 uppercase">
                    RECEIPT
                  </span>
                </div>

                {/* 4. PATIENT DETAILS SECTION */}
                <div className="mb-5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    PATIENT DETAILS
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 text-xs">
                    {/* Left Column */}
                    <div className="space-y-2">
                      <div className="pb-1.5 border-b border-slate-100">
                        <div className="text-[10px] font-extrabold uppercase text-slate-400">PATIENT NAME</div>
                        <div className="font-extrabold text-slate-900 text-sm capitalize">
                          {activeInvoice.patientName}
                        </div>
                      </div>

                      <div className="pb-1.5 border-b border-slate-100">
                        <div className="text-[10px] font-extrabold uppercase text-slate-400">CONSULTANT DOCTOR</div>
                        <div className="font-extrabold text-slate-900">
                          {activeInvoice.doctorName || "Dr. Prashanth K Vaidya"}
                        </div>
                      </div>

                      <div className="pb-1">
                        <div className="text-[10px] font-extrabold uppercase text-slate-400">APPOINTMENT SCHEDULE</div>
                        <div className="font-extrabold text-slate-900">
                          {activeInvoice.appointmentDate || new Date().toISOString().slice(0, 10)}
                          {activeInvoice.timeSlot ? ` at ${activeInvoice.timeSlot}` : " at 02:30 PM"}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2">
                      <div className="pb-1.5 border-b border-slate-100">
                        <div className="text-[10px] font-extrabold uppercase text-slate-400">PHONE NUMBER</div>
                        <div className="font-extrabold text-slate-900">
                          +91 {cleanPhone || "9248868597"}
                        </div>
                      </div>

                      <div className="pb-1.5 border-b border-slate-100">
                        <div className="text-[10px] font-extrabold uppercase text-slate-400">CLINIC BRANCH</div>
                        <div className="font-extrabold text-slate-900">
                          {activeInvoice.branch || "KPHB Branch"}
                        </div>
                      </div>

                      <div className="pb-1">
                        <div className="text-[10px] font-extrabold uppercase text-slate-400">SPECIALTY</div>
                        <div className="font-extrabold text-slate-900">
                          Homeopathy
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. PAYMENT INFORMATION BOX (Dashed border, light green background) */}
                <div className="mb-5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    PAYMENT INFORMATION
                  </div>

                  <div className="rounded-xl border-2 border-dashed border-[#86efac] bg-[#f0fdf4] p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        TOTAL AMOUNT PAID
                      </div>
                      <div className="text-3xl font-black text-emerald-600 tracking-tight mt-0.5">
                        ₹{displayTotal}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="inline-flex items-center gap-1 rounded-full bg-[#22c55e] px-3.5 py-1 text-xs font-black text-white shadow-xs">
                        <span>PAID ✓</span>
                      </div>
                      <div className="text-[10px] font-black uppercase text-emerald-800 tracking-wide mt-1.5">
                        VIA {displayPaymentMode}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. FEE BREAKDOWN TABLE */}
                <div className="mb-5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    FEE BREAKDOWN
                  </div>

                  <div className="border-t border-b border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase">
                          <th className="py-2 font-black">DESCRIPTION</th>
                          <th className="py-2 text-right font-black">AMOUNT (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                        {/* Consultation fee if included */}
                        {Number(activeInvoice.consultationFee) > 0 && (
                          <tr>
                            <td className="py-2.5">Consultation Fee</td>
                            <td className="py-2.5 text-right font-black text-slate-900">
                              ₹{Number(activeInvoice.consultationFee).toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {/* Medicine Items itemized or grouped with duration */}
                        {activeInvoice.medicines && activeInvoice.medicines.length > 0 ? (
                          activeInvoice.medicines.map((m, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5">
                                {m.name || "Prescribed Medicine"} {m.type ? `(${m.type})` : ""} {m.timing ? `- ${m.timing}` : ""}
                              </td>
                              <td className="py-2.5 text-right font-black text-slate-900">
                                ₹{Number(m.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : Number(activeInvoice.medicineFee) > 0 ? (
                          <tr>
                            <td className="py-2.5">
                              Medicine Fee ({activeInvoice.medicineDuration || "1 Month"})
                            </td>
                            <td className="py-2.5 text-right font-black text-slate-900">
                              ₹{Number(activeInvoice.medicineFee).toFixed(2)}
                            </td>
                          </tr>
                        ) : null}

                        {/* Diet plan fee */}
                        {Number(activeInvoice.dietFee || activeInvoice.dietPlanFee) > 0 && (
                          <tr>
                            <td className="py-2.5">Diet & Nutrition Plan</td>
                            <td className="py-2.5 text-right font-black text-slate-900">
                              ₹{Number(activeInvoice.dietFee || activeInvoice.dietPlanFee).toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {/* Other charges */}
                        {Number(activeInvoice.otherCharges) > 0 && (
                          <tr>
                            <td className="py-2.5">Other Clinic Charges</td>
                            <td className="py-2.5 text-right font-black text-slate-900">
                              ₹{Number(activeInvoice.otherCharges).toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {/* Discount */}
                        {Number(activeInvoice.discount) > 0 && (
                          <tr className="text-red-600">
                            <td className="py-2">
                              Discount ({activeInvoice.discountReason || "Special Waiver"})
                            </td>
                            <td className="py-2 text-right font-black">
                              - ₹{Number(activeInvoice.discount).toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {/* TOTAL PAID ROW */}
                        <tr className="border-t-2 border-slate-900 text-slate-900">
                          <td className="py-2.5 font-black uppercase text-xs">
                            TOTAL PAID ({displayPaymentMode})
                          </td>
                          <td className="py-2.5 text-right font-black text-sm">
                            ₹{displayTotal}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 7. RECEIPT METADATA & DISCLAIMER */}
                <div className="text-[10px] text-slate-400 font-medium space-y-1 mb-4">
                  <div>
                    Payment ID: <span className="font-mono text-slate-600">{activeInvoice.invoiceId || "WALKIN_COUNTER_UPI"}</span>
                  </div>
                  <div>
                    Issued At: {formattedIssuedDate}
                  </div>
                  <div className="text-center pt-2 text-[10px] text-slate-400 italic">
                    This is a computer generated bill. No signature is required.
                  </div>
                </div>

                {/* 8. BOTTOM GREEN FOOTER BAR */}
                <div className="rounded-lg bg-[#84cc16] px-4 py-2 text-white flex flex-wrap items-center justify-between text-[11px] font-extrabold tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="fill-white" />
                    <span>9030176176</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Mail size={12} />
                    <span>support@spiritualhomeoclinic.com</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Globe size={12} />
                    <span>spiritualhomeoclinic.com</span>
                  </div>

                  <div className="flex items-center gap-1.5 uppercase">
                    <MapPin size={12} />
                    <span>{activeInvoice.branch || "KPHB BRANCH"}</span>
                  </div>
                </div>

              </div>

              {/* CLOSE BUTTON AT BOTTOM OF MODAL */}
              <div className="mt-5 flex justify-end no-print">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-100 px-5 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  Close & Return
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default FeeCheckoutAndInvoiceModal;

