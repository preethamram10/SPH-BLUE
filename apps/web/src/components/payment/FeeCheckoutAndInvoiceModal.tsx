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
  Smartphone,
  Layers,
  ArrowRight,
  Calendar,
  User,
  Phone,
  FileText,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Stethoscope,
  Mail,
  Globe,
  RefreshCw,
  AlertTriangle,
  Upload,
  ExternalLink,
  Camera,
} from "lucide-react";
import { RazorpayQRModal } from "./RazorpayQRModal";
import { POPULAR_HOMEOPATHY_REMEDIES } from "../patient-file/PatientFileWebView";
import { generate30DayDietSchedule, DayDietPlan } from "../patient-file/dietPlanData";
import { getBranchPhone } from "../../app/reception/medical-requests/pdf/generateMedicineRequestPDF";

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
  hasPackage?: boolean;
  packageId?: string;
  packageName?: string;
  packageTotalAmount?: number;
  packagePaidAmount?: number;
  packagePendingAmount?: number;
  packageDurationMonths?: number;
  packageEndDate?: string;
  packageInstallmentPaid?: number;
  payLaterAmount?: number;
  pendingBalance?: number;
  previousDuePaid?: number;
  prescriptionText?: string;
  prescriptionPdfUrl?: string;
  consultationDetails?: any;
  diagnosis?: string;
  dietPlan?: string;
}

export interface FeeCheckoutModalProps {
  isOpen: boolean;
  appointment: PatientAppointment | null;
  onClose: () => void;
  onSubmitPayment?: (invoiceData: any) => Promise<{ success: boolean; invoiceId?: string; appointment?: any }>;
  onOpenPatientFile?: () => void;
}

