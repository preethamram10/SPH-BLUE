import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getActiveBranch, apiFetch } from "../../../services/auth";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";
import {
  generateMedicineRequestPDF,
  printMedicineRequestDirect,
  getBranchPhone,
} from "./pdf/generateMedicineRequestPDF";
import { CLINIC_LOGO_BASE64 } from "./pdf/logoBase64";

// --- OPTIONS CONSTANTS ---
export const DOSAGE_TIMING_OPTIONS = [
  "M - A - N",
  "M - - E",
  "M - - N",
  "M - A -",
  "- A - N",
  "M - - -",
  "- - N",
  "1-0-1",
  "1-1-1",
  "SOS",
];

export const MEDICINE_TYPE_OPTIONS = [
  "Pills",
  "Drops",
  "Mother Tincture",
  "Tablet",
  "Syrup",
  "Powder",
  "Ointment",
];

export const DURATION_OPTIONS = [
  "15 Days",
  "1 Month",
  "2 Months",
  "3 Months",
  "4 Months",
  "6 Months",
];

export const BRANCH_OPTIONS = [
  "KPHB Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

export interface MedicineItem {
  id: string;
  name: string;
  type: string;
  timing: string;
  amount: number;
}

export interface MedicalRequestItem {
  id: string;
  requestId: string;
  patientName: string;
  phone: string;
  gender: string;
  age?: string;
  branchName: string;
  duration: string;
  totalAmount: number;
  medicines: MedicineItem[];
  deliveryAddress?: string;
  notes?: string;
  status: "pending" | "completed" | "dispatched" | "rejected";
  createdAt: string;
}

export default function MedicalRequestsScreen() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "pending" | "completed" | "dispatched" | "rejected">("ALL");
  const [requests, setRequests] = useState<MedicalRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Request Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Mr.");
  const [branchName, setBranchName] = useState("KPHB Branch");
  const [duration, setDuration] = useState("1 Month");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    { id: "1", name: "", type: "Pills", timing: "M - - N", amount: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  // Share Popup Modal State (WhatsApp & PDF)
  const [sharePopupData, setSharePopupData] = useState<{
    patientName: string;
    gender: string;
    phone: string;
    age?: string;
    branchName: string;
    duration: string;
    totalAmount: number;
    medicines: MedicineItem[];
    notes?: string;
  } | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("");

  // Dropdown Picker Modals (no branch dropdown)
  const [pickerModal, setPickerModal] = useState<{
    type: "gender" | "duration" | "medType" | "timing";
    rowIndex?: number;
  } | null>(null);

  useEffect(() => {
    getActiveBranch().then((branch) => {
      if (branch) {
        setActiveBranch(branch);
        setBranchName(branch.name.includes("Branch") ? branch.name : `${branch.name} Branch`);
      }
    });
    // Kept empty as requested until linked out later
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; requests: MedicalRequestItem[] }>(
        "/reception/medical-requests"
      );
      if (res.success && Array.isArray(res.requests)) {
        setRequests(res.requests);
      }
    } catch (e) {
      console.warn("Failed to fetch medical requests on mobile:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "pending" | "completed" | "dispatched" | "rejected") => {
    try {
      const res = await apiFetch<{ success: boolean }>(
        "/reception/medical-requests",
        {
          method: "POST",
          body: JSON.stringify({ action: "UPDATE_STATUS", id, status: newStatus }),
        }
      );
      if (res.success) {
        fetchRequests();
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  // Medicine Rows Management
  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", type: "Pills", timing: "M - - N", amount: 0 },
    ]);
  };

  const handleRemoveMedicineRow = (id: string) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMedicine = (id: string, field: keyof MedicineItem, value: any) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Handle user changing Total Medicine Fee
  const handleTotalAmountChange = (text: string) => {
    const cleanNum = text.replace(/[^0-9.]/g, "");
    const val = cleanNum ? Number(cleanNum) : 0;
    setTotalAmount(val);

    // If only 1 remedy row exists, auto-sync its individual price to match total fee
    setMedicines((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], amount: val }];
      }
      return prev;
    });
  };

  const medicinesSum = medicines.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  const isFeeMatched = totalAmount > 0 ? medicinesSum === totalAmount : true;

  const handleClearForm = () => {
    setPatientName("");
    setPhone("");
    setAge("");
    setGender("Mr.");
    setDuration("1 Month");
    setTotalAmount(0);
    setMedicines([{ id: "1", name: "", type: "Pills", timing: "M - - N", amount: 0 }]);
    setNotes("");
  };

  // SHARE MEDICAL REQUEST ACTION (No mandatory DB save needed, directly prepares instant share)
  const handleShareMedicalRequest = () => {
    if (!patientName.trim()) {
      Alert.alert("Validation", "Please enter patient full name.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert("Validation", "Please enter a valid 10-digit phone number.");
      return;
    }
    const validMeds = medicines.filter((m) => m.name.trim().length > 0);
    if (validMeds.length === 0) {
      Alert.alert("Validation", "Please add at least one medicine remedy.");
      return;
    }

    const finalTotal = Number(totalAmount) || 0;

    // Auto sync 1 remedy if amount wasn't typed
    if (validMeds.length === 1 && finalTotal > 0 && (!validMeds[0].amount || Number(validMeds[0].amount) === 0)) {
      validMeds[0].amount = finalTotal;
    }

    const currentRemediesSum = validMeds.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    // Enforce that prescribed remedies sum must equal the Total Medicine Fee
    if (finalTotal > 0 && currentRemediesSum !== finalTotal) {
      Alert.alert(
        "Fee Mismatch",
        `Total Medicine Fee (₹${finalTotal}) must be equal to the sum of prescribed remedies (₹${currentRemediesSum}).\nDifference: ₹${Math.abs(finalTotal - currentRemediesSum)}\n\nPlease match the amounts to share.`
      );
      return;
    }

    const payload = {
      patientName: patientName.trim(),
      phone: cleanPhone.slice(-10),
      age: age.trim() || undefined,
      gender,
      branchName,
      duration,
      totalAmount: finalTotal,
      medicines: validMeds,
      notes: notes.trim() || undefined,
    };

    // Save to DB in background
    apiFetch("/reception/medical-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res: any) => {
        if (res?.success) {
          fetchRequests();
        }
      })
      .catch((err) => console.warn("Could not save medical request to DB on mobile:", err));

    // Open share popup modal directly with prefilled details
    setSharePopupData(payload);
    setWhatsappPhone(cleanPhone.slice(-10));
  };

  const handleSendViaWhatsApp = () => {
    if (!sharePopupData) return;
    const cleanP = (whatsappPhone || sharePopupData.phone || "").replace(/\D/g, "").slice(-10);
    if (!cleanP || cleanP.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit WhatsApp number.");
      return;
    }

    const medsList = sharePopupData.medicines
      .filter((m) => m.name.trim().length > 0)
      .map((m, i) => `  ${i + 1}. *${m.name}* (${m.type || "Pills"})\n     Dosage: ${m.timing}`)
      .join("\n\n");

    const notesBlock = sharePopupData.notes && sharePopupData.notes.trim()
      ? `${sharePopupData.notes.trim()}\n\n--------------------------------\n`
      : "";

    const text = encodeURIComponent(
      `*SPIRITUAL HOMEOPATHY CLINICS*\n` +
      `*Official Medical Request & Remedy Slip*\n` +
      `--------------------------------\n` +
      `*Patient:* ${sharePopupData.gender} ${sharePopupData.patientName} ${sharePopupData.age ? `(${sharePopupData.age}y)` : ""}\n` +
      `*Contact:* +91 ${cleanP}\n` +
      `*Clinic Branch:* ${sharePopupData.branchName}\n` +
      `*Course Duration:* ${sharePopupData.duration}\n` +
      `*Total Medicine Fee:* ₹${Number(sharePopupData.totalAmount || 0).toFixed(2)}\n` +
      `--------------------------------\n` +
      `${notesBlock}` +
      `*Prescribed Remedies:*\n\n${medsList}\n\n` +
      `--------------------------------\n` +
      `Spiritual Homeopathy Clinics (${sharePopupData.branchName || "Clinic"})\nHelpline: ${getBranchPhone(sharePopupData.branchName)} | spiritualhomeoclinic.com`
    );

    Linking.openURL(`https://wa.me/91${cleanP}?text=${text}`).catch(() => {
      Alert.alert("Error", "WhatsApp is not available on this device.");
    });
  };

  const handleSharePdfOrDoc = async () => {
    if (!sharePopupData) return;
    const cleanP = (whatsappPhone || sharePopupData.phone || "").replace(/\D/g, "").slice(-10);
    await generateMedicineRequestPDF({
      patientName: sharePopupData.patientName,
      phone: cleanP || sharePopupData.phone,
      age: sharePopupData.age,
      gender: sharePopupData.gender,
      branchName: sharePopupData.branchName,
      receptionPhone: (sharePopupData as any).receptionPhone,
      duration: sharePopupData.duration,
      totalAmount: sharePopupData.totalAmount,
      medicines: sharePopupData.medicines,
      notes: sharePopupData.notes,
    });
  };

  const handleDirectPrint = async () => {
    if (!sharePopupData) return;
    await printMedicineRequestDirect({
      patientName: sharePopupData.patientName,
      phone: sharePopupData.phone,
      age: sharePopupData.age,
      gender: sharePopupData.gender,
      branchName: sharePopupData.branchName,
      receptionPhone: (sharePopupData as any).receptionPhone,
      duration: sharePopupData.duration,
      totalAmount: sharePopupData.totalAmount,
      medicines: sharePopupData.medicines,
      notes: sharePopupData.notes,
    });
  };

  // Filtered requests list
  const filteredRequests = requests.filter((r) => {
    if (activeTab === "pending") return (r.status || "pending") === "pending";
    if (activeTab === "completed") return r.status === "completed";
    if (activeTab === "dispatched") return r.status === "dispatched";
    if (activeTab === "rejected") return r.status === "rejected";
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* 1. TOP NAVBAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.titleCol}>
          <Text style={styles.titleText}>Medical Requests</Text>
          <Text style={styles.subtitleText}>
            {branchName} • Requests &amp; Completed
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setIsFormOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={17} color="#ffffff" />
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* 2. TABS BAR */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "ALL" && styles.tabButtonActive]}
            onPress={() => setActiveTab("ALL")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "ALL" && styles.tabTextActive]}>
              All ({requests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "pending" && styles.tabButtonActive]}
            onPress={() => setActiveTab("pending")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
              Pending ({requests.filter((r) => (r.status || "pending") === "pending").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "completed" && styles.tabButtonActive]}
            onPress={() => setActiveTab("completed")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "completed" && styles.tabTextActive]}>
              Completed ({requests.filter((r) => r.status === "completed").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "dispatched" && styles.tabButtonActive]}
            onPress={() => setActiveTab("dispatched")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "dispatched" && styles.tabTextActive]}>
              Dispatched ({requests.filter((r) => r.status === "dispatched").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "rejected" && styles.tabButtonActive]}
            onPress={() => setActiveTab("rejected")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "rejected" && styles.tabTextActive]}>
              Rejected ({requests.filter((r) => r.status === "rejected").length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 3. REQUESTS LIST */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ padding: 14, paddingBottom: 95 }}
      >
        {isLoading ? (
          <View style={{ padding: 30, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#16a34a" />
            <Text style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>Loading requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="medkit-outline" size={32} color="#16a34a" />
            </View>
            <Text style={styles.emptyTitle}>No Medical Requests</Text>
            <Text style={styles.emptySubtitle}>
              Tap the &quot;+ New&quot; button to prescribe remedies and instantly share via WhatsApp or PDF.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => setIsFormOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.emptyActionBtnText}>Create New Request</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredRequests.map((item) => {
              const isCompleted = item.status === "completed";
              return (
                <View key={item.id || item.requestId} style={styles.requestCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientNameText}>
                        {item.gender} {item.patientName} {item.age ? `(${item.age}y)` : ""}
                      </Text>
                      <Text style={styles.cardPhoneText}>
                        📞 +91 {item.phone} • {item.branchName}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isCompleted ? "#dcfce7" : "#fef3c7" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isCompleted ? "#15803d" : "#b45309" },
                        ]}
                      >
                        {isCompleted ? "COMPLETED" : "PENDING"}
                      </Text>
                    </View>
                  </View>

                  {/* Prescribed Remedies Summary */}
                  <View style={styles.medsBox}>
                    <Text style={styles.medsBoxTitle}>
                      Remedies ({item.duration || "1 Month"}):
                    </Text>
                    {(item.medicines || []).map((m, idx) => (
                      <View key={idx} style={styles.medRow}>
                        <Text style={styles.medBullet}>•</Text>
                        <Text style={styles.medText}>
                          <Text style={{ fontWeight: "800", color: "#0f172a" }}>{m.name}</Text>{" "}
                          ({m.type || "Pills"}) - {m.timing}
                        </Text>
                        {Number(m.amount) > 0 && (
                          <Text style={styles.medPriceText}>₹{m.amount}</Text>
                        )}
                      </View>
                    ))}
                    {item.notes ? (
                      <View style={{ marginTop: 6, backgroundColor: "#f0f9ff", padding: 6, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: "#0284c7" }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: "#0284c7" }}>
                          Notes: <Text style={{ fontWeight: "500", color: "#334155" }}>{item.notes}</Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooterRow}>
                    <Text style={styles.totalFeeText}>
                      Total: ₹{Number(item.totalAmount || 0).toFixed(2)}
                    </Text>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.cardPdfBtn}
                        onPress={() => {
                          setSharePopupData({
                            patientName: item.patientName,
                            gender: item.gender,
                            phone: item.phone,
                            age: item.age,
                            branchName: item.branchName,
                            duration: item.duration,
                            totalAmount: item.totalAmount,
                            medicines: item.medicines,
                            notes: item.notes,
                          });
                          setWhatsappPhone(item.phone);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="document-text-outline" size={13} color="#0284c7" />
                        <Text style={styles.cardPdfBtnText}>PDF</Text>
                      </TouchableOpacity>
                      {isCompleted ? (
                        <View style={styles.completedBadgeBtn}>
                          <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                          <Text style={styles.completedBadgeBtnText}>Completed</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.completeBtn}
                          onPress={() => handleUpdateStatus(item.id, "completed")}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                          <Text style={styles.completeBtnText}>Mark Completed</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ========================================================
          4. NEW MEDICAL REQUEST MODAL (With Resizing & No Overlap)
         ======================================================== */}
      <Modal visible={isFormOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
          {/* Modal Header */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setIsFormOpen(false)} style={styles.backBtn}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.titleCol}>
              <Text style={styles.titleText}>New Medical Request</Text>
              <Text style={styles.subtitleText}>{branchName} • Prescribe &amp; Share</Text>
            </View>

            <TouchableOpacity
              style={[styles.addBtn, !isFeeMatched && { opacity: 0.5 }]}
              onPress={handleShareMedicalRequest}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Form Scroll Area with Keyboard Resizing */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Step 1: Patient & Clinic Details */}
              <View style={styles.formCard}>
                <View style={styles.formSectionHeader}>
                  <View style={styles.stepNumBadge}>
                    <Text style={styles.stepNumText}>1</Text>
                  </View>
                  <Text style={styles.formSectionTitle}>Patient &amp; Clinic Details</Text>
                </View>

                {/* Title & Patient Name */}
                <Text style={styles.fieldLabel}>Patient Full Name *</Text>
                <View style={styles.nameRow}>
                  <TouchableOpacity
                    style={styles.genderSelectBtn}
                    onPress={() => setPickerModal({ type: "gender" })}
                  >
                    <Text style={styles.genderSelectText}>{gender}</Text>
                    <Ionicons name="chevron-down" size={14} color="#64748b" />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.nameInput}
                    placeholder="e.g. Ravi Kumar"
                    placeholderTextColor="#94a3b8"
                    value={patientName}
                    onChangeText={setPatientName}
                  />
                </View>

                {/* Phone & Age */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Phone (+91) *</Text>
                    <TextInput
                      style={styles.inputBox}
                      placeholder="10-digit number"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
                    />
                  </View>

                  <View style={{ width: 85 }}>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput
                      style={styles.inputBox}
                      placeholder="e.g. 34"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={age}
                      onChangeText={setAge}
                    />
                  </View>
                </View>

                {/* Branch & Duration */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Clinic Branch (Locked)</Text>
                    <View style={[styles.inputBox, styles.disabledBox]}>
                      <Ionicons name="business" size={13} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={styles.disabledText} numberOfLines={1}>
                        {branchName}
                      </Text>
                      <Ionicons name="lock-closed" size={12} color="#94a3b8" style={{ marginLeft: "auto" }} />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Course Duration *</Text>
                    <TouchableOpacity
                      style={styles.pickerBox}
                      onPress={() => setPickerModal({ type: "duration" })}
                    >
                      <Text style={styles.pickerBoxText} numberOfLines={1}>
                        {duration}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Total Medicine Fee */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.fieldLabel}>Total Medicine Fee (₹) *</Text>
                  <TextInput
                    style={[styles.inputBox, { fontWeight: "900", color: "#16a34a" }]}
                    placeholder="e.g. 500"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={totalAmount ? String(totalAmount) : ""}
                    onChangeText={handleTotalAmountChange}
                  />
                </View>
              </View>

              {/* Step 2: Prescribed Remedies Table (Spacious, Zero-Overlap) */}
              <View style={styles.formCard}>
                <View style={[styles.formSectionHeader, { justifyContent: "space-between" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.stepNumBadge, { backgroundColor: "#16a34a" }]}>
                      <Text style={styles.stepNumText}>2</Text>
                    </View>
                    <Text style={styles.formSectionTitle}>Prescribed Remedies</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.addMedBtn}
                    onPress={handleAddMedicineRow}
                  >
                    <Ionicons name="add" size={13} color="#0284c7" />
                    <Text style={styles.addMedBtnText}>Add Row</Text>
                  </TouchableOpacity>
                </View>

                {/* Real-time Fee Match Indicator */}
                {totalAmount > 0 && (
                  <View
                    style={[
                      styles.feeMatchBanner,
                      medicinesSum === totalAmount
                        ? styles.feeMatchSuccess
                        : styles.feeMatchWarning,
                    ]}
                  >
                    <Ionicons
                      name={medicinesSum === totalAmount ? "checkmark-circle" : "alert-circle"}
                      size={15}
                      color={medicinesSum === totalAmount ? "#15803d" : "#b45309"}
                    />
                    <Text
                      style={[
                        styles.feeMatchText,
                        { color: medicinesSum === totalAmount ? "#15803d" : "#b45309" },
                      ]}
                    >
                      {medicinesSum === totalAmount
                        ? `Remedies Total: ₹${medicinesSum} (Equals Total Fee ₹${totalAmount} ✓)`
                        : `Remedies Total: ₹${medicinesSum} / ₹${totalAmount} (Must equal Total Fee ₹${totalAmount} • Diff: ₹${Math.abs(totalAmount - medicinesSum)})`}
                    </Text>
                  </View>
                )}

                {medicines.map((m, idx) => (
                  <View key={m.id} style={styles.medItemCard}>
                    {/* Row 1: Remedy Name & Potency */}
                    <View style={styles.medItemTopRow}>
                      <Text style={styles.medNumPill}>#{idx + 1}</Text>
                      <TextInput
                        style={styles.medNameInput}
                        placeholder="Remedy & Potency (e.g. Arsenicum Album 200CH)"
                        placeholderTextColor="#94a3b8"
                        value={m.name}
                        onChangeText={(t) => handleUpdateMedicine(m.id, "name", t)}
                      />
                      {medicines.length > 1 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMedicineRow(m.id)}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#e11d48" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Row 2: Form Type & Timing Selectors */}
                    <View style={styles.medItemDetailsRow}>
                      <TouchableOpacity
                        style={styles.medChipBtn}
                        onPress={() => setPickerModal({ type: "medType", rowIndex: idx })}
                      >
                        <Text style={styles.medChipBtnText} numberOfLines={1}>
                          Type: {m.type || "Pills"}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color="#64748b" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.medChipBtn}
                        onPress={() => setPickerModal({ type: "timing", rowIndex: idx })}
                      >
                        <Text style={styles.medChipBtnText} numberOfLines={1}>
                          {m.timing || "M - - N"}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    {/* Row 3: Dedicated Amount Row (Zero Overlap) */}
                    <View style={styles.medPriceDedicatedRow}>
                      <Text style={styles.medPriceLabel}>Remedy Amount (₹):</Text>
                      <View style={styles.medPriceInputWrapper}>
                        <Text style={styles.medCurrencySymbol}>₹</Text>
                        <TextInput
                          style={styles.medPriceDedicatedInput}
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                          value={m.amount ? String(m.amount) : ""}
                          onChangeText={(t) => handleUpdateMedicine(m.id, "amount", Number(t))}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Step 3: Clinical Notes / Special Instructions */}
              <View style={styles.formCard}>
                <View style={styles.formSectionHeader}>
                  <View style={[styles.stepNumBadge, { backgroundColor: "#0284c7" }]}>
                    <Text style={styles.stepNumText}>3</Text>
                  </View>
                  <Text style={styles.formSectionTitle}>Clinical Notes / Instructions</Text>
                </View>
                <TextInput
                  style={[
                    styles.inputBox,
                    { height: 75, textAlignVertical: "top", paddingTop: 8, paddingBottom: 8 },
                  ]}
                  placeholder="Enter clinical notes, dietary instructions, or special precautions..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </ScrollView>

            {/* Bottom Footer Bar */}
            <View style={styles.modalFooterBar}>
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearForm}>
                <Ionicons name="refresh-outline" size={15} color="#64748b" />
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, !isFeeMatched && { opacity: 0.6 }]}
                onPress={handleShareMedicalRequest}
                activeOpacity={0.85}
              >
                <Ionicons name="share-social" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.submitBtnText}>Share Medical Request</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* SHARE & PDF PREVIEW POPUP MODAL */}
      <Modal
        visible={sharePopupData !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSharePopupData(null)}
      >
        <View style={styles.shareModalBackdrop}>
          <View style={styles.shareModalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Header */}
              <View style={styles.shareSuccessHeader}>
                <View style={styles.shareIconCircle}>
                  <Ionicons name="checkmark-circle" size={32} color="#16a34a" />
                </View>
                <Text style={styles.shareModalTitle}>Medical Request Ready</Text>
                <Text style={styles.shareModalSubtitle}>
                  {sharePopupData?.gender} {sharePopupData?.patientName} • Fee: ₹{Number(sharePopupData?.totalAmount || 0).toFixed(2)}
                </Text>
              </View>

              {/* VISUAL PDF LETTERHEAD CERTIFICATE PREVIEW */}
              <View style={styles.certPreviewWrapper}>
                {/* Top Header: Left White with Logo, Right Blue Banner */}
                <View style={styles.certPreviewTopBanner}>
                  <View style={styles.certBrandPill}>
                    <Image
                      source={{ uri: CLINIC_LOGO_BASE64 }}
                      style={{ width: 85, height: 26, resizeMode: "contain" }}
                    />
                  </View>
                  <View style={styles.certBlueRightBox}>
                    <Text style={styles.certWebLink}>spiritualhomeoclinic.com</Text>
                    <Text style={{ fontSize: 8, fontWeight: "700", color: "#ffffff" }}>
                      📞 {getBranchPhone(sharePopupData?.branchName || "")}
                    </Text>
                  </View>
                </View>

                {/* Certificate Paper Body */}
                <View style={styles.certBody}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#475569" }}>
                      BRANCH: {(sharePopupData?.branchName || "KPHB Branch").toUpperCase()}
                    </Text>
                    <Text style={styles.certDateText}>
                      DATE: {new Date().toLocaleDateString("en-GB")}
                    </Text>
                  </View>

                  <Text style={styles.certTitle}>TO WHOM SO EVER IT MAY CONCERN</Text>

                  <Text style={styles.certPara}>
                    THIS IS TO CERTIFY THAT{" "}
                    <Text style={{ fontWeight: "900", color: "#0f172a" }}>
                      {(() => {
                        const sal = sharePopupData?.gender || "MR.";
                        const raw = (sharePopupData?.patientName || "PATIENT").toUpperCase();
                        const clean = sal.toLowerCase().startsWith("dr") ? raw.replace(/^DR\.?\s+/i, "") : raw;
                        return `${sal.toUpperCase()} ${clean}`.trim();
                      })()}
                    </Text>
                    {sharePopupData?.age ? ` AGED ABOUT ${sharePopupData.age} YEARS,` : ""} HAS BEEN UNDER OUR TREATMENT AT SPIRITUAL HOMEOPATHY ({sharePopupData?.branchName}).
                  </Text>

                  <Text style={styles.certPara}>
                    {sharePopupData?.duration ? `THE PATIENT NEEDED TO TAKE HOMEOPATHY MEDICINE FOR ${(sharePopupData.duration).toUpperCase()}. ` : ""}
                    WE RECOMMENDED TO CONTINUE WITH PRESCRIBED MEDICATIONS.
                  </Text>

                  {sharePopupData?.notes && sharePopupData.notes.trim() ? (
                    <Text style={{ fontSize: 8.5, color: "#1e293b", lineHeight: 12, marginTop: 4, marginBottom: 8, fontWeight: "500" }}>
                      {sharePopupData.notes.trim()}
                    </Text>
                  ) : null}

                  {/* Prescribed Remedies Heading & Fee */}
                  <View style={styles.certMedsBar}>
                    <Text style={styles.certMedsTitle}>PRESCRIBED MEDICINES</Text>
                    {Number(sharePopupData?.totalAmount) > 0 && (
                      <View style={styles.certFeeBadge}>
                        <Text style={styles.certFeeBadgeText}>
                          Total Fee: ₹{Number(sharePopupData?.totalAmount).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Medicines mini-table */}
                  <View style={styles.certTable}>
                    <View style={styles.certTableHeader}>
                      <Text style={[styles.certColH, { width: 22, textAlign: "center" }]}>#</Text>
                      <Text style={[styles.certColH, { flex: 1 }]}>Remedy Name</Text>
                      <Text style={[styles.certColH, { width: 60, textAlign: "center" }]}>Type</Text>
                      <Text style={[styles.certColH, { width: 75 }]}>Timing</Text>
                    </View>
                    {(sharePopupData?.medicines || []).map((m, idx) => (
                      <View key={idx} style={styles.certTableRow}>
                        <Text style={[styles.certCell, { width: 22, textAlign: "center", color: "#94a3b8" }]}>
                          {idx + 1}
                        </Text>
                        <Text style={[styles.certCell, { flex: 1, fontWeight: "800", color: "#0f172a" }]} numberOfLines={1}>
                          {m.name || "-"}
                        </Text>
                        <Text style={[styles.certCell, { width: 60, textAlign: "center", color: "#0284c7" }]}>
                          {m.type || "Pills"}
                        </Text>
                        <Text style={[styles.certCell, { width: 75, color: "#334155" }]} numberOfLines={1}>
                          {m.timing || "-"}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.certDisclaimer}>
                    This is a computer-generated document. No physical signature required.
                  </Text>
                </View>

                {/* Bottom Green Footer */}
                <View style={styles.certBottomBanner}>
                  <Text style={styles.certFooterText}>
                    📞 {getBranchPhone(sharePopupData?.branchName || "")}
                  </Text>
                  <Text style={styles.certFooterText}>•</Text>
                  <Text style={styles.certFooterText}>✉️ support@spiritualhomeo.com</Text>
                  <Text style={styles.certFooterText}>•</Text>
                  <Text style={styles.certFooterText} numberOfLines={1}>
                    📍 {sharePopupData?.branchName}
                  </Text>
                </View>
              </View>

              {/* WhatsApp Sharing */}
              <View style={styles.shareOptionBlock}>
                <Text style={styles.shareOptionLabel}>1. WhatsApp Patient Share:</Text>
                <View style={styles.sharePhoneRow}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={styles.sharePhoneInput}
                    value={whatsappPhone}
                    onChangeText={(t) => setWhatsappPhone(t.replace(/\D/g, ""))}
                    placeholder="10-digit WhatsApp number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                {/* Primary Button: Attach PDF to WhatsApp */}
                <TouchableOpacity
                  style={styles.whatsappSendBtn}
                  onPress={handleSharePdfOrDoc}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                  <Text style={styles.whatsappSendBtnText}>Share &amp; Attach PDF to WhatsApp</Text>
                </TouchableOpacity>

                {/* Secondary Button: Open Direct Chat with Text Slip */}
                <TouchableOpacity
                  style={[styles.pdfShareBtn, { marginTop: 8, borderColor: "#86efac", backgroundColor: "#f0fdf4" }]}
                  onPress={handleSendViaWhatsApp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubbles-outline" size={17} color="#15803d" />
                  <Text style={[styles.pdfShareBtnText, { color: "#15803d" }]}>Open WhatsApp Chat (Text Slip)</Text>
                </TouchableOpacity>
              </View>

              {/* Option 2: Print & Document Options */}
              <View style={styles.shareOptionBlock}>
                <Text style={styles.shareOptionLabel}>2. Print &amp; Document Options:</Text>
                <TouchableOpacity
                  style={styles.pdfShareBtn}
                  onPress={handleDirectPrint}
                  activeOpacity={0.8}
                >
                  <Ionicons name="print-outline" size={17} color="#334155" />
                  <Text style={[styles.pdfShareBtnText, { color: "#334155" }]}>Print / Save as PDF Dialog</Text>
                </TouchableOpacity>
              </View>

              {/* Done Button */}
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setSharePopupData(null);
                  handleClearForm();
                  setIsFormOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>Done / Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DROPDOWN OPTIONS CENTERED POPUP MODAL */}
      <Modal visible={pickerModal !== null} transparent animationType="fade">
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPickerModal(null)}
          />

          <View style={styles.pickerPopupCard}>
            {/* Header with Title & Close (X) */}
            <View style={styles.pickerHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.pickerIconCircle}>
                  <Ionicons
                    name={
                      pickerModal?.type === "gender"
                        ? "person-outline"
                        : pickerModal?.type === "duration"
                        ? "calendar-outline"
                        : pickerModal?.type === "medType"
                        ? "medkit-outline"
                        : "time-outline"
                    }
                    size={15}
                    color="#16a34a"
                  />
                </View>
                <Text style={styles.pickerTitle}>
                  {pickerModal?.type === "gender" && "Select Salutation"}
                  {pickerModal?.type === "duration" && "Select Course Duration"}
                  {pickerModal?.type === "medType" && "Select Medicine Form"}
                  {pickerModal?.type === "timing" && "Select Dosage & Timing"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setPickerModal(null)}
                style={styles.pickerCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <ScrollView style={{ maxHeight: 290 }} showsVerticalScrollIndicator={false}>
              {pickerModal?.type === "gender" &&
                ["Mr.", "Mrs.", "Ms.", "Master", "Dr."].map((opt) => {
                  const isSelected = gender === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerOptionRow, isSelected && styles.pickerOptionRowActive]}
                      onPress={() => {
                        setGender(opt);
                        setPickerModal(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>
                        {opt}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#16a34a" />}
                    </TouchableOpacity>
                  );
                })}

              {pickerModal?.type === "duration" &&
                DURATION_OPTIONS.map((opt) => {
                  const isSelected = duration === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerOptionRow, isSelected && styles.pickerOptionRowActive]}
                      onPress={() => {
                        setDuration(opt);
                        setPickerModal(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>
                        {opt}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#16a34a" />}
                    </TouchableOpacity>
                  );
                })}

              {pickerModal?.type === "medType" &&
                MEDICINE_TYPE_OPTIONS.map((opt) => {
                  const currentRow = pickerModal.rowIndex !== undefined ? medicines[pickerModal.rowIndex] : null;
                  const isSelected = currentRow?.type === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerOptionRow, isSelected && styles.pickerOptionRowActive]}
                      onPress={() => {
                        if (pickerModal.rowIndex !== undefined) {
                          const m = medicines[pickerModal.rowIndex];
                          handleUpdateMedicine(m.id, "type", opt);
                        }
                        setPickerModal(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>
                        {opt}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#16a34a" />}
                    </TouchableOpacity>
                  );
                })}

              {pickerModal?.type === "timing" &&
                DOSAGE_TIMING_OPTIONS.map((opt) => {
                  const currentRow = pickerModal.rowIndex !== undefined ? medicines[pickerModal.rowIndex] : null;
                  const isSelected = currentRow?.timing === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerOptionRow, isSelected && styles.pickerOptionRowActive]}
                      onPress={() => {
                        if (pickerModal.rowIndex !== undefined) {
                          const m = medicines[pickerModal.rowIndex];
                          handleUpdateMedicine(m.id, "timing", opt);
                        }
                        setPickerModal(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>
                        {opt}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#16a34a" />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. BOTTOM NAVIGATION */}
      <ReceptionBottomNav activeTab="med-req" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  titleCol: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
  },
  subtitleText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 1,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#16a34a",
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  tabTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  scrollArea: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 45,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 15,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 16,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#16a34a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  requestCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  patientNameText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardPhoneText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  medsBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  medsBoxTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 4,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginVertical: 1,
  },
  medBullet: {
    fontSize: 12,
    color: "#16a34a",
  },
  medText: {
    fontSize: 11,
    color: "#334155",
    flex: 1,
  },
  medPriceText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  totalFeeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0f172a",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardPdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardPdfBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  completedBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  completedBadgeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  completeBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  formSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
    marginBottom: 10,
  },
  stepNumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#ffffff",
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  genderSelectBtn: {
    width: 78,
    height: 38,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
  },
  genderSelectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  nameInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  inputBox: {
    height: 38,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  disabledBox: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    flexDirection: "row",
    alignItems: "center",
  },
  disabledText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
    flex: 1,
  },
  feeMatchBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  feeMatchSuccess: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  feeMatchWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  feeMatchText: {
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  pickerBox: {
    height: 38,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
  },
  pickerBoxText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  addMedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addMedBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  medItemCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  medItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  medNumPill: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#94a3b8",
  },
  medNameInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  medItemDetailsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  medChipBtn: {
    flex: 1,
    height: 32,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  medChipBtnText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "700",
    flex: 1,
  },
  medPriceDedicatedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  medPriceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  medPriceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    height: 32,
    paddingHorizontal: 8,
    width: 95,
  },
  medCurrencySymbol: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    marginRight: 4,
  },
  medPriceDedicatedInput: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "right",
    padding: 0,
  },
  modalFooterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  clearBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748b",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerPopupCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    padding: 18,
    maxHeight: 400,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pickerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  pickerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0f172a",
  },
  pickerOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  pickerOptionRowActive: {
    backgroundColor: "#f0fdf4",
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  pickerOptionTextActive: {
    color: "#15803d",
    fontWeight: "900",
  },
  shareModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  shareModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 420,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  certPreviewWrapper: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  certPreviewTopBanner: {
    backgroundColor: "#ffffff",
    height: 48,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  certBrandPill: {
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  certBlueRightBox: {
    backgroundColor: "#1d8ecd",
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  certBrandPillText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#0284c7",
  },
  certWebLink: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  certBody: {
    padding: 12,
    backgroundColor: "#ffffff",
  },
  certDateText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
    textAlign: "right",
    marginBottom: 6,
  },
  certTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    textDecorationLine: "underline",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  certPara: {
    fontSize: 10.5,
    color: "#334155",
    lineHeight: 15,
    textAlign: "justify",
    marginBottom: 6,
  },
  certMedsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1d8ecd",
    paddingBottom: 4,
    marginTop: 6,
    marginBottom: 6,
  },
  certMedsTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1d8ecd",
    textTransform: "uppercase",
  },
  certFeeBadge: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  certFeeBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#166534",
  },
  certTable: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 2,
  },
  certTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  certColH: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
  },
  certTableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    alignItems: "center",
  },
  certCell: {
    fontSize: 9.5,
  },
  certDisclaimer: {
    fontSize: 8.5,
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 4,
  },
  certBottomBanner: {
    backgroundColor: "#a3cf3b",
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  certFooterText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  shareSuccessHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  shareIconCircle: {
    marginBottom: 6,
  },
  shareModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
  },
  shareModalSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
    textAlign: "center",
  },
  shareSummaryBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  shareSummaryRow: {
    fontSize: 11.5,
    color: "#334155",
  },
  shareOptionBlock: {
    marginBottom: 14,
  },
  shareOptionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  sharePhoneRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  countryCodeBadge: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    height: 40,
  },
  countryCodeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  sharePhoneInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  whatsappSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16a34a",
    height: 40,
    borderRadius: 10,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappSendBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  pdfShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    height: 40,
    borderRadius: 10,
  },
  pdfShareBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  doneBtn: {
    backgroundColor: "#0f172a",
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  doneBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#ffffff",
  },
});