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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../services/auth";

export type PaymentMethod = "Cash" | "Counter UPI" | "UPI / QR Code" | "Card" | "Split" | "Send Pay to app";

interface MedicineItem {
  id: string;
  name: string;
  type: "Pills" | "Syrup" | "Powder" | "Drops" | "Ointment" | "Oil" | "Tablet" | "Other";
  timing: "M-A-N" | "M--E" | "M--N" | "M-A-" | "M---" | "-A-" | "--E-" | "--N";
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
  const hasPrescription = rxImages.length > 0;

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

  // Selected Payment Method
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize on modal open
  useEffect(() => {
    if (visible && appointment) {
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
  }, [visible, appointment]);

  // Adjust Fees Based on Payment Type
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
      setConsultationFee(0);
      setIncludeMedicine(false);
      setMedicineFee(0);
    }
  };

  // Re-calculate when Target Amount changes
  const handleTargetAmountChange = (text: string) => {
    setTargetAmount(text);
    const target = parseFloat(text) || 0;
    if (paymentType === "consultation") {
      setConsultationFee(target);
    } else if (paymentType === "consult_and_med" || paymentType === "split") {
      const half = Math.round(target / 2);
      setConsultationFee(half);
      setMedicineFee(target - half);
      if (medicines.length === 1) {
        setMedicines([{ ...medicines[0], amount: target - half }]);
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

  const itemizedTotal = medicines.reduce((sum, m) => sum + (m.amount || 0), 0);
  const isMedicineTotalMatching = !includeMedicine || medicineFee === 0 || itemizedTotal === medicineFee;

  // Total Due calculation with approved discount
  const baseTotal = (includeConsult ? consultationFee : 0) + (includeMedicine ? medicineFee : 0) + (includeDiet ? dietFee : 0);
  const totalAmountDue = Math.max(0, baseTotal - (discountStatus === "APPROVED" ? discountApprovedAmount : 0));

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

    if (includeMedicine && medicineFee > 0 && itemizedTotal !== medicineFee) {
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

    setIsSubmitting(true);
    try {
      const payload = {
        appointmentId: appointment.id,
        consultationFee: includeConsult ? consultationFee : 0,
        medicineFee: includeMedicine ? medicineFee : 0,
        dietPlanFee: includeDiet ? dietFee : 0,
        totalAmountDue,
        paymentMethod:
          selectedMethod === "Cash"
            ? "CASH"
            : selectedMethod === "Counter UPI"
            ? "COUNTER_UPI"
            : selectedMethod === "UPI / QR Code"
            ? "ONLINE_UPI"
            : selectedMethod === "Card"
            ? "CARD"
            : selectedMethod === "Split"
            ? "SPLIT"
            : "SEND_TO_APP",
        medicinesList: includeMedicine ? medicines : [],
        medicineDuration,
        discountApproved: discountStatus === "APPROVED" ? discountApprovedAmount : 0,
        discountNotes,
        discountStatus,
      };

      const res = await apiFetch<any>("/reception/payment", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        Alert.alert(
          "Payment Confirmed ✓",
          `Payment of ₹${totalAmountDue} via ${selectedMethod} recorded successfully!\n${appointment.patientName}'s consultation is now completed.`,
          [
            {
              text: "OK",
              onPress: () => {
                onPaymentSuccess(res.appointment || { ...appointment, status: "COMPLETED" });
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert("Payment Error", res.error || "Failed to process payment.");
      }
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible || !appointment) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top", "bottom", "left", "right"]}>
        <View style={styles.container}>
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

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* 1. TARGET AMOUNT BOX (Matching Screenshot 2) */}
          <View style={styles.targetCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.targetCardTitle}>Target Amount (Consultation + Medicine):</Text>
              <Text style={styles.targetCardSub}>Split & presets calculate strictly within this target</Text>
            </View>

            <View style={styles.targetInputWrapper}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.targetTextInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94a3b8"
                value={targetAmount}
                onChangeText={handleTargetAmountChange}
              />
            </View>
          </View>

          {/* 2. PAYMENT TYPE TABS (Matching Screenshot 2) */}
          <View style={styles.typeTabsRow}>
            {(
              [
                { id: "consultation", label: "Consultation" },
                { id: "consult_and_med", label: "Consultation & Medicine" },
                { id: "split", label: "Split" },
                { id: "package", label: "Package" },
              ] as const
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

          {/* 3. CONSULTATION FEE CARD (Matching Screenshot) */}
          <View style={[styles.feeCard, includeConsult && styles.feeCardActive]}>
            <TouchableOpacity
              style={styles.checkboxTouch}
              onPress={() => setIncludeConsult(!includeConsult)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={includeConsult ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={includeConsult ? "#0284c7" : "#cbd5e1"}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.feeCardTitle}>Consultation Fee</Text>
                <Text style={styles.feeCardSub}>Doctor Requested Consultation Fee</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.amountInputBox}>
              <Text style={styles.inputRupee}>₹</Text>
              <TextInput
                style={styles.amountInputText}
                keyboardType="numeric"
                editable={includeConsult && (paymentType === "consultation" || paymentType === "split" || paymentType === "consult_and_med")}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                value={consultationFee > 0 ? String(consultationFee) : ""}
                onChangeText={handleConsultFeeChange}
              />
            </View>
          </View>

          {/* 4. PRESCRIBED MEDICINES CARD (Matching Screenshot 3) */}
          <View
            style={[
              styles.feeCard,
              includeMedicine && styles.feeCardActive,
              paymentType === "consultation" && { opacity: 0.55 },
            ]}
          >
            <TouchableOpacity
              style={styles.checkboxTouch}
              disabled={paymentType === "consultation"}
              onPress={() => {
                if (paymentType === "consultation") {
                  Alert.alert(
                    "Consultation Mode Active",
                    "Prescribed medicines cannot be selected under Consultation-only mode. Please select 'Consultation & Medicine' or 'Split' above to include medicines."
                  );
                  return;
                }
                const next = !includeMedicine;
                setIncludeMedicine(next);
                if (next && medicineFee === 0) {
                  const target = parseFloat(targetAmount) || 0;
                  const med = Math.max(0, target - consultationFee);
                  setMedicineFee(med);
                }
              }}
              activeOpacity={paymentType === "consultation" ? 1 : 0.7}
            >
              <Ionicons
                name={includeMedicine && paymentType !== "consultation" ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={includeMedicine && paymentType !== "consultation" ? "#0284c7" : "#cbd5e1"}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={styles.feeCardTitle}>Prescribed Medicines</Text>
                  {paymentType === "consultation" && (
                    <Text style={{ fontSize: 9, fontWeight: "700", color: "#94a3b8" }}>
                      (Disabled in Consultation)
                    </Text>
                  )}
                </View>
                <Text style={styles.feeCardSub}>Prescribed Remedies / Pharmacy Fee</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.amountInputBox}>
              <Text style={styles.inputRupee}>₹</Text>
              <TextInput
                style={styles.amountInputText}
                keyboardType="numeric"
                editable={includeMedicine && paymentType === "split"}
                value={paymentType === "consultation" ? "0" : String(medicineFee)}
                onChangeText={(val) => {
                  const num = parseFloat(val) || 0;
                  setMedicineFee(num);
                }}
              />
            </View>

            {/* EXPANDABLE MEDICINE DETAILS (Matching Screenshot 3) */}
            {includeMedicine && medicineFee > 0 && paymentType !== "consultation" && (
              <View style={styles.medicinesExpansionSection}>
                {/* Duration Chips */}
                <Text style={styles.miniLabel}>Medicine Duration:</Text>
                <View style={styles.durationRow}>
                  {["1 Month", "2 Months", "3 Months", "4 Months", "5 Months", "6 Months"].map((dur) => {
                    const isDurSelected = medicineDuration === dur;
                    return (
                      <TouchableOpacity
                        key={dur}
                        style={[styles.durationChip, isDurSelected && styles.durationChipActive]}
                        onPress={() => setMedicineDuration(dur)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.durationChipText, isDurSelected && styles.durationChipTextActive]}>
                          {dur}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Itemized Header & Match Indicator */}
                <View style={styles.itemizedHeaderRow}>
                  <Text style={styles.itemizedHeaderTitle}>Itemized Medicines ({medicines.length})</Text>
                  <TouchableOpacity style={styles.addMedicineBtn} onPress={handleAddMedicine} activeOpacity={0.7}>
                    <Text style={styles.addMedicineBtnText}>+ Add Medicine</Text>
                  </TouchableOpacity>
                </View>

                {/* Match Banner */}
                <View
                  style={[
                    styles.matchBanner,
                    isMedicineTotalMatching ? styles.matchBannerSuccess : styles.matchBannerWarning,
                  ]}
                >
                  <Text style={styles.matchBannerText}>
                    Allocated Medicine: <Text style={{ fontWeight: "800" }}>₹{medicineFee}</Text> | Itemized:{" "}
                    <Text style={{ fontWeight: "800" }}>₹{itemizedTotal}</Text>
                  </Text>
                  <Text
                    style={[
                      styles.matchStatusTag,
                      isMedicineTotalMatching ? { color: "#16a34a" } : { color: "#ea580c" },
                    ]}
                  >
                    {isMedicineTotalMatching
                      ? "✓ Total Matches"
                      : `⚠️ Diff: ₹${Math.abs(medicineFee - itemizedTotal)}`}
                  </Text>
                </View>

                {/* Medicines List */}
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
                        {/* Type Selector Pill */}
                        <TouchableOpacity
                          style={styles.dropdownMiniBtn}
                          onPress={() => {
                            const types: MedicineItem["type"][] = [
                              "Pills",
                              "Syrup",
                              "Powder",
                              "Drops",
                              "Ointment",
                              "Oil",
                              "Tablet",
                              "Other",
                            ];
                            const curIdx = types.indexOf(med.type);
                            const nextType = types[(curIdx + 1) % types.length];
                            handleUpdateMedicine(med.id, { type: nextType });
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dropdownMiniText}>{med.type}</Text>
                          <Ionicons name="chevron-down" size={12} color="#64748b" />
                        </TouchableOpacity>

                        {/* Timing Selector Pill */}
                        <TouchableOpacity
                          style={styles.dropdownMiniBtn}
                          onPress={() => {
                            const timings: MedicineItem["timing"][] = [
                              "M-A-N",
                              "M--E",
                              "M--N",
                              "M-A-",
                              "M---",
                              "-A-",
                              "--E-",
                              "--N",
                            ];
                            const curIdx = timings.indexOf(med.timing);
                            const nextTiming = timings[(curIdx + 1) % timings.length];
                            handleUpdateMedicine(med.id, { timing: nextTiming });
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dropdownMiniText}>{med.timing}</Text>
                          <Ionicons name="chevron-down" size={12} color="#64748b" />
                        </TouchableOpacity>

                        {/* Amount */}
                        <View style={styles.medAmountBox}>
                          <Text style={styles.inputRupee}>₹</Text>
                          <TextInput
                            style={styles.medAmountText}
                            keyboardType="numeric"
                            value={String(med.amount || "")}
                            onChangeText={(txt) =>
                              handleUpdateMedicine(med.id, { amount: parseFloat(txt) || 0 })
                            }
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 5. DIET PLAN FEE CARD */}
          <View style={[styles.feeCard, includeDiet && styles.feeCardActive]}>
            <TouchableOpacity
              style={styles.checkboxTouch}
              onPress={() => setIncludeDiet(!includeDiet)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={includeDiet ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={includeDiet ? "#0284c7" : "#cbd5e1"}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.feeCardTitle}>Diet Plan Fee</Text>
                <Text style={styles.feeCardSub}>Diet & Nutrition Fee</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.amountInputBox}>
              <Text style={styles.inputRupee}>₹</Text>
              <TextInput
                style={styles.amountInputText}
                keyboardType="numeric"
                editable={includeDiet}
                value={String(dietFee)}
                onChangeText={(val) => setDietFee(parseFloat(val) || 0)}
              />
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
                  "Cash",
                  "Counter UPI",
                  "UPI / QR Code",
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
                    onPress={() => setSelectedMethod(method)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.methodBtnText, isMethodSelected && styles.methodBtnTextSelected]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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

            <View style={[styles.summaryRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" }]}>
              <Text style={styles.totalDueLabel}>TOTAL AMOUNT DUE:</Text>
              <Text style={styles.totalDueValue}>₹ {totalAmountDue}</Text>
            </View>
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
        </Modal>
      </View>
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
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  targetCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369a1",
  },
  targetCardSub: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 1,
  },
  targetInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    borderRadius: 6,
    paddingHorizontal: 6,
    height: 32,
    minWidth: 70,
  },
  rupeeSymbol: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284c7",
    marginRight: 3,
  },
  targetTextInput: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    padding: 0,
    minWidth: 45,
  },
  typeTabsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  typeTabActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0284c7",
  },
  typeTabText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  typeTabTextActive: {
    color: "#0284c7",
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
  checkboxTouch: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  feeCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  feeCardSub: {
    fontSize: 9.5,
    color: "#64748b",
  },
  amountInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 32,
    alignSelf: "flex-end",
    minWidth: 80,
  },
  inputRupee: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
    marginRight: 3,
  },
  amountInputText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    padding: 0,
    minWidth: 50,
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
    borderRadius: 5,
    paddingHorizontal: 6,
    height: 28,
    fontSize: 11,
    color: "#0f172a",
  },
  medRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },
  dropdownMiniBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    paddingHorizontal: 6,
    height: 26,
  },
  dropdownMiniText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  medAmountBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    paddingHorizontal: 5,
    height: 26,
    width: 68,
  },
  medAmountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    padding: 0,
    width: 45,
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
});

