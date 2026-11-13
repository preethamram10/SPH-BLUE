import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../../../services/auth";

const COLORS = {
  green: "#16a34a",
  greenDark: "#15803d",
  greenLight: "#dcfce7",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
  red: "#dc2626",
  redLight: "#fee2e2",
};

interface BranchStaff {
  id: string;
  name: string;
  phone: string;
  branchName?: string;
  category?: string;
  salary?: number;
  shiftHours?: string;
  dailyHours?: string;
  status?: string;
}

const ROLES = [
  "Receptionist / Front Desk",
  "Branch Cleaning & Sanitization",
  "Pharmacy Assistant",
  "Security / Front Helper",
  "Administrative Helper",
];

export default function AdminStaffManagementScreen() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<BranchStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Staff Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("Kphb Branch");
  const [availableBranches, setAvailableBranches] = useState<string[]>([
    "Kphb Branch",
    "Chandanagar Branch",
    "Dilshuknagar Branch",
    "Nallagandla Branch",
  ]);
  const [role, setRole] = useState(ROLES[0]);
  const [shift, setShift] = useState("09:00 AM - 06:00 PM");
  const [salary, setSalary] = useState("20000");

  const fetchBranches = useCallback(async () => {
    try {
      const res = await apiFetch<any>("/branches");
      const list = res?.data || res?.branches || [];
      if (Array.isArray(list) && list.length > 0) {
        const names = list.map((b: any) => (typeof b === "string" ? b : b.name)).filter(Boolean);
        if (names.length > 0) setAvailableBranches(names);
      }
    } catch {}
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<any>("/admin/employees");
      const list = res?.employees || [];
      const staffFiltered = list.filter(
        (e: any) => e.category === "STAFF" || e.category === "RECEPTION"
      );
      setStaffList(staffFiltered);
    } catch (err: any) {
      console.warn("Failed to fetch staff:", err);
      Alert.alert("Notice", "Unable to load live staff records: " + (err.message || "Please retry"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchBranches();
  }, [fetchStaff, fetchBranches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaff();
    fetchBranches();
  };

  const handleAddStaff = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required", "Please provide Staff Member Name and Phone.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim().startsWith("+91") ? phone.trim() : `+91 ${phone.trim()}`,
        branchName: branch.trim() || "Kphb Branch",
        category: role.toLowerCase().includes("reception") ? "RECEPTION" : "STAFF",
        shiftHours: shift.trim() || "09:00 AM - 06:00 PM",
        salary: Number(salary) || 20000,
        status: "Active",
      };

      const res = await apiFetch<any>("/admin/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success || res.employee) {
        Alert.alert("Success", `${payload.name} was registered to staff directory.`);
        setShowAddModal(false);
        setName("");
        setPhone("");
        fetchStaff();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = (item: BranchStaff) => {
    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to remove ${item.name} from staff directory?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch<any>(`/admin/employees?id=${item.id}`, { method: "DELETE" });
              setStaffList((prev) => prev.filter((s) => s.id !== item.id));
              Alert.alert("Removed", `${item.name} has been removed.`);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to remove staff.");
            }
          },
        },
      ]
    );
  };

  const handleCall = (ph: string) => {
    const cleaned = ph.replace(/[^0-9+]/g, "");
    if (cleaned) {
      Linking.openURL(`tel:${cleaned}`).catch(() => {
        Alert.alert("Dialer", `Cannot open phone dialer for ${ph}.`);
      });
    }
  };

  const filtered = useMemo(() => {
    return staffList.filter((s) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const n = (s.name || "").toLowerCase();
      const b = (s.branchName || "").toLowerCase();
      const p = (s.phone || "").replace(/[^0-9]/g, "");
      return n.includes(q) || b.includes(q) || p.includes(q.replace(/[^0-9]/g, ""));
    });
  }, [staffList, search]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Staff &amp; Helpers</Text>
            <Text style={styles.headerSub}>
              {loading ? "Loading staff..." : `${staffList.length} Personnel Registered`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={COLORS.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff by name, branch, role or phone..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Staff List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading staff directory...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.green]}
              tintColor={COLORS.green}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="people-outline" size={36} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No staff members found</Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? `No personnel matched "${search}".`
                  : "No staff members registered in this category yet."}
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <View key={item.id} style={styles.staffCard}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Ionicons name="people" size={18} color={COLORS.green} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{item.name}</Text>
                    <Text style={styles.staffRole}>
                      {item.category === "RECEPTION" ? "Receptionist / Front Desk" : "Clinic Assistant / Operations"}
                    </Text>
                    <Text style={styles.staffBranch}>📍 {item.branchName || "All Branches"}</Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{item.status || "Active"}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <TouchableOpacity
                    style={styles.infoRow}
                    onPress={() => handleCall(item.phone)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.infoText}>{item.phone}</Text>
                  </TouchableOpacity>

                  <View style={styles.rightActionRow}>
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={14} color={COLORS.green} />
                      <Text style={styles.infoText}>
                        {item.shiftHours && item.shiftHours !== "-" ? item.shiftHours : "Full-Time"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteStaff(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={COLORS.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Staff Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <ScrollView
              style={{ maxHeight: "90%", width: "100%" }}
              contentContainerStyle={{ alignItems: "center", paddingVertical: 10 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Register Branch Staff</Text>
                    <Text style={styles.modalSub}>
                      Add receptionists, clinic helpers and operations personnel
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  <Text style={styles.label}>Employee Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ramesh Babu"
                    placeholderTextColor={COLORS.textLight}
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="9876543210"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />

                  <Text style={styles.label}>Branch</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {availableBranches.map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[
                            styles.roleChip,
                            branch === b && styles.roleChipSelected,
                          ]}
                          onPress={() => setBranch(b)}
                        >
                          <Text
                            style={[
                              styles.roleChipText,
                              branch === b && styles.roleChipTextSelected,
                            ]}
                          >
                            {b}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.label}>Designation / Role</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {ROLES.map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleChip,
                            role === r && styles.roleChipSelected,
                          ]}
                          onPress={() => setRole(r)}
                        >
                          <Text
                            style={[
                              styles.roleChipText,
                              role === r && styles.roleChipTextSelected,
                            ]}
                          >
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.label}>Shift Timings</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09:00 AM - 06:00 PM"
                    placeholderTextColor={COLORS.textLight}
                    value={shift}
                    onChangeText={setShift}
                  />

                  <Text style={styles.label}>Monthly Salary (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="20000"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="numeric"
                    value={salary}
                    onChangeText={setSalary}
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleAddStaff}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.submitBtnText}>Save Staff Record</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  addButton: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    maxWidth: 240,
  },
  staffCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.greenLight,
    justifyContent: "center",
    alignItems: "center",
  },
  staffName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  staffRole: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  staffBranch: {
    fontSize: 10.5,
    color: COLORS.greenDark,
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.green,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  rightActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtn: {
    backgroundColor: COLORS.redLight,
    padding: 5,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  modalSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalForm: {
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f8fafc",
  },
  roleChipSelected: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  roleChipTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
