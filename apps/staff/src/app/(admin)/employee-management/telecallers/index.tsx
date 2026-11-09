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
  purple: "#8b5cf6",
  purpleLight: "#f3e8ff",
  green: "#16a34a",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

interface Telecaller {
  id: string;
  name: string;
  phone: string;
  branch: string;
  language: string;
  shift: string;
  leadsAssigned: number;
  status: "ONLINE" | "BUSY" | "OFFLINE";
}

export default function AdminTelecallersManagementScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Telecaller Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("Central Hub / KPHB");
  const [language, setLanguage] = useState("Telugu, English, Hindi");
  const [shift, setShift] = useState("Morning (09:00 AM - 05:00 PM)");

  const [telecallers, setTelecallers] = useState<Telecaller[]>([
    {
      id: "1",
      name: "Pooja Sharma",
      phone: "+91 91234 56789",
      branch: "KPHB Branch",
      language: "Telugu, Hindi, English",
      shift: "Morning Shift",
      leadsAssigned: 34,
      status: "ONLINE",
    },
    {
      id: "2",
      name: "Manoj Kumar",
      phone: "+91 92345 67890",
      branch: "Dilsukhnagar Branch",
      language: "Telugu, English",
      shift: "General Shift",
      leadsAssigned: 28,
      status: "BUSY",
    },
    {
      id: "3",
      name: "Divya Bhavani",
      phone: "+91 93456 78901",
      branch: "KPHB Branch",
      language: "Telugu, Hindi",
      shift: "Morning Shift",
      leadsAssigned: 41,
      status: "ONLINE",
    },
    {
      id: "4",
      name: "Suresh Varma",
      phone: "+91 94567 89012",
      branch: "Gachibowli Branch",
      language: "English, Hindi",
      shift: "Evening Shift",
      leadsAssigned: 19,
      status: "OFFLINE",
    },
  ]);

  const handleAddTelecaller = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required", "Please provide Agent Name and Phone number.");
      return;
    }

    const newAgent: Telecaller = {
      id: String(Date.now()),
      name,
      phone,
      branch,
      language,
      shift,
      leadsAssigned: 0,
      status: "ONLINE",
    };

    setTelecallers([newAgent, ...telecallers]);
    setShowAddModal(false);
    setName("");
    setPhone("");
  };

  const filtered = telecallers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.branch.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search) ||
      t.language.toLowerCase().includes(search.toLowerCase())
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
            <Text style={styles.headerTitle}>Telecaller Team</Text>
            <Text style={styles.headerSub}>{telecallers.length} Agents Registered</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Agent</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={COLORS.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search telecaller by name, branch or phone..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Telecallers List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {filtered.map((agent) => (
          <View key={agent.id} style={styles.agentCard}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Ionicons name="headset" size={18} color={COLORS.purple} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.agentName}>{agent.name}</Text>
                <Text style={styles.agentSub}>
                  {agent.shift} • {agent.language}
                </Text>
                <Text style={styles.agentBranch}>📍 {agent.branch}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  agent.status === "ONLINE"
                    ? styles.statusOnline
                    : agent.status === "BUSY"
                    ? styles.statusBusy
                    : styles.statusOffline,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    agent.status === "ONLINE"
                      ? { color: COLORS.green }
                      : agent.status === "BUSY"
                      ? { color: "#d97706" }
                      : { color: COLORS.textMuted },
                  ]}
                >
                  {agent.status}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBottom}>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{agent.phone}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="chatbubbles-outline" size={14} color={COLORS.purple} />
                <Text style={styles.infoText}>{agent.leadsAssigned} Leads Assigned</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Telecaller Modal */}
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
                  <Text style={styles.modalTitle}>Add Telecaller Agent</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  <Text style={styles.label}>Agent Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Swathi Reddy"
                    placeholderTextColor={COLORS.textLight}
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.label}>Mobile Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />

                  <Text style={styles.label}>Branch / Hub Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Central Hub / KPHB"
                    placeholderTextColor={COLORS.textLight}
                    value={branch}
                    onChangeText={setBranch}
                  />

                  <Text style={styles.label}>Spoken Languages</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Telugu, English, Hindi"
                    placeholderTextColor={COLORS.textLight}
                    value={language}
                    onChangeText={setLanguage}
                  />

                  <Text style={styles.label}>Work Shift</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Morning (09:00 AM - 05:00 PM)"
                    placeholderTextColor={COLORS.textLight}
                    value={shift}
                    onChangeText={setShift}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleAddTelecaller}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Save Telecaller Record</Text>
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
    backgroundColor: COLORS.purple,
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
  agentCard: {
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
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
  },
  agentName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  agentSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  agentBranch: {
    fontSize: 10.5,
    color: COLORS.purple,
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOnline: {
    backgroundColor: "#dcfce7",
  },
  statusBusy: {
    backgroundColor: "#fef3c7",
  },
  statusOffline: {
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
  submitBtn: {
    backgroundColor: COLORS.purple,
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

