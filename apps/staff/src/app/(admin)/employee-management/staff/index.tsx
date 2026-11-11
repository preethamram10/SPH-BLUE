import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  green: "#16a34a",
  greenLight: "#dcfce7",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

interface BranchStaff {
  id: string;
  name: string;
  role: string;
  branch: string;
  phone: string;
  shift: string;
  status: "ON_DUTY" | "OFF_DUTY";
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
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Staff Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("Kphb Branch");
  const [role, setRole] = useState(ROLES[0]);
  const [shift, setShift] = useState("Full-Time (08:30 AM - 05:30 PM)");

  const [staffList, setStaffList] = useState<BranchStaff[]>([
    {
      id: "1",
      name: "Sravani Latha",
      role: "Receptionist / Front Desk",
      branch: "KPHB Branch",
      phone: "+91 90301 76176",
      shift: "Morning (08:30 AM - 04:30 PM)",
      status: "ON_DUTY",
    },
    {
      id: "2",
      name: "Raju Nayak",
      role: "Branch Cleaning & Sanitization",
      branch: "KPHB Branch",
      phone: "+91 98492 11002",
      shift: "Full-Time (08:00 AM - 05:00 PM)",
      status: "ON_DUTY",
    },
    {
      id: "3",
      name: "Lakshmi Bai",
      role: "Branch Cleaning & Sanitization",
      branch: "Dilsukhnagar Branch",
      phone: "+91 97004 88221",
      shift: "Morning (07:30 AM - 03:30 PM)",
      status: "ON_DUTY",
    },
    {
      id: "4",
      name: "Naveen Chary",
      role: "Pharmacy Assistant",
      branch: "Gachibowli Branch",
      phone: "+91 91211 44552",
      shift: "General (10:00 AM - 07:00 PM)",
      status: "ON_DUTY",
    },
    {
      id: "5",
      name: "Krishna Mohan",
      role: "Security / Front Helper",
      branch: "KPHB Branch",
      phone: "+91 93450 99881",
      shift: "Night Shift",
      status: "OFF_DUTY",
    },
  ]);

  const handleAddStaff = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required", "Please provide Staff Member Name and Phone.");
      return;
    }

    const newStaff: BranchStaff = {
      id: String(Date.now()),
      name,
      role,
      branch,
      phone,
      shift,
      status: "ON_DUTY",
    };

    setStaffList([newStaff, ...staffList]);
    setShowAddModal(false);
    setName("");
    setPhone("");
  };

  const filtered = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.branch.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

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
            <Text style={styles.headerSub}>{staffList.length} Personnel Registered</Text>
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
      </View>

      {/* Staff List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.staffCard}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Ionicons name="people" size={18} color={COLORS.green} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={styles.staffRole}>{item.role}</Text>
                <Text style={styles.staffBranch}>📍 {item.branch}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.status === "ON_DUTY" ? styles.statusOn : styles.statusOff,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === "ON_DUTY"
                      ? { color: COLORS.green }
                      : { color: COLORS.textMuted },
                  ]}
                >
                  {item.status === "ON_DUTY" ? "ON DUTY" : "OFF DUTY"}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBottom}>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{item.phone}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.green} />
                <Text style={styles.infoText}>{item.shift}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

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
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Register Branch Staff</Text>
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
                    placeholder="+91 98765 43210"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />

                  <Text style={styles.label}>Branch</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Kphb Branch"
                    placeholderTextColor={COLORS.textLight}
                    value={branch}
                    onChangeText={setBranch}
                  />

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

                  <Text style={styles.label}>Shift Schedule</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Full-Time (08:30 AM - 05:30 PM)"
                    placeholderTextColor={COLORS.textLight}
                    value={shift}
                    onChangeText={setShift}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleAddStaff}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Save Staff Record</Text>
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
    paddingVertical: 10,
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
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 12,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.greenLight,
    justifyContent: "center",
    alignItems: "center",
  },
  staffName: {
    fontSize: 13.5,
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
    color: COLORS.green,
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOn: {
    backgroundColor: "#dcfce7",
  },
  statusOff: {
    backgroundColor: "#f1f5f9",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  modalForm: {
    gap: 12,
  },
  label: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.textDark,
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
    backgroundColor: COLORS.white,
  },
  roleChipSelected: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  roleChipText: {
    fontSize: 11,
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