export const FeeCheckoutAndInvoiceModal: React.FC<FeeCheckoutModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onSubmitPayment,
  onOpenPatientFile,
}) => {
  // View state: 'collect_fee' vs 'invoice_receipt'
  const [currentStep, setCurrentStep] = useState<"collect_fee" | "invoice_receipt">("collect_fee");

  // --- FORM INPUT STATES ---
  const [consultationFee, setConsultationFee] = useState<number>(0);
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

  const [includeDietFee, setIncludeDietFee] = useState<boolean>(false);
  const [dietFee, setDietFee] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<string>("Counter UPI");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // Package member installment state - strictly based on Patient File registration
  const isPackageMember = Boolean(
    appointment?.hasPackage ||
    (appointment?.packageTotalAmount && appointment.packageTotalAmount > 0) ||
    (appointment as any)?.activePackage
  );
  const pkgTotal = appointment?.packageTotalAmount ?? (appointment as any)?.activePackage?.totalAmount ?? 0;
  const pkgPaid = appointment?.packagePaidAmount ?? (appointment as any)?.activePackage?.paidAmount ?? 0;
  const pkgPending = typeof appointment?.packagePendingAmount === "number"
    ? appointment.packagePendingAmount
    : (typeof (appointment as any)?.activePackage?.pendingAmount === "number"
      ? (appointment as any).activePackage.pendingAmount
      : Math.max(0, pkgTotal - pkgPaid));
  const pkgName = appointment?.packageName || (appointment as any)?.activePackage?.packageName || `${appointment?.packageDurationMonths || 3} Months Treatment Package`;
  const pkgEndDate = appointment?.packageEndDate || (appointment as any)?.activePackage?.endDate || "N/A";

  const [billingMode, setBillingMode] = useState<"package" | "regular">("regular");
  const isPackageMode = isPackageMember && billingMode === "package";
  const [packageInstallmentAmount, setPackageInstallmentAmount] = useState<number>(0);

  // Diet plan state from patient file - Diet Fee is ONLY enabled if prescribed in Patient File
  const hasPrescribedDiet = Boolean(
    (appointment?.dietPlan &&
      typeof appointment.dietPlan === "string" &&
      appointment.dietPlan.trim().length > 0) ||
    Number(appointment?.dietPlanFee || (appointment as any)?.dietFee || 0) > 0
  );
  const rawDietFee = Number(appointment?.dietPlanFee ?? (appointment as any)?.dietFee ?? 0);
  const canChargeDiet = hasPrescribedDiet && rawDietFee > 0;

  // Target Total Amount & Payment Type Mode (Matching Mobile App - Default: Consultation & Medicine)
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<"consultation" | "consult_and_med" | "split" | "package">("consult_and_med");
  const [showDetailedMedicines, setShowDetailedMedicines] = useState<boolean>(false);

  // Mandatory Prescription Image State & Check
  const [currentRxImages, setCurrentRxImages] = useState<string[]>(appointment?.prescriptionImages || []);
  const [isUploadingRx, setIsUploadingRx] = useState<boolean>(false);
  const rxImages = currentRxImages.length > 0 ? currentRxImages : (appointment?.prescriptionImages || []);
  const hasPrescription =
    rxImages.length > 0 ||
    Boolean(appointment?.hasPackage);

  // --- PAY LATER STATES ---
  const [isPayLater, setIsPayLater] = useState<boolean>(false);
  const [isPayLaterModalOpen, setIsPayLaterModalOpen] = useState<boolean>(false);
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [payLaterNotes, setPayLaterNotes] = useState<string>("");
  const [previousPendingBalance, setPreviousPendingBalance] = useState<number>(0);
  const [includePreviousDue, setIncludePreviousDue] = useState<boolean>(false);

  // Completed Invoice State for Receipt View
  const [completedInvoice, setCompletedInvoice] = useState<PatientAppointment | null>(appointment);

  useEffect(() => {
    if (isOpen && appointment) {
      setCompletedInvoice(appointment);
      setCurrentRxImages(appointment.prescriptionImages || []);
      const isPaid = Boolean(
        appointment.isFeeCollected ||
        appointment.status === "COMPLETED" ||
        (appointment.totalPaid !== undefined && appointment.totalPaid > 0)
      );
      setCurrentStep(isPaid ? "invoice_receipt" : "collect_fee");

      const consult = typeof appointment.consultationFee === "number" && appointment.consultationFee > 0 ? appointment.consultationFee : 0;
      const medFee = typeof appointment.medicineFee === "number" ? appointment.medicineFee : 0;
      const initialTarget = consult + medFee;
      setTargetAmount(initialTarget);
      setConsultationFee(consult);
      setIncludeConsultFee(consult > 0);
      setMedicineDuration(appointment.medicineDuration || "1 Month");

      const meds = appointment.medicines || appointment.medicinesList || [];
      if (meds.length > 0) {
        setMedicineItems(meds);
        setIncludeMedicineFee(true);
        setShowDetailedMedicines(true);
      } else if (appointment.prescriptionText && typeof appointment.prescriptionText === "string") {
        const remedyLines = appointment.prescriptionText
          .split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.includes("|") || l.includes("Timing:"));
        if (remedyLines.length > 0) {
          const parsed = remedyLines.map((line: string, idx: number) => {
            const parts = line.split("|").map((p: string) => p.trim());
            const namePart = parts[0]?.replace(/^\d+[\.\)]\s*/, "").trim() || "";
            let type = "Pills";
            const typeMatch = namePart.match(/\((.*?)\)/);
            if (typeMatch) type = typeMatch[1];
            const cleanName = namePart.replace(/\(.*?\)/, "").trim();

            let timing = "M - N - N";
            const timingPart = parts.find((p: string) => p.toLowerCase().includes("timing:"));
            if (timingPart) {
              timing = timingPart.replace(/timing:\s*/i, "").trim();
            }

            return {
              id: String(idx + 1),
              name: cleanName,
              type,
              timing,
              amount: idx === 0 && medFee > 0 ? medFee : 0,
            };
          });
          setMedicineItems(parsed);
          setIncludeMedicineFee(true);
          setShowDetailedMedicines(true);
        } else {
          setMedicineItems([
            {
              id: "1",
              name: "",
              type: "Pills",
              timing: "M - N - N",
              amount: medFee > 0 ? medFee : 0,
            },
          ]);
          setIncludeMedicineFee(medFee > 0);
          setShowDetailedMedicines(false);
        }
      } else {
        setMedicineItems([
          {
            id: "1",
            name: "",
            type: "Pills",
            timing: "M - N - N",
            amount: medFee > 0 ? medFee : 0,
          },
        ]);
        setIncludeMedicineFee(medFee > 0);
        setShowDetailedMedicines(false);
      }

      // Diet plan fee: ONLY enable and prefill if entered and saved in Patient File
      if (canChargeDiet) {
        setDietFee(rawDietFee);
        setIncludeDietFee(true);
      } else {
        setDietFee(0);
        setIncludeDietFee(false);
      }
      setOtherCharges(appointment.otherCharges ?? 0);
      setDiscount(appointment.discount ?? 0);
      setDiscountReason(appointment.discountReason || "");
      setPaymentMode(appointment.paymentMode || appointment.paymentMethod || "Counter UPI");
      setIsPayLater(false);
      setPayLaterNotes("");
      setIncludePreviousDue(false);

      // Check previous pending balance from database
      const cleanP = (appointment.phoneNumber || appointment.phone || "").replace(/\D/g, "").slice(-10);
      if (cleanP) {
        fetch(`/api/pay-later?phone=${cleanP}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && typeof data.pendingTotal === "number" && data.pendingTotal > 0) {
              setPreviousPendingBalance(data.pendingTotal);
            } else {
              setPreviousPendingBalance(0);
            }
          })
          .catch(() => setPreviousPendingBalance(0));
      } else {
        setPreviousPendingBalance(0);
      }

      if (isPackageMember) {
        setBillingMode("package");
        setPaymentType("package");
        setIncludeConsultFee(false);
        setConsultationFee(0);
        setIncludeMedicineFee(false);
        setIncludeDietFee(false);
        setPackageInstallmentAmount(pkgPending > 0 ? pkgPending : 0);
      } else {
        setBillingMode("regular");
        setPaymentType("consult_and_med");
        setConsultationFee(initialTarget);
        setIncludeConsultFee(true);
        setIncludeMedicineFee(false);
        if (meds.length <= 1) {
          setMedicineItems([
            {
              id: "1",
              name: (meds[0] && meds[0].name) || "",
              type: (meds[0] && meds[0].type) || "Pills",
              timing: (meds[0] && meds[0].timing) || "M - N - N",
              amount: initialTarget,
            },
          ]);
        }
      }
    }
  }, [isOpen, appointment]);

  const handleDirectRxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appointment) return;
    setIsUploadingRx(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = ev.target?.result as string;
        if (!base64Data) {
          setIsUploadingRx(false);
          return;
        }

        // Upload to S3 / API
        const upRes = await fetch("/api/patient-file/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: base64Data, contentType: file.type || "image/jpeg" }),
        });
        const upData = await upRes.json();
        const uploadedUrl = upData.url || base64Data;

        // Persist to patient-file
        const updatedList = [...(currentRxImages || []), uploadedUrl];
        await fetch("/api/patient-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: appointment.id,
            prescriptionImages: updatedList,
          }),
        });

        setCurrentRxImages(updatedList);
        setIsUploadingRx(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert("Failed to upload prescription image: " + err.message);
      setIsUploadingRx(false);
    }
  };

  const handleRefreshRx = async () => {
    if (!appointment?.id) return;
    try {
      const res = await fetch(`/api/patient-file?id=${encodeURIComponent(appointment.id)}`);
      const data = await res.json();
      if (data.success && data.patient && Array.isArray(data.patient.prescriptionImages)) {
        setCurrentRxImages(data.patient.prescriptionImages);
      }
    } catch (_) {}
  };

  // Adjust Fees Based on Target Amount change
  const handleTargetAmountChange = (val: number) => {
    setTargetAmount(val);
    if (paymentType === "consultation" || paymentType === "consult_and_med") {
      setConsultationFee(val);
      setIncludeConsultFee(true);
      setIncludeMedicineFee(false);
      if (paymentType === "consult_and_med" && medicineItems.length <= 1) {
        setMedicineItems([{ ...(medicineItems[0] || { id: "1", name: "", type: "Pills", timing: "M - N - N" }), amount: val }]);
      }
    } else if (paymentType === "split") {
      const half = Math.round(val / 2);
      setConsultationFee(half);
      setIncludeConsultFee(true);
      setIncludeMedicineFee(true);
      if (medicineItems.length <= 1) {
        setMedicineItems([{ ...(medicineItems[0] || { id: "1", name: "", type: "Pills", timing: "M - N - N" }), amount: val - half }]);
      }
    }
  };

  // Adjust Fees Based on Payment Type
  const handlePaymentTypeChange = (type: "consultation" | "consult_and_med" | "split" | "package") => {
    if (type === "package" && !isPackageMember) return;
    setPaymentType(type);
    if (type === "package") {
      setBillingMode("package");
      setIncludeConsultFee(false);
      setConsultationFee(0);
      setIncludeMedicineFee(false);
      setIncludeDietFee(false);
      if (!packageInstallmentAmount) {
        setPackageInstallmentAmount(pkgPending > 0 ? pkgPending : 0);
      }
      return;
    }

    setBillingMode("regular");
    const target = targetAmount || 0;
    if (type === "consultation") {
      setIncludeConsultFee(true);
      setConsultationFee(target);
      setIncludeMedicineFee(false);
    } else if (type === "consult_and_med") {
      setIncludeConsultFee(true);
      setConsultationFee(target);
      setIncludeMedicineFee(false);
      if (medicineItems.length <= 1) {
        setMedicineItems([{ ...(medicineItems[0] || { id: "1", name: "", type: "Pills", timing: "M - N - N" }), amount: target }]);
      }
    } else if (type === "split") {
      setIncludeConsultFee(true);
      setIncludeMedicineFee(true);
      const half = Math.round(target / 2);
      setConsultationFee(half);
      if (medicineItems.length <= 1) {
        setMedicineItems([{ ...(medicineItems[0] || { id: "1", name: "", type: "Pills", timing: "M - N - N" }), amount: target - half }]);
      }
    }
  };

  const handleConsultFeeChange = (val: number) => {
    const target = targetAmount || 0;
    if (paymentType === "split") {
      const clampedConsult = Math.max(0, Math.min(val, target));
      setConsultationFee(clampedConsult);
      const remainingMed = Math.max(0, target - clampedConsult);
      if (medicineItems.length <= 1) {
        setMedicineItems([{ ...(medicineItems[0] || { id: "1", name: "", type: "Pills", timing: "M - N - N" }), amount: remainingMed }]);
      } else {
        const diff = remainingMed - totalMedicineAmount;
        setMedicineItems((prev) =>
          prev.map((m, idx) => (idx === 0 ? { ...m, amount: Math.max(0, (Number(m.amount) || 0) + diff) } : m))
        );
      }
      return;
    }
    const clampedVal = target > 0 ? Math.min(val, target) : val;
    setConsultationFee(clampedVal);
  };

  const handleMedicineFeeInputChange = (val: number) => {
    const target = targetAmount || 0;
    if (paymentType === "split") {
      const clampedMed = Math.max(0, Math.min(val, target));
      const remainingConsult = Math.max(0, target - clampedMed);
      setConsultationFee(remainingConsult);
      if (medicineItems.length <= 1) {
        setMedicineItems([{ ...(medicineItems[0] || { id: "1", name: "", type: "Pills", timing: "M - N - N" }), amount: clampedMed }]);
      } else {
        const diff = clampedMed - totalMedicineAmount;
        setMedicineItems((prev) =>
          prev.map((m, idx) => (idx === 0 ? { ...m, amount: Math.max(0, (Number(m.amount) || 0) + diff) } : m))
        );
      }
      return;
    }
    const effectiveVal = target > 0 ? Math.min(val, target) : val;
    if (medicineItems.length <= 1) {
      setMedicineItems([{ ...(medicineItems[0] || { id: "1", name: "", type: "Pills", timing: "M - N - N" }), amount: effectiveVal }]);
    }
  };

  // Toggling Consultation checkbox
  const handleToggleConsult = (checked: boolean) => {
    setIncludeConsultFee(checked);
    const target = targetAmount || 0;
    if (!checked) {
      setConsultationFee(0);
      if (includeMedicineFee) {
        if (medicineItems.length <= 1) {
          setMedicineItems([{ ...medicineItems[0], amount: target }]);
        }
      }
    } else {
      if (includeMedicineFee) {
        const half = Math.round(target / 2);
        setConsultationFee(half);
        if (medicineItems.length <= 1) {
          setMedicineItems([{ ...medicineItems[0], amount: target - half }]);
        }
      } else {
        setConsultationFee(target);
      }
    }
  };

  // Toggling Medicine checkbox
  const handleToggleMedicine = (checked: boolean) => {
    setIncludeMedicineFee(checked);
    const target = targetAmount || 0;
    if (!checked) {
      if (includeConsultFee) {
        setConsultationFee(target);
      }
    } else {
      if (includeConsultFee) {
        const half = Math.round(target / 2);
        setConsultationFee(half);
        if (medicineItems.length <= 1) {
          setMedicineItems([{ ...medicineItems[0], amount: target - half }]);
        }
      } else {
        if (medicineItems.length <= 1) {
          setMedicineItems([{ ...medicineItems[0], amount: target }]);
        }
      }
    }
  };

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
    const dFee = (!isPackageMode && canChargeDiet && includeDietFee) ? Number(dietFee) || 0 : 0;
    const oFee = Number(otherCharges) || 0;
    const prevFee = includePreviousDue ? Number(previousPendingBalance) || 0 : 0;
    return cFee + mFee + dFee + oFee + prevFee;
  }, [includeConsultFee, consultationFee, totalMedicineAmount, canChargeDiet, includeDietFee, dietFee, isPackageMode, otherCharges, includePreviousDue, previousPendingBalance]);

  const grandTotalDue = useMemo(() => {
    if (isPackageMode) {
      return Number(packageInstallmentAmount) || 0;
    }
    return Math.max(0, subTotalAmount - (Number(discount) || 0));
  }, [isPackageMode, packageInstallmentAmount, subTotalAmount, discount]);

  // Auto-sync amountPaidNow when grandTotalDue changes if pay later is not customized
  useEffect(() => {
    if (!isPayLater) {
      setAmountPaidNow(grandTotalDue);
    }
  }, [grandTotalDue, isPayLater]);

  const effectivePaidToday = isPayLater ? Math.min(grandTotalDue, Number(amountPaidNow) || 0) : grandTotalDue;
  const calculatedPayLater = isPayLater ? Math.max(0, grandTotalDue - effectivePaidToday) : 0;

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
    let finalValue = value;
    if (field === "amount") {
      const num = Math.max(0, Number(value) || 0);
      const target = targetAmount || 0;
      if (target > 0) {
        const maxAllowed = paymentType === "split" && includeConsultFee
          ? Math.max(0, target - consultationFee)
          : target;
        const otherItemsSum = medicineItems
          .filter((m) => m.id !== id)
          .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
        finalValue = Math.min(num, Math.max(0, maxAllowed - otherItemsSum));
      } else {
        finalValue = num;
      }
    }
    setMedicineItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: finalValue } : m))
    );
  };

  // --- RAZORPAY CARD GATEWAY HANDLER ---
  const handleOpenRazorpayCard = async (customAmount?: number) => {
    if (!appointment) return;
    const chargeAmount = typeof customAmount === "number" && customAmount > 0 ? customAmount : effectivePaidToday;
    setIsCardProcessing(true);
    try {
      const res = await fetch("/api/reception/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          amount: chargeAmount,
          patientName: appointment.patientName,
          phone: appointment.phoneNumber || appointment.phone,
          description: `Card payment for ${appointment.patientName || "Patient"}`,
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
        description: `Fee Collection Card - ${appointment.patientName || "Patient"}`,
        order_id: orderData.orderId,
        prefill: {
          name: appointment.patientName || "",
          contact: (appointment.phoneNumber || appointment.phone || "").replace(/\D/g, "").slice(-10),
        },
        theme: { color: "#0284c7" },
        handler: async function (response: any) {
          alert(`Razorpay Card Payment of ₹${chargeAmount} authorized! Ref ID: ${response.razorpay_payment_id}`);
          if (paymentMode === "Split") {
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

  // --- CONFIRM PAYMENT HANDLER ---
  const handleConfirmPayment = async (overrideMode?: string) => {
    if (!appointment) return;

    if (!hasPrescription) {
      alert("Prescription is mandatory to collect fee. Please upload or save the prescription in the patient file first.");
      return;
    }

    const calculatedPreviousDue = includePreviousDue ? Number(previousPendingBalance) || 0 : 0;
    const effectiveMode = overrideMode || paymentMode;

    if (effectiveMode === "Split") {
      const activeCash = optedSplitModes.includes("cash") ? (splitCash || 0) : 0;
      const activeCounterUpi = optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0;
      const activeUpi = optedSplitModes.includes("upi") ? (splitUpi || 0) : 0;
      const activeCard = optedSplitModes.includes("card") ? (splitCard || 0) : 0;
      const splitAllocated = activeCash + activeCounterUpi + activeUpi + activeCard;

      if (splitAllocated !== effectivePaidToday) {
        alert(
          `Split payment amounts (₹${splitAllocated}) must equal the amount paid today (₹${effectivePaidToday}). Difference: ₹${Math.abs(effectivePaidToday - splitAllocated)}.`
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
      const generatedInvoiceId =
        appointment.invoiceId || `INV-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();
      const phoneNum = (appointment.phoneNumber || appointment.phone || "").replace(/\D/g, "").slice(-10);

      const validWebMeds = (Array.isArray(medicineItems) ? medicineItems : []).filter(
        (m) =>
          (m.name && m.name.trim().length > 0) ||
          Number(m.amount) > 0 ||
          (m.type && m.type.toLowerCase() === "reserve") ||
          (m.timing && m.timing.toLowerCase() === "reserve")
      );
      const webMedsToSend = validWebMeds.length > 0
        ? validWebMeds
        : (!isPackageMode && (includeMedicineFee || paymentType === "consult_and_med") ? medicineItems : []);

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
        consultationFee: isPackageMode ? 0 : (includeConsultFee ? Number(consultationFee) || 0 : 0),
        medicineFee: isPackageMode ? 0 : totalMedicineAmount,
        medicineDuration: (!isPackageMode && (includeMedicineFee || paymentType === "consult_and_med")) ? medicineDuration : undefined,
        medicines: webMedsToSend,
        medicinesList: webMedsToSend,
        dietFee: isPackageMode ? 0 : (canChargeDiet && includeDietFee ? (Number(dietFee) || 0) : 0),
        dietPlanFee: isPackageMode ? 0 : (canChargeDiet && includeDietFee ? (Number(dietFee) || 0) : 0),
        otherCharges: Number(otherCharges) || 0,
        discount: (!isPackageMode) ? (Number(discount) || 0) : 0,
        discountReason: (!isPackageMode) ? (discountReason || undefined) : undefined,
        totalPaid: effectivePaidToday,
        totalAmountDue: grandTotalDue,
        payLaterAmount: calculatedPayLater,
        previousDuePaid: calculatedPreviousDue,
        dueDate: isPayLater ? new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] : undefined,
        payLaterNotes: isPayLater ? payLaterNotes : undefined,
        hasPackage: isPackageMode,
        prescriptionImages: rxImages,
        isRegularBilling: !isPackageMode,
        skipPackagePayment: !isPackageMode,
        packageInstallmentPaid: isPackageMode ? effectivePaidToday : undefined,
        paymentMode: effectiveMode,
        paymentMethod: effectiveMode,
        splitDetails: effectiveMode === "Split" ? {
          upi: optedSplitModes.includes("upi") ? splitUpi : 0,
          cash: optedSplitModes.includes("cash") ? splitCash : 0,
          card: optedSplitModes.includes("card") ? splitCard : 0,
          counterUpi: optedSplitModes.includes("counterUpi") ? splitCounterUpi : 0,
          upiTxId: splitUpiRef || undefined,
          cardTxId: splitCardRef || undefined,
        } : undefined,
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

    const targetBranch = activeInvoice.branch || appointment?.branch || "KPHB Branch";
    const branchPhone = getBranchPhone(targetBranch);

    const rawMeds = activeInvoice.medicines || activeInvoice.medicinesList || [];
    const validReceiptMeds = Array.isArray(rawMeds)
      ? rawMeds.filter((m: any) => m && ((m.name && m.name.trim().length > 0) || Number(m.amount) > 0 || m.type || m.timing))
      : [];
    const medsBreakdown = validReceiptMeds.length > 0
      ? validReceiptMeds.map((m: any) => `• ${m.name || (m.type === "Reserve" ? "Reserve Medicine" : "Medicine")} (${m.type || "Pills"}${m.timing ? ` - ${m.timing}` : ""}): ₹${Number(m.amount || 0).toFixed(2)}\n`).join("")
      : (Number(activeInvoice.medicineFee) > 0
        ? `• Medicine Fee (${activeInvoice.medicineDuration || "1 Month"}): ₹${Number(activeInvoice.medicineFee).toFixed(2)}\n`
        : "");

    const message = encodeURIComponent(
      `*SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT*\n` +
      `--------------------------------\n` +
      `Receipt No: ${invoiceNum}\n` +
      `Patient Name: ${activeInvoice.patientName}\n` +
      `Phone: +91 ${phone}\n` +
      `Doctor: ${activeInvoice.doctorName || "Dr. Prashanth K Vaidya"}\n` +
      `Branch: ${targetBranch}\n` +
      `Schedule: ${dateStr}${timeStr}\n` +
      `Specialty: Homeopathy\n` +
      `--------------------------------\n` +
      `*TOTAL AMOUNT PAID: ₹${totalPaidNum}*\n` +
      `Payment Mode: VIA ${formatPaymentModeForInvoice(activeInvoice.paymentMode || paymentMode)}\n` +
      `Payment Status: ${Number(activeInvoice.payLaterAmount) > 0 ? "PARTIAL PAID" : "PAID ✓"}\n` +
      (Number(activeInvoice.payLaterAmount) > 0
        ? `*Remaining Need to Pay (Pay Later): ₹${Number(activeInvoice.payLaterAmount).toFixed(2)}*\n`
        : "") +
      `--------------------------------\n` +
      `*Fee Breakdown:*\n` +
      (Number(activeInvoice.consultationFee) > 0
        ? `• Consultation Fee: ₹${Number(activeInvoice.consultationFee).toFixed(2)}\n`
        : "") +
      medsBreakdown +
      (Number(activeInvoice.dietFee || activeInvoice.dietPlanFee) > 0
        ? `• Diet Plan: ₹${Number(activeInvoice.dietFee || activeInvoice.dietPlanFee).toFixed(2)}\n`
        : "") +
      (Number(activeInvoice.otherCharges) > 0
        ? `• Other Charges: ₹${Number(activeInvoice.otherCharges).toFixed(2)}\n`
        : "") +
      (Number(activeInvoice.previousDuePaid) > 0
        ? `• Previous Pending Balance Cleared: ₹${Number(activeInvoice.previousDuePaid).toFixed(2)}\n`
        : "") +
      (Number(activeInvoice.discount) > 0
        ? `• Discount Applied: -₹${Number(activeInvoice.discount).toFixed(2)}\n`
        : "") +
      `--------------------------------\n` +
      `Branch Helpline: ${branchPhone} | spiritualhomeo.com\n` +
      `This is a computer-generated bill. No signature is required.`
    );

    window.open(`https://wa.me/91${phone}?text=${message}`, "_blank");
  };

  const formatPaymentModeForInvoice = (mode: string = "") => {
    const upper = (mode || "").toUpperCase();
    if (upper.includes("UPI")) return "UPI";
    if (upper.includes("CASH")) return "CASH";
    if (upper.includes("CARD")) return "CARD";
    return upper || "UPI";
  };

  // Format issued date
  const issuedDateObj = activeInvoice.paidAt ? new Date(activeInvoice.paidAt) : new Date();
  const formattedIssuedDate = `${issuedDateObj.toLocaleDateString("en-GB")}, ${issuedDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}`;

  const displayTotal = Number(
    activeInvoice.totalPaid ?? activeInvoice.totalAmountDue ?? grandTotalDue
  ).toFixed(2);

  const displayPaymentMode = formatPaymentModeForInvoice(activeInvoice.paymentMode || activeInvoice.paymentMethod || paymentMode);

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
          .diet-sheet-page {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 24px;
            padding-top: 16px;
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
                  {currentStep === "collect_fee" ? "Appointment Payment" : "Payment Receipt & Tax Invoice"}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {currentStep === "collect_fee" ? "Review and complete payment • " : ""}{appointment.patientName} • {appointment.doctorName || "Dr. Prashanth K Vaidya"} • {appointment.appointmentDate || ""}
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

              {/* PREVIOUS PENDING BALANCE ALERT (Orange Box) */}
              {previousPendingBalance > 0 && (
                <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-4 shadow-xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                          <span>Previous Visit Pending Balance</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-[10px] font-black text-amber-900">
                            UNPAID DUE
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-amber-900 mt-0.5">
                          Outstanding Due: <span className="text-rose-600 font-black">₹{previousPendingBalance.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-amber-900/90">
                    This patient has an unpaid balance from a previous visit. Choose whether to add it to this bill or leave it for next visit:
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIncludePreviousDue(true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border flex items-center gap-1.5 ${
                        includePreviousDue
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>{includePreviousDue ? "✓" : "○"}</span>
                      <span>Add to Current Bill (+₹{previousPendingBalance.toLocaleString()})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludePreviousDue(false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border flex items-center gap-1.5 ${
                        !includePreviousDue
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>{!includePreviousDue ? "✓" : "○"}</span>
                      <span>Leave for Next Visit</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 1. TARGET AMOUNT BOX */}
              <div className={`rounded-xl border-2 p-3.5 flex items-center justify-between gap-4 transition-all ${isPackageMode ? "bg-slate-50 border-slate-200 opacity-70" : "bg-sky-50/70 border-sky-300"
                }`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-sky-950">Target Amount (Consultation + Medicine):</span>
                    {isPackageMode && (
                      <span className="bg-sky-100 text-sky-700 text-[10px] font-extrabold px-2 py-0.5 rounded">
                        Covered Under Package
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sky-700 mt-0.5 font-medium">
                    {isPackageMode
                      ? "Disabled: Covered by package installment. Tap 'Regular Visit' below to activate target amount."
                      : "Split & presets calculate strictly within this target"}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 rounded-xl border-2 bg-white ${isPackageMode ? "border-slate-300 bg-slate-100" : "border-sky-500 shadow-2xs"
                  }`} style={{ height: "46px", minWidth: "125px" }}>
                  <span className="text-lg font-black text-sky-600">₹</span>
                  <input
                    type="number"
                    disabled={isPackageMode}
                    value={isPackageMode ? 0 : (targetAmount || "")}
                    onChange={(e) => handleTargetAmountChange(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-24 text-right text-lg font-black text-slate-800 bg-transparent focus:outline-none disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* 2. PAYMENT TYPE TABS */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(
                  (isPackageMember
                    ? [
                      { id: "consultation", label: "Consultation" },
                      { id: "consult_and_med", label: "Consultation & Medicine" },
                      { id: "split", label: "Split" },
                      { id: "package", label: "Package" },
                    ]
                    : [
                      { id: "consultation", label: "Consultation" },
                      { id: "consult_and_med", label: "Consultation & Medicine" },
                      { id: "split", label: "Split" },
                    ]
                  ) as Array<{ id: "consultation" | "consult_and_med" | "split" | "package"; label: string }>
                ).map((t) => {
                  const isSelected = paymentType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePaymentTypeChange(t.id)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center justify-center text-center ${isSelected
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* PACKAGE MEMBER BANNER & INSTALLMENT INPUT */}
              {isPackageMember && (
                <div className="rounded-xl border border-sky-300 p-4 bg-linear-to-r from-sky-50 to-blue-50/60 shadow-xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-black uppercase tracking-wider">
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

                  {/* Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBillingMode("package");
                        setIncludeConsultFee(false);
                        setConsultationFee(0);
                        setIncludeMedicineFee(false);
                        setIncludeDietFee(false);
                        if (!packageInstallmentAmount) {
                          setPackageInstallmentAmount(pkgPending > 0 ? pkgPending : 0);
                        }
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${billingMode === "package"
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
                        setIncludeConsultFee(typeof appointment.consultationFee === "number" && appointment.consultationFee > 0);
                        setConsultationFee(typeof appointment.consultationFee === "number" && appointment.consultationFee > 0 ? appointment.consultationFee : 0);
                        setIncludeMedicineFee(true);
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${billingMode === "regular"
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
                        <p className="text-[11px] text-slate-500 mb-2">
                          Normal consultation fee is waived. Enter the installment amount collected for this visit:
                        </p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={packageInstallmentAmount}
                            onChange={(e) => setPackageInstallmentAmount(Math.max(0, Number(e.target.value)))}
                            placeholder="e.g. 2000"
                            className="w-full pl-7 pr-3 py-2 rounded-lg border border-sky-300 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-sky-50/20"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] mt-2 text-slate-600 font-medium">
                          <span>Remaining Balance After Payment:</span>
                          <span className="font-bold text-sky-800">
                            ₹{Math.max(0, pkgPending - (Number(packageInstallmentAmount) || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-sky-200 text-xs text-sky-900">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <span>ℹ️</span>
                        <span>Package Installment Paused for this Visit</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Patient package (<strong>{pkgName}</strong>) remains active on their profile. You can charge regular consultation and prescribed medicines below.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!isPackageMode && (
                <>
                  {/* 3. CONSULTATION FEE CARD (or Consultation & Medicine Fee) */}
                  <div className={`rounded-xl border p-4 transition-all ${includeConsultFee ? "border-sky-300 bg-sky-50/30" : "border-slate-200 bg-slate-50/50"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="incConsult"
                          disabled={paymentType === "consultation" || paymentType === "consult_and_med"}
                          checked={includeConsultFee}
                          onChange={(e) => handleToggleConsult(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                        />
                        <div>
                          <label htmlFor="incConsult" className="text-xs font-black text-slate-800 cursor-pointer block">
                            {paymentType === "consult_and_med" ? "Consultation & Medicine Fee" : "Consultation Fee"}
                          </label>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {paymentType === "consult_and_med"
                              ? "Combined Doctor Consultation & Prescribed Remedies Fee (Locked to Target)"
                              : "Doctor Requested Consultation Fee"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white shadow-2xs">
                        <span className="text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          disabled={!includeConsultFee || paymentType === "consultation" || paymentType === "consult_and_med"}
                          value={consultationFee > 0 ? consultationFee : (paymentType === "consultation" || paymentType === "consult_and_med" ? (targetAmount || 0) : "")}
                          onChange={(e) => handleConsultFeeChange(Math.max(0, Number(e.target.value)))}
                          placeholder="0"
                          className="w-24 text-right text-xs md:text-sm font-black text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* MEDICINE DURATION & DETAILS FOR COMBINED CONSULTATION & MEDICINE */}
                    {paymentType === "consult_and_med" && includeConsultFee && (
                      <div className="mt-4 pt-3 border-t border-sky-200/80">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Prescription Duration:</span>
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

                          {!showDetailedMedicines ? (
                            <button
                              type="button"
                              onClick={() => setShowDetailedMedicines(true)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                            >
                              <Plus size={13} /> Add Medicine Items
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleAddMedicineRow}
                              className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                            >
                              <Plus size={13} /> Add Medicine Item
                            </button>
                          )}
                        </div>

                        {showDetailedMedicines && (
                          <div className="space-y-2">
                            {medicineItems.map((item, idx) => (
                              <div key={item.id || idx} className="flex items-center gap-2">
                                <input
                                  list="web-remedy-datalist"
                                  type="text"
                                  placeholder="Medicine Name (e.g. Arnica)"
                                  value={item.name}
                                  onChange={(e) => handleUpdateMedicine(item.id, "name", e.target.value)}
                                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                                <select
                                  value={item.type || "Pills"}
                                  onChange={(e) => handleUpdateMedicine(item.id, "type", e.target.value)}
                                  className="w-24 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs md:text-sm text-slate-700 font-medium"
                                >
                                  <option value="Pills">Pills</option>
                                  <option value="Drops">Drops</option>
                                  <option value="Dilution">Dilution</option>
                                  <option value="Reserve">Reserve</option>
                                  <option value="Tincture">Tincture</option>
                                  <option value="Syrup">Syrup</option>
                                  <option value="Kit">Kit</option>
                                  <option value="Tablet">Tablet</option>
                                  <option value="Other">Other</option>
                                </select>
                                <select
                                  value={item.timing || "M - N - N"}
                                  onChange={(e) => handleUpdateMedicine(item.id, "timing", e.target.value)}
                                  className="w-28 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs md:text-sm font-bold text-slate-700"
                                >
                                  <option value="M - N - N">M - N - N</option>
                                  <option value="M - A - N">M - A - N</option>
                                  <option value="M - N">M - N</option>
                                  <option value="1 - 0 - 1">1 - 0 - 1</option>
                                  <option value="1 - 1 - 1">1 - 1 - 1</option>
                                  <option value="Reserve">Reserve</option>
                                  <option value="M only">M only</option>
                                  <option value="N only">N only</option>
                                  <option value="SOS">SOS</option>
                                </select>
                                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white w-24">
                                  <span className="text-xs font-bold text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={item.amount !== undefined && item.amount !== 0 ? item.amount : ""}
                                    onChange={(e) => handleUpdateMedicine(item.id, "amount", Math.max(0, Number(e.target.value)))}
                                    className="w-full text-right text-xs md:text-sm font-black text-slate-800 bg-transparent focus:outline-none"
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

                            <div className="flex justify-between items-center pt-1">
                              <button
                                type="button"
                                onClick={() => setShowDetailedMedicines(false)}
                                className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                              >
                                Hide Medicine Details
                              </button>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-extrabold ${medicineItems.reduce((acc, m) => acc + (Number(m.amount) || 0), 0) === (targetAmount || 0) ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" : "text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"}`}>
                                  Total Remedies: ₹{medicineItems.reduce((acc, m) => acc + (Number(m.amount) || 0), 0)} / ₹{targetAmount || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. PRESCRIBED MEDICINES CARD */}
                  {paymentType !== "consult_and_med" && (
                    <div className={`rounded-xl border p-4 transition-all ${includeMedicineFee ? "border-sky-300 bg-sky-50/30" : "border-slate-200 bg-slate-50/50"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="incMed"
                            disabled={paymentType === "consultation"}
                            checked={paymentType === "consultation" ? false : includeMedicineFee}
                            onChange={(e) => handleToggleMedicine(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                          />
                          <div>
                            <label htmlFor="incMed" className="text-xs font-black text-slate-800 cursor-pointer block">
                              Prescribed Homeopathy Medicines
                            </label>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Prescribed Remedies / Pharmacy Fee
                            </p>
                          </div>
                        </div>

                        {includeMedicineFee && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
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

                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white shadow-2xs">
                              <span className="text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                value={totalMedicineAmount > 0 ? totalMedicineAmount : ""}
                                onChange={(e) => handleMedicineFeeInputChange(Math.max(0, Number(e.target.value)))}
                                placeholder="0"
                                className="w-24 text-right text-xs md:text-sm font-black text-slate-800 bg-transparent focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* PRESCRIBED MEDICINE DETAILS / EXPANSION */}
                      {includeMedicineFee && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          {showDetailedMedicines ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-700">
                                  Detailed Medicine Items ({medicineItems.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={handleAddMedicineRow}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                                >
                                  <Plus size={13} /> Add Medicine Item
                                </button>
                              </div>

                              {medicineItems.map((item, idx) => (
                                <div key={item.id || idx} className="flex items-center gap-2">
                                  <input
                                    list="web-remedy-datalist"
                                    type="text"
                                    placeholder="Medicine Name (e.g. Arnica)"
                                    value={item.name}
                                    onChange={(e) => handleUpdateMedicine(item.id, "name", e.target.value)}
                                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs md:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  />
                                  <select
                                    value={item.type || "Pills"}
                                    onChange={(e) => handleUpdateMedicine(item.id, "type", e.target.value)}
                                    className="w-24 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs md:text-sm text-slate-700 font-medium"
                                  >
                                    <option value="Pills">Pills</option>
                                    <option value="Drops">Drops</option>
                                    <option value="Dilution">Dilution</option>
                                    <option value="Reserve">Reserve</option>
                                    <option value="Tincture">Tincture</option>
                                    <option value="Syrup">Syrup</option>
                                    <option value="Kit">Kit</option>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Other">Other</option>
                                  </select>
                                  <select
                                    value={item.timing || "M - N - N"}
                                    onChange={(e) => handleUpdateMedicine(item.id, "timing", e.target.value)}
                                    className="w-28 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs md:text-sm font-bold text-slate-700"
                                  >
                                    <option value="M - N - N">M - N - N</option>
                                    <option value="M - A - N">M - A - N</option>
                                    <option value="M - N">M - N</option>
                                    <option value="1 - 0 - 1">1 - 0 - 1</option>
                                    <option value="1 - 1 - 1">1 - 1 - 1</option>
                                    <option value="Reserve">Reserve</option>
                                    <option value="M only">M only</option>
                                    <option value="N only">N only</option>
                                    <option value="SOS">SOS</option>
                                  </select>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs text-slate-500 font-bold">₹</span>
                                    <input
                                      type="number"
                                      value={item.amount}
                                      onChange={(e) =>
                                        handleUpdateMedicine(item.id, "amount", Math.max(0, Number(e.target.value)))
                                      }
                                      className="w-24 min-w-[80px] rounded-xl border border-slate-300 px-2.5 py-2 text-right text-xs md:text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                              <datalist id="web-remedy-datalist">
                                {POPULAR_HOMEOPATHY_REMEDIES.map((r) => (
                                  <option key={r} value={r} />
                                ))}
                              </datalist>

                              <div className="flex justify-between items-center pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowDetailedMedicines(false)}
                                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                                >
                                  Hide Medicine Item Details
                                </button>
                                <span className="text-xs font-extrabold text-slate-700">
                                  Total Medicines: ₹{totalMedicineAmount}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                {medicineItems.some((m) => m.name)
                                  ? `${medicineItems.filter((m) => m.name).length} remedies loaded`
                                  : "Standard prescription remedies"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowDetailedMedicines(true)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                              >
                                <Plus size={13} /> Add Detailed Medicine Items
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 3. DIET, OTHER CHARGES, AND DISCOUNT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={`rounded-xl border p-3 flex items-center justify-between transition-colors ${!canChargeDiet || isPackageMode
                      ? "border-slate-200 bg-slate-50/80 opacity-60"
                      : !isPackageMode && includeDietFee
                        ? "border-[#0284c7] bg-sky-50/40"
                        : "border-slate-200 bg-white"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!isPackageMode && canChargeDiet && includeDietFee}
                      onChange={(e) => {
                        if (!canChargeDiet || isPackageMode) return;
                        const checked = e.target.checked;
                        setIncludeDietFee(checked);
                        if (checked) {
                          setDietFee(rawDietFee);
                        }
                      }}
                      disabled={isPackageMode || !canChargeDiet}
                      className={`rounded text-[#0284c7] focus:ring-[#0284c7] w-4 h-4 ${canChargeDiet && !isPackageMode ? "cursor-pointer" : "cursor-not-allowed"
                        }`}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Diet & Nutrition Fee</span>
                      <span className="text-[10px] text-slate-400">
                        {canChargeDiet
                          ? "Prescribed in Patient File"
                          : "Disabled (Must be prescribed in Patient File)"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      disabled={isPackageMode || !canChargeDiet || !includeDietFee}
                      value={canChargeDiet && includeDietFee ? dietFee : 0}
                      readOnly
                      className="w-24 rounded-lg border border-slate-300 px-2.5 py-1 text-right text-xs font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
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

              {/* 3B. PAY LATER (PARTIAL PAYMENT) - SMALL BUTTON & TRIGGER */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${isPayLater ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                    <Clock size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">
                      {isPayLater ? "Pay Later Active (Partial Payment)" : "Pay Later Option"}
                    </span>
                    <span className="text-[10.5px] text-slate-500 font-medium">
                      {isPayLater
                        ? `₹${amountPaidNow.toLocaleString()} paid today • ₹${calculatedPayLater.toLocaleString()} remaining to pay later`
                        : "Allow patient to pay a partial amount today"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!isPayLater && (amountPaidNow === 0 || amountPaidNow >= grandTotalDue)) {
                      setAmountPaidNow(Math.round(grandTotalDue * 0.75));
                    }
                    setIsPayLaterModalOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isPayLater
                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-2xs"
                      : "border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900"
                    }`}
                >
                  <Clock size={12} />
                  <span>{isPayLater ? "Edit Pay Later" : "+ Pay Later"}</span>
                </button>
              </div>

              {/* MANDATORY PRESCRIPTION CHECK & UPLOAD BANNER */}
              {!hasPrescription ? (
                <div className="rounded-2xl bg-amber-500 text-white p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">UPLOAD PRESCRIPTION REQUIRED</span>
                      <span className="text-[11.5px] opacity-95">Prescription image must be uploaded to collect fee (Mandatory)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
                    {/* 1. Quick File / Camera Upload directly inside modal */}
                    <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white text-amber-900 hover:bg-amber-50 text-xs font-black cursor-pointer shadow-sm transition">
                      <Upload size={14} />
                      <span>{isUploadingRx ? "Uploading..." : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleDirectRxUpload}
                        disabled={isUploadingRx}
                        className="hidden"
                      />
                    </label>

                    {/* 2. Open Patient File in new tab */}
                    <a
                      href={`/reception/patient-file?id=${appointment.id}&name=${encodeURIComponent(appointment.patientName || "")}&phone=${encodeURIComponent(appointment.phone || appointment.phoneNumber || "")}&branch=${encodeURIComponent(appointment.branch || "")}&registrationId=${encodeURIComponent(appointment.registrationId || "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      <span>Patient File</span>
                      <ExternalLink size={13} />
                    </a>

                    {/* 3. Re-check / Refresh */}
                    <button
                      type="button"
                      onClick={handleRefreshRx}
                      title="Refresh prescription check"
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Prescription image attached ({rxImages.length} image{rxImages.length > 1 ? "s" : ""})</span>
                  </div>
                  <label className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer underline flex items-center gap-1">
                    <Upload size={12} />
                    <span>+ Add Another</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDirectRxUpload}
                      disabled={isUploadingRx}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* 4. PAYMENT MODE SELECTION */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Select Payment Method
                  </label>
                  <span className="text-[11px] font-bold text-rose-500">* (Mandatory)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { id: "Counter UPI", label: "Counter UPI", icon: Smartphone },
                    { id: "UPI / QR Code", label: "UPI / QR Code", icon: QrCode },
                    { id: "Cash", label: "Cash", icon: Banknote },
                    { id: "Card", label: "Card / POS", icon: CreditCard },
                    { id: "Split", label: "Split", icon: Layers },
                    { id: "Send Pay to app", label: "Send Pay to app", icon: ArrowRight },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const active = paymentMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setPaymentMode(mode.id);
                          if (mode.id === "UPI / QR Code") {
                            setRazorpayQRAmount(effectivePaidToday);
                            setIsRazorpayQROpen(true);
                          } else if (mode.id === "Split") {
                            if (splitUpi === 0 && splitCash === 0 && splitCard === 0 && splitCounterUpi === 0) {
                              const half = Math.round(effectivePaidToday / 2);
                              setSplitUpi(half);
                              setSplitCash(effectivePaidToday - half);
                              setSplitCounterUpi(0);
                              setSplitCard(0);
                            }
                          }
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${active
                          ? "border-sky-600 bg-sky-50 text-sky-800 shadow-xs ring-2 ring-sky-500"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        <Icon size={17} className={active ? "text-sky-600" : "text-slate-400"} />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* RAZORPAY DYNAMIC QR CODE DISPLAY - ONLY FOR ONLINE UPI / QR CODE */}
                {paymentMode === "UPI / QR Code" && (
                  <div className="mt-3 bg-sky-50/90 border-2 border-sky-400 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-xs block">
                            Razorpay Dynamic UPI QR Code
                          </span>
                          <span className="text-[10.5px] text-slate-500 font-medium">
                            Amount: <strong className="text-slate-900">₹{effectivePaidToday.toLocaleString()}</strong> • Auto-detects payment when scanned
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRazorpayQRAmount(effectivePaidToday);
                          setIsRazorpayQROpen(true);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
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
                          `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${effectivePaidToday.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Payment for ' + (appointment?.patientName || 'Patient'))}`
                        )}`}
                        alt="Razorpay UPI QR"
                        className="w-32 h-32 object-contain rounded-lg border border-slate-200 shadow-2xs"
                      />
                      <div className="flex-1 space-y-1.5 text-left">
                        <div className="flex items-center gap-2 text-xs font-bold text-sky-800">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                          <span>Ready to scan with any UPI app</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Scan using <strong>Google Pay, PhonePe, Paytm, CRED</strong> to pay <strong>₹{effectivePaidToday.toLocaleString()}</strong>.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRazorpayQRAmount(effectivePaidToday);
                              setIsRazorpayQROpen(true);
                            }}
                            className="py-1 px-2.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Live Tracker</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const cleanPh = (appointment?.phoneNumber || appointment?.phone || "").replace(/\D/g, "").slice(-10);
                              const upiUri = `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${effectivePaidToday.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Payment for ' + (appointment?.patientName || 'Patient'))}`;
                              const msg = encodeURIComponent(`Hello ${appointment?.patientName || 'Patient'},\nPlease pay ₹${effectivePaidToday} for your consultation at Spiritual Homeopathy using this UPI link:\n${upiUri}`);
                              window.open(`https://wa.me/91${cleanPh}?text=${msg}`, "_blank");
                            }}
                            className="py-1 px-2.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
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
                {paymentMode === "Counter UPI" && (
                  <div className="mt-3 bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 shadow-sm space-y-2.5 animate-in fade-in duration-200">
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
                            Patient scans printed static QR on reception desk • Handled same as Cash
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        DIRECT DESK
                      </span>
                    </div>
                    <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100 text-xs text-indigo-900 font-medium leading-relaxed">
                      • Patient scans clinic counter static QR code directly. Collect <strong>₹{effectivePaidToday.toLocaleString()}</strong> at reception.
                      <br />
                      • Click <strong>&quot;Complete &amp; Print Bill&quot;</strong> below to confirm (No online gateway popup).
                    </div>
                  </div>
                )}

                {/* CARD PAYMENT DETAILS (RAZORPAY CARD / POS) */}
                {paymentMode === "Card" && (
                  <div className="mt-3 bg-fuchsia-50/80 border-2 border-fuchsia-300 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
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
                          <CheckCircle2 size={16} />
                          <span>{isSubmitting ? "Completing Appointment..." : "Confirm Card Payment & Complete Appointment"}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-fuchsia-800 font-semibold text-center">
                      Enter card details above or swipe on clinic POS machine, then click Complete below.
                    </p>
                  </div>
                )}

                {/* SPLIT BREAKDOWN INPUTS & PRESETS */}
                {paymentMode === "Split" && (
                  <div className="mt-3 bg-sky-50/80 border-2 border-sky-400 rounded-2xl p-4 space-y-4 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs">
                          ⚡
                        </span>
                        <div>
                          <span className="font-black text-slate-900 text-xs block">
                            Split Payment Allocation
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Amount to Pay Today: <strong className="text-slate-900">₹{effectivePaidToday.toLocaleString()}</strong> — Opt-in modes, allocate amounts, and verify online payments
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setOptedSplitModes(["cash", "upi"]);
                            const half = Math.round(effectivePaidToday / 2);
                            setSplitUpi(half);
                            setSplitCash(effectivePaidToday - half);
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
                            const half = Math.round(effectivePaidToday / 2);
                            setSplitCard(half);
                            setSplitCash(effectivePaidToday - half);
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
                            const half = Math.round(effectivePaidToday / 2);
                            setSplitCounterUpi(half);
                            setSplitCash(effectivePaidToday - half);
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
                            const quarter = Math.round(effectivePaidToday / 4);
                            setSplitCash(quarter);
                            setSplitCounterUpi(quarter);
                            setSplitUpi(quarter);
                            setSplitCard(effectivePaidToday - (quarter * 3));
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
                                  const rem = Math.max(0, effectivePaidToday - currentSum);
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
                                <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash
                              </label>
                              {(() => {
                                const alloc = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                                return effectivePaidToday - alloc !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const rem = effectivePaidToday - splitUpi - splitCard - splitCounterUpi;
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
                                max={effectivePaidToday}
                                value={splitCash || ""}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value) || 0;
                                  const other = (optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0) +
                                                (optedSplitModes.includes("upi") ? (splitUpi || 0) : 0) +
                                                (optedSplitModes.includes("card") ? (splitCard || 0) : 0);
                                  const maxAllowed = Math.max(0, effectivePaidToday - other);
                                  setSplitCash(Math.max(0, Math.min(maxAllowed, raw)));
                                }}
                                placeholder="0"
                                className="w-full font-black text-slate-900 text-sm focus:outline-none bg-transparent"
                              />
                            </div>
                            <span className="text-[9.5px] text-slate-400 block">
                              Counter Cash
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
                                return effectivePaidToday - alloc !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const rem = effectivePaidToday - splitUpi - splitCard - splitCash;
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
                                max={effectivePaidToday}
                                value={splitCounterUpi || ""}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value) || 0;
                                  const other = (optedSplitModes.includes("cash") ? (splitCash || 0) : 0) +
                                                (optedSplitModes.includes("upi") ? (splitUpi || 0) : 0) +
                                                (optedSplitModes.includes("card") ? (splitCard || 0) : 0);
                                  const maxAllowed = Math.max(0, effectivePaidToday - other);
                                  setSplitCounterUpi(Math.max(0, Math.min(maxAllowed, raw)));
                                }}
                                placeholder="0"
                                className="w-full font-black text-slate-900 text-sm focus:outline-none bg-transparent"
                              />
                            </div>
                            <span className="text-[9.5px] text-slate-400 block">
                              Desk static QR (Same as Cash)
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
                                <QrCode className="w-3.5 h-3.5 text-sky-600" /> Online UPI
                              </label>
                              {!isSplitUpiPaid && (() => {
                                const alloc = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                                return effectivePaidToday - alloc !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const rem = effectivePaidToday - splitCash - splitCard - splitCounterUpi;
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
                                max={effectivePaidToday}
                                disabled={isSplitUpiPaid}
                                value={splitUpi || ""}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value) || 0;
                                  const other = (optedSplitModes.includes("cash") ? (splitCash || 0) : 0) +
                                                (optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0) +
                                                (optedSplitModes.includes("card") ? (splitCard || 0) : 0);
                                  const maxAllowed = Math.max(0, effectivePaidToday - other);
                                  setSplitUpi(Math.max(0, Math.min(maxAllowed, raw)));
                                }}
                                placeholder="0"
                                className="w-full font-black text-slate-900 text-sm focus:outline-none bg-transparent disabled:opacity-60"
                              />
                            </div>

                            {/* Status / Action for Split UPI */}
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSplitUpiPaid(true);
                                    setSplitUpiRef(`MANUAL-${Date.now().toString().slice(-4)}`);
                                  }}
                                  className="w-full py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9.5px] transition cursor-pointer"
                                >
                                  Mark Paid ✓
                                </button>
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
                                return effectivePaidToday - alloc !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const rem = effectivePaidToday - splitCash - splitUpi - splitCounterUpi;
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
                                max={effectivePaidToday}
                                disabled={isSplitCardPaid}
                                value={splitCard || ""}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value) || 0;
                                  const other = (optedSplitModes.includes("cash") ? (splitCash || 0) : 0) +
                                                (optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0) +
                                                (optedSplitModes.includes("upi") ? (splitUpi || 0) : 0);
                                  const maxAllowed = Math.max(0, effectivePaidToday - other);
                                  setSplitCard(Math.max(0, Math.min(maxAllowed, raw)));
                                }}
                                placeholder="0"
                                className="w-full font-black text-slate-900 text-sm focus:outline-none bg-transparent disabled:opacity-60"
                              />
                            </div>

                            {/* Status / Action for Split Card */}
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

                    {/* Status badge & Complete button */}
                    {(() => {
                      const activeCash = optedSplitModes.includes("cash") ? (splitCash || 0) : 0;
                      const activeCounterUpi = optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0;
                      const activeUpi = optedSplitModes.includes("upi") ? (splitUpi || 0) : 0;
                      const activeCard = optedSplitModes.includes("card") ? (splitCard || 0) : 0;
                      const allocated = activeCash + activeCounterUpi + activeUpi + activeCard;
                      const isMatch = allocated === effectivePaidToday;
                      const diff = effectivePaidToday - allocated;

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
                                  ? `Split Total Matched: ${parts.join(" + ")} = ₹${effectivePaidToday.toLocaleString()}`
                                  : diff > 0
                                  ? `₹${diff.toLocaleString()} remaining to allocate (Amount to pay today: ₹${effectivePaidToday.toLocaleString()})`
                                  : `Split exceeds amount to pay today by ₹${Math.abs(diff).toLocaleString()}`}
                              </span>
                            </div>
                            {!isMatch && (
                              <button
                                type="button"
                                onClick={() => {
                                  const firstMode = optedSplitModes[0] || "cash";
                                  if (firstMode === "cash") {
                                    const rem = effectivePaidToday - activeCounterUpi - activeUpi - activeCard;
                                    setSplitCash(Math.max(0, rem));
                                  } else if (firstMode === "counterUpi") {
                                    const rem = effectivePaidToday - activeCash - activeUpi - activeCard;
                                    setSplitCounterUpi(Math.max(0, rem));
                                  } else if (firstMode === "upi") {
                                    const rem = effectivePaidToday - activeCash - activeCounterUpi - activeCard;
                                    setSplitUpi(Math.max(0, rem));
                                  } else if (firstMode === "card") {
                                    const rem = effectivePaidToday - activeCash - activeCounterUpi - activeUpi;
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
                              disabled={isSubmitting || !hasPrescription || !canComplete}
                              onClick={() => handleConfirmPayment("Split")}
                              className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                canComplete
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-amber-500 hover:bg-amber-600 text-white"
                              }`}
                            >
                              <CheckCircle2 size={16} />
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

              {/* 5. SUMMARY FOOTER & SUBMIT */}
              <div className="rounded-2xl bg-slate-900 text-white p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    {isPayLater ? "Amount to Pay Today (Partial)" : "Total Amount Due"}
                  </span>
                  <span className="text-2xl font-black text-emerald-400">
                    ₹{effectivePaidToday.toFixed(2)}
                  </span>
                  {isPayLater && (
                    <span className="text-[11px] text-amber-300 font-bold block">
                      Pay Later Active • ₹{calculatedPayLater.toLocaleString()} remaining
                    </span>
                  )}
                  {!isPayLater && discount > 0 && (
                    <span className="text-[11px] text-red-300 block">
                      (₹{discount} discount applied)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmPayment()}
                  disabled={
                    isSubmitting ||
                    !hasPrescription ||
                    (paymentMode === "Split" && (
                      (optedSplitModes.includes("cash") ? splitCash : 0) +
                      (optedSplitModes.includes("counterUpi") ? splitCounterUpi : 0) +
                      (optedSplitModes.includes("upi") ? splitUpi : 0) +
                      (optedSplitModes.includes("card") ? splitCard : 0) !== effectivePaidToday ||
                      (optedSplitModes.includes("upi") && splitUpi > 0 && !isSplitUpiPaid) ||
                      (optedSplitModes.includes("card") && splitCard > 0 && !isSplitCardPaid)
                    ))
                  }
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {isSubmitting
                      ? "Recording..."
                      : !hasPrescription
                      ? "Prescription Required"
                      : "Confirm & Generate Bill"}
                  </span>
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
                    <div className="text-slate-500">support@spiritualhomeo.com</div>
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

                {/* 5. PAYMENT INFORMATION BOX (Dashed border, light green or orange background) */}
                <div className="mb-5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    PAYMENT INFORMATION
                  </div>

                  {Number(activeInvoice.payLaterAmount) > 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                          AMOUNT PAID TODAY
                        </div>
                        <div className="text-3xl font-black text-emerald-600 tracking-tight mt-0.5">
                          ₹{Number(activeInvoice.totalPaid || 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] font-extrabold text-amber-800 mt-1 flex items-center gap-1.5">
                          <span>Remaining Due (Pay Later):</span>
                          <span className="bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded font-black text-xs">
                            ₹{Number(activeInvoice.payLaterAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3.5 py-1 text-xs font-black text-white shadow-xs">
                          <span>PARTIAL PAID</span>
                        </div>
                        <div className="text-[10px] font-black uppercase text-amber-900 tracking-wide mt-1.5">
                          VIA {displayPaymentMode}
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  )}
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
                        {/* Package installment if package member */}
                        {activeInvoice.hasPackage && (
                          <tr>
                            <td className="py-2.5">
                              <div>Package Treatment Installment</div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {activeInvoice.packageName || "Treatment Care Package"}
                              </div>
                            </td>
                            <td className="py-2.5 text-right font-black text-slate-900">
                              ₹{Number(activeInvoice.packageInstallmentPaid ?? activeInvoice.totalPaid ?? grandTotalDue).toFixed(2)}
                            </td>
                          </tr>
                        )}

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
                        {(() => {
                          const invoiceMeds = activeInvoice.medicines || activeInvoice.medicinesList || [];
                          const validMeds = Array.isArray(invoiceMeds)
                            ? invoiceMeds.filter((m: any) => m && ((m.name && m.name.trim().length > 0) || Number(m.amount) > 0 || m.type || m.timing))
                            : [];

                          if (validMeds.length > 0) {
                            return validMeds.map((m: any, idx: number) => (
                              <tr key={idx}>
                                <td className="py-2.5">
                                  <span className="font-semibold text-slate-800">
                                    {m.name || (m.type?.toLowerCase() === "reserve" ? "Reserve Medicine" : "Prescribed Medicine")}
                                  </span>
                                  {m.type ? <span className="ml-1 text-xs text-slate-500 font-medium">({m.type})</span> : null}
                                  {m.timing ? <span className="ml-1.5 text-xs text-slate-400 font-normal">• {m.timing}</span> : null}
                                </td>
                                <td className="py-2.5 text-right font-black text-slate-900">
                                  ₹{Number(m.amount || 0).toFixed(2)}
                                </td>
                              </tr>
                            ));
                          }
                          if (Number(activeInvoice.medicineFee) > 0) {
                            return (
                              <tr>
                                <td className="py-2.5">
                                  Medicine Fee ({activeInvoice.medicineDuration || "1 Month"})
                                </td>
                                <td className="py-2.5 text-right font-black text-slate-900">
                                  ₹{Number(activeInvoice.medicineFee).toFixed(2)}
                                </td>
                              </tr>
                            );
                          }
                          return null;
                        })()}

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

                        {/* Previous pending balance cleared in this visit */}
                        {Number(activeInvoice.previousDuePaid) > 0 && (
                          <tr className="bg-amber-50/50">
                            <td className="py-2.5">
                              <div className="font-extrabold text-slate-900">Previous Pending Balance (Cleared)</div>
                              <div className="text-[10px] text-amber-700 font-semibold">Previous visit balance cleared today</div>
                            </td>
                            <td className="py-2.5 text-right font-black text-amber-800">
                              ₹{Number(activeInvoice.previousDuePaid).toFixed(2)}
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

                        {/* TOTAL PAID ROWS (Supports Pay Later & Full Payment) */}
                        {Number(activeInvoice.payLaterAmount) > 0 ? (
                          <>
                            <tr className="border-t border-slate-200 text-slate-700">
                              <td className="py-2 font-bold uppercase text-[11px] text-slate-500">
                                TOTAL BILL AMOUNT
                              </td>
                              <td className="py-2 text-right font-black text-xs text-slate-800">
                                ₹{Number(activeInvoice.totalAmountDue || (Number(activeInvoice.totalPaid || 0) + Number(activeInvoice.payLaterAmount || 0))).toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-t border-slate-100 text-slate-900">
                              <td className="py-2 font-black uppercase text-xs text-emerald-700">
                                AMOUNT PAID TODAY ({displayPaymentMode})
                              </td>
                              <td className="py-2 text-right font-black text-sm text-emerald-600">
                                ₹{Number(activeInvoice.totalPaid || 0).toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-t-2 border-amber-400 bg-amber-50/70 text-amber-950 font-black">
                              <td className="py-2.5 px-2 font-black uppercase text-xs text-amber-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                                <span>REMAINING NEED TO PAY (PAY LATER)</span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-black text-sm text-amber-800">
                                ₹{Number(activeInvoice.payLaterAmount).toFixed(2)}
                              </td>
                            </tr>
                          </>
                        ) : (
                          <tr className="border-t-2 border-slate-900 text-slate-900">
                            <td className="py-2.5 font-black uppercase text-xs">
                              TOTAL PAID ({displayPaymentMode})
                            </td>
                            <td className="py-2.5 text-right font-black text-sm">
                              ₹{displayTotal}
                            </td>
                          </tr>
                        )}
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
                    <span>{getBranchPhone(activeInvoice.branch || appointment?.branch || "KPHB Branch")}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Mail size={12} />
                    <span>support@spiritualhomeo.com</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Globe size={12} />
                    <span>spiritualhomeoclinic.com</span>
                  </div>

                  <div className="flex items-center gap-1.5 uppercase">
                    <MapPin size={12} />
                    <span>{(activeInvoice.branch || appointment?.branch || "KPHB Branch").toUpperCase()}</span>
                  </div>
                </div>

                {/* 9. ATTACHED 30-DAY DIET PLAN SHEETS (2 PAGES: DAYS 1-15 & DAYS 16-30) */}
                {Boolean(activeInvoice.dietPlan || (activeInvoice.dietPlanFee && activeInvoice.dietPlanFee > 0) || (activeInvoice.dietFee && activeInvoice.dietFee > 0)) && (
                  (() => {
                    const fullSchedule = generate30DayDietSchedule([], 30, "Normal");
                    const page1Days = fullSchedule.filter((d) => d.day <= 15);
                    const page2Days = fullSchedule.filter((d) => d.day > 15);

                    return (
                      <div className="mt-8 space-y-8">
                        {/* SHEET 1: DAYS 1 TO 15 */}
                        <div className="diet-sheet-page rounded-xl border border-slate-300 p-5 bg-white shadow-xs">
                          {/* Header */}
                          <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/assets/SH logo.png" alt="Logo" className="h-10 w-auto object-contain" />
                              <div>
                                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                  SPIRITUAL HOMEOPATHY CLINICS
                                </h3>
                                <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                                  Personalized 30-Day Regimen • Sheet 1 of 2 (Days 01 – 15)
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-[10px] font-semibold text-slate-500">
                              <div>Patient: <strong className="text-slate-800">{activeInvoice.patientName}</strong></div>
                              <div>Reg ID: {activeInvoice.registrationId || activeInvoice.patientId || "SPH-REC"}</div>
                              <div>Branch: {activeInvoice.branch || "Clinic"}</div>
                            </div>
                          </div>

                          {/* Critical 30-min water rule banner */}
                          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-950 font-bold leading-tight">
                            ⚠️ Mandatory Homeopathic 30-Min Protocol: DO NOT drink water 30 minutes before or 30 minutes after your meal. Sip lukewarm water between meals (Total 2.5–3.5 Liters).
                          </div>

                          {/* Days 1-15 Table */}
                          <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-900 font-black uppercase text-[9px] border-b border-slate-300">
                                <th className="p-1.5 border-r border-slate-300 text-center w-12">Day</th>
                                <th className="p-1.5 border-r border-slate-300 w-[24%] bg-amber-50/70 text-amber-950">Breakfast (08:30 AM)</th>
                                <th className="p-1.5 border-r border-slate-300 w-[24%] bg-sky-50/70 text-sky-950">Lunch (01:15 PM)</th>
                                <th className="p-1.5 border-r border-slate-300 w-[24%] bg-emerald-50/70 text-emerald-950">Snacks (05:00 PM)</th>
                                <th className="p-1.5 w-[24%] bg-indigo-50/70 text-indigo-950">Dinner (07:45 PM)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {page1Days.map((d) => (
                                <tr key={d.day} className={d.day % 2 === 0 ? "bg-slate-50/40" : "bg-white"}>
                                  <td className="p-1.5 border-r border-slate-300 font-black text-center text-sky-800">Day {d.day}</td>
                                  <td className="p-1.5 border-r border-slate-300 leading-tight">{d.breakfast}</td>
                                  <td className="p-1.5 border-r border-slate-300 leading-tight">{d.lunch}</td>
                                  <td className="p-1.5 border-r border-slate-300 leading-tight">{d.snacks}</td>
                                  <td className="p-1.5 leading-tight">{d.dinner}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div className="mt-3 text-right text-[9px] text-slate-400 italic">
                            Sheet 1 of 2 • Follow strictly as prescribed by your treating doctor.
                          </div>
                        </div>

                        {/* SHEET 2: DAYS 16 TO 30 */}
                        <div className="diet-sheet-page rounded-xl border border-slate-300 p-5 bg-white shadow-xs">
                          {/* Header */}
                          <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/assets/SH logo.png" alt="Logo" className="h-10 w-auto object-contain" />
                              <div>
                                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                  SPIRITUAL HOMEOPATHY CLINICS
                                </h3>
                                <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                                  Personalized 30-Day Regimen • Sheet 2 of 2 (Days 16 – 30)
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-[10px] font-semibold text-slate-500">
                              <div>Patient: <strong className="text-slate-800">{activeInvoice.patientName}</strong></div>
                              <div>Reg ID: {activeInvoice.registrationId || activeInvoice.patientId || "SPH-REC"}</div>
                              <div>Branch: {activeInvoice.branch || "Clinic"}</div>
                            </div>
                          </div>

                          {/* Critical 30-min water rule banner */}
                          <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-950 font-bold leading-tight">
                            🌿 Weeks 3 & 4 Focus: Cellular Repair, Hormone Harmony & Metabolic Stabilization. Adhere to light dinners before 8:00 PM.
                          </div>

                          {/* Days 16-30 Table */}
                          <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-900 font-black uppercase text-[9px] border-b border-slate-300">
                                <th className="p-1.5 border-r border-slate-300 text-center w-12">Day</th>
                                <th className="p-1.5 border-r border-slate-300 w-[24%] bg-amber-50/70 text-amber-950">Breakfast (08:30 AM)</th>
                                <th className="p-1.5 border-r border-slate-300 w-[24%] bg-sky-50/70 text-sky-950">Lunch (01:15 PM)</th>
                                <th className="p-1.5 border-r border-slate-300 w-[24%] bg-emerald-50/70 text-emerald-950">Snacks (05:00 PM)</th>
                                <th className="p-1.5 w-[24%] bg-indigo-50/70 text-indigo-950">Dinner (07:45 PM)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {page2Days.map((d) => (
                                <tr key={d.day} className={d.day % 2 === 0 ? "bg-slate-50/40" : "bg-white"}>
                                  <td className="p-1.5 border-r border-slate-300 font-black text-center text-sky-800">Day {d.day}</td>
                                  <td className="p-1.5 border-r border-slate-300 leading-tight">{d.breakfast}</td>
                                  <td className="p-1.5 border-r border-slate-300 leading-tight">{d.lunch}</td>
                                  <td className="p-1.5 border-r border-slate-300 leading-tight">{d.snacks}</td>
                                  <td className="p-1.5 leading-tight">{d.dinner}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div className="mt-3 text-right text-[9px] text-slate-400 italic">
                            Sheet 2 of 2 • Book follow-up consultation with your doctor after Day 30.
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}

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

      {/* PAY LATER POPUP MODAL */}
      {isPayLaterModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-2xs">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Pay Later (Partial Payment)</h4>
                  <p className="text-[11px] text-slate-500">Patient clears remaining balance in next visit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayLaterModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Total Bill Box */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-600">Total Bill Amount</span>
                <span className="text-base font-black text-slate-900">₹{grandTotalDue.toLocaleString()}</span>
              </div>

              {/* Amount Paid Today */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount Paid Today (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    max={grandTotalDue}
                    value={amountPaidNow || ""}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(grandTotalDue, parseFloat(e.target.value) || 0));
                      setAmountPaidNow(val);
                    }}
                    placeholder="e.g. 1500"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Quick % buttons */}
                <div className="flex gap-1.5 mt-2">
                  {[0.25, 0.5, 0.75].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAmountPaidNow(Math.round(grandTotalDue * pct))}
                      className="flex-1 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      {pct * 100}% (₹{Math.round(grandTotalDue * pct)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Remaining Need to Pay */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 block">Remaining Need to Pay Later</span>
                  <span className="text-[10px] text-amber-700">Will be recorded in patient file as pending</span>
                </div>
                <span className="text-base font-black text-amber-700">
                  ₹{Math.max(0, grandTotalDue - (Number(amountPaidNow) || 0)).toLocaleString()}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pay Later Notes / Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Remaining balance to be paid next week"
                  value={payLaterNotes}
                  onChange={(e) => setPayLaterNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPayLater(false);
                  setAmountPaidNow(grandTotalDue);
                  setIsPayLaterModalOpen(false);
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Clear / Full Pay
              </button>

              <button
                type="button"
                onClick={() => {
                  if (amountPaidNow >= grandTotalDue) {
                    alert("Amount paid today equals or exceeds total bill. Pay Later is not needed.");
                    setIsPayLater(false);
                  } else {
                    setIsPayLater(true);
                  }
                  setIsPayLaterModalOpen(false);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs cursor-pointer"
              >
                Apply Pay Later
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
        amount={razorpayQRAmount || (isPayLater ? amountPaidNow : grandTotalDue)}
        onClose={() => setIsRazorpayQROpen(false)}
        onPaymentSuccess={async (updated) => {
          setIsRazorpayQROpen(false);
          if (paymentMode === "Split") {
            setIsSplitUpiPaid(true);
            setSplitUpiRef(updated?.paymentId || updated?.razorpayPaymentId || `PAY-${Date.now().toString().slice(-6)}`);
            alert(`Online UPI payment of ₹${razorpayQRAmount || splitUpi} received & verified via Razorpay! Now complete any remaining split payment.`);
            return;
          }
          try {
            const validWebMeds = (Array.isArray(medicineItems) ? medicineItems : []).filter(
              (m) =>
                (m.name && m.name.trim().length > 0) ||
                Number(m.amount) > 0 ||
                (m.type && m.type.toLowerCase() === "reserve") ||
                (m.timing && m.timing.toLowerCase() === "reserve")
            );
            const webMedsToSend = validWebMeds.length > 0
              ? validWebMeds
              : (!isPackageMode && (includeMedicineFee || paymentType === "consult_and_med") ? medicineItems : []);

            const invoicePayload = {
              appointmentId: appointment?.id,
              consultationFee: includeConsultFee ? consultationFee : 0,
              medicineFee: includeMedicineFee ? totalMedicineAmount : 0,
              medicines: webMedsToSend,
              medicinesList: webMedsToSend,
              medicineDuration: (includeMedicineFee || paymentType === "consult_and_med") ? medicineDuration : "",
              dietPlanFee: dietFee,
              otherCharges,
              discount,
              discountReason,
              totalAmountDue: grandTotalDue,
              totalPaid: isPayLater ? amountPaidNow : grandTotalDue,
              payLaterAmount: isPayLater ? calculatedPayLater : 0,
              paymentMethod: paymentMode === "Split" ? "Split" : "ONLINE_UPI",
              paymentMode: paymentMode === "Split" ? "Split" : "UPI / QR Code",
              splitDetails: paymentMode === "Split" ? {
                upi: splitUpi,
                cash: splitCash,
                card: splitCard,
                counterUpi: splitCounterUpi,
              } : undefined,
              paidAt: new Date().toISOString(),
              invoiceId: `INV-${Date.now().toString().slice(-6)}`,
              isFeeCollected: true,
              status: "COMPLETED",
            };

            if (onSubmitPayment) {
              await onSubmitPayment(invoicePayload);
            } else {
              await fetch("/api/reception/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(invoicePayload),
              });
            }
            setCompletedInvoice(updated || { ...appointment, ...invoicePayload });
            setCurrentStep("invoice_receipt");
          } catch (e: any) {
            console.error("Payment finalize error:", e);
            setCompletedInvoice(updated || appointment);
            setCurrentStep("invoice_receipt");
          }
        }}
      />
    </>
  );
};

export default FeeCheckoutAndInvoiceModal;

