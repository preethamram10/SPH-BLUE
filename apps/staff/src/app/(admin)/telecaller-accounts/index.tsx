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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";

const BRANCH_OPTIONS = [
  "All Branches",
  "KPHB Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

export default function MobileTelecallerAccountsScreen() {
  const router = useRouter();
  const [telecallers, setTelecallers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nextId, setNextId] = useState("TC01");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formId, setFormId] = useState("TC01");
  const [formPhone, setFormPhone] = useState("");
  const [formBranch, setFormBranch] = useState("All Branches");
  const [formPassword, setFormPassword] = useState("sph12345");
  const [formQuota, setFormQuota] = useState("60 calls/day");

  const fetchTelecallers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/employees?category=TELECALLER`);
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        setTelecallers(data.employees);
        if (data.nextTelecallerId) {
          setNextId(data.nextTelecallerId);
          setFormId(data.nextTelecallerId);
        }
      }
    } catch (e) {
      console.warn("Failed fetching mobile telecallers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelecallers();
  }, []);

  const openAddModal = () => {
    setFormName("");
    setFormId(nextId);
    setFormPhone("");
    setFormBranch("All Branches");
    setFormPassword("sph12345");
    setFormQuota("60 calls/day");
    setIsModalOpen(true);
  };

  const handleCreateTelecaller = async () => {
    if (!formName.trim()) {
      Alert.alert("Validation", "Telecaller Full Name is required.");
      return;
    }
    const cleanPhone = formPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      Alert.alert("Validation", "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!formId.trim()) {
      Alert.alert("Validation", "Telecaller ID is required (e.g. TC01).");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/admin/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          telecallerId: formId.trim().toUpperCase(),
          phone: cleanPhone,
          branchName: formBranch,
          category: "TELECALLER",
          password: formPassword.trim(),
          targetQuota: formQuota,
          status: "Active",
          isAccessGranted: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        Alert.alert("Success", `Telecaller ${formName} (${formId.toUpperCase()}) added!`);
        fetchTelecallers();
      } else {
        Alert.alert("Error", data.error || "Failed to add telecaller.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Confirm Remove",
      `Are you sure you want to remove telecaller ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${API_BASE_URL}/admin/employees?id=${id}`, { method: "DELETE" });
              fetchTelecallers();
            } catch (err) {
              console.warn("Delete telecaller err:", err);
            }
          },
        },
      ]
    );
  };

  const filtered = telecallers.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.telecallerId || "").toLowerCase().includes(q) ||
      t.phone.includes(search)
    );
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Telecaller Accounts</Text>
          <Text style={styles.headerSub}>Calling Team &amp; Branch Permissions</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search telecaller name, TC ID, phone..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Cards List */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="headset-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No telecallers found</Text>
            <Text style={styles.emptySub}>Tap "+ Add" to create your first calling account</Text>
          </View>
        ) : (
          filtered.map((t) => (
            <View key={t.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.name}>{t.name}</Text>
                    <View style={styles.idBadge}>
                      <Text style={styles.idBadgeText}>{t.telecallerId || "TC01"}</Text>
                    </View>
                  </View>
                  <Text style={styles.phoneText}>📞 {t.phone}</Text>
                  <Text style={styles.passwordText}>🔑 Password: {t.password || "sph12345"}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.footerRow}>
                <View style={styles.branchPill}>
                  <Ionicons name="business" size={12} color="#0284c7" />
                  <Text style={styles.branchPillText}>{t.branchName || "All Branches"}</Text>
                </View>

                <View style={styles.bookedPill}>
                  <Ionicons name="calendar-outline" size={12} color="#16a34a" />
                  <Text style={styles.bookedPillText}>{t.bookedCount || 0} Booked</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.statusText}>● {t.status || "Active"}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Telecaller Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="headset" size={18} color="#0284c7" />
                </View>
                <Text style={styles.modalTitle}>Add Telecaller</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>
                Telecaller Full Name <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Srikanth Reddy"
                placeholderTextColor="#94a3b8"
                value={formName}
                onChangeText={setFormName}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>
                    Unique Telecaller ID <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.fieldInput, { fontFamily: "monospace", textTransform: "uppercase" }]}
                    placeholder="e.g. TC01"
                    placeholderTextColor="#94a3b8"
                    value={formId}
                    onChangeText={setFormId}
                  />
                  <Text style={styles.fieldHint}>Auto-prefilled (editable)</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>
                    Contact Phone <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="10-digit Mobile"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={formPhone}
                    onChangeText={(val) => setFormPhone(val.replace(/\D/g, ""))}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>
                Assigned Hospital Branch <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <View style={styles.branchSelectWrap}>
                {BRANCH_OPTIONS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.branchChip,
                      formBranch === b && styles.branchChipActive,
                    ]}
                    onPress={() => setFormBranch(b)}
                  >
                    <Text
                      style={[
                        styles.branchChipText,
                        formBranch === b && styles.branchChipTextActive,
                      ]}
                    >
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldHint}>
                {formBranch === "All Branches"
                  ? "✓ Can access all branches & book doctor appointments across clinic."
                  : `🔒 Restricted only to follow-ups & doctors at ${formBranch}.`}
              </Text>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.fieldLabel}>Initial Password</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  value={formPassword}
                  onChangeText={setFormPassword}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreateTelecaller}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Telecaller</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 14.5, fontWeight: "800", color: "#0f172a" },
  idBadge: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  idBadgeText: { fontSize: 10, fontWeight: "900", color: "#0284c7", fontFamily: "monospace" },
  phoneText: { fontSize: 11.5, color: "#475569", fontWeight: "600", marginTop: 2 },
  passwordText: { fontSize: 10.5, color: "#94a3b8", fontFamily: "monospace", marginTop: 2 },
  deleteBtn: { padding: 6, backgroundColor: "#fef2f2", borderRadius: 8 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 10 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  branchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  branchPillText: { fontSize: 11, fontWeight: "700", color: "#334155" },
  bookedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  bookedPillText: { fontSize: 11, fontWeight: "800", color: "#16a34a" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  metaText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  statusText: { fontSize: 11, color: "#16a34a", fontWeight: "800" },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b", marginTop: 12 },
  emptySub: { fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  fieldLabel: { fontSize: 11.5, fontWeight: "800", color: "#334155", marginBottom: 4, marginTop: 8 },
  fieldInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  fieldHint: { fontSize: 10, color: "#64748b", marginTop: 3 },
  branchSelectWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  branchChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  branchChipActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  branchChipText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  branchChipTextActive: { color: "#ffffff" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { fontSize: 12.5, fontWeight: "800", color: "#64748b" },
  saveBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 110,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 12.5, fontWeight: "800", color: "#ffffff" },
});
