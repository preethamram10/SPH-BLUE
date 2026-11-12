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
  purple: "#8b5cf6",
  purpleDark: "#7c3aed",
  purpleLight: "#f3e8ff",
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
  red: "#dc2626",
  redLight: "#fee2e2",
};

interface Telecaller {
  id: string;
  name: string;
  phone: string;
  branchName?: string;
  telecallerId?: string;
  targetQuota?: string;
  bookedCount?: number;
  status?: string;
  email?: string;
}

export default function AdminTelecallersManagementScreen() {
  const router = useRouter();
  const [telecallers, setTelecallers] = useState<Telecaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Telecaller Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("KPHB Branch");
  const [quota, setQuota] = useState("60 calls/day");
  const [suggestedId, setSuggestedId] = useState("");

  const fetchTelecallers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<any>("/admin/employees?category=TELECALLER");
      const list = res?.employees || [];
      setTelecallers(list);
      if (res?.nextTelecallerId) {
        setSuggestedId(res.nextTelecallerId);
      }
    } catch (err: any) {
      console.warn("Failed to fetch telecallers:", err);
      Alert.alert("Notice", "Unable to load live telecallers: " + (err.message || "Please retry"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelecallers();
  }, [fetchTelecallers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTelecallers();
  };

  const handleAddTelecaller = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required", "Please provide Agent Name and Phone number.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim().startsWith("+91") ? phone.trim() : `+91 ${phone.trim()}`,
        branchName: branch.trim() || "KPHB Branch",
        category: "TELECALLER",
        telecallerId: suggestedId || `TC${String(telecallers.length + 1).padStart(2, "0")}`,
        targetQuota: quota.trim() || "60 calls/day",
        status: "Active",
      };

      const res = await apiFetch<any>("/admin/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success || res.employee) {
        Alert.alert("Success", `${payload.name} was registered as a telecaller agent.`);
        setShowAddModal(false);
        setName("");
        setPhone("");
        fetchTelecallers();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add telecaller.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTelecaller = (agent: Telecaller) => {
    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to remove ${agent.name} (${agent.telecallerId || "Agent"})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove Agent",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch<any>(`/admin/employees?id=${agent.id}`, { method: "DELETE" });
              setTelecallers((prev) => prev.filter((a) => a.id !== agent.id));
              Alert.alert("Removed", `${agent.name} has been removed.`);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to remove agent");
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
    return telecallers.filter((t) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const n = (t.name || "").toLowerCase();
      const b = (t.branchName || "").toLowerCase();
      const id = (t.telecallerId || "").toLowerCase();
      const p = (t.phone || "").replace(/[^0-9]/g, "");
      return n.includes(q) || b.includes(q) || id.includes(q) || p.includes(q.replace(/[^0-9]/g, ""));
    });
  }, [telecallers, search]);

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
            <Text style={styles.headerSub}>
              {loading ? "Loading agents..." : `${telecallers.length} Agents Registered`}
            </Text>
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
          placeholder="Search telecaller by name, ID, branch or phone..."
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

      {/* Telecallers List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Loading telecaller team...</Text>
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
              colors={[COLORS.purple]}
              tintColor={COLORS.purple}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="headset-outline" size={36} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No telecallers found</Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? `No agent matched "${search}".`
                  : "No telecaller agents have been registered yet."}
              </Text>
            </View>
          ) : (
            filtered.map((agent) => (
              <View key={agent.id} style={styles.agentCard}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Ionicons name="headset" size={18} color={COLORS.purple} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.agentName}>{agent.name}</Text>
                      {agent.telecallerId && (
                        <View style={styles.idBadge}>
                          <Text style={styles.idBadgeText}>{agent.telecallerId}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.agentSub}>
                      Target: {agent.targetQuota || "60 calls/day"}
                    </Text>
                    <Text style={styles.agentBranch}>📍 {agent.branchName || "All Branches"}</Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{agent.status || "Active"}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <TouchableOpacity
                    style={styles.infoRow}
                    onPress={() => handleCall(agent.phone)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.infoText}>{agent.phone}</Text>
                  </TouchableOpacity>

                  <View style={styles.rightActionRow}>
                    <View style={styles.bookedBadge}>
                      <Ionicons name="calendar-outline" size={12} color={COLORS.purple} />
                      <Text style={styles.bookedText}>
                        {agent.bookedCount !== undefined ? agent.bookedCount : 0} Booked
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteTelecaller(agent)}
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
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Add Telecaller Agent</Text>
                    <Text style={styles.modalSub}>
                      Create telecaller profile with caller ID &amp; quota
                    </Text>
                  </View>
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
                    placeholder="9876543210"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />

                  <Text style={styles.label}>Branch / Hub Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="KPHB Branch"
                    placeholderTextColor={COLORS.textLight}
                    value={branch}
                    onChangeText={setBranch}
                  />

                  <Text style={styles.label}>Daily Target Quota</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="60 calls/day"
                    placeholderTextColor={COLORS.textLight}
                    value={quota}
                    onChangeText={setQuota}
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleAddTelecaller}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.submitBtnText}>Save Telecaller Record</Text>
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  agentName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  idBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.purpleDark,
  },
  agentSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  agentBranch: {
    fontSize: 10.5,
    color: COLORS.purpleDark,
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
  bookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookedText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.purpleDark,
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
