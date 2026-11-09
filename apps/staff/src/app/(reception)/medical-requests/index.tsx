import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getActiveBranch, apiFetch } from "../../../services/auth";

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
  status: "pending" | "completed" | "dispatched";
  createdAt: string;
}

export default function MedicalRequestsScreen() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "pending" | "completed" | "dispatched">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [requests, setRequests] = useState<MedicalRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Request Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
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
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown Picker Modals
  const [pickerModal, setPickerModal] = useState<{
    type: "gender" | "branch" | "duration" | "medType" | "timing";
    rowIndex?: number;
  } | null>(null);

  useEffect(() => {
    getActiveBranch().then((branch) => {
      if (branch) {
        setActiveBranch(branch);
        setBranchName(branch.name.includes("Branch") ? branch.name : `${branch.name} Branch`);
      }
    });
    fetchRequests();
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

  // Auto sum medicine row amounts
  useEffect(() => {
    const sum = medicines.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
    if (sum > 0) {
      setTotalAmount(sum);
    }
  }, [medicines]);

  const handleClearForm = () => {
    setPatientName("");
    setPhone("");
    setAge("");
    setGender("Mr.");
    setDuration("1 Month");
    setTotalAmount(0);
    setMedicines([{ id: "1", name: "", type: "Pills", timing: "M - - N", amount: 0 }]);
  };

  const handleSaveRequest = async () => {
    if (!patientName.trim()) {
      Alert.alert("Validation", "Please enter patient name.");
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

    setIsSaving(true);
    try {
      const payload = {
        patientName: patientName.trim(),
        phone: cleanPhone.slice(-10),
        age: age.trim() || undefined,
        gender,
        branchName,
        duration,
        totalAmount: Number(totalAmount) || 0,
        medicines: validMeds,
      };

      const res = await apiFetch<{ success: boolean; error?: string }>(
        "/reception/medical-requests",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (res.success) {
        Alert.alert("Success", "Medical request saved successfully!");
        handleClearForm();
        setIsFormOpen(false);
        fetchRequests();
      } else {
        Alert.alert("Error", res.error || "Failed to save medical request.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to connect to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "pending" | "completed" | "dispatched") => {
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

  const handleDelete = (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch("/reception/medical-requests", {
              method: "POST",
              body: JSON.stringify({ action: "DELETE", id }),
            });
            fetchRequests();
          } catch {
            Alert.alert("Error", "Failed to delete request.");
          }
        },
      },
    ]);
  };

  const handleShareWhatsApp = (item: MedicalRequestItem) => {
    const cleanP = item.phone.replace(/\D/g, "").slice(-10);
    const medsList = item.medicines
      .map((m, i) => `  ${i + 1}. ${m.name} (${m.type || "Pills"}) - ${m.timing}`)
      .join("\n");

    const text = encodeURIComponent(
      `*SPIRITUAL HOMEOPATHY - MEDICINE REQUEST*\n` +
      `--------------------------------\n` +
      `Req ID: ${item.requestId}\n` +
      `Patient: ${item.gender} ${item.patientName}\n` +
      `Branch: ${item.branchName}\n` +
      `Duration: ${item.duration}\n` +
      `Total Fee: ₹${Number(item.totalAmount || 0).toFixed(2)}\n` +
      `Status: ${item.status.toUpperCase()}\n` +
      `--------------------------------\n` +
      `*Prescribed Remedies:*\n${medsList}\n` +
      `--------------------------------\n` +
      `Spiritual Homeopathy Clinics\nHelpline: 9030176176`
    );

    Linking.openURL(`https://wa.me/91${cleanP}?text=${text}`).catch(() => {
      Alert.alert("Error", "WhatsApp is not available on this device.");
    });
  };

  // Filtered requests list
  const filteredRequests = requests.filter((r) => {
    if (activeTab !== "ALL" && r.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.patientName.toLowerCase().includes(q);
      const matchPhone = r.phone.includes(q);
      const matchReqId = (r.requestId || "").toLowerCase().includes(q);
      const matchMed = (r.medicines || []).some((m) => m.name.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchReqId && !matchMed) return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* 1. TOP NAVBAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.titleCol}>
          <Text style={styles.titleText}>Medical Requests</Text>
          <Text style={styles.subtitleText}>
            {activeBranch?.name || "KPHB Branch"} • Prescriptions &amp; Pharmacy
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setIsFormOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* 2. FILTER TABS & SEARCH */}
      <View style={styles.controlsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {(["ALL", "pending", "completed", "dispatched"] as const).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabChip, isSelected && styles.tabChipActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}>
                  {tab === "ALL" ? `All (${requests.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient, phone, remedy..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 3. REQUESTS LIST */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
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
              Tap the &quot;+ New&quot; button to prescribe homeopathic remedies and issue certificates.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredRequests.map((item) => {
              const statusBg =
                item.status === "completed"
                  ? "#dcfce7"
                  : item.status === "dispatched"
                  ? "#e0f2fe"
                  : "#fef3c7";
              const statusText =
                item.status === "completed"
                  ? "#15803d"
                  : item.status === "dispatched"
                  ? "#0369a1"
                  : "#b45309";

              return (
                <View key={item.id || item.requestId} style={styles.requestCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={styles.patientNameText}>
                        {item.gender} {item.patientName} {item.age ? `(${item.age}y)` : ""}
                      </Text>
                      <Text style={styles.cardPhoneText}>
                        📞 +91 {item.phone} • {item.branchName}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusText }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Medicines List */}
                  <View style={styles.medsBox}>
                    <Text style={styles.medsBoxTitle}>
                      Prescribed Remedies ({item.duration}):
                    </Text>
                    {item.medicines.map((m, idx) => (
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
                  </View>

                  {/* Delivery Address if present */}
                  {item.deliveryAddress && (
                    <Text style={styles.deliveryText}>
                      📍 Courier: {item.deliveryAddress}
                    </Text>
                  )}

                  {/* Card Footer Actions */}
                  <View style={styles.cardFooterRow}>
                    <Text style={styles.totalFeeText}>
                      Total: ₹{Number(item.totalAmount || 0).toFixed(2)}
                    </Text>

                    <View style={styles.actionsRow}>
                      {/* WhatsApp Share */}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}
                        onPress={() => handleShareWhatsApp(item)}
                      >
                        <Ionicons name="logo-whatsapp" size={13} color="#15803d" />
                      </TouchableOpacity>

                      {/* Completed toggle */}
                      {item.status !== "completed" && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}
                          onPress={() => handleUpdateStatus(item.id, "completed")}
                        >
                          <Ionicons name="checkmark-outline" size={14} color="#15803d" />
                          <Text style={styles.actionBtnText}>Done</Text>
                        </TouchableOpacity>
                      )}

                      {/* Dispatched toggle */}
                      {item.status !== "dispatched" && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: "#e0f2fe", borderColor: "#7dd3fc" }]}
                          onPress={() => handleUpdateStatus(item.id, "dispatched")}
                        >
                          <Ionicons name="paper-plane-outline" size={13} color="#0284c7" />
                          <Text style={[styles.actionBtnText, { color: "#0284c7" }]}>Dispatch</Text>
                        </TouchableOpacity>
                      )}

                      {/* Delete */}
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: "#fecdd3" }]}
                        onPress={() => handleDelete(item.id)}
                      >
                        <Ionicons name="trash-outline" size={13} color="#e11d48" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ========================================================
          4. CREATE MEDICAL REQUEST MODAL (Exact Schema Form)
         ======================================================== */}
      <Modal visible={isFormOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
          {/* Modal Header */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setIsFormOpen(false)} style={styles.backBtn}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.titleCol}>
              <Text style={styles.titleText}>New Medical Request</Text>
              <Text style={styles.subtitleText}>Prescribe Remedies &amp; Issue Slip</Text>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleSaveRequest}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="#ffffff" />
                  <Text style={styles.addBtnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
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
                  <Text style={styles.fieldLabel}>Clinic Branch *</Text>
                  <TouchableOpacity
                    style={styles.pickerBox}
                    onPress={() => setPickerModal({ type: "branch" })}
                  >
                    <Text style={styles.pickerBoxText} numberOfLines={1}>
                      {branchName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#64748b" />
                  </TouchableOpacity>
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

              {/* Fee & Delivery Address */}
              <View style={{ marginTop: 10 }}>
                <Text style={styles.fieldLabel}>Total Medicine Fee (₹)</Text>
                <TextInput
                  style={[styles.inputBox, { fontWeight: "900", color: "#16a34a" }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={totalAmount ? String(totalAmount) : ""}
                  onChangeText={(t) => setTotalAmount(Math.max(0, Number(t)))}
                />
              </View>
            </View>

            {/* Step 2: Prescribed Medicines Table */}
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

              {medicines.map((m, idx) => (
                <View key={m.id} style={styles.medItemCard}>
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

                  <View style={styles.medItemDetailsRow}>
                    {/* Type Selector */}
                    <TouchableOpacity
                      style={styles.medChipBtn}
                      onPress={() => setPickerModal({ type: "medType", rowIndex: idx })}
                    >
                      <Text style={styles.medChipBtnText}>Type: {m.type || "Pills"}</Text>
                      <Ionicons name="chevron-down" size={12} color="#64748b" />
                    </TouchableOpacity>

                    {/* Timing Selector */}
                    <TouchableOpacity
                      style={styles.medChipBtn}
                      onPress={() => setPickerModal({ type: "timing", rowIndex: idx })}
                    >
                      <Text style={styles.medChipBtnText}>{m.timing || "M - - N"}</Text>
                      <Ionicons name="chevron-down" size={12} color="#64748b" />
                    </TouchableOpacity>

                    {/* Individual Price */}
                    <TextInput
                      style={styles.medPriceInput}
                      placeholder="₹ 0"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={m.amount ? String(m.amount) : ""}
                      onChangeText={(t) => handleUpdateMedicine(m.id, "amount", Number(t))}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Clear & Save Bar */}
          <View style={styles.modalFooterBar}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearForm}>
              <Ionicons name="refresh-outline" size={15} color="#64748b" />
              <Text style={styles.clearBtnText}>Clear Form</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSaveRequest}
              disabled={isSaving}
            >
              <Text style={styles.submitBtnText}>
                {isSaving ? "Saving..." : "Save Medical Request"}
              </Text>
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* DROPDOWN OPTIONS PICKER MODAL */}
      <Modal visible={pickerModal !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setPickerModal(null)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>
              Select{" "}
              {pickerModal?.type === "gender"
                ? "Title"
                : pickerModal?.type === "branch"
                ? "Branch"
                : pickerModal?.type === "duration"
                ? "Course Duration"
                : pickerModal?.type === "medType"
                ? "Form / Type"
                : "Dosage & Timing"}
            </Text>

            <ScrollView style={{ maxHeight: 280 }}>
              {(pickerModal?.type === "gender"
                ? ["Mr.", "Mrs.", "Ms.", "Master", "Dr."]
                : pickerModal?.type === "branch"
                ? BRANCH_OPTIONS
                : pickerModal?.type === "duration"
                ? DURATION_OPTIONS
                : pickerModal?.type === "medType"
                ? MEDICINE_TYPE_OPTIONS
                : DOSAGE_TIMING_OPTIONS
              ).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    if (!pickerModal) return;
                    if (pickerModal.type === "gender") setGender(opt);
                    if (pickerModal.type === "branch") setBranchName(opt);
                    if (pickerModal.type === "duration") setDuration(opt);
                    if (pickerModal.type === "medType" && pickerModal.rowIndex !== undefined) {
                      const rowId = medicines[pickerModal.rowIndex]?.id;
                      if (rowId) handleUpdateMedicine(rowId, "type", opt);
                    }
                    if (pickerModal.type === "timing" && pickerModal.rowIndex !== undefined) {
                      const rowId = medicines[pickerModal.rowIndex]?.id;
                      if (rowId) handleUpdateMedicine(rowId, "timing", opt);
                    }
                    setPickerModal(null);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
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
  controlsBar: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  tabsScroll: {
    flexDirection: "row",
    gap: 6,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  tabChipActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  tabChipTextActive: {
    color: "#15803d",
    fontWeight: "800",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0f172a",
    paddingVertical: 0,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 14,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    padding: 24,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 260,
  },
  requestCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  patientNameText: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0f172a",
  },
  cardPhoneText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
  },
  medsBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  medsBoxTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 4,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 1,
  },
  medBullet: {
    fontSize: 12,
    color: "#64748b",
    marginRight: 4,
  },
  medText: {
    fontSize: 11,
    color: "#334155",
    flex: 1,
  },
  medPriceText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  deliveryText: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 6,
    fontStyle: "italic",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  totalFeeText: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#16a34a",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#ffffff",
  },
  actionBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#15803d",
  },
  // Form Styles
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  formSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
    marginBottom: 10,
  },
  stepNumBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 11,
  },
  formSectionTitle: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  genderSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 85,
    height: 38,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
  },
  genderSelectText: {
    fontSize: 12,
    fontWeight: "800",
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
    padding: 8,
    marginBottom: 8,
  },
  medItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  medNumPill: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
  },
  medNameInput: {
    flex: 1,
    height: 34,
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
    marginTop: 6,
  },
  medChipBtn: {
    flex: 1,
    height: 30,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  medChipBtnText: {
    fontSize: 10.5,
    color: "#334155",
    fontWeight: "700",
    flex: 1,
  },
  medPriceInput: {
    width: 65,
    height: 30,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 6,
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "right",
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
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  // Picker Dropdown Styles
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: 360,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 6,
  },
  pickerOptionRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  pickerOptionText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
  },
});
