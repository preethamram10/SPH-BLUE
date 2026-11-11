import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Share,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../services/auth";
import { getBranchPhone } from "../../app/(reception)/medical-requests/pdf/generateMedicineRequestPDF";

export type PaymentMethod = "Cash" | "Counter UPI" | "UPI / QR Code" | "Card" | "Split" | "Send Pay to app";

export const MEDICINE_TYPE_OPTIONS = [
  "Pills",
  "Drops",
  "Dilution",
  "Syrup",
  "Powder",
  "Tablet",
  "Ointment",
  "Oil",
  "Kit",
  "Other",
];

export const TIMING_OPTIONS = [
  { label: "M - N - N", desc: "Morning - Night - Night" },
  { label: "M - A - N", desc: "Morning - Afternoon - Night" },
  { label: "M - N", desc: "Morning - Night" },
  { label: "1 - 0 - 1", desc: "Morning & Night" },
  { label: "1 - 1 - 1", desc: "Three times a day" },
  { label: "M only", desc: "Morning only" },
  { label: "N only", desc: "Night only" },
  { label: "SOS", desc: "As needed / Emergency" },
  { label: "M - A", desc: "Morning - Afternoon" },
  { label: "A - N", desc: "Afternoon - Night" },
];

interface MedicineItem {
  id: string;
  name: string;
  type: string;
  timing: string;
  amount: number;
}

interface AppointmentPaymentModalProps {
  visible: boolean;
  appointment: any;
  onClose: () => void;
  onPaymentSuccess: (updatedAppt: any) => void;
  onOpenPatientFile?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const AppointmentPaymentModal: React.FC<AppointmentPaymentModalProps> = ({
  visible,
  appointment,
  onClose,
  onPaymentSuccess,
  onOpenPatientFile,
}) => {
  const rxImages = appointment?.prescriptionImages || [];
  const hasPrescription =
    rxImages.length > 0 ||
    Boolean(appointment?.hasPackage) ||
    Boolean(appointment?.activePackage) ||
    Boolean(appointment?.isSentToReception) ||
    Boolean(appointment?.diagnosisNotes) ||
    Boolean(appointment?.consultationFee);

  // Initial Target Amount from Doctor (no hardcoded default - blank if not entered)
  const initialDoctorFee =
    typeof appointment?.consultationFee === "number" && appointment.consultationFee > 0
      ? appointment.consultationFee
      : 0;

  const [targetAmount, setTargetAmount] = useState<string>(
    initialDoctorFee > 0 ? String(initialDoctorFee) : ""
  );
  const [paymentType, setPaymentType] = useState<"consultation" | "consult_and_med" | "split" | "package">(
    "consultation"
  );

  // Fees Breakdown
  const [includeConsult, setIncludeConsult] = useState(true);
  const [consultationFee, setConsultationFee] = useState<number>(initialDoctorFee);

  const [includeMedicine, setIncludeMedicine] = useState(false);
  const [medicineFee, setMedicineFee] = useState<number>(0);

  const [includeDiet, setIncludeDiet] = useState(false);
  const [dietFee, setDietFee] = useState<number>(0);
  const [showDetailedMedicines, setShowDetailedMedicines] = useState<boolean>(false);

  // Medicine Details
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

  // Package Member installment state
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

  const [packageInstallmentAmount, setPackageInstallmentAmount] = useState<string>("");
  const [billingMode, setBillingMode] = useState<"package" | "regular">("regular");

  // Diet plan state from patient file - Diet Fee is ONLY enabled if prescribed in Patient File
  const hasPrescribedDiet = Boolean(
    (appointment?.dietPlan &&
      typeof appointment.dietPlan === "string" &&
      appointment.dietPlan.trim().length > 0) ||
    Number(appointment?.dietPlanFee || (appointment as any)?.dietFee || 0) > 0
  );
  const rawDietFee = Number(appointment?.dietPlanFee ?? (appointment as any)?.dietFee ?? 0);
  const canChargeDiet = hasPrescribedDiet && rawDietFee > 0;

  // Medicine Discount
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

  // Card payment details state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Selected Payment Method
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [isUpiPaid, setIsUpiPaid] = useState(false);

  // Split payment breakdown state
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCounterUpi, setSplitCounterUpi] = useState<number>(0);
  const [showSplitRazorpayQr, setShowSplitRazorpayQr] = useState<boolean>(false);
  // Opted split payment modes: "cash" | "counterUpi" | "upi" | "card"
  const [optedSplitModes, setOptedSplitModes] = useState<string[]>(["cash", "upi"]);
  const [isSplitUpiPaid, setIsSplitUpiPaid] = useState<boolean>(false);
  const [splitUpiRef, setSplitUpiRef] = useState<string>("");
  const [isSplitCardPaid, setIsSplitCardPaid] = useState<boolean>(false);
  const [splitCardRef, setSplitCardRef] = useState<string>("");

  // Pay Later states
  const [isPayLater, setIsPayLater] = useState<boolean>(false);
  const [amountPaidNow, setAmountPaidNow] = useState<string>("");
  const [payLaterNotes, setPayLaterNotes] = useState<string>("");
  const [isPayLaterModalOpen, setIsPayLaterModalOpen] = useState<boolean>(false);
  const [previousPendingBalance, setPreviousPendingBalance] = useState<number>(0);
  const [includePreviousDue, setIncludePreviousDue] = useState<boolean>(false);

  // Timing and Type Picker Modal states
  const [activeTimingMedId, setActiveTimingMedId] = useState<string | null>(null);
  const [activeTypeMedId, setActiveTypeMedId] = useState<string | null>(null);

  // View state: 'collect_fee' vs 'invoice_receipt'
  const [currentView, setCurrentView] = useState<"collect_fee" | "invoice_receipt">("collect_fee");
  const [completedInvoice, setCompletedInvoice] = useState<any>(appointment);

  // Initialize on modal open
  useEffect(() => {
    if (visible && appointment) {
      setCompletedInvoice(appointment);
      const isPaid = Boolean(
        appointment.isFeeCollected ||
        appointment.status === "COMPLETED" ||
        (appointment.totalPaid !== undefined && appointment.totalPaid > 0)
      );
      setCurrentView(isPaid ? "invoice_receipt" : "collect_fee");

      const docFee =
        typeof appointment.consultationFee === "number" && appointment.consultationFee > 0
          ? appointment.consultationFee
          : 0;
      setTargetAmount(docFee > 0 ? String(docFee) : "");
      setConsultationFee(docFee);
      const isZeroConsult = appointment.consultationFee === 0;
      setIncludeConsult(isZeroConsult ? false : (docFee > 0 || !isPaid));

      // Pre-populate medicines if available in appointment or prescriptionText
      let loadedMeds: MedicineItem[] = [];
      const rawMeds = appointment.medicinesList || appointment.medicines;
      if (Array.isArray(rawMeds) && rawMeds.length > 0) {
        loadedMeds = rawMeds.map((m: any, idx: number) => ({
          id: m.id || `med-${idx}-${Date.now()}`,
          name: m.name || "",
          type: m.type || "Pills",
          timing: m.timing || "M - N - N",
          amount: typeof m.amount === "number" ? m.amount : 0,
        }));
      } else if (appointment.prescriptionText && typeof appointment.prescriptionText === "string") {
        const remedyLines = appointment.prescriptionText
          .split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.includes("|") || l.includes("Timing:"));
        if (remedyLines.length > 0) {
          loadedMeds = remedyLines.map((line: string, idx: number) => {
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
              id: `med-${idx}-${Date.now()}`,
              name: cleanName,
              type,
              timing,
              amount: 0,
            };
          });
        }
      }

      if (loadedMeds.length > 0) {
        setMedicines(loadedMeds);
        const sumMeds = loadedMeds.reduce((acc, m) => acc + (m.amount || 0), 0);
        setMedicineFee(appointment.medicineFee || sumMeds || 0);
        setIncludeMedicine(true);
        setShowDetailedMedicines(true);
      } else {
        const medFee = appointment.medicineFee || 0;
        setMedicines([
          {
            id: "med-1",
            name: "",
            type: "Pills",
            timing: "M - N - N",
            amount: medFee,
          },
        ]);
        setMedicineFee(medFee);
        setIncludeMedicine(Boolean(medFee > 0));
        setShowDetailedMedicines(false);
      }

      // Diet plan fee: ONLY enable and prefill if entered and saved in Patient File
      if (canChargeDiet) {
        setDietFee(rawDietFee);
        setIncludeDiet(true);
      } else {
        setDietFee(0);
        setIncludeDiet(false);
      }
      setIsPayLater(false);
      setAmountPaidNow("");
      setPayLaterNotes("");
      setIsPayLaterModalOpen(false);
      setActiveTimingMedId(null);
      setActiveTypeMedId(null);
      setIncludePreviousDue(false);

      // Check previous pending balance
      const cleanP = (appointment.phoneNumber || appointment.phone || "").replace(/\D/g, "").slice(-10);
      if (cleanP) {
        apiFetch<any>(`/pay-later?phone=${cleanP}`)
          .then((res) => {
            if (res && res.success && typeof res.pendingTotal === "number" && res.pendingTotal > 0) {
              setPreviousPendingBalance(res.pendingTotal);
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
        setIncludeConsult(false);
        setConsultationFee(0);
        setIncludeMedicine(false);
        setMedicineFee(0);
        setIncludeDiet(false);
        setPackageInstallmentAmount(pkgPending > 0 ? String(pkgPending) : "");
      } else {
        setBillingMode("regular");
        setPaymentType("split");
        const total = (docFee > 0 ? docFee : 500) + (appointment.medicineFee || 0);
        setTargetAmount(String(total));
        const half = Math.round(total / 2);
        setConsultationFee(half);
        setMedicineFee(total - half);
        setIncludeConsult(true);
        setIncludeMedicine(true);
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
  }, [visible, appointment]);

  const handleSelectBillingMode = (mode: "package" | "regular") => {
    setBillingMode(mode);
    if (mode === "package") {
      setPaymentType("package");
      setIncludeConsult(false);
      setConsultationFee(0);
      setIncludeMedicine(false);
      setMedicineFee(0);
      setIncludeDiet(false);
      if (!packageInstallmentAmount) {
        setPackageInstallmentAmount(pkgPending > 0 ? String(pkgPending) : "0");
      }
    } else {
      setPaymentType("consult_and_med");
      const target = parseFloat(targetAmount) || 0;
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
    }
  };

  // Adjust Fees Based on Payment Type
  const handlePaymentTypeChange = (type: "consultation" | "consult_and_med" | "split" | "package") => {
    if (type === "package" && !isPackageMember) {
      Alert.alert(
        "Package Not Registered",
        "This patient is not enrolled in a treatment package. Packages must be registered from the Patient File first."
      );
      return;
    }
    setPaymentType(type);
    if (type === "package") {
      setBillingMode("package");
      setIncludeConsult(false);
      setConsultationFee(0);
      setIncludeMedicine(false);
      setMedicineFee(0);
      setIncludeDiet(false);
      if (!packageInstallmentAmount) {
        setPackageInstallmentAmount(pkgPending > 0 ? String(pkgPending) : "0");
      }
      return;
    }

    if (isPackageMember) {
      setBillingMode("regular");
    }

    const target = parseFloat(targetAmount) || 0;

    if (type === "consultation") {
      setIncludeConsult(true);
      setConsultationFee(target);
      setIncludeMedicine(false);
      setMedicineFee(0);
    } else if (type === "consult_and_med") {
      // Combined Consultation & Medicine box
      setIncludeConsult(true);
      setConsultationFee(target);
      setIncludeMedicine(false);
      setMedicineFee(0);
    } else if (type === "split") {
      // Split 50/50 between Consultation and Medicine
      setIncludeConsult(true);
      setIncludeMedicine(true);
      const half = Math.round(target / 2);
      setConsultationFee(half);
      setMedicineFee(target - half);
      if (medicines.length === 1) {
        setMedicines([{ ...medicines[0], amount: target - half }]);
      }
    }
  };

  // Re-calculate when Target Amount changes
  const handleTargetAmountChange = (text: string) => {
    setTargetAmount(text);
    const target = parseFloat(text) || 0;
    if (paymentType === "consultation" || paymentType === "consult_and_med") {
      setConsultationFee(target);
      setMedicineFee(0);
    } else if (paymentType === "split") {
      const half = Math.round(target / 2);
      setConsultationFee(half);
      setMedicineFee(target - half);
      if (medicines.length === 1) {
        setMedicines([{ ...medicines[0], amount: target - half }]);
      }
    }
  };

  // Toggling Consultation Fee checkbox
  const handleToggleConsult = () => {
    const next = !includeConsult;
    const target = parseFloat(targetAmount) || 0;
    setIncludeConsult(next);
    if (!next) {
      // Deselecting consultation: make consultation fee 0, and make medicine fee target amount
      setConsultationFee(0);
      if (includeMedicine) {
        setMedicineFee(target);
        if (medicines.length === 1) {
          setMedicines([{ ...medicines[0], amount: target }]);
        }
      }
    } else {
      // Selecting consultation
      if (includeMedicine) {
        const half = Math.round(target / 2);
        setConsultationFee(half);
        setMedicineFee(target - half);
        if (medicines.length === 1) {
          setMedicines([{ ...medicines[0], amount: target - half }]);
        }
      } else {
        setConsultationFee(target);
      }
    }
  };

  // Toggling Prescribed Medicine Fee checkbox
  const handleToggleMedicine = () => {
    const next = !includeMedicine;
    const target = parseFloat(targetAmount) || 0;
    setIncludeMedicine(next);
    if (!next) {
      // Deselecting medicine: make medicine fee 0, and make consultation fee target amount
      setMedicineFee(0);
      if (includeConsult) {
        setConsultationFee(target);
      }
    } else {
      // Selecting medicine
      if (includeConsult) {
        const half = Math.round(target / 2);
        setConsultationFee(half);
        setMedicineFee(target - half);
        if (medicines.length === 1) {
          setMedicines([{ ...medicines[0], amount: target - half }]);
        }
      } else {
        setMedicineFee(target);
        if (medicines.length === 1) {
          setMedicines([{ ...medicines[0], amount: target }]);
        }
      }
    }
  };

  // When Consultation Fee is adjusted
  const handleConsultFeeChange = (val: string) => {
    const consult = parseFloat(val) || 0;
    setConsultationFee(consult);
    if (paymentType === "consultation" || paymentType === "package") {
      setTargetAmount(val);
      return;
    }
    const target = parseFloat(targetAmount) || 0;
    const remaining = Math.max(0, target - consult);
    setMedicineFee(remaining);
    if (medicines.length === 1) {
      setMedicines([{ ...medicines[0], amount: remaining }]);
    }
  };

  // Medicine Item management
  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}`,
        name: "",
        type: "Pills",
        timing: "M-A-N",
        amount: 0,
      },
    ]);
  };

  const handleUpdateMedicine = (id: string, updates: Partial<MedicineItem>) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const handleRemoveMedicine = (id: string) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const isPackageMode = isPackageMember && billingMode === "package";
  const itemizedTotal = medicines.reduce((sum, m) => sum + (m.amount || 0), 0);
  const isMedicineTotalMatching = isPackageMode || !includeMedicine || medicineFee === 0 || !showDetailedMedicines || itemizedTotal === medicineFee;

  const previousDueAmount = includePreviousDue ? Number(previousPendingBalance) || 0 : 0;

  // Total Due calculation with approved discount and previous due
  const baseTotal = (includeConsult ? consultationFee : 0) + (includeMedicine ? medicineFee : 0) + (canChargeDiet && includeDiet ? dietFee : 0) + previousDueAmount;
  const totalAmountDue = isPackageMode
    ? Math.max(0, parseFloat(packageInstallmentAmount) || 0)
    : Math.max(0, baseTotal - (discountStatus === "APPROVED" ? discountApprovedAmount : 0));

  const effectivePaidToday = isPayLater ? Math.min(totalAmountDue, parseFloat(amountPaidNow) || 0) : totalAmountDue;
  const calculatedPayLater = isPayLater ? Math.max(0, totalAmountDue - effectivePaidToday) : 0;

  // Request Discount to HR / Admin
  const handleRequestDiscountSubmit = async () => {
    const numDisc = parseFloat(discountRequestedAmount) || 0;
    if (numDisc <= 0) {
      Alert.alert("Invalid Discount", "Please enter a valid discount amount.");
      return;
    }
    setIsRequestingDiscount(true);
    try {
      const res = await apiFetch<any>("/reception/discount-request", {
        method: "POST",
        body: JSON.stringify({
          appointmentId: appointment.id,
          discountAmount: numDisc,
          notes: discountNotes,
        }),
      });
      if (res.success) {
        setDiscountStatus("PENDING");
        setIsDiscountModalOpen(false);
        Alert.alert(
          "Request Sent to HR & Admin",
          `Discount request of ₹${numDisc} has been sent to HR & Admin. Payment is locked until approval.`
        );
      } else {
        Alert.alert("Error", res.error || "Failed to submit discount request.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsRequestingDiscount(false);
    }
  };

  // Confirm Payment & Generate Invoice
  const handleConfirmPayment = async () => {
    if (!hasPrescription) {
      Alert.alert(
        "Upload Prescription Required",
        "Prescription is mandatory to collect fee. Please upload or draw the prescription in the patient file first."
      );
      return;
    }

    if (!isPackageMode && includeMedicine && medicineFee > 0 && showDetailedMedicines && itemizedTotal !== medicineFee) {
      Alert.alert(
        "Medicine Amount Mismatch",
        `Allocated medicine amount is ₹${medicineFee}, but itemized medicines total ₹${itemizedTotal}.\nPlease balance the medicine amounts to match ₹${medicineFee}.`
      );
      return;
    }

    if (discountStatus === "PENDING") {
      Alert.alert(
        "Discount Pending HR Approval",
        "This payment has a discount request pending HR/Admin approval. Please wait for approval or cancel the discount request before proceeding."
      );
      return;
    }

    if (!selectedMethod) {
      Alert.alert("Payment Method Required", "Please tap an option to select how the patient is paying.");
      return;
    }

    if (selectedMethod === "Split") {
      const activeCash = optedSplitModes.includes("cash") ? (splitCash || 0) : 0;
      const activeCounterUpi = optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0;
      const activeUpi = optedSplitModes.includes("upi") ? (splitUpi || 0) : 0;
      const activeCard = optedSplitModes.includes("card") ? (splitCard || 0) : 0;
      const splitAllocated = activeCash + activeCounterUpi + activeUpi + activeCard;

      if (splitAllocated !== effectivePaidToday) {
        Alert.alert(
          "Split Amount Mismatch",
          `Split amounts (₹${splitAllocated}) must equal amount paid today (₹${effectivePaidToday}). Difference: ₹${Math.abs(effectivePaidToday - splitAllocated)}.`
        );
        return;
      }

      if (optedSplitModes.includes("upi") && splitUpi > 0 && !isSplitUpiPaid) {
        Alert.alert("Online UPI Pending", `Online UPI payment of ₹${splitUpi} has not been verified yet. Please scan QR or tap Mark Paid.`);
        return;
      }

      if (optedSplitModes.includes("card") && splitCard > 0 && !isSplitCardPaid) {
        Alert.alert("Card Payment Pending", `Card payment of ₹${splitCard} has not been confirmed yet. Please swipe on POS or tap Mark Card Paid.`);
        return;
      }
    }

    // Reusable payment submission function to ensure DB record is saved and status set to COMPLETED
    const completePaymentWithPayload = async (overrideMethod?: PaymentMethod | string) => {
      const method = overrideMethod || selectedMethod || "Counter UPI";
      const payload = {
        appointmentId: appointment.id,
        consultationFee: isPackageMode ? 0 : (includeConsult ? consultationFee : 0),
        medicineFee: isPackageMode ? 0 : (includeMedicine ? medicineFee : 0),
        dietPlanFee: isPackageMode ? 0 : (canChargeDiet && includeDiet ? dietFee : 0),
        totalAmountDue,
        totalPaid: effectivePaidToday,
        payLaterAmount: calculatedPayLater,
        payLaterNotes: isPayLater ? payLaterNotes : undefined,
        previousDuePaid: previousDueAmount,
        hasPackage: isPackageMode,
        isRegularBilling: !isPackageMode,
        skipPackagePayment: !isPackageMode,
        packageInstallmentPaid: isPackageMode ? effectivePaidToday : undefined,
        paymentMethod:
          method === "Cash"
            ? "CASH"
            : method === "Counter UPI"
              ? "COUNTER_UPI"
              : method === "UPI / QR Code"
                ? "ONLINE_UPI"
                : method === "Card"
                  ? "CARD"
                  : method === "Split"
                    ? "SPLIT"
                    : "SEND_TO_APP",
        paymentMode: method,
        status: "COMPLETED",
        isFeeCollected: true,
        splitDetails: method === "Split" ? {
          upi: optedSplitModes.includes("upi") ? splitUpi : 0,
          cash: optedSplitModes.includes("cash") ? splitCash : 0,
          card: optedSplitModes.includes("card") ? splitCard : 0,
          counterUpi: optedSplitModes.includes("counterUpi") ? splitCounterUpi : 0,
          upiTxId: splitUpiRef || undefined,
          cardTxId: splitCardRef || undefined,
        } : undefined,
        medicinesList: (!isPackageMode && (includeMedicine || paymentType === "consult_and_med")) ? medicines : [],
        medicineDuration,
        discountApproved: (!isPackageMode && discountStatus === "APPROVED") ? discountApprovedAmount : 0,
        discountNotes,
        discountStatus,
      };

      const res = await apiFetch<any>("/reception/payment", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.success) {
        const updated = res.appointment || {
          ...appointment,
          status: "COMPLETED",
          isFeeCollected: true,
          totalPaid: effectivePaidToday,
          totalAmountDue,
          payLaterAmount: calculatedPayLater,
          previousDuePaid: previousDueAmount,
          paymentMethod: method,
          paymentMode: method,
          paidAt: new Date().toISOString(),
          invoiceId: `INV-${Date.now().toString().slice(-6)}`,
        };
        setCompletedInvoice(updated);
        setCurrentView("invoice_receipt");
        onPaymentSuccess(updated);
        return updated;
      } else {
        throw new Error(res?.error || "Failed to process payment.");
      }
    };

    setIsSubmitting(true);
    try {
      await completePaymentWithPayload();
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- MOBILE RAZORPAY UPI VERIFICATION ---
  const handleCheckUpiStatus = async (force: boolean = false) => {
    if (!appointment?.id || totalAmountDue <= 0) return;
    setIsVerifyingUpi(true);
    try {
      const upiTargetAmount = isPayLater ? effectivePaidToday : totalAmountDue;
      const res = await apiFetch<any>(
        `/reception/razorpay/check-status?amount=${upiTargetAmount}&appointmentId=${appointment.id}&allowAnyRecent=true${force ? "&forceVerify=true" : ""}`
      );
      if (res.success && res.isPaid) {
        if (selectedMethod === "Split") {
          setIsSplitUpiPaid(true);
          setSplitUpiRef(res.payment?.id || `RZP-${Date.now().toString().slice(-4)}`);
          Alert.alert(
            "Split UPI Verified ✓",
            `Online UPI payment of ₹${res.payment?.amount || splitUpi} verified via Razorpay! Now complete any remaining split payment.`
          );
          return;
        }
        setIsUpiPaid(true);
        Alert.alert(
          "Payment Detected! ✓",
          `Payment of ₹${res.payment?.amount || upiTargetAmount} received via UPI (ID: ${res.payment?.id || 'Razorpay'}). Completing appointment...`
        );
        try {
          const method = selectedMethod || "Counter UPI";
          const payload = {
            appointmentId: appointment.id,
            consultationFee: isPackageMode ? 0 : (includeConsult ? consultationFee : 0),
            medicineFee: isPackageMode ? 0 : (includeMedicine ? medicineFee : 0),
            dietPlanFee: isPackageMode ? 0 : (canChargeDiet && includeDiet ? dietFee : 0),
            totalAmountDue,
            totalPaid: effectivePaidToday,
            payLaterAmount: calculatedPayLater,
            payLaterNotes: isPayLater ? payLaterNotes : undefined,
            previousDuePaid: previousDueAmount,
            hasPackage: isPackageMode,
            isRegularBilling: !isPackageMode,
            skipPackagePayment: !isPackageMode,
            packageInstallmentPaid: isPackageMode ? effectivePaidToday : undefined,
            paymentMethod: method === "UPI / QR Code" ? "ONLINE_UPI" : "COUNTER_UPI",
            paymentMode: method,
            status: "COMPLETED",
            isFeeCollected: true,
            medicinesList: (!isPackageMode && (includeMedicine || paymentType === "consult_and_med")) ? medicines : [],
            medicineDuration,
            discountApproved: (!isPackageMode && discountStatus === "APPROVED") ? discountApprovedAmount : 0,
            discountNotes,
            discountStatus,
          };
          const saveRes = await apiFetch<any>("/reception/payment", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const updated = saveRes?.appointment || res.appointment || {
            ...appointment,
            status: "COMPLETED",
            isFeeCollected: true,
            totalPaid: effectivePaidToday,
            totalAmountDue,
            payLaterAmount: calculatedPayLater,
            paymentMethod: method,
            paymentMode: method,
            paidAt: new Date().toISOString(),
            invoiceId: `INV-${Date.now().toString().slice(-6)}`,
          };
          setCompletedInvoice(updated);
          setCurrentView("invoice_receipt");
          onPaymentSuccess(updated);
        } catch (finalizeErr: any) {
          Alert.alert("Finalize Error", finalizeErr.message || "Failed to save payment record.");
        }
      } else {
        Alert.alert(
          "Payment Pending",
          "Payment not detected yet in Razorpay.\n\nIf the patient has already completed payment or money was debited, tap 'Patient Paid / Confirm Receipt' below."
        );
      }
    } catch (err: any) {
      Alert.alert("Verification Error", err.message || "Failed to check payment status.");
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  const handleManualConfirmUpi = async () => {
    setIsVerifyingUpi(true);
    try {
      const upiTargetAmount = isPayLater ? effectivePaidToday : totalAmountDue;
      const res = await apiFetch<any>(
        `/reception/razorpay/check-status?amount=${upiTargetAmount}&appointmentId=${appointment?.id}&confirmManual=true`
      );
      if (res.success && res.isPaid) {
        if (selectedMethod === "Split") {
          setIsSplitUpiPaid(true);
          setSplitUpiRef(res.payment?.id || `RZP-${Date.now().toString().slice(-4)}`);
          Alert.alert(
            "Split UPI Verified ✓",
            `Online UPI payment of ₹${res.payment?.amount || splitUpi} verified via Razorpay! Now complete any remaining split payment.`
          );
          return;
        }
        setIsUpiPaid(true);
        const method = selectedMethod || "Counter UPI";
        const payload = {
          appointmentId: appointment.id,
          consultationFee: isPackageMode ? 0 : (includeConsult ? consultationFee : 0),
          medicineFee: isPackageMode ? 0 : (includeMedicine ? medicineFee : 0),
          dietPlanFee: isPackageMode ? 0 : (canChargeDiet && includeDiet ? dietFee : 0),
          totalAmountDue,
          totalPaid: effectivePaidToday,
          payLaterAmount: calculatedPayLater,
          payLaterNotes: isPayLater ? payLaterNotes : undefined,
          previousDuePaid: previousDueAmount,
          hasPackage: isPackageMode,
          isRegularBilling: !isPackageMode,
          skipPackagePayment: !isPackageMode,
          packageInstallmentPaid: isPackageMode ? effectivePaidToday : undefined,
          paymentMethod: method === "UPI / QR Code" ? "ONLINE_UPI" : "COUNTER_UPI",
          paymentMode: method,
          status: "COMPLETED",
          isFeeCollected: true,
          medicinesList: (!isPackageMode && (includeMedicine || paymentType === "consult_and_med")) ? medicines : [],
          medicineDuration,
          discountApproved: (!isPackageMode && discountStatus === "APPROVED") ? discountApprovedAmount : 0,
          discountNotes,
          discountStatus,
        };
        const saveRes = await apiFetch<any>("/reception/payment", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const updated = saveRes?.appointment || res.appointment || {
          ...appointment,
          status: "COMPLETED",
          isFeeCollected: true,
          totalPaid: effectivePaidToday,
          totalAmountDue,
          payLaterAmount: calculatedPayLater,
          previousDuePaid: previousDueAmount,
          paymentMethod: method,
          paymentMode: method,
          paidAt: new Date().toISOString(),
          invoiceId: `INV-${Date.now().toString().slice(-6)}`,
        };
        setCompletedInvoice(updated);
        setCurrentView("invoice_receipt");
        onPaymentSuccess(updated);
      }
    } catch (err: any) {
      Alert.alert("Confirmation Error", err.message || "Could not confirm payment.");
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  // Dedicated Card Payment Confirmation (Instantly completes appointment)
  const handleManualConfirmCard = async () => {
    if (selectedMethod === "Split") {
      setIsSplitCardPaid(true);
      setSplitCardRef(`POS-${Date.now().toString().slice(-4)}`);
      Alert.alert("Card Confirmed ✓", `Split Card payment of ₹${splitCard} marked as paid / swiped. Now complete any remaining split payment.`);
      return;
    }
    if (!hasPrescription) {
      Alert.alert(
        "Prescription Required (Mandatory)",
        "A prescription must be uploaded or written in the patient file before completing consultation."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const targetAmount = isPayLater ? effectivePaidToday : totalAmountDue;
      const payload = {
        appointmentId: appointment?.id,
        consultationFee: isPackageMode ? 0 : (includeConsult ? consultationFee : 0),
        medicineFee: isPackageMode ? 0 : (includeMedicine ? medicineFee : 0),
        dietPlanFee: isPackageMode ? 0 : (canChargeDiet && includeDiet ? dietFee : 0),
        totalAmountDue,
        totalPaid: effectivePaidToday,
        payLaterAmount: calculatedPayLater,
        payLaterNotes: isPayLater ? payLaterNotes : undefined,
        previousDuePaid: previousDueAmount,
        hasPackage: isPackageMode,
        isRegularBilling: !isPackageMode,
        skipPackagePayment: !isPackageMode,
        packageInstallmentPaid: isPackageMode ? effectivePaidToday : undefined,
        paymentMethod: "CARD",
        paymentMode: "Card",
        status: "COMPLETED",
        isFeeCollected: true,
        medicinesList: (!isPackageMode && (includeMedicine || paymentType === "consult_and_med")) ? medicines : [],
        medicineDuration,
        discountApproved: (!isPackageMode && discountStatus === "APPROVED") ? discountApprovedAmount : 0,
        discountNotes,
        discountStatus,
      };
      const saveRes = await apiFetch<any>("/reception/payment", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const updated = saveRes?.appointment || {
        ...appointment,
        status: "COMPLETED",
        isFeeCollected: true,
        totalPaid: effectivePaidToday,
        totalAmountDue,
        payLaterAmount: calculatedPayLater,
        previousDuePaid: previousDueAmount,
        paymentMethod: "Card",
        paymentMode: "Card",
        paidAt: new Date().toISOString(),
        invoiceId: `INV-${Date.now().toString().slice(-6)}`,
      };
      setCompletedInvoice(updated);
      setCurrentView("invoice_receipt");
      onPaymentSuccess(updated);
      Alert.alert("Card Payment Completed ✓", `Payment of ₹${targetAmount} recorded via Card. Consultation completed.`);
    } catch (err: any) {
      Alert.alert("Payment Error", err.message || "Failed to record card payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Background polling for live payment detection on mobile (UPI and Card)
  useEffect(() => {
    if (!visible || !appointment?.id || currentView !== "collect_fee" || isUpiPaid) return;
    if (selectedMethod !== "UPI / QR Code" && selectedMethod !== "Card") return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const upiTargetAmount = isPayLater ? effectivePaidToday : totalAmountDue;
        const res = await apiFetch<any>(
          `/reception/razorpay/check-status?amount=${upiTargetAmount}&appointmentId=${appointment.id}&method=${selectedMethod === "Card" ? "card" : "upi"}&allowAnyRecent=true`
        );
        if (isMounted && res.success && res.isPaid) {
          setIsUpiPaid(true);
          const method = selectedMethod || "Card";
          const payload = {
            appointmentId: appointment.id,
            consultationFee: isPackageMode ? 0 : (includeConsult ? consultationFee : 0),
            medicineFee: isPackageMode ? 0 : (includeMedicine ? medicineFee : 0),
            dietPlanFee: isPackageMode ? 0 : (canChargeDiet && includeDiet ? dietFee : 0),
            totalAmountDue,
            totalPaid: effectivePaidToday,
            payLaterAmount: calculatedPayLater,
            payLaterNotes: isPayLater ? payLaterNotes : undefined,
            previousDuePaid: previousDueAmount,
            hasPackage: isPackageMode,
            isRegularBilling: !isPackageMode,
            skipPackagePayment: !isPackageMode,
            packageInstallmentPaid: isPackageMode ? effectivePaidToday : undefined,
            paymentMethod: method === "Card" ? "CARD" : (method === "UPI / QR Code" ? "ONLINE_UPI" : "COUNTER_UPI"),
            paymentMode: method,
            status: "COMPLETED",
            isFeeCollected: true,
            medicinesList: (!isPackageMode && (includeMedicine || paymentType === "consult_and_med")) ? medicines : [],
            medicineDuration,
            discountApproved: (!isPackageMode && discountStatus === "APPROVED") ? discountApprovedAmount : 0,
            discountNotes,
            discountStatus,
          };
          const saveRes = await apiFetch<any>("/reception/payment", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const updated = saveRes?.appointment || res.appointment || {
            ...appointment,
            status: "COMPLETED",
            isFeeCollected: true,
            totalPaid: effectivePaidToday,
            totalAmountDue,
            payLaterAmount: calculatedPayLater,
            previousDuePaid: previousDueAmount,
            paymentMethod: method,
            paymentMode: method,
            paidAt: new Date().toISOString(),
            invoiceId: `INV-${Date.now().toString().slice(-6)}`,
          };
          setCompletedInvoice(updated);
          setCurrentView("invoice_receipt");
          onPaymentSuccess(updated);
        }
      } catch {
        // silent
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [visible, appointment?.id, currentView, selectedMethod, totalAmountDue, isUpiPaid]);

  // --- WHATSAPP SHARE RECEIPT ---
  const handleShareWhatsApp = () => {
    const rawPhone = completedInvoice?.phoneNumber || completedInvoice?.phone || appointment?.phoneNumber || appointment?.phone || "";
    const phone = rawPhone.replace(/\D/g, "").slice(-10);
    const invoiceNum = completedInvoice?.invoiceId || "INV-RECEIPT";
    const totalPaidNum = Number(
      completedInvoice?.totalPaid ?? completedInvoice?.totalAmountDue ?? totalAmountDue
    ).toFixed(2);
    const dateStr = completedInvoice?.appointmentDate || appointment?.appointmentDate || new Date().toISOString().slice(0, 10);
    const timeStr = completedInvoice?.timeSlot ? ` at ${completedInvoice.timeSlot}` : "";
    const formatPaymentMethod = (m: string = "") => {
      const upper = (m || "").toUpperCase();
      if (upper.includes("UPI")) return "UPI";
      if (upper.includes("CASH")) return "CASH";
      if (upper.includes("CARD")) return "CARD";
      return upper || "UPI";
    };

    const method = formatPaymentMethod(completedInvoice?.paymentMode || completedInvoice?.paymentMethod || selectedMethod || "Counter UPI");

    const targetBranch = completedInvoice?.branch || appointment?.branch || "KPHB Branch";
    const branchPhone = getBranchPhone(targetBranch);

    const message = encodeURIComponent(
      `*SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT*\n` +
      `--------------------------------\n` +
      `Receipt No: ${invoiceNum}\n` +
      `Patient Name: ${completedInvoice?.patientName || appointment?.patientName}\n` +
      `Phone: +91 ${phone}\n` +
      `Doctor: ${completedInvoice?.doctorName || appointment?.doctorName || "Dr. Prashanth K Vaidya"}\n` +
      `Branch: ${targetBranch}\n` +
      `Schedule: ${dateStr}${timeStr}\n` +
      `Specialty: Homeopathy\n` +
      `--------------------------------\n` +
      `*TOTAL AMOUNT PAID: ₹${totalPaidNum}*\n` +
      `Payment Mode: VIA ${method}\n` +
      `Payment Status: ${Number(completedInvoice?.payLaterAmount) > 0 ? "PARTIAL PAID" : "PAID ✓"}\n` +
      (Number(completedInvoice?.payLaterAmount) > 0
        ? `*Remaining Need to Pay (Pay Later): ₹${Number(completedInvoice.payLaterAmount).toFixed(2)}*\n`
        : "") +
      `--------------------------------\n` +
      `*Fee Breakdown:*\n` +
      (Number(completedInvoice?.consultationFee ?? consultationFee) > 0
        ? `• Consultation Fee: ₹${Number(completedInvoice?.consultationFee ?? consultationFee).toFixed(2)}\n`
        : "") +
      (Number(completedInvoice?.medicineFee ?? medicineFee) > 0
        ? `• Medicine Fee (${completedInvoice?.medicineDuration || medicineDuration || "1 Month"}): ₹${Number(completedInvoice?.medicineFee ?? medicineFee).toFixed(2)}\n`
        : "") +
      (Number(completedInvoice?.dietPlanFee ?? dietFee) > 0
        ? `• Diet Plan: ₹${Number(completedInvoice?.dietPlanFee ?? dietFee).toFixed(2)}\n`
        : "") +
      (Number(completedInvoice?.otherCharges ?? 0) > 0
        ? `• Other Charges: ₹${Number(completedInvoice?.otherCharges).toFixed(2)}\n`
        : "") +
      (Number(completedInvoice?.previousDuePaid) > 0
        ? `• Previous Pending Balance Cleared: ₹${Number(completedInvoice.previousDuePaid).toFixed(2)}\n`
        : "") +
      (Number(completedInvoice?.discount ?? 0) > 0
        ? `• Discount Applied: -₹${Number(completedInvoice?.discount).toFixed(2)}\n`
        : "") +
      `--------------------------------\n` +
      `Branch Helpline: ${branchPhone} | spiritualhomeo.com\n` +
      `This is a computer-generated bill. No signature is required.`
    );

    Linking.openURL(`https://wa.me/91${phone}?text=${message}`).catch(() => {
      Alert.alert("Unable to open WhatsApp", "Please make sure WhatsApp is installed on your device.");
    });
  };

  const formatPaymentMethod = (m: string = "") => {
    const upper = (m || "").toUpperCase();
    if (upper.includes("UPI")) return "UPI";
    if (upper.includes("CASH")) return "CASH";
    if (upper.includes("CARD")) return "CARD";
    return upper || "UPI";
  };

  // --- PRINT / SHARE RECEIPT ---
  const handlePrintOrShare = async () => {
    if (Platform.OS === "web" && typeof window !== "undefined" && (window as any).print) {
      (window as any).print();
      return;
    }
    const rawPhone = completedInvoice?.phoneNumber || completedInvoice?.phone || appointment?.phoneNumber || appointment?.phone || "";
    const phone = rawPhone.replace(/\D/g, "").slice(-10);
    const invoiceNum = completedInvoice?.invoiceId || "INV-RECEIPT";
    const totalPaidNum = Number(
      completedInvoice?.totalPaid ?? completedInvoice?.totalAmountDue ?? totalAmountDue
    ).toFixed(2);
    const dateStr = completedInvoice?.appointmentDate || appointment?.appointmentDate || new Date().toISOString().slice(0, 10);
    const method = formatPaymentMethod(completedInvoice?.paymentMode || completedInvoice?.paymentMethod || selectedMethod || "Counter UPI");

    const targetBranch = completedInvoice?.branch || appointment?.branch || "KPHB Branch";
    const branchPhone = getBranchPhone(targetBranch);

    const summary =
      `SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT\n` +
      `Receipt No: ${invoiceNum}\n` +
      `Patient: ${completedInvoice?.patientName || appointment?.patientName} (+91 ${phone})\n` +
      `Doctor: ${completedInvoice?.doctorName || appointment?.doctorName || "Dr. Prashanth K Vaidya"}\n` +
      `Branch: ${targetBranch}\n` +
      `Date: ${dateStr}\n` +
      `TOTAL PAID: ₹${totalPaidNum} (VIA ${method})\n` +
      `Status: ${Number(completedInvoice?.payLaterAmount) > 0 ? "PARTIAL PAID" : "PAID ✓"}\n` +
      (Number(completedInvoice?.payLaterAmount) > 0 ? `Remaining Need to Pay (Pay Later): ₹${Number(completedInvoice.payLaterAmount).toFixed(2)}\n` : "") +
      `Branch Helpline: ${branchPhone} | spiritualhomeo.com`;

    try {
      await Share.share({
        title: `Payment Receipt - ${completedInvoice?.patientName || appointment?.patientName}`,
        message: summary,
      });
    } catch {
      // Ignored
    }
  };

  if (!visible || !appointment) {
    return null;
  }

  const rawPhone = completedInvoice?.phoneNumber || completedInvoice?.phone || appointment?.phoneNumber || appointment?.phone || "";
  const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
  const displayTotal = Number(
    completedInvoice?.totalPaid ?? completedInvoice?.totalAmountDue ?? totalAmountDue
  ).toFixed(2);
  const displayPaymentMode = formatPaymentMethod(
    completedInvoice?.paymentMode ||
    completedInvoice?.paymentMethod ||
    selectedMethod ||
    "Counter UPI"
  );
  const issuedDateObj = completedInvoice?.paidAt ? new Date(completedInvoice.paidAt) : new Date();
  const formattedIssuedDate = `${issuedDateObj.toLocaleDateString("en-GB")}, ${issuedDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top", "bottom", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.container}>
            {currentView === "invoice_receipt" ? (
              <View style={{ flex: 1 }}>
                {/* TOP ACTION TOOLBAR */}
                <View style={styles.receiptTopBar}>
                  <TouchableOpacity style={styles.headerBackBtn} onPress={onClose} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color="#0f172a" />
                  </TouchableOpacity>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.receiptTopBarTitle}>Receipt &amp; Tax Invoice</Text>
                    <Text style={styles.receiptTopBarSub}>{completedInvoice?.patientName || appointment.patientName} • {completedInvoice?.branch || appointment.branch || "KPHB"}</Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TouchableOpacity
                      style={styles.whatsAppTopBtn}
                      onPress={handleShareWhatsApp}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="#15803d" />
                      <Text style={styles.whatsAppTopBtnText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareTopBtn}
                      onPress={handlePrintOrShare}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-social-outline" size={13} color="#ffffff" />
                      <Text style={styles.shareTopBtnText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* SCROLLABLE RECEIPT PAPER */}
                <ScrollView style={styles.scrollArea} contentContainerStyle={styles.receiptScrollContent}>
                  <View style={styles.receiptCard}>
                    {/* 1. Header: Logo Left, Website/Email Right */}
                    <View style={styles.receiptHeaderRow}>
                      <Image
                        source={require("../../../assets/SH logo.png")}
                        style={styles.receiptLogo}
                        resizeMode="contain"
                      />

                      <View style={styles.receiptContactCol}>
                        <Text style={styles.receiptWebText}>spiritualhomeoclinic.com</Text>
                        <Text style={styles.receiptEmailText}>support@spiritualhomeo.com</Text>
                      </View>
                    </View>

                    {/* 2. Lime Green Accent Bar */}
                    <View style={styles.receiptGreenBar} />

                    {/* 3. Title & Receipt Badge */}
                    <View style={styles.receiptTitleRow}>
                      <Text style={styles.receiptTitleText}>PAYMENT RECEIPT</Text>
                      <View style={styles.receiptBadgePill}>
                        <Text style={styles.receiptBadgeText}>RECEIPT</Text>
                      </View>
                    </View>

                    {/* 4. Patient Details Grid */}
                    <View style={styles.receiptSectionBox}>
                      <Text style={styles.receiptSectionHeader}>PATIENT DETAILS</Text>

                      <View style={styles.receiptGridRow}>
                        {/* Left Column */}
                        <View style={styles.receiptGridCol}>
                          <View style={styles.receiptFieldGroup}>
                            <Text style={styles.receiptFieldLabel}>PATIENT NAME</Text>
                            <Text style={styles.receiptFieldValueBold}>{completedInvoice?.patientName || appointment.patientName}</Text>
                          </View>
                          <View style={styles.receiptDividerLine} />

                          <View style={styles.receiptFieldGroup}>
                            <Text style={styles.receiptFieldLabel}>CONSULTANT DOCTOR</Text>
                            <Text style={styles.receiptFieldValueBold}>{completedInvoice?.doctorName || appointment.doctorName || "Dr. Prashanth K Vaidya"}</Text>
                          </View>
                          <View style={styles.receiptDividerLine} />

                          <View style={styles.receiptFieldGroup}>
                            <Text style={styles.receiptFieldLabel}>APPOINTMENT SCHEDULE</Text>
                            <Text style={styles.receiptFieldValueBold}>
                              {completedInvoice?.appointmentDate || appointment.appointmentDate || new Date().toISOString().slice(0, 10)}
                              {completedInvoice?.timeSlot ? ` at ${completedInvoice.timeSlot}` : " at 02:30 PM"}
                            </Text>
                          </View>
                        </View>

                        {/* Right Column */}
                        <View style={styles.receiptGridCol}>
                          <View style={styles.receiptFieldGroup}>
                            <Text style={styles.receiptFieldLabel}>PHONE NUMBER</Text>
                            <Text style={styles.receiptFieldValueBold}>+91 {cleanPhone || "9248868597"}</Text>
                          </View>
                          <View style={styles.receiptDividerLine} />

                          <View style={styles.receiptFieldGroup}>
                            <Text style={styles.receiptFieldLabel}>CLINIC BRANCH</Text>
                            <Text style={styles.receiptFieldValueBold}>{completedInvoice?.branch || appointment.branch || "KPHB Branch"}</Text>
                          </View>
                          <View style={styles.receiptDividerLine} />

                          <View style={styles.receiptFieldGroup}>
                            <Text style={styles.receiptFieldLabel}>SPECIALTY</Text>
                            <Text style={styles.receiptFieldValueBold}>Homeopathy</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* 5. Payment Information Dashed Box */}
                    <View style={styles.receiptSectionBox}>
                      <Text style={styles.receiptSectionHeader}>PAYMENT INFORMATION</Text>

                      {Number(completedInvoice?.payLaterAmount) > 0 ? (
                        <View style={styles.receiptPayLaterOrangeCard}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View>
                              <Text style={styles.receiptPayLaterLabel}>AMOUNT PAID TODAY</Text>
                              <Text style={styles.receiptPayLaterPaidAmount}>₹{displayTotal}</Text>
                              <Text style={styles.receiptPayLaterVia}>Via {displayPaymentMode}</Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <View style={styles.receiptPayLaterBadge}>
                                <Text style={styles.receiptPayLaterBadgeText}>PAY LATER ACTIVE</Text>
                              </View>
                              <Text style={styles.receiptPayLaterDueLabel}>REMAINING NEED TO PAY</Text>
                              <Text style={styles.receiptPayLaterDueAmount}>
                                ₹{Number(completedInvoice.payLaterAmount).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.receiptPaymentBox}>
                          <View>
                            <Text style={styles.receiptPaymentBoxLabel}>TOTAL AMOUNT PAID</Text>
                            <Text style={styles.receiptPaymentBoxAmount}>₹{displayTotal}</Text>
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            <View style={styles.receiptPaidPill}>
                              <Text style={styles.receiptPaidPillText}>PAID ✓</Text>
                            </View>
                            <Text style={styles.receiptViaText}>VIA {displayPaymentMode}</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* 6. Fee Breakdown Table */}
                    <View style={styles.receiptSectionBox}>
                      <Text style={styles.receiptSectionHeader}>FEE BREAKDOWN</Text>

                      <View style={styles.breakdownTable}>
                        <View style={styles.breakdownHeadRow}>
                          <Text style={styles.breakdownHeadDesc}>DESCRIPTION</Text>
                          <Text style={styles.breakdownHeadAmount}>AMOUNT (₹)</Text>
                        </View>

                        {/* Package Installment */}
                        {(isPackageMode || completedInvoice?.hasPackage) && (
                          <View style={styles.breakdownRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.breakdownRowDesc}>Package Treatment Installment</Text>
                              <Text style={{ fontSize: 9.5, color: "#64748b" }}>{pkgName || "Care Package"}</Text>
                            </View>
                            <Text style={[styles.breakdownRowAmount, { color: "#0284c7" }]}>
                              ₹{Number(displayTotal).toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {/* Consultation Fee */}
                        {Number(completedInvoice?.consultationFee ?? consultationFee) > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownRowDesc}>Consultation Fee</Text>
                            <Text style={styles.breakdownRowAmount}>
                              ₹{Number(completedInvoice?.consultationFee ?? consultationFee).toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {/* Medicines */}
                        {completedInvoice?.medicines && completedInvoice.medicines.length > 0 ? (
                          completedInvoice.medicines.map((m: any, idx: number) => (
                            <View key={idx} style={styles.breakdownRow}>
                              <Text style={styles.breakdownRowDesc}>
                                {m.name || "Prescribed Medicine"} {m.type ? `(${m.type})` : ""}
                              </Text>
                              <Text style={styles.breakdownRowAmount}>₹{Number(m.amount).toFixed(2)}</Text>
                            </View>
                          ))
                        ) : Number(completedInvoice?.medicineFee ?? medicineFee) > 0 ? (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownRowDesc}>
                              Medicine Fee ({completedInvoice?.medicineDuration || medicineDuration || "1 Month"})
                            </Text>
                            <Text style={styles.breakdownRowAmount}>
                              ₹{Number(completedInvoice?.medicineFee ?? medicineFee).toFixed(2)}
                            </Text>
                          </View>
                        ) : null}

                        {/* Diet Plan */}
                        {Number(completedInvoice?.dietPlanFee ?? dietFee) > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownRowDesc}>Diet &amp; Nutrition Plan</Text>
                            <Text style={styles.breakdownRowAmount}>
                              ₹{Number(completedInvoice?.dietPlanFee ?? dietFee).toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {/* Other Charges */}
                        {Number(completedInvoice?.otherCharges ?? 0) > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownRowDesc}>Other Clinic Charges</Text>
                            <Text style={styles.breakdownRowAmount}>
                              ₹{Number(completedInvoice?.otherCharges).toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {/* Previous Pending Balance (Cleared) - Separate Line */}
                        {Number(completedInvoice?.previousDuePaid) > 0 && (
                          <View style={[styles.breakdownRow, { backgroundColor: "#fff7ed" }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.breakdownRowDesc, { color: "#c2410c", fontWeight: "700" }]}>
                                Previous Pending Balance (Cleared)
                              </Text>
                              <Text style={{ fontSize: 9.5, color: "#ea580c" }}>Billed &amp; settled in this visit</Text>
                            </View>
                            <Text style={[styles.breakdownRowAmount, { color: "#c2410c", fontWeight: "700" }]}>
                              + ₹{Number(completedInvoice?.previousDuePaid).toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {/* Discount */}
                        {Number(completedInvoice?.discount ?? 0) > 0 && (
                          <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownRowDesc, { color: "#dc2626" }]}>
                              Discount ({completedInvoice?.discountReason || "Special Waiver"})
                            </Text>
                            <Text style={[styles.breakdownRowAmount, { color: "#dc2626" }]}>
                              - ₹{Number(completedInvoice?.discount).toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {/* TOTAL PAID / PAY LATER BREAKDOWN */}
                        {Number(completedInvoice?.payLaterAmount) > 0 ? (
                          <>
                            <View style={[styles.breakdownTotalRow, { backgroundColor: "#fff7ed", borderColor: "#fed7aa" }]}>
                              <Text style={[styles.breakdownTotalDesc, { color: "#9a3412" }]}>TOTAL BILL AMOUNT</Text>
                              <Text style={[styles.breakdownTotalAmount, { color: "#9a3412" }]}>
                                ₹{(Number(displayTotal) + Number(completedInvoice.payLaterAmount)).toFixed(2)}
                              </Text>
                            </View>
                            <View style={styles.breakdownTotalRow}>
                              <Text style={styles.breakdownTotalDesc}>AMOUNT PAID TODAY ({displayPaymentMode})</Text>
                              <Text style={[styles.breakdownTotalAmount, { color: "#16a34a" }]}>₹{displayTotal}</Text>
                            </View>
                            <View style={[styles.breakdownTotalRow, { backgroundColor: "#ea580c", marginTop: 4, borderRadius: 6 }]}>
                              <Text style={[styles.breakdownTotalDesc, { color: "#ffffff", fontWeight: "900" }]}>
                                REMAINING NEED TO PAY (PAY LATER)
                              </Text>
                              <Text style={[styles.breakdownTotalAmount, { color: "#ffffff", fontWeight: "900" }]}>
                                ₹{Number(completedInvoice.payLaterAmount).toFixed(2)}
                              </Text>
                            </View>
                          </>
                        ) : (
                          <View style={styles.breakdownTotalRow}>
                            <Text style={styles.breakdownTotalDesc}>TOTAL PAID ({displayPaymentMode})</Text>
                            <Text style={styles.breakdownTotalAmount}>₹{displayTotal}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* 7. Metadata & Disclaimer */}
                    <View style={styles.receiptMetaCol}>
                      <Text style={styles.receiptMetaText}>
                        Payment ID: <Text style={{ fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", color: "#334155" }}>{completedInvoice?.invoiceId || "WALKIN_COUNTER_UPI"}</Text>
                      </Text>
                      <Text style={styles.receiptMetaText}>Issued At: {formattedIssuedDate}</Text>
                      <Text style={styles.receiptDisclaimer}>This is a computer generated bill. No signature is required.</Text>
                    </View>

                    {/* 8. Bottom Green Footer Bar */}
                    <View style={styles.receiptFooterGreen}>
                      <View style={styles.receiptFooterItem}>
                        <Ionicons name="call" size={10} color="#ffffff" />
                        <Text style={styles.receiptFooterItemText}>
                          {getBranchPhone(completedInvoice?.branch || appointment?.branch || "KPHB Branch")}
                        </Text>
                      </View>
                      <View style={styles.receiptFooterItem}>
                        <Ionicons name="mail" size={10} color="#ffffff" />
                        <Text style={styles.receiptFooterItemText}>support@spiritualhomeo.com</Text>
                      </View>
                      <View style={styles.receiptFooterItem}>
                        <Ionicons name="globe-outline" size={10} color="#ffffff" />
                        <Text style={styles.receiptFooterItemText}>spiritualhomeoclinic.com</Text>
                      </View>
                      <View style={styles.receiptFooterItem}>
                        <Ionicons name="location" size={10} color="#ffffff" />
                        <Text style={styles.receiptFooterItemText}>{(completedInvoice?.branch || appointment?.branch || "KPHB Branch").toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Return Button */}
                  <TouchableOpacity style={styles.receiptDoneBtn} onPress={onClose} activeOpacity={0.8}>
                    <Text style={styles.receiptDoneBtnText}>Close &amp; Return</Text>
                  </TouchableOpacity>
                  <View style={{ height: 25 }} />
                </ScrollView>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {/* TOP HEADER (Matching Screenshot) */}
                <View style={styles.topHeader}>
                  <TouchableOpacity style={styles.headerBackBtn} onPress={onClose} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color="#0f172a" />
                  </TouchableOpacity>

                  <View style={styles.headerTitleCol}>
                    <Text style={styles.headerTitle}>Appointment Payment</Text>
                    <Text style={styles.headerSubtitle}>Review and complete payment</Text>
                  </View>

                  <TouchableOpacity style={styles.headerCloseBtn} onPress={onClose} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                >
                  {/* PREVIOUS PENDING BALANCE ALERT BOX */}
                  {previousPendingBalance > 0 && (
                    <View style={styles.prevDueAlertCard}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                        <Ionicons name="warning" size={22} color="#ea580c" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                            <Text style={styles.prevDueAlertTitle}>
                              Previous Pending Balance: ₹{previousPendingBalance.toLocaleString()}
                            </Text>
                            <View style={styles.prevDueAlertBadge}>
                              <Text style={styles.prevDueAlertBadgeText}>UNPAID DUE</Text>
                            </View>
                          </View>
                          <Text style={styles.prevDueAlertSub}>
                            This patient has an unpaid balance from a previous visit. Choose whether to add it to this bill or leave it for next visit.
                          </Text>

                          <View style={styles.prevDueOptionRow}>
                            <TouchableOpacity
                              style={[styles.prevDueOptionBtn, includePreviousDue && styles.prevDueOptionBtnActive]}
                              onPress={() => setIncludePreviousDue(true)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={includePreviousDue ? "checkbox" : "square-outline"}
                                size={18}
                                color={includePreviousDue ? "#ea580c" : "#64748b"}
                              />
                              <Text style={[styles.prevDueOptionText, includePreviousDue && styles.prevDueOptionTextActive]}>
                                Add to Current Bill (+₹{previousPendingBalance})
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.prevDueOptionBtn, !includePreviousDue && styles.prevDueOptionBtnActive]}
                              onPress={() => setIncludePreviousDue(false)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={!includePreviousDue ? "checkbox" : "square-outline"}
                                size={18}
                                color={!includePreviousDue ? "#ea580c" : "#64748b"}
                              />
                              <Text style={[styles.prevDueOptionText, !includePreviousDue && styles.prevDueOptionTextActive]}>
                                Leave for Next Visit
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* 1. TARGET AMOUNT BOX (Matching Screenshot 2) */}
                  <View style={[styles.targetCard, isPackageMode && { opacity: 0.7, backgroundColor: "#f8fafc" }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={styles.targetCardTitle}>Target Amount (Consultation + Medicine):</Text>
                        {isPackageMode && (
                          <View style={{ backgroundColor: "#e0f2fe", paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: "800", color: "#0284c7" }}>Covered Under Package</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.targetCardSub}>
                        {isPackageMode
                          ? "Disabled: Covered by package installment. Tap 'Regular Visit' below to activate target amount."
                          : "Split & presets calculate strictly within this target"}
                      </Text>
                    </View>

                    <View style={[styles.targetInputWrapper, isPackageMode && { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" }]}>
                      <Text style={styles.rupeeSymbol}>₹</Text>
                      <TextInput
                        style={[styles.targetTextInput, isPackageMode && { color: "#94a3b8" }]}
                        editable={!isPackageMode}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                        value={isPackageMode ? "0" : targetAmount}
                        onChangeText={handleTargetAmountChange}
                      />
                    </View>
                  </View>

                  {/* 2. PAYMENT TYPE TABS (Package only available for active package members from Patient File) */}
                  <View style={styles.typeTabsRow}>
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
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.typeTab, isSelected && styles.typeTabActive]}
                          onPress={() => handlePaymentTypeChange(t.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.typeTabText, isSelected && styles.typeTabTextActive]}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* PACKAGE MEMBER BANNER & MODE TOGGLE */}
                  {isPackageMember && (
                    <View style={styles.packageBannerCard}>
                      <View style={styles.packageHeaderRow}>
                        <View style={styles.packageBadgeRow}>
                          <View style={styles.packageBadgePill}>
                            <Text style={styles.packageBadgeText}>PKG MEMBER</Text>
                          </View>
                          <Text style={styles.packageNameTitle} numberOfLines={1}>
                            {pkgName}
                          </Text>
                        </View>
                        <Text style={styles.packageValidityText}>
                          Valid till: {pkgEndDate}
                        </Text>
                      </View>

                      {/* Billing Mode Switch Pills */}
                      <View style={styles.packageModeToggleRow}>
                        <TouchableOpacity
                          style={[styles.packageModeBtn, billingMode === "package" && styles.packageModeBtnActive]}
                          onPress={() => handleSelectBillingMode("package")}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.packageModeBtnText, billingMode === "package" && styles.packageModeBtnTextActive]}>
                            ✓ Pay Package Installment
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.packageModeBtn, billingMode === "regular" && styles.packageModeBtnActive]}
                          onPress={() => handleSelectBillingMode("regular")}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.packageModeBtnText, billingMode === "regular" && styles.packageModeBtnTextActive]}>
                            ⚡ Regular Visit / Extra Medicine
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Mode Description & Inputs */}
                      {billingMode === "package" ? (
                        <>
                          {/* 3 Stats Boxes */}
                          <View style={styles.packageStatsRow}>
                            <View style={styles.packageStatBox}>
                              <Text style={styles.packageStatLabel}>TOTAL PACKAGE</Text>
                              <Text style={styles.packageStatValue}>₹{pkgTotal.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.packageStatBox, { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }]}>
                              <Text style={[styles.packageStatLabel, { color: "#16a34a" }]}>PAID SO FAR</Text>
                              <Text style={[styles.packageStatValue, { color: "#15803d" }]}>₹{pkgPaid.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.packageStatBox, { borderColor: "#bae6fd", backgroundColor: "#f0f9ff" }]}>
                              <Text style={[styles.packageStatLabel, { color: "#0284c7" }]}>REMAINING</Text>
                              <Text style={[styles.packageStatValue, { color: "#0369a1" }]}>₹{pkgPending.toLocaleString()}</Text>
                            </View>
                          </View>

                          {/* Installment Amount Input */}
                          <View style={styles.packageInstallmentBox}>
                            <Text style={styles.packageInstallmentLabel}>
                              Pay Package Installment For This Visit (₹) <Text style={{ color: "#ef4444" }}>*</Text>
                            </Text>
                            <View style={styles.packageAmountInputRow}>
                              <Text style={styles.packageRupeeIcon}>₹</Text>
                              <TextInput
                                style={styles.packageAmountInput}
                                keyboardType="numeric"
                                placeholder="Enter installment amount..."
                                placeholderTextColor="#94a3b8"
                                value={packageInstallmentAmount}
                                onChangeText={setPackageInstallmentAmount}
                              />
                            </View>
                            <Text style={styles.packageInstallmentHint}>
                              Doctor consultation & medicines are covered under package. Balance after this visit: ₹{Math.max(0, pkgPending - (parseFloat(packageInstallmentAmount) || 0)).toLocaleString()}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.packagePausedInfoBox}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Ionicons name="information-circle" size={16} color="#0369a1" />
                            <Text style={styles.packagePausedTitle}>Package Installment Paused for this Visit</Text>
                          </View>
                          <Text style={styles.packagePausedSub}>
                            Patient package ({pkgName}) remains active. Target amount is now enabled above and regular consultation & medicine charges apply below.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {!isPackageMode && (
                    <>
                      {/* 3. CONSULTATION FEE CARD (or Consultation & Medicine Fee) */}
                      <View style={[styles.feeCard, includeConsult && styles.feeCardActive]}>
                        <View style={styles.feeCardHeaderRow}>
                          <TouchableOpacity
                            style={styles.feeCardCheckboxTouch}
                            onPress={handleToggleConsult}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={includeConsult ? "checkmark-circle" : "ellipse-outline"}
                              size={22}
                              color={includeConsult ? "#0284c7" : "#cbd5e1"}
                            />
                            <View style={styles.feeCardTextCol}>
                              <Text style={styles.feeCardTitle}>
                                {paymentType === "consult_and_med" ? "Consultation & Medicine Fee" : "Consultation Fee"}
                              </Text>
                              <Text style={styles.feeCardSub}>
                                {paymentType === "consult_and_med"
                                  ? "Combined Doctor Consultation & Prescribed Remedies Fee"
                                  : "Doctor Requested Consultation Fee"}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={styles.amountInputBox}>
                            <Text style={styles.inputRupee}>₹</Text>
                            <TextInput
                              style={styles.amountInputText}
                              keyboardType="numeric"
                              editable={includeConsult}
                              placeholder="0"
                              placeholderTextColor="#94a3b8"
                              value={consultationFee > 0 ? String(consultationFee) : ""}
                              onChangeText={handleConsultFeeChange}
                            />
                          </View>
                        </View>

                        {/* MEDICINES EXPANSION INSIDE CONSULTATION & MEDICINE CARD */}
                        {paymentType === "consult_and_med" && includeConsult && (
                          <View style={styles.medicinesExpansionSection}>
                            <View style={[styles.itemizedHeaderRow, { marginBottom: 6 }]}>
                              <Text style={styles.itemizedHeaderTitle}>Prescribed Medicines</Text>
                              <TouchableOpacity
                                style={styles.addMedicineBtn}
                                onPress={() => {
                                  setShowDetailedMedicines(true);
                                  handleAddMedicine();
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.addMedicineBtnText}>+ Add Medicine</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Duration selector chips */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                              {["15 Days", "1 Month", "2 Months", "3 Months", "6 Months"].map((dur) => (
                                <TouchableOpacity
                                  key={dur}
                                  style={[styles.durationChip, medicineDuration === dur && styles.durationChipActive]}
                                  onPress={() => setMedicineDuration(dur)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.durationChipText, medicineDuration === dur && styles.durationChipTextActive]}>
                                    {dur}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>

                            {showDetailedMedicines ? (
                              <View style={{ gap: 8, marginTop: 4 }}>
                                {medicines.map((med, idx) => (
                                  <View key={med.id} style={styles.medicineItemCard}>
                                    <View style={styles.medRowTop}>
                                      <View style={styles.medIndexBadge}>
                                        <Text style={styles.medIndexBadgeText}>#{idx + 1}</Text>
                                      </View>
                                      <TextInput
                                        style={styles.medNameInput}
                                        placeholder="Enter Medicine Name (e.g. Arnica 30C)"
                                        placeholderTextColor="#94a3b8"
                                        value={med.name}
                                        onChangeText={(txt) => handleUpdateMedicine(med.id, { name: txt })}
                                      />
                                      {medicines.length > 1 && (
                                        <TouchableOpacity
                                          onPress={() => handleRemoveMedicine(med.id)}
                                          style={{ padding: 4 }}
                                        >
                                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                      )}
                                    </View>

                                    <View style={styles.medRowBottom}>
                                      <TouchableOpacity
                                        style={styles.dropdownMiniBtn}
                                        onPress={() => setActiveTypeMedId(med.id)}
                                        activeOpacity={0.7}
                                      >
                                        <Text style={styles.dropdownMiniText} numberOfLines={1}>{med.type || "Type"}</Text>
                                        <Ionicons name="chevron-down" size={12} color="#64748b" />
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={styles.dropdownMiniBtn}
                                        onPress={() => setActiveTimingMedId(med.id)}
                                        activeOpacity={0.7}
                                      >
                                        <Text style={styles.dropdownMiniText} numberOfLines={1}>{med.timing || "Timing"}</Text>
                                        <Ionicons name="chevron-down" size={12} color="#64748b" />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                ))}

                                <TouchableOpacity
                                  onPress={() => setShowDetailedMedicines(false)}
                                  style={{ alignSelf: "flex-start", marginTop: 2 }}
                                >
                                  <Text style={{ fontSize: 10, color: "#64748b", fontWeight: "600" }}>
                                    Hide Medicine Details
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                                <Text style={{ fontSize: 11, color: "#64748b" }}>
                                  {medicines.some((m) => m.name) ? `${medicines.filter((m) => m.name).length} medicines loaded` : "Standard prescription remedies"}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => setShowDetailedMedicines(true)}
                                  style={{ paddingVertical: 2, paddingHorizontal: 6 }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#0284c7" }}>
                                    View Details ▾
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      {/* 4. PRESCRIBED MEDICINES CARD (Shown for Split & Consultation modes) */}
                      {paymentType !== "consult_and_med" && (
                        <View
                          style={[
                            styles.feeCard,
                            includeMedicine && styles.feeCardActive,
                          ]}
                        >
                          <View style={styles.feeCardHeaderRow}>
                            <TouchableOpacity
                              style={styles.feeCardCheckboxTouch}
                              onPress={handleToggleMedicine}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={includeMedicine ? "checkmark-circle" : "ellipse-outline"}
                                size={22}
                                color={includeMedicine ? "#0284c7" : "#cbd5e1"}
                              />
                              <View style={styles.feeCardTextCol}>
                                <Text style={styles.feeCardTitle}>Prescribed Medicines</Text>
                                <Text style={styles.feeCardSub}>Prescribed Remedies / Pharmacy Fee</Text>
                              </View>
                            </TouchableOpacity>

                            <View style={styles.amountInputBox}>
                              <Text style={styles.inputRupee}>₹</Text>
                              <TextInput
                                style={styles.amountInputText}
                                keyboardType="numeric"
                                editable={includeMedicine}
                                value={String(medicineFee)}
                                onChangeText={(val) => {
                                  const num = parseFloat(val) || 0;
                                  setMedicineFee(num);
                                }}
                              />
                            </View>
                          </View>

                          {/* PRESCRIBED MEDICINES ITEMS */}
                          {includeMedicine && (
                            <View style={styles.medicinesExpansionSection}>
                              {showDetailedMedicines ? (
                                <>
                                  <View style={styles.itemizedHeaderRow}>
                                    <Text style={styles.itemizedHeaderTitle}>Prescribed Medicine Items ({medicines.length})</Text>
                                    <TouchableOpacity style={styles.addMedicineBtn} onPress={handleAddMedicine} activeOpacity={0.7}>
                                      <Text style={styles.addMedicineBtnText}>+ Add Medicine</Text>
                                    </TouchableOpacity>
                                  </View>

                                  <View style={{ gap: 8, marginTop: 8 }}>
                                    {medicines.map((med, idx) => (
                                      <View key={med.id} style={styles.medicineItemCard}>
                                        <View style={styles.medRowTop}>
                                          <View style={styles.medIndexBadge}>
                                            <Text style={styles.medIndexBadgeText}>#{idx + 1}</Text>
                                          </View>
                                          <TextInput
                                            style={styles.medNameInput}
                                            placeholder="Enter Medicine Name (e.g. Arnica 30C)"
                                            placeholderTextColor="#94a3b8"
                                            value={med.name}
                                            onChangeText={(txt) => handleUpdateMedicine(med.id, { name: txt })}
                                          />
                                          {medicines.length > 1 && (
                                            <TouchableOpacity
                                              onPress={() => handleRemoveMedicine(med.id)}
                                              style={{ padding: 4 }}
                                            >
                                              <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                          )}
                                        </View>

                                        <View style={styles.medRowBottom}>
                                          {/* Type Selector Pop-up Pill */}
                                          <TouchableOpacity
                                            style={styles.dropdownMiniBtn}
                                            onPress={() => setActiveTypeMedId(med.id)}
                                            activeOpacity={0.7}
                                          >
                                            <Text style={styles.dropdownMiniText} numberOfLines={1}>{med.type || "Type"}</Text>
                                            <Ionicons name="chevron-down" size={12} color="#64748b" />
                                          </TouchableOpacity>

                                          {/* Timing Selector Pop-up Pill */}
                                          <TouchableOpacity
                                            style={styles.dropdownMiniBtn}
                                            onPress={() => setActiveTimingMedId(med.id)}
                                            activeOpacity={0.7}
                                          >
                                            <Text style={styles.dropdownMiniText} numberOfLines={1}>{med.timing || "Timing"}</Text>
                                            <Ionicons name="chevron-down" size={12} color="#64748b" />
                                          </TouchableOpacity>

                                          {/* Amount */}
                                          <View style={styles.medAmountBox}>
                                            <Text style={styles.inputRupee}>₹</Text>
                                            <TextInput
                                              style={styles.medAmountText}
                                              keyboardType="numeric"
                                              placeholder="0"
                                              placeholderTextColor="#94a3b8"
                                              value={med.amount !== undefined && med.amount !== 0 ? String(med.amount) : ""}
                                              onChangeText={(txt) => {
                                                const num = parseFloat(txt) || 0;
                                                handleUpdateMedicine(med.id, { amount: num });
                                                const nextMeds = medicines.map((m) => (m.id === med.id ? { ...m, amount: num } : m));
                                                const nextSum = nextMeds.reduce((acc, m) => acc + (m.amount || 0), 0);
                                                if (nextSum > 0) setMedicineFee(nextSum);
                                              }}
                                            />
                                          </View>
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                </>
                              ) : (
                                <View style={{ alignItems: "flex-end", marginTop: 4 }}>
                                  <TouchableOpacity
                                    style={styles.addMedicineBtn}
                                    onPress={() => {
                                      setShowDetailedMedicines(true);
                                      if (medicines.length === 0 || (medicines.length === 1 && !medicines[0].name)) {
                                        setMedicines([
                                          {
                                            id: `med-${Date.now()}`,
                                            name: "",
                                            type: "Pills",
                                            timing: "M - N - N",
                                            amount: medicineFee,
                                          },
                                        ]);
                                      }
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.addMedicineBtnText}>+ Add Medicine Details</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      )}

                      {/* 5. DIET PLAN FEE CARD */}
                      <View
                        style={[
                          styles.feeCard,
                          (!canChargeDiet || isPackageMode) && { opacity: 0.5, backgroundColor: "#f8fafc" },
                          includeDiet && canChargeDiet && !isPackageMode && styles.feeCardActive,
                        ]}
                      >
                        <View style={styles.feeCardHeaderRow}>
                          <TouchableOpacity
                            style={styles.feeCardCheckboxTouch}
                            disabled={!canChargeDiet || isPackageMode}
                            onPress={() => {
                              if (!canChargeDiet || isPackageMode) return;
                              const next = !includeDiet;
                              setIncludeDiet(next);
                              if (next) {
                                setDietFee(rawDietFee);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={includeDiet && canChargeDiet && !isPackageMode ? "checkmark-circle" : "ellipse-outline"}
                              size={22}
                              color={includeDiet && canChargeDiet && !isPackageMode ? "#0284c7" : "#cbd5e1"}
                            />
                            <View style={styles.feeCardTextCol}>
                              <Text style={styles.feeCardTitle}>Diet Plan Fee</Text>
                              <Text style={styles.feeCardSub}>
                                {canChargeDiet
                                  ? "Prescribed in Patient File"
                                  : "Disabled (Must prescribe in Patient File)"}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={styles.amountInputBox}>
                            <Text style={styles.inputRupee}>₹</Text>
                            <TextInput
                              style={[
                                styles.amountInputText,
                                (!canChargeDiet || !includeDiet || isPackageMode) && {
                                  backgroundColor: "#f1f5f9",
                                  color: "#94a3b8",
                                },
                              ]}
                              keyboardType="numeric"
                              editable={false}
                              value={canChargeDiet && includeDiet && !isPackageMode ? String(dietFee) : "0"}
                            />
                          </View>
                        </View>
                      </View>

                      {/* 6. MEDICINE DISCOUNT STATUS (Matching Screenshot 1 & 2) */}
                      <View style={styles.discountCard}>
                        <View style={styles.discountHeaderRow}>
                          <View>
                            <Text style={styles.discountTitle}>Medicine Discount Status</Text>
                            <Text style={styles.discountSub}>
                              {discountStatus === "NONE" && "HR Approval Required • Locked until approved"}
                              {discountStatus === "PENDING" && "⏳ Pending HR/Admin Approval"}
                              {discountStatus === "APPROVED" && `✓ Approved by HR: -₹${discountApprovedAmount}`}
                              {discountStatus === "REJECTED" && "✕ Discount Request Rejected by HR"}
                            </Text>
                          </View>
                        </View>

                        {discountStatus === "NONE" ? (
                          <TouchableOpacity
                            style={styles.requestDiscountBtn}
                            onPress={() => setIsDiscountModalOpen(true)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.requestDiscountBtnText}>Request Discount</Text>
                          </TouchableOpacity>
                        ) : discountStatus === "APPROVED" ? (
                          <View style={styles.discountAppliedTag}>
                            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                            <Text style={styles.discountAppliedTagText}>₹{discountApprovedAmount} Discount Applied to Bill</Text>
                          </View>
                        ) : discountStatus === "PENDING" ? (
                          <View style={styles.discountPendingTag}>
                            <Ionicons name="time" size={14} color="#b45309" />
                            <Text style={styles.discountPendingTagText}>Locked until HR/Admin responds</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.requestDiscountBtn}
                            onPress={() => setIsDiscountModalOpen(true)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.requestDiscountBtnText}>Request Again</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}

                  {/* 7. MANDATORY PRESCRIPTION CHECK BANNER (Matching Screenshot 2) */}
                  {!hasPrescription && (
                    <TouchableOpacity
                      style={styles.rxWarningBanner}
                      onPress={() => {
                        onClose();
                        if (onOpenPatientFile) onOpenPatientFile();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="warning" size={16} color="#ffffff" />
                        <Text style={styles.rxWarningTitle}>UPLOAD PRESCRIPTION REQUIRED</Text>
                      </View>
                      <Text style={styles.rxWarningSub}>Upload Prescription to Collect Fee (Mandatory) →</Text>
                    </TouchableOpacity>
                  )}

                  {/* PAY LATER COMPACT BUTTON & SUMMARY */}
                  <View style={[styles.payLaterCompactCard, isPayLater && styles.payLaterCompactCardActive]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      <View style={[styles.payLaterIconBadge, isPayLater && { backgroundColor: "#ea580c" }]}>
                        <Ionicons name="time" size={16} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.payLaterCompactTitle}>Pay Later / Partial Payment</Text>
                          {isPayLater && (
                            <View style={styles.payLaterActivePill}>
                              <Text style={styles.payLaterActivePillText}>Due: ₹{calculatedPayLater.toLocaleString()}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.payLaterCompactSub}>
                          {isPayLater
                            ? `Paying ₹${effectivePaidToday.toLocaleString()} today • Balance ₹${calculatedPayLater.toLocaleString()}`
                            : "Allow patient to pay partially today and carry balance"}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.payLaterSmallBtn, isPayLater && styles.payLaterSmallBtnActive]}
                      onPress={() => {
                        if (!isPayLater && !amountPaidNow) {
                          setAmountPaidNow(String(Math.round(totalAmountDue / 2)));
                        }
                        setIsPayLaterModalOpen(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={isPayLater ? "create-outline" : "add-circle-outline"} size={14} color="#ffffff" />
                      <Text style={styles.payLaterSmallBtnText}>{isPayLater ? "Edit" : "+ Pay Later"}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 8. SELECT PAYMENT METHOD (Matching Screenshot 1) */}
                  <View style={styles.methodsSection}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={styles.methodsTitle}>Select Payment Method</Text>
                      <Text style={styles.mandatoryStar}>* (Mandatory)</Text>
                    </View>
                    <Text style={styles.methodsHelper}>⚠️ Please tap an option below to select how the patient is paying:</Text>

                    <View style={styles.methodsGrid}>
                      {(
                        [
                          "Counter UPI",
                          "UPI / QR Code",
                          "Cash",
                          "Card",
                          "Split",
                          "Send Pay to app",
                        ] as PaymentMethod[]
                      ).map((method) => {
                        const isMethodSelected = selectedMethod === method;
                        return (
                          <TouchableOpacity
                            key={method}
                            style={[styles.methodBtn, isMethodSelected && styles.methodBtnSelected]}
                            onPress={() => {
                              setSelectedMethod(method);
                              const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                              if (method === "Split" && splitUpi === 0 && splitCash === 0 && splitCard === 0) {
                                const half = Math.round(targetToPay / 2);
                                setSplitUpi(half);
                                setSplitCash(targetToPay - half);
                                setSplitCard(0);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.methodBtnText, isMethodSelected && styles.methodBtnTextSelected]}>
                              {method}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* RAZORPAY UPI QR CODE CARD (MOBILE APP) - ONLY FOR UPI / QR CODE */}
                    {selectedMethod === "UPI / QR Code" && (
                      <View style={{ marginTop: 14, backgroundColor: "#f0f9ff", borderWidth: 2, borderColor: "#38bdf8", borderRadius: 20, padding: 14, alignItems: "center" }}>
                        {/* Header */}
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#0284c7", alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="qr-code" size={18} color="#ffffff" />
                            </View>
                            <View>
                              <Text style={{ fontSize: 13, fontWeight: "900", color: "#0f172a" }}>Razorpay UPI QR Code</Text>
                              <Text style={{ fontSize: 10, fontWeight: "600", color: "#64748b" }}>Spiritual Homeopathy • Auto-Detect</Text>
                            </View>
                          </View>
                          <View style={{ backgroundColor: "#e0f2fe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 10, fontWeight: "800", color: "#0369a1" }}>LIVE QR</Text>
                          </View>
                        </View>

                        {/* Amount Due Pill */}
                        <View style={{ backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#86efac", borderRadius: 12, paddingVertical: 6, paddingHorizontal: 16, marginBottom: 12, alignItems: "center", width: "100%" }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: "#166534", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {isPayLater ? "Amount to Pay Today (Partial)" : "Amount Due to Pay"}
                          </Text>
                          <Text style={{ fontSize: 24, fontWeight: "900", color: "#14532d" }}>₹{(isPayLater ? effectivePaidToday : totalAmountDue).toLocaleString()}</Text>
                          <Text style={{ fontSize: 9.5, fontWeight: "600", color: "#15803d" }}>VPA: sseomni9k9v0j291124pos@mairtel</Text>
                        </View>

                        {/* Dynamic QR Code Image */}
                        <View style={{ backgroundColor: "#ffffff", padding: 12, borderRadius: 18, borderWidth: 1.5, borderColor: "#cbd5e1", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 12 }}>
                          <Image
                            source={{
                              uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
                                `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${(isPayLater ? effectivePaidToday : totalAmountDue).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Payment for ' + (appointment?.patientName || 'Patient'))}`
                              )}`,
                            }}
                            style={{ width: 220, height: 220, borderRadius: 8 }}
                            resizeMode="contain"
                          />
                        </View>

                        {/* Status indicator */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, backgroundColor: "#e0f2fe", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}>
                          <ActivityIndicator size="small" color="#0284c7" />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#0369a1" }}>
                            Waiting for patient scan • Auto-detecting...
                          </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={{ width: "100%", gap: 8 }}>
                          <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
                            <TouchableOpacity
                              onPress={() => handleCheckUpiStatus(true)}
                              disabled={isVerifyingUpi}
                              style={{ flex: 1, backgroundColor: "#0f172a", borderRadius: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              {isVerifyingUpi ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Ionicons name="refresh" size={15} color="#ffffff" />
                              )}
                              <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>
                                {isVerifyingUpi ? "Checking..." : "Verify Status"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => {
                                const cleanPh = (appointment?.phoneNumber || appointment?.phone || "").replace(/\D/g, "").slice(-10);
                                const upiUri = `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${(isPayLater ? effectivePaidToday : totalAmountDue).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Payment for ' + (appointment?.patientName || 'Patient'))}`;
                                const msg = encodeURIComponent(`Hello ${appointment?.patientName || 'Patient'},\nPlease pay ₹${isPayLater ? effectivePaidToday : totalAmountDue} for your consultation at Spiritual Homeopathy using this UPI link:\n${upiUri}`);
                                Linking.openURL(`https://wa.me/91${cleanPh}?text=${msg}`).catch(() => {
                                  Alert.alert("Unable to open WhatsApp", "Please make sure WhatsApp is installed.");
                                });
                              }}
                              style={{ flex: 1, backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                              <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>WhatsApp Link</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Direct Confirmation Button */}
                          <TouchableOpacity
                            onPress={handleManualConfirmUpi}
                            disabled={isVerifyingUpi}
                            style={{ backgroundColor: "#dcfce7", borderWidth: 1.5, borderColor: "#86efac", borderRadius: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                            <Text style={{ color: "#166534", fontWeight: "900", fontSize: 12 }}>Patient Paid / Confirm Receipt</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* COUNTER UPI (CLINIC DESK QR - SAME AS CASH) */}
                    {selectedMethod === "Counter UPI" && (
                      <View style={{ marginTop: 14, backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#cbd5e1", borderRadius: 18, padding: 14 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="storefront-outline" size={20} color="#ffffff" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>Counter UPI (Clinic Desk QR)</Text>
                            <Text style={{ fontSize: 11, color: "#64748b" }}>Handled same as Cash • Direct counter collection</Text>
                          </View>
                          <View style={{ backgroundColor: "#e0e7ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 10, fontWeight: "800", color: "#4338ca" }}>MANUAL DESK</Text>
                          </View>
                        </View>
                        <View style={{ backgroundColor: "#eef2ff", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#c7d2fe" }}>
                          <Text style={{ fontSize: 11.5, color: "#3730a3", fontWeight: "600", lineHeight: 18 }}>
                            • Patient scans the clinic counter printed QR code directly.
                            {"\n"}• Amount to Collect: <Text style={{ fontWeight: "900", color: "#1e1b4b" }}>₹{(isPayLater ? effectivePaidToday : totalAmountDue).toLocaleString()}</Text>
                            {"\n"}• Tap "Complete Consultation & Collect Payment" below to record this payment.
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* CARD PAYMENT DETAILS (RAZORPAY CARD / POS) */}
                    {selectedMethod === "Card" && (
                      <View style={{ marginTop: 14, backgroundColor: "#fdf4ff", borderWidth: 1.5, borderColor: "#f0abfc", borderRadius: 18, padding: 14 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#c026d3", alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="card-outline" size={18} color="#ffffff" />
                            </View>
                            <View>
                              <Text style={{ fontSize: 13, fontWeight: "900", color: "#0f172a" }}>Razorpay Card / POS Payment</Text>
                              <Text style={{ fontSize: 10, fontWeight: "600", color: "#64748b" }}>Enter card details or swipe on POS terminal</Text>
                            </View>
                          </View>
                          <View style={{ backgroundColor: "#fae8ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 10, fontWeight: "800", color: "#a21caf" }}>CARD</Text>
                          </View>
                        </View>

                        {/* Card Inputs */}
                        <View style={{ gap: 8, marginBottom: 12 }}>
                          <View>
                            <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#475569", marginBottom: 3 }}>Card Number</Text>
                            <TextInput
                              value={cardNumber}
                              onChangeText={(val) => {
                                const clean = val.replace(/\D/g, "").slice(0, 16);
                                const formatted = clean.match(/.{1,4}/g)?.join(" ") || clean;
                                setCardNumber(formatted);
                              }}
                              placeholder="4532 •••• •••• ••••"
                              placeholderTextColor="#94a3b8"
                              keyboardType="numeric"
                              style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontWeight: "700", color: "#0f172a" }}
                            />
                          </View>
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#475569", marginBottom: 3 }}>Expiry (MM/YY)</Text>
                              <TextInput
                                value={cardExpiry}
                                onChangeText={(val) => {
                                  const clean = val.replace(/\D/g, "").slice(0, 4);
                                  const formatted = clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
                                  setCardExpiry(formatted);
                                }}
                                placeholder="MM/YY"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontWeight: "700", color: "#0f172a" }}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#475569", marginBottom: 3 }}>CVV</Text>
                              <TextInput
                                value={cardCvv}
                                onChangeText={(val) => setCardCvv(val.replace(/\D/g, "").slice(0, 4))}
                                placeholder="CVV"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                secureTextEntry
                                style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontWeight: "700", color: "#0f172a" }}
                              />
                            </View>
                          </View>
                        </View>

                        {/* Card Action Buttons */}
                        <View style={{ width: "100%", gap: 8, marginTop: 4 }}>
                          {/* Open Razorpay Card Gateway Button */}
                          <TouchableOpacity
                            onPress={async () => {
                              try {
                                const amountToCharge = isPayLater ? effectivePaidToday : totalAmountDue;
                                const res = await apiFetch<any>("/reception/razorpay/create-order", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    appointmentId: appointment?.id,
                                    amount: amountToCharge,
                                    patientName: appointment?.patientName,
                                    phone: appointment?.phoneNumber || appointment?.phone,
                                    description: `Card Payment for ${appointment?.patientName || "Patient"}`
                                  })
                                });
                                if (res?.paymentLinkUrl) {
                                  Linking.openURL(res.paymentLinkUrl);
                                } else {
                                  Alert.alert("Razorpay Card Gateway", `Card charge order created for ₹${amountToCharge}. Enter card details above or swipe on clinic POS machine and tap Complete Payment.`);
                                }
                              } catch (e: any) {
                                Alert.alert("Card Payment", "Swipe card on POS terminal or enter details above and tap Complete Consultation.");
                              }
                            }}
                            style={{ backgroundColor: "#c026d3", borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
                          >
                            <Ionicons name="card" size={15} color="#ffffff" />
                            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12 }}>Open Razorpay Card Gateway</Text>
                          </TouchableOpacity>

                          {/* Instant Card Payment Confirmation Button */}
                          <TouchableOpacity
                            onPress={handleManualConfirmCard}
                            disabled={isSubmitting}
                            style={{ backgroundColor: "#dcfce7", borderWidth: 1.5, borderColor: "#86efac", borderRadius: 12, paddingVertical: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                          >
                            {isSubmitting ? (
                              <ActivityIndicator size="small" color="#16a34a" />
                            ) : (
                              <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
                            )}
                            <Text style={{ color: "#166534", fontWeight: "900", fontSize: 13 }}>
                              {isSubmitting ? "Completing Consultation..." : "Card Paid / Complete Appointment"}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 10, color: "#86198f", textAlign: "center", fontWeight: "600", marginTop: 6 }}>
                          Enter card details above or pay via Gateway/POS terminal, then tap Complete Appointment.
                        </Text>
                      </View>
                    )}

                    {/* SPLIT PAYMENT BREAKDOWN (MOBILE APP) */}
                    {selectedMethod === "Split" && (
                      <View style={{ marginTop: 12, backgroundColor: "#f0f9ff", borderWidth: 1.5, borderColor: "#38bdf8", borderRadius: 16, padding: 12 }}>
                        {/* Header & Presets */}
                        <View style={{ marginBottom: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "#0284c7", alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 11 }}>⚡</Text>
                              </View>
                              <View>
                                <Text style={{ fontSize: 12, fontWeight: "800", color: "#0f172a" }}>Split Payment Allocation</Text>
                                <Text style={{ fontSize: 10, color: "#64748b" }}>
                                  {isPayLater ? `Paid Today: ₹${effectivePaidToday.toLocaleString()}` : `Total Due: ₹${totalAmountDue.toLocaleString()}`}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                            <TouchableOpacity
                              onPress={() => {
                                setOptedSplitModes(["cash", "upi"]);
                                const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                const half = Math.round(targetToPay / 2);
                                setSplitUpi(half);
                                setSplitCash(targetToPay - half);
                                setSplitCounterUpi(0);
                                setSplitCard(0);
                                setIsSplitUpiPaid(false);
                                setIsSplitCardPaid(false);
                              }}
                              style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#bae6fd", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 }}
                            >
                              <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0369a1" }}>Cash + UPI</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                setOptedSplitModes(["cash", "card"]);
                                const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                const half = Math.round(targetToPay / 2);
                                setSplitCard(half);
                                setSplitCash(targetToPay - half);
                                setSplitUpi(0);
                                setSplitCounterUpi(0);
                                setIsSplitUpiPaid(false);
                                setIsSplitCardPaid(false);
                              }}
                              style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#bae6fd", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 }}
                            >
                              <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0369a1" }}>Cash + Card</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                setOptedSplitModes(["cash", "counterUpi"]);
                                const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                const half = Math.round(targetToPay / 2);
                                setSplitCounterUpi(half);
                                setSplitCash(targetToPay - half);
                                setSplitUpi(0);
                                setSplitCard(0);
                                setIsSplitUpiPaid(false);
                                setIsSplitCardPaid(false);
                              }}
                              style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#bae6fd", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 }}
                            >
                              <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0369a1" }}>Cash + Counter UPI</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                setOptedSplitModes(["cash", "counterUpi", "upi", "card"]);
                                const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                const quarter = Math.round(targetToPay / 4);
                                setSplitCash(quarter);
                                setSplitCounterUpi(quarter);
                                setSplitUpi(quarter);
                                setSplitCard(targetToPay - (quarter * 3));
                              }}
                              style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#bae6fd", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 }}
                            >
                              <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0369a1" }}>All 4 Options</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Step 1: Opt-in Toggles */}
                        <View style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 8, borderWidth: 1, borderColor: "#bae6fd", marginBottom: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: "#0369a1", marginBottom: 6 }}>
                            Step 1: Tap to Choose Split Modes
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            {[
                              { id: "cash", label: "Cash", icon: "cash-outline" },
                              { id: "counterUpi", label: "Counter UPI", icon: "storefront-outline" },
                              { id: "upi", label: "Online UPI (QR)", icon: "qr-code-outline" },
                              { id: "card", label: "Card / POS", icon: "card-outline" },
                            ].map((opt) => {
                              const isOpted = optedSplitModes.includes(opt.id);
                              return (
                                <TouchableOpacity
                                  key={opt.id}
                                  onPress={() => {
                                    const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                    if (isOpted) {
                                      if (optedSplitModes.length === 1) {
                                        Alert.alert("Split Modes", "At least one payment mode must be selected in Split.");
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
                                      const rem = Math.max(0, targetToPay - currentSum);
                                      if (rem > 0) {
                                        if (opt.id === "cash") setSplitCash(rem);
                                        else if (opt.id === "counterUpi") setSplitCounterUpi(rem);
                                        else if (opt.id === "upi") setSplitUpi(rem);
                                        else if (opt.id === "card") setSplitCard(rem);
                                      }
                                    }
                                  }}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 5,
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    borderRadius: 8,
                                    backgroundColor: isOpted ? "#e0f2fe" : "#f8fafc",
                                    borderWidth: 1,
                                    borderColor: isOpted ? "#0284c7" : "#e2e8f0",
                                  }}
                                >
                                  <Ionicons name={opt.icon as any} size={12} color={isOpted ? "#0284c7" : "#64748b"} />
                                  <Text style={{ fontSize: 10, fontWeight: "800", color: isOpted ? "#0369a1" : "#64748b" }}>
                                    {opt.label}
                                  </Text>
                                  {isOpted && <Text style={{ fontSize: 10, fontWeight: "900", color: "#0284c7" }}>✓</Text>}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        {/* Step 2: Opted Inputs */}
                        <View style={{ gap: 8 }}>
                          {/* 1. Cash (if opted) */}
                          {optedSplitModes.includes("cash") && (
                            <View style={{ backgroundColor: "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", padding: 8 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                  <Ionicons name="cash-outline" size={14} color="#16a34a" />
                                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#334155" }}>Cash Amount (₹)</Text>
                                </View>
                                {(() => {
                                  const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                  const currentTotal = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                                  return targetToPay - currentTotal !== 0 && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        const rem = targetToPay - splitUpi - splitCard - splitCounterUpi;
                                        setSplitCash(Math.max(0, rem));
                                      }}
                                    >
                                      <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0284c7" }}>Fill Remaining</Text>
                                    </TouchableOpacity>
                                  );
                                })()}
                              </View>
                              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: "#cbd5e1" }}>
                                <Text style={{ fontWeight: "700", color: "#64748b", marginRight: 4 }}>₹</Text>
                                <TextInput
                                  style={{ flex: 1, height: 36, fontSize: 13, fontWeight: "800", color: "#0f172a" }}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  value={splitCash > 0 ? String(splitCash) : ""}
                                  onChangeText={(txt) => setSplitCash(Math.max(0, parseFloat(txt) || 0))}
                                />
                              </View>
                              <Text style={{ fontSize: 9.5, color: "#64748b", marginTop: 3 }}>Physical cash collected at counter desk</Text>
                            </View>
                          )}

                          {/* 2. Counter UPI (if opted) */}
                          {optedSplitModes.includes("counterUpi") && (
                            <View style={{ backgroundColor: "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", padding: 8 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                  <Ionicons name="storefront-outline" size={14} color="#4f46e5" />
                                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#334155" }}>Counter UPI (Desk QR) (₹)</Text>
                                </View>
                                {(() => {
                                  const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                  const currentTotal = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                                  return targetToPay - currentTotal !== 0 && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        const rem = targetToPay - splitUpi - splitCard - splitCash;
                                        setSplitCounterUpi(Math.max(0, rem));
                                      }}
                                    >
                                      <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0284c7" }}>Fill Remaining</Text>
                                    </TouchableOpacity>
                                  );
                                })()}
                              </View>
                              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: "#cbd5e1" }}>
                                <Text style={{ fontWeight: "700", color: "#64748b", marginRight: 4 }}>₹</Text>
                                <TextInput
                                  style={{ flex: 1, height: 36, fontSize: 13, fontWeight: "800", color: "#0f172a" }}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  value={splitCounterUpi > 0 ? String(splitCounterUpi) : ""}
                                  onChangeText={(txt) => setSplitCounterUpi(Math.max(0, parseFloat(txt) || 0))}
                                />
                              </View>
                              <Text style={{ fontSize: 9.5, color: "#64748b", marginTop: 3 }}>Patient scans printed counter QR directly (Same as Cash)</Text>
                            </View>
                          )}

                          {/* 3. Online UPI / QR Code (if opted) */}
                          {optedSplitModes.includes("upi") && (
                            <View style={{ backgroundColor: isSplitUpiPaid ? "#f0fdf4" : "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: isSplitUpiPaid ? "#86efac" : "#bae6fd", padding: 8 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                  <Ionicons name="qr-code" size={14} color="#0284c7" />
                                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#0369a1" }}>Online UPI (Razorpay QR) (₹)</Text>
                                </View>
                                {!isSplitUpiPaid && (() => {
                                  const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                  const currentTotal = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                                  return targetToPay - currentTotal !== 0 && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        const rem = targetToPay - splitCash - splitCard - splitCounterUpi;
                                        setSplitUpi(Math.max(0, rem));
                                      }}
                                    >
                                      <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0284c7" }}>Fill Remaining</Text>
                                    </TouchableOpacity>
                                  );
                                })()}
                              </View>

                              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f0f9ff", borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: "#bae6fd" }}>
                                <Text style={{ fontWeight: "700", color: "#0284c7", marginRight: 4 }}>₹</Text>
                                <TextInput
                                  style={{ flex: 1, height: 36, fontSize: 13, fontWeight: "800", color: "#0369a1" }}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  editable={!isSplitUpiPaid}
                                  value={splitUpi > 0 ? String(splitUpi) : ""}
                                  onChangeText={(txt) => setSplitUpi(Math.max(0, parseFloat(txt) || 0))}
                                />
                              </View>

                              {/* Status / Actions for Online UPI */}
                              {isSplitUpiPaid ? (
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#dcfce7", borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: "#86efac" }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                    <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534" }}>
                                      ✓ ₹{splitUpi} UPI Paid {splitUpiRef ? `(${splitUpiRef.slice(-6)})` : ""}
                                    </Text>
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => { setIsSplitUpiPaid(false); setSplitUpiRef(""); }}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#166534", textDecorationLine: "underline" }}>Reset</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : splitUpi > 0 ? (
                                <View style={{ gap: 6, marginTop: 6 }}>
                                  <TouchableOpacity
                                    onPress={() => setShowSplitRazorpayQr(!showSplitRazorpayQr)}
                                    style={{ backgroundColor: "#0284c7", borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                                  >
                                    <Ionicons name="qr-code" size={14} color="#ffffff" />
                                    <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 11 }}>
                                      {showSplitRazorpayQr ? "Hide Razorpay QR" : `Show Razorpay QR for ₹${splitUpi.toLocaleString()}`}
                                    </Text>
                                  </TouchableOpacity>

                                  <View style={{ flexDirection: "row", gap: 6 }}>
                                    <TouchableOpacity
                                      onPress={() => {
                                        setIsSplitUpiPaid(true);
                                        setSplitUpiRef(`MANUAL-${Date.now().toString().slice(-4)}`);
                                        Alert.alert("Marked Paid", `Online UPI of ₹${splitUpi} marked as paid.`);
                                      }}
                                      style={{ flex: 1, backgroundColor: "#f1f5f9", borderRadius: 8, paddingVertical: 6, alignItems: "center", justifyContent: "center" }}
                                    >
                                      <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#334155" }}>Mark Paid ✓</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      onPress={() => {
                                        const cleanPh = (appointment?.phoneNumber || appointment?.phone || "").replace(/\D/g, "").slice(-10);
                                        const upiUri = `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${splitUpi.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Split Payment for ' + (appointment?.patientName || 'Patient'))}`;
                                        const msg = encodeURIComponent(`Hello ${appointment?.patientName || 'Patient'},
Please pay ₹${splitUpi} (Split UPI portion) using this link:
${upiUri}`);
                                        Linking.openURL(`https://wa.me/91${cleanPh}?text=${msg}`);
                                      }}
                                      style={{ backgroundColor: "#16a34a", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 5 }}
                                    >
                                      <Ionicons name="logo-whatsapp" size={13} color="#ffffff" />
                                      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 11 }}>WA Link</Text>
                                    </TouchableOpacity>
                                  </View>

                                  {showSplitRazorpayQr && (
                                    <View style={{ backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 10, alignItems: "center", marginTop: 4 }}>
                                      <Image
                                        source={{
                                          uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(
                                            `upi://pay?pa=sseomni9k9v0j291124pos@mairtel&pn=SPIRITUAL%20HOMEO%20PRIVATE%20LIMITED&am=${splitUpi.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Split Payment for ' + (appointment?.patientName || 'Patient'))}`
                                          )}`,
                                        }}
                                        style={{ width: 170, height: 170, borderRadius: 6, marginBottom: 8 }}
                                        resizeMode="contain"
                                      />
                                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#0369a1", marginBottom: 6 }}>
                                        Auto-Detecting ₹{splitUpi.toLocaleString()} via Razorpay...
                                      </Text>
                                      <TouchableOpacity
                                        onPress={() => handleCheckUpiStatus(true)}
                                        style={{ backgroundColor: "#0284c7", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 }}
                                      >
                                        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 10.5 }}>Check Status Now ⚡</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              ) : null}
                            </View>
                          )}

                          {/* 4. Card / POS (if opted) */}
                          {optedSplitModes.includes("card") && (
                            <View style={{ backgroundColor: isSplitCardPaid ? "#f0fdf4" : "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: isSplitCardPaid ? "#86efac" : "#f0abfc", padding: 8 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                  <Ionicons name="card-outline" size={14} color="#c026d3" />
                                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#a21caf" }}>Card / POS (Razorpay) (₹)</Text>
                                </View>
                                {!isSplitCardPaid && (() => {
                                  const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                                  const currentTotal = (splitUpi || 0) + (splitCash || 0) + (splitCard || 0) + (splitCounterUpi || 0);
                                  return targetToPay - currentTotal !== 0 && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        const rem = targetToPay - splitCash - splitUpi - splitCounterUpi;
                                        setSplitCard(Math.max(0, rem));
                                      }}
                                    >
                                      <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#c026d3" }}>Fill Remaining</Text>
                                    </TouchableOpacity>
                                  );
                                })()}
                              </View>
                              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fdf4ff", borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: "#f0abfc" }}>
                                <Text style={{ fontWeight: "700", color: "#a21caf", marginRight: 4 }}>₹</Text>
                                <TextInput
                                  style={{ flex: 1, height: 36, fontSize: 13, fontWeight: "800", color: "#701a75" }}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  editable={!isSplitCardPaid}
                                  value={splitCard > 0 ? String(splitCard) : ""}
                                  onChangeText={(txt) => setSplitCard(Math.max(0, parseFloat(txt) || 0))}
                                />
                              </View>

                              {/* Status / Actions for Card */}
                              {isSplitCardPaid ? (
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#dcfce7", borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: "#86efac" }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                    <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534" }}>
                                      ✓ ₹{splitCard} Card Paid / Swiped {splitCardRef ? `(${splitCardRef.slice(-6)})` : ""}
                                    </Text>
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => { setIsSplitCardPaid(false); setSplitCardRef(""); }}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#166534", textDecorationLine: "underline" }}>Reset</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : splitCard > 0 ? (
                                <View style={{ gap: 6, marginTop: 6 }}>
                                  <TouchableOpacity
                                    onPress={async () => {
                                      try {
                                        const res = await apiFetch<any>("/reception/razorpay/create-order", {
                                          method: "POST",
                                          body: JSON.stringify({
                                            appointmentId: appointment?.id,
                                            amount: splitCard,
                                            patientName: appointment?.patientName,
                                            phone: appointment?.phoneNumber || appointment?.phone,
                                            description: `Split Card Payment (₹${splitCard}) for ${appointment?.patientName || "Patient"}`
                                          })
                                        });
                                        if (res?.paymentLinkUrl) {
                                          Linking.openURL(res?.paymentLinkUrl);
                                        } else {
                                          Alert.alert("Razorpay Card Gateway", `Card charge order of ₹${splitCard} created. Enter card details or swipe on POS terminal.`);
                                        }
                                      } catch (e: any) {
                                        Alert.alert("Card Payment", "Swipe card on POS terminal or enter details above.");
                                      }
                                    }}
                                    style={{ backgroundColor: "#c026d3", borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                                  >
                                    <Ionicons name="card" size={14} color="#ffffff" />
                                    <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 11 }}>
                                      Pay ₹{splitCard.toLocaleString()} via Razorpay Card Gateway
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => {
                                      setIsSplitCardPaid(true);
                                      setSplitCardRef(`POS-${Date.now().toString().slice(-4)}`);
                                      Alert.alert("Card Confirmed", `Split Card payment of ₹${splitCard} marked as paid.`);
                                    }}
                                    style={{ backgroundColor: "#fdf4ff", borderWidth: 1, borderColor: "#f0abfc", borderRadius: 8, paddingVertical: 6, alignItems: "center", justifyContent: "center" }}
                                  >
                                    <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#a21caf" }}>Swipe on POS / Mark Card Paid ✓</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : null}
                            </View>
                          )}
                        </View>

                        {/* Status Bar & Completion Button */}
                        {(() => {
                          const targetToPay = isPayLater ? effectivePaidToday : totalAmountDue;
                          const activeCash = optedSplitModes.includes("cash") ? (splitCash || 0) : 0;
                          const activeCounterUpi = optedSplitModes.includes("counterUpi") ? (splitCounterUpi || 0) : 0;
                          const activeUpi = optedSplitModes.includes("upi") ? (splitUpi || 0) : 0;
                          const activeCard = optedSplitModes.includes("card") ? (splitCard || 0) : 0;
                          const allocated = activeCash + activeCounterUpi + activeUpi + activeCard;
                          const isMatch = allocated === targetToPay;
                          const diff = targetToPay - allocated;

                          const isUpiSatisfied = !optedSplitModes.includes("upi") || activeUpi === 0 || isSplitUpiPaid;
                          const isCardSatisfied = !optedSplitModes.includes("card") || activeCard === 0 || isSplitCardPaid;
                          const canComplete = isMatch && isUpiSatisfied && isCardSatisfied;

                          const parts: string[] = [];
                          if (activeCash > 0) parts.push(`Cash ₹${activeCash}`);
                          if (activeCounterUpi > 0) parts.push(`Counter UPI ₹${activeCounterUpi}`);
                          if (activeUpi > 0) parts.push(`Online UPI ₹${activeUpi}${isSplitUpiPaid ? " (✓ Paid)" : " (⏳ Pending)"}`);
                          if (activeCard > 0) parts.push(`Card ₹${activeCard}${isSplitCardPaid ? " (✓ Paid)" : " (⏳ Pending)"}`);

                          return (
                            <View style={{ marginTop: 10 }}>
                              <View
                                style={{
                                  padding: 8,
                                  borderRadius: 8,
                                  backgroundColor: isMatch ? "#ecfdf5" : diff > 0 ? "#fffbeb" : "#fff1f2",
                                  borderWidth: 1,
                                  borderColor: isMatch ? "#a7f3d0" : diff > 0 ? "#fde68a" : "#fecdd3",
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: isMatch ? 8 : 0,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: "700",
                                    color: isMatch ? "#065f46" : diff > 0 ? "#92400e" : "#9f1239",
                                    flex: 1,
                                  }}
                                >
                                  {isMatch
                                    ? `✓ Split Matched: ${parts.join(" + ")}`
                                    : diff > 0
                                      ? `⚠️ ₹${diff} remaining to allocate (Allocated: ₹${allocated} / ₹${targetToPay})`
                                      : `⚠️ Exceeds total by ₹${Math.abs(diff)}`}
                                </Text>
                                {!isMatch && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      const firstMode = optedSplitModes[0] || "cash";
                                      if (firstMode === "cash") {
                                        const rem = targetToPay - activeCounterUpi - activeUpi - activeCard;
                                        setSplitCash(Math.max(0, rem));
                                      } else if (firstMode === "counterUpi") {
                                        const rem = targetToPay - activeCash - activeUpi - activeCard;
                                        setSplitCounterUpi(Math.max(0, rem));
                                      } else if (firstMode === "upi") {
                                        const rem = targetToPay - activeCash - activeCounterUpi - activeCard;
                                        setSplitUpi(Math.max(0, rem));
                                      } else if (firstMode === "card") {
                                        const rem = targetToPay - activeCash - activeCounterUpi - activeUpi;
                                        setSplitCard(Math.max(0, rem));
                                      }
                                    }}
                                    style={{ backgroundColor: "#fef3c7", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 }}
                                  >
                                    <Text style={{ fontSize: 9, fontWeight: "800", color: "#78350f" }}>Auto-Balance</Text>
                                  </TouchableOpacity>
                                )}
                              </View>

                              {/* Direct Complete Split Consultation Button */}
                              {isMatch && (
                                <TouchableOpacity
                                  onPress={handleConfirmPayment}
                                  disabled={isSubmitting || !canComplete}
                                  style={{
                                    backgroundColor: canComplete ? "#16a34a" : "#f59e0b",
                                    borderRadius: 10,
                                    paddingVertical: 10,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexDirection: "row",
                                    gap: 6,
                                    opacity: canComplete ? 1 : 0.8,
                                  }}
                                >
                                  {isSubmitting ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                  ) : (
                                    <Ionicons name={canComplete ? "checkmark-circle" : "time-outline"} size={16} color="#ffffff" />
                                  )}
                                  <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 12 }}>
                                    {isSubmitting
                                      ? "Completing..."
                                      : !isUpiSatisfied
                                      ? `Awaiting Online UPI (Pay ₹${activeUpi} via QR)`
                                      : !isCardSatisfied
                                      ? `Awaiting Card (Pay ₹${activeCard} or Swipe POS)`
                                      : "Complete Consultation & Record Split ✓"}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    )}
                  </View>

                  {/* 9. SUMMARY TOTAL CARD (Matching Screenshot 1) */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Target Amount (Consult + Med):</Text>
                      <Text style={styles.summaryTarget}>₹ {parseFloat(targetAmount) || 0}</Text>
                    </View>

                    {discountStatus === "APPROVED" && discountApprovedAmount > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: "#16a34a" }]}>HR Approved Discount:</Text>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#16a34a" }}>
                          - ₹ {discountApprovedAmount}
                        </Text>
                      </View>
                    )}

                    {includePreviousDue && previousPendingBalance > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: "#ea580c" }]}>Previous Due Added:</Text>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#ea580c" }}>
                          + ₹ {previousPendingBalance}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.summaryRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" }]}>
                      <Text style={styles.totalDueLabel}>TOTAL BILL AMOUNT:</Text>
                      <Text style={styles.totalDueValue}>₹ {totalAmountDue}</Text>
                    </View>

                    {isPayLater && (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: "#16a34a" }]}>AMOUNT PAID TODAY:</Text>
                          <Text style={{ fontSize: 14, fontWeight: "900", color: "#16a34a" }}>
                            ₹ {effectivePaidToday}
                          </Text>
                        </View>
                        <View style={[styles.summaryRow, { backgroundColor: "#fff7ed", padding: 6, borderRadius: 6, marginTop: 4 }]}>
                          <Text style={[styles.totalDueLabel, { color: "#ea580c" }]}>REMAINING NEED TO PAY (PAY LATER):</Text>
                          <Text style={[styles.totalDueValue, { color: "#ea580c" }]}>
                            ₹ {calculatedPayLater}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Bottom Spacing */}
                  <View style={{ height: 20 }} />
                </ScrollView>

                {/* BOTTOM ACTION BUTTONS (Matching Screenshot) */}
                <View style={styles.footerBar}>
                  <TouchableOpacity style={styles.cancelFooterBtn} onPress={onClose} activeOpacity={0.7}>
                    <Text style={styles.cancelFooterText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmFooterBtn,
                      (!hasPrescription || isSubmitting || !isMedicineTotalMatching || !selectedMethod) &&
                      styles.confirmFooterBtnDisabled,
                    ]}
                    onPress={handleConfirmPayment}
                    disabled={!hasPrescription || isSubmitting || !isMedicineTotalMatching || !selectedMethod}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmFooterText}>Confirm Payment & Generate Invoice ✓</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* DISCOUNT REQUEST SUB-MODAL */}
                <Modal
                  visible={isDiscountModalOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setIsDiscountModalOpen(false)}
                >
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                  >
                    <View style={styles.subModalBackdrop}>
                      <View style={styles.subModalCard}>
                        <Text style={styles.subModalTitle}>Request Medicine Discount</Text>
                        <Text style={styles.subModalSubtitle}>
                          Requires approval from HR or Admin before fee collection.
                        </Text>

                        <Text style={styles.inputFieldLabel}>Discount Amount (₹):</Text>
                        <TextInput
                          style={styles.subModalInput}
                          placeholder="e.g. 200"
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                          value={discountRequestedAmount}
                          onChangeText={setDiscountRequestedAmount}
                        />

                        <Text style={styles.inputFieldLabel}>Reason / Notes:</Text>
                        <TextInput
                          style={[styles.subModalInput, { height: 60, textAlignVertical: "top" }]}
                          placeholder="e.g. Economically weaker patient, recommended by Dr."
                          placeholderTextColor="#94a3b8"
                          multiline
                          value={discountNotes}
                          onChangeText={setDiscountNotes}
                        />

                        <View style={styles.subModalActions}>
                          <TouchableOpacity
                            style={styles.subModalCancelBtn}
                            onPress={() => setIsDiscountModalOpen(false)}
                          >
                            <Text style={styles.subModalCancelText}>Cancel</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.subModalSubmitBtn}
                            onPress={handleRequestDiscountSubmit}
                            disabled={isRequestingDiscount}
                          >
                            {isRequestingDiscount ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text style={styles.subModalSubmitText}>Send to HR & Admin</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </Modal>

                {/* TIMING PICKER POP-UP MODAL */}
                <Modal
                  visible={activeTimingMedId !== null}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setActiveTimingMedId(null)}
                >
                  <TouchableOpacity
                    style={styles.subModalBackdrop}
                    activeOpacity={1}
                    onPress={() => setActiveTimingMedId(null)}
                  >
                    <View style={styles.timingPickerCard}>
                      <View style={styles.timingPickerHeader}>
                        <View>
                          <Text style={styles.subModalTitle}>Select Medicine Timing</Text>
                          <Text style={styles.subModalSubtitle}>Choose dosage timing (e.g. M - N - N)</Text>
                        </View>
                        <TouchableOpacity onPress={() => setActiveTimingMedId(null)} style={{ padding: 4 }}>
                          <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                        {TIMING_OPTIONS.map((opt) => (
                          <TouchableOpacity
                            key={opt.label}
                            style={styles.timingOptionItem}
                            onPress={() => {
                              if (activeTimingMedId) {
                                handleUpdateMedicine(activeTimingMedId, { timing: opt.label });
                              }
                              setActiveTimingMedId(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.timingOptionLabel}>{opt.label}</Text>
                              <Text style={styles.timingOptionDesc}>{opt.desc}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>

                {/* MEDICINE TYPE PICKER POP-UP MODAL */}
                <Modal
                  visible={activeTypeMedId !== null}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setActiveTypeMedId(null)}
                >
                  <TouchableOpacity
                    style={styles.subModalBackdrop}
                    activeOpacity={1}
                    onPress={() => setActiveTypeMedId(null)}
                  >
                    <View style={styles.timingPickerCard}>
                      <View style={styles.timingPickerHeader}>
                        <View>
                          <Text style={styles.subModalTitle}>Select Medicine Type</Text>
                          <Text style={styles.subModalSubtitle}>Choose form / type of medicine</Text>
                        </View>
                        <TouchableOpacity onPress={() => setActiveTypeMedId(null)} style={{ padding: 4 }}>
                          <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                        {MEDICINE_TYPE_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={styles.timingOptionItem}
                            onPress={() => {
                              if (activeTypeMedId) {
                                handleUpdateMedicine(activeTypeMedId, { type: t });
                              }
                              setActiveTypeMedId(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.timingOptionLabel}>{t}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>

                {/* PAY LATER POP-UP MODAL */}
                <Modal
                  visible={isPayLaterModalOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setIsPayLaterModalOpen(false)}
                >
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.subModalBackdrop}
                  >
                    <View style={styles.payLaterPopupCard}>
                      <View style={styles.payLaterPopupHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                          <View style={styles.payLaterIconBadge}>
                            <Ionicons name="time" size={18} color="#ffffff" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.payLaterPopupTitle}>Pay Later / Partial Payment</Text>
                            <Text style={styles.payLaterPopupSub}>Carry forward remaining balance to next visit</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => setIsPayLaterModalOpen(false)} style={{ padding: 4 }}>
                          <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                        {/* Total Bill Banner */}
                        <View style={styles.payLaterBillBanner}>
                          <Text style={styles.payLaterBillLabel}>TOTAL BILL DUE TODAY</Text>
                          <Text style={styles.payLaterBillAmount}>₹{totalAmountDue.toLocaleString()}</Text>
                        </View>

                        {/* Amount Paid Today */}
                        <View style={{ marginTop: 12 }}>
                          <Text style={styles.inputFieldLabel}>Amount Paying Today (₹) *</Text>
                          <View style={styles.payLaterInputWrapper}>
                            <Text style={styles.payLaterRupee}>₹</Text>
                            <TextInput
                              style={styles.payLaterTextInput}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor="#94a3b8"
                              value={amountPaidNow}
                              onChangeText={setAmountPaidNow}
                            />
                          </View>
                        </View>

                        {/* Quick % chips */}
                        <View style={styles.payLaterPercentRow}>
                          {[
                            { label: "25%", mult: 0.25 },
                            { label: "50%", mult: 0.5 },
                            { label: "75%", mult: 0.75 },
                            { label: "Clear / 0", mult: 0 },
                          ].map((preset) => (
                            <TouchableOpacity
                              key={preset.label}
                              style={styles.payLaterPercentBtn}
                              onPress={() => {
                                const calculated = Math.round(totalAmountDue * preset.mult);
                                setAmountPaidNow(String(calculated));
                              }}
                            >
                              <Text style={styles.payLaterPercentBtnText}>{preset.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Remaining Due Card */}
                        <View style={styles.payLaterDueCard}>
                          <Text style={styles.payLaterDueCardLabel}>REMAINING NEED TO PAY</Text>
                          <Text style={styles.payLaterDueCardVal}>₹{calculatedPayLater.toLocaleString()}</Text>
                          <Text style={styles.payLaterDueCardSub}>
                            Patient pays ₹{effectivePaidToday.toLocaleString()} today. Remaining ₹{calculatedPayLater.toLocaleString()} will be recorded as pending and shown on their next visit.
                          </Text>
                        </View>

                        {/* Notes */}
                        <View style={{ marginTop: 12 }}>
                          <Text style={styles.inputFieldLabel}>Pay Later Notes (Optional):</Text>
                          <TextInput
                            style={[styles.subModalInput, { height: 50, textAlignVertical: "top" }]}
                            placeholder="e.g. Patient promised to clear ₹500 next Tuesday"
                            placeholderTextColor="#94a3b8"
                            multiline
                            value={payLaterNotes}
                            onChangeText={setPayLaterNotes}
                          />
                        </View>
                      </ScrollView>

                      {/* Modal Footer Buttons */}
                      <View style={styles.payLaterPopupFooter}>
                        <TouchableOpacity
                          style={styles.payLaterClearBtn}
                          onPress={() => {
                            setIsPayLater(false);
                            setAmountPaidNow("");
                            setPayLaterNotes("");
                            setIsPayLaterModalOpen(false);
                          }}
                        >
                          <Text style={styles.payLaterClearBtnText}>Remove Pay Later</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.payLaterApplyBtn}
                          onPress={() => {
                            const entered = parseFloat(amountPaidNow) || 0;
                            if (entered <= 0 && totalAmountDue > 0) {
                              Alert.alert("Invalid Amount", "Please enter an amount paying today, or remove Pay Later for full payment.");
                              return;
                            }
                            if (entered >= totalAmountDue) {
                              Alert.alert("Full Amount", "Amount paying today equals or exceeds total bill. Pay Later is not needed.");
                              setIsPayLater(false);
                              setIsPayLaterModalOpen(false);
                              return;
                            }
                            setIsPayLater(true);
                            setIsPayLaterModalOpen(false);
                          }}
                        >
                          <Text style={styles.payLaterApplyBtnText}>Apply Pay Later ✓</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </Modal>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  headerBackBtn: {
    padding: 4,
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: "#64748b",
  },
  headerCloseBtn: {
    padding: 5,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 20,
  },
  targetCard: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  targetCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0369a1",
  },
  targetCardSub: {
    fontSize: 10,
    color: "#0284c7",
    marginTop: 1,
  },
  targetInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#0284c7",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
    minWidth: 105,
  },
  rupeeSymbol: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0284c7",
    marginRight: 4,
  },
  targetTextInput: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
    padding: 0,
    minWidth: 65,
    textAlign: "right",
  },
  typeTabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  typeTab: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  typeTabActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0284c7",
  },
  typeTabText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#475569",
    textAlign: "center",
    lineHeight: 15,
  },
  typeTabTextActive: {
    color: "#0284c7",
    fontWeight: "900",
  },
  feeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 6,
  },
  feeCardActive: {
    borderColor: "#bae6fd",
  },
  feeCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feeCardCheckboxTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  feeCardTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  checkboxTouch: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  feeCardTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  feeCardSub: {
    fontSize: 10,
    color: "#64748b",
  },
  amountInputBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    minWidth: 96,
  },
  inputRupee: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0284c7",
    marginRight: 4,
  },
  amountInputText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    padding: 0,
    minWidth: 60,
    textAlign: "right",
  },
  medicinesExpansionSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  miniLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 8,
  },
  durationChip: {
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 5,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  durationChipActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0284c7",
  },
  durationChipText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#475569",
  },
  durationChipTextActive: {
    color: "#0284c7",
    fontWeight: "800",
  },
  itemizedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  itemizedHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  addMedicineBtn: {
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  addMedicineBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284c7",
  },
  matchBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    marginBottom: 5,
  },
  matchBannerSuccess: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  matchBannerWarning: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  matchBannerText: {
    fontSize: 9.5,
    color: "#334155",
  },
  matchStatusTag: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  medicineItemCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  medRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  medIndexBadge: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  medIndexBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#475569",
  },
  medNameInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12.5,
    color: "#0f172a",
  },
  medRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  dropdownMiniBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
  },
  dropdownMiniText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    flexShrink: 1,
  },
  medAmountBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
    minWidth: 92,
  },
  medAmountText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
    padding: 0,
    minWidth: 55,
    textAlign: "right",
  },
  discountCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 6,
  },
  discountHeaderRow: {
    marginBottom: 6,
  },
  discountTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  discountSub: {
    fontSize: 9.5,
    color: "#64748b",
  },
  requestDiscountBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: "center",
  },
  requestDiscountBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  discountAppliedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 5,
    borderRadius: 5,
  },
  discountAppliedTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16a34a",
  },
  discountPendingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 5,
    borderRadius: 5,
  },
  discountPendingTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b45309",
  },
  rxWarningBanner: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginBottom: 6,
  },
  rxWarningTitle: {
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  rxWarningSub: {
    color: "#fee2e2",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },
  methodsSection: {
    marginBottom: 6,
  },
  methodsTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  mandatoryStar: {
    fontSize: 10,
    fontWeight: "800",
    color: "#dc2626",
  },
  methodsHelper: {
    fontSize: 9,
    color: "#b45309",
    marginTop: 1,
    marginBottom: 5,
  },
  methodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  methodBtn: {
    width: (SCREEN_WIDTH - 16 - 12) / 3,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  methodBtnSelected: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  methodBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  methodBtnTextSelected: {
    color: "#ffffff",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 10.5,
    color: "#64748b",
  },
  summaryTarget: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  totalDueLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
  },
  totalDueValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#16a34a",
  },
  footerBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  cancelFooterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelFooterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  confirmFooterBtn: {
    flex: 1,
    backgroundColor: "#16a34a",
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmFooterBtnDisabled: {
    opacity: 0.45,
  },
  confirmFooterText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  subModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  subModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    maxWidth: 360,
  },
  subModalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  subModalSubtitle: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 10,
  },
  inputFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginTop: 6,
    marginBottom: 3,
  },
  subModalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: "#0f172a",
  },
  subModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
  subModalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  subModalCancelText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748b",
  },
  subModalSubmitBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  subModalSubmitText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  // RECEIPT VIEW STYLES
  receiptTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  receiptTopBarTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  receiptTopBarSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  whatsAppTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  whatsAppTopBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803d",
  },
  shareTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0f172a",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  shareTopBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  receiptScrollContent: {
    padding: 12,
    backgroundColor: "#f8fafc",
  },
  receiptCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  receiptHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  receiptLogo: {
    width: 145,
    height: 40,
  },
  receiptContactCol: {
    alignItems: "flex-end",
  },
  receiptWebText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569",
  },
  receiptEmailText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#64748b",
    marginTop: 1,
  },
  receiptGreenBar: {
    height: 3,
    backgroundColor: "#84cc16",
    width: "100%",
    borderRadius: 2,
    marginVertical: 10,
  },
  receiptTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  receiptTitleText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  receiptBadgePill: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  receiptBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0284c7",
    letterSpacing: 0.5,
  },
  receiptSectionBox: {
    marginBottom: 12,
  },
  receiptSectionHeader: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#94a3b8",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  receiptGridRow: {
    flexDirection: "row",
    gap: 12,
  },
  receiptGridCol: {
    flex: 1,
  },
  receiptFieldGroup: {
    paddingVertical: 3,
  },
  receiptFieldLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#94a3b8",
  },
  receiptFieldValueBold: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 1,
  },
  receiptDividerLine: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 2,
  },
  receiptPaymentBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#86efac",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptPaymentBoxLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#166534",
    letterSpacing: 0.5,
  },
  receiptPaymentBoxAmount: {
    fontSize: 24,
    fontWeight: "900",
    color: "#16a34a",
    marginTop: 2,
  },
  receiptPaidPill: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  receiptPaidPillText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#ffffff",
  },
  receiptViaText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#166534",
    marginTop: 3,
    letterSpacing: 0.3,
  },
  breakdownTable: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 4,
  },
  breakdownHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 4,
    marginBottom: 4,
  },
  breakdownHeadDesc: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94a3b8",
  },
  breakdownHeadAmount: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94a3b8",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  breakdownRowDesc: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  breakdownRowAmount: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    marginLeft: 8,
  },
  breakdownTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: "#0f172a",
    paddingTop: 6,
    marginTop: 4,
  },
  breakdownTotalDesc: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
  },
  breakdownTotalAmount: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
  },
  receiptMetaCol: {
    marginVertical: 10,
    gap: 2,
  },
  receiptMetaText: {
    fontSize: 9,
    color: "#64748b",
  },
  receiptDisclaimer: {
    fontSize: 8.5,
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  receiptFooterGreen: {
    backgroundColor: "#84cc16",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  receiptFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  receiptFooterItemText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  receiptDoneBtn: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  receiptDoneBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  packageBannerCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    padding: 12,
    marginBottom: 12,
  },
  packageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 4,
  },
  packageBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  packageBadgePill: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  packageBadgeText: {
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  packageNameTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0c4a6e",
    flex: 1,
  },
  packageValidityText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748b",
  },
  packageStatsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  packageStatBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "#e0f2fe",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  packageStatLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  packageStatValue: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#0f172a",
  },
  packageInstallmentBox: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
    padding: 10,
  },
  packageInstallmentLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  packageAmountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    height: 42,
  },
  packageRupeeIcon: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748b",
    marginRight: 6,
  },
  packageAmountInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
  },
  packageInstallmentHint: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 6,
  },
  packageModeToggleRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  packageModeBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  packageModeBtnActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  packageModeBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369a1",
  },
  packageModeBtnTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  packagePausedInfoBox: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
    padding: 10,
  },
  packagePausedTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0369a1",
  },
  packagePausedSub: {
    fontSize: 10,
    color: "#475569",
    marginTop: 3,
  },
  // Pay Later Receipt Styles
  receiptPayLaterOrangeCard: {
    backgroundColor: "#fff7ed",
    borderWidth: 1.5,
    borderColor: "#ea580c",
    borderRadius: 10,
    padding: 12,
  },
  receiptPayLaterLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9a3412",
    textTransform: "uppercase",
  },
  receiptPayLaterPaidAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#16a34a",
    marginTop: 2,
  },
  receiptPayLaterVia: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7c2d12",
    marginTop: 2,
  },
  receiptPayLaterBadge: {
    backgroundColor: "#ea580c",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  receiptPayLaterBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#ffffff",
  },
  receiptPayLaterDueLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9a3412",
  },
  receiptPayLaterDueAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ea580c",
  },
  // Previous Pending Balance Alert Box Styles
  prevDueAlertCard: {
    backgroundColor: "#fff7ed",
    borderWidth: 1.5,
    borderColor: "#fdba74",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  prevDueAlertTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#c2410c",
  },
  prevDueAlertBadge: {
    backgroundColor: "#fed7aa",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prevDueAlertBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#9a3412",
  },
  prevDueAlertSub: {
    fontSize: 11,
    color: "#9a3412",
    marginTop: 3,
    lineHeight: 15,
  },
  prevDueOptionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  prevDueOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: "#ffffff",
  },
  prevDueOptionBtnActive: {
    backgroundColor: "#ffedd5",
    borderColor: "#ea580c",
  },
  prevDueOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  prevDueOptionTextActive: {
    color: "#c2410c",
    fontWeight: "800",
  },
  // Pay Later Orange Box Form Styles
  payLaterOrangeBox: {
    backgroundColor: "#fff7ed",
    borderWidth: 2,
    borderColor: "#ea580c",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  payLaterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payLaterIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  payLaterTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#9a3412",
  },
  payLaterSub: {
    fontSize: 10,
    color: "#c2410c",
    marginTop: 1,
  },
  payLaterToggleBtn: {
    backgroundColor: "#fed7aa",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fdba74",
  },
  payLaterToggleBtnActive: {
    backgroundColor: "#ea580c",
    borderColor: "#ea580c",
  },
  payLaterToggleBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9a3412",
  },
  payLaterToggleBtnTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  payLaterBody: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#fed7aa",
  },
  payLaterInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  payLaterInputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9a3412",
    marginBottom: 4,
  },
  payLaterInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#ea580c",
    paddingHorizontal: 8,
    height: 40,
  },
  payLaterRupee: {
    fontSize: 14,
    fontWeight: "800",
    color: "#9a3412",
    marginRight: 4,
  },
  payLaterTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#9a3412",
  },
  payLaterDuePillBox: {
    backgroundColor: "#ffedd5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fdba74",
  },
  payLaterDuePillLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#9a3412",
    textTransform: "uppercase",
  },
  payLaterDuePillAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ea580c",
    marginTop: 2,
  },
  payLaterSummaryBadges: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  payLaterBadgeItem: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payLaterBadgeItemLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#64748b",
  },
  payLaterBadgeItemVal: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 1,
  },
  // Compact Pay Later Button Card
  payLaterCompactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    marginBottom: 12,
    gap: 8,
  },
  payLaterCompactCardActive: {
    backgroundColor: "#ffedd5",
    borderColor: "#ea580c",
  },
  payLaterCompactTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#9a3412",
  },
  payLaterCompactSub: {
    fontSize: 10,
    color: "#c2410c",
    marginTop: 1,
  },
  payLaterSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ea580c",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payLaterSmallBtnActive: {
    backgroundColor: "#c2410c",
  },
  payLaterSmallBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  payLaterActivePill: {
    backgroundColor: "#ea580c",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  payLaterActivePillText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#ffffff",
  },
  // Timing Picker Modal
  timingPickerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 360,
    maxHeight: 400,
  },
  timingPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 8,
  },
  timingOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 6,
    backgroundColor: "#f8fafc",
  },
  timingOptionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  timingOptionDesc: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1,
  },
  // Pay Later Pop-up Modal Card
  payLaterPopupCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  payLaterPopupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
  },
  payLaterPopupTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#9a3412",
  },
  payLaterPopupSub: {
    fontSize: 10.5,
    color: "#c2410c",
    marginTop: 2,
  },
  payLaterBillBanner: {
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fed7aa",
    marginTop: 12,
  },
  payLaterBillLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9a3412",
    letterSpacing: 0.5,
  },
  payLaterBillAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ea580c",
    marginTop: 2,
  },
  payLaterPercentRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  payLaterPercentBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: "center",
  },
  payLaterPercentBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#334155",
  },
  payLaterDueCard: {
    backgroundColor: "#fff1f2",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#fecdd3",
    alignItems: "center",
  },
  payLaterDueCardLabel: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#be123c",
    letterSpacing: 0.5,
  },
  payLaterDueCardVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#e11d48",
    marginTop: 2,
  },
  payLaterDueCardSub: {
    fontSize: 10,
    color: "#9f1239",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 14,
  },
  payLaterPopupFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  payLaterClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  payLaterClearBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  payLaterApplyBtn: {
    flex: 1,
    backgroundColor: "#ea580c",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  payLaterApplyBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
  },
});

