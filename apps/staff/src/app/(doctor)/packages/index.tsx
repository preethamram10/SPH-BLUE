import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
  BackHandler,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { DoctorHeader } from "../../../components/doctor/DoctorHeader";
import { DoctorDrawerSidebar } from "../../../components/doctor/DoctorDrawerSidebar";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";

const normalizeBranchKey = (name: string): string => {
  let c = (name || "")
    .toLowerCase()
    .replace(/spiritual|homeopathy|clinic|branch/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  if (c === "kpb") c = "kphb";
  return c;
};

export default function DoctorPackagesScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Add Package Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("Kphb Branch");
  const [durationMonths, setDurationMonths] = useState(3);
  const [totalAmount, setTotalAmount] = useState("");
  const [initialPaidAmount, setInitialPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Quick Pay Modal State
  const [payModalMember, setPayModalMember] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/package-members`);
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        setMembers(data.members);
      }
    } catch (e) {
      console.warn("Failed fetching doctor package members:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json.branches || [];
        if (Array.isArray(list)) {
          const names = list.map((b: any) => b.name?.trim()).filter(Boolean);
          if (names.length > 0) setAvailableBranches(names);
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchMembers();
    fetchBranches();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
    fetchBranches();
  }, []);

  const handleDial = (phoneNumber: string) => {
    if (!phoneNumber) return;
    const clean = phoneNumber.replace(/\D/g, "");
    Linking.openURL(`tel:${clean}`);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(doctor)");
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [router]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();
    availableBranches.forEach((b) => {
      const k = normalizeBranchKey(b);
      if (k) map.set(k, b);
    });
    members.forEach((m) => {
      if (m.branch) {
        const k = normalizeBranchKey(m.branch);
        if (k && !map.has(k)) map.set(k, m.branch);
      }
    });
    if (map.size === 0) {
      ["Kphb Branch", "Chandanagar Branch", "Dilshuknagar Branch", "Nallagandla Branch"].forEach((b) => {
        map.set(normalizeBranchKey(b), b);
      });
    }
    return ["All", ...Array.from(map.values())];
  }, [availableBranches, members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        (m.patientName || "").toLowerCase().includes(q) ||
        (m.phone || "").includes(q) ||
        (m.registrationId || "").toLowerCase().includes(q) ||
        (m.packageName || "").toLowerCase().includes(q) ||
        (m.branch || "").toLowerCase().includes(q);

      const matchesBranch =
        branchFilter === "All" ||
        normalizeBranchKey(m.branch || "") === normalizeBranchKey(branchFilter);

      return matchesSearch && matchesBranch;
    });
  }, [members, search, branchFilter]);

  const totalMembers = members.length;
  const totalRevenue = members.reduce((acc, m) => acc + (Number(m.paidAmount) || 0), 0);
  const totalPending = members.reduce((acc, m) => acc + (Number(m.pendingAmount) || 0), 0);

  const handleAddPackage = async () => {
    if (!patientName.trim() || !phone.trim()) {
      Alert.alert("Required Fields", "Please enter patient name and phone number.");
      return;
    }
    const tot = parseFloat(totalAmount) || 0;
    if (tot <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid total package amount.");
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await fetch(`${API_BASE_URL}/package-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          patientName: patientName.trim(),
          phone: phone.trim(),
          registrationId: registrationId.trim(),
          branch: selectedBranch || "Kphb Branch",
          durationMonths,
          totalAmount: tot,
          initialPaidAmount: parseFloat(initialPaidAmount) || 0,
          paymentMethod,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setPatientName("");
        setPhone("");
        setRegistrationId("");
        setTotalAmount("");
        setInitialPaidAmount("");
        setNotes("");
        fetchMembers();
        Alert.alert("Success", data.message || "Package registered successfully!");
      } else {
        Alert.alert("Error", data.error || "Failed to register package.");
      }
    } catch (err: any) {
      Alert.alert("Network Error", err.message || "Could not register package.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handlePayInstallment = async () => {
    if (!payModalMember) return;
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter an installment payment amount.");
      return;
    }

    setSubmittingPay(true);
    try {
      const res = await fetch(`${API_BASE_URL}/package-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment",
          packageId: payModalMember.id,
          amount: amt,
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPayModalMember(null);
        setPayAmount("");
        setPayNotes("");
        fetchMembers();
        Alert.alert("Success", data.message || `Payment of ₹${amt} recorded!`);
      } else {
        Alert.alert("Error", data.error || "Failed to record payment.");
      }
    } catch (err: any) {
      Alert.alert("Network Error", err.message || "Could not record payment.");
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Doctor Header */}
      <DoctorHeader
        title="Package Members"
        subtitle="Live Chronic Care Patient Subscriptions"
        onBack={handleBack}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        rightAction={{
          icon: "refresh",
          onPress: fetchMembers,
          color: "#0284c7",
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0284c7"]}
          />
        }
      >
        {/* Modern Clean White Hero Card (matches Admin Web UI) */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroSub}>TOTAL ACTIVE SUBSCRIBERS</Text>
              <Text style={styles.heroTotal}>{totalMembers}</Text>
            </View>
            <TouchableOpacity style={styles.heroAddBtn} onPress={() => setIsAddModalOpen(true)}>
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.heroAddBtnText}>Enroll</Text>
            </TouchableOpacity>
          </View>

          {/* Inline Summary Strip */}
          <View style={styles.heroSummaryRow}>
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>COLLECTED</Text>
              <Text style={[styles.heroSummaryValue, { color: "#16a34a" }]}>
                ₹{totalRevenue.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.heroSummaryDivider} />
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>PENDING DUE</Text>
              <Text style={[styles.heroSummaryValue, { color: "#d97706" }]}>
                ₹{totalPending.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.heroSummaryDivider} />
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>TOTAL VALUE</Text>
              <Text style={[styles.heroSummaryValue, { color: "#0284c7" }]}>
                ₹{(totalRevenue + totalPending).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search member name, phone, reg ID..."
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

        {/* Branch Filter Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.branchFilterRow}
        >
          {branchOptions.map((b) => {
            const isSel =
              b === "All"
                ? branchFilter === "All"
                : normalizeBranchKey(branchFilter) === normalizeBranchKey(b);
            return (
              <TouchableOpacity
                key={b}
                style={[styles.branchChip, isSel && styles.branchChipActive]}
                onPress={() => setBranchFilter(b)}
              >
                <Text
                  style={[
                    styles.branchChipText,
                    isSel && styles.branchChipTextActive,
                  ]}
                >
                  {b}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Members Cards List */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="ribbon-outline" size={42} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No package members found</Text>
            <Text style={styles.emptySub}>
              Patients registered under chronic treatment plans will appear here in real time.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setIsAddModalOpen(true)}>
              <Text style={styles.emptyAddBtnText}>+ Register Package</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((m) => {
            const hasDue = Number(m.pendingAmount) > 0;
            return (
              <View key={m.id} style={styles.memberCard}>
                <View style={styles.memberCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.patientName}</Text>
                    <Text style={styles.regText}>
                      ID: {m.registrationId || "SPH-GEN"} • {m.branch || "Kphb Branch"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.dialBtn}
                    onPress={() => handleDial(m.phone)}
                  >
                    <Ionicons name="call" size={12} color="#0284c7" />
                    <Text style={styles.dialBtnText}>{m.phone}</Text>
                  </TouchableOpacity>
                </View>

                {/* Plan Info Box */}
                <View style={styles.planBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="shield-checkmark" size={15} color="#0284c7" />
                    <Text style={styles.planTitle}>
                      {m.packageName || "Annual Treatment Plan"}
                    </Text>
                  </View>
                  <Text style={styles.validityText}>
                    Duration: {m.durationMonths || 3} Months
                    {m.endDate ? ` • Valid till ${m.endDate}` : ""}
                  </Text>
                </View>

                {/* Financial Ledger Details */}
                <View style={styles.ledgerRow}>
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>TOTAL</Text>
                    <Text style={styles.ledgerVal}>
                      ₹{Number(m.totalAmount || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={styles.ledgerDivider} />
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>PAID</Text>
                    <Text style={[styles.ledgerVal, { color: "#16a34a" }]}>
                      ₹{Number(m.paidAmount || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={styles.ledgerDivider} />
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>PENDING</Text>
                    <Text
                      style={[
                        styles.ledgerVal,
                        hasDue ? { color: "#d97706" } : { color: "#16a34a" },
                      ]}
                    >
                      ₹{Number(m.pendingAmount || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>

                {hasDue && (
                  <TouchableOpacity
                    style={styles.payDueBtn}
                    onPress={() => {
                      setPayModalMember(m);
                      setPayAmount(String(m.pendingAmount || ""));
                    }}
                  >
                    <Ionicons name="cash-outline" size={14} color="#ffffff" />
                    <Text style={styles.payDueBtnText}>Collect Due (₹{m.pendingAmount})</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Package Member Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Package Member</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Patient Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. V. Keerthana"
                value={patientName}
                onChangeText={setPatientName}
              />

              <Text style={styles.inputLabel}>Mobile Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel}>MRN / Reg ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SPH-KPB-17818"
                value={registrationId}
                onChangeText={setRegistrationId}
              />

              <Text style={styles.inputLabel}>Duration</Text>
              <View style={styles.durationRow}>
                {[1, 2, 3, 4, 5, 6].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.durationChip, durationMonths === m && styles.durationChipActive]}
                    onPress={() => setDurationMonths(m)}
                  >
                    <Text style={[styles.durationChipText, durationMonths === m && styles.durationChipTextActive]}>
                      {m}M
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Total Package Fee (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10000"
                keyboardType="numeric"
                value={totalAmount}
                onChangeText={setTotalAmount}
              />

              <Text style={styles.inputLabel}>Initial Paid (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0 if pay later"
                keyboardType="numeric"
                value={initialPaidAmount}
                onChangeText={setInitialPaidAmount}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submittingAdd && { opacity: 0.6 }]}
                disabled={submittingAdd}
                onPress={handleAddPackage}
              >
                <Text style={styles.submitBtnText}>
                  {submittingAdd ? "Registering..." : "Confirm & Register Package"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pay Due Modal */}
      <Modal visible={!!payModalMember} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Collect Installment</Text>
              <TouchableOpacity onPress={() => setPayModalMember(null)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 8 }}>
                {payModalMember?.patientName} ({payModalMember?.registrationId})
              </Text>
              <Text style={{ fontSize: 12, color: "#d97706", fontWeight: "800", marginBottom: 12 }}>
                Pending Balance: ₹{payModalMember?.pendingAmount}
              </Text>

              <Text style={styles.inputLabel}>Payment Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Amount to collect"
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submittingPay && { opacity: 0.6 }]}
                disabled={submittingPay}
                onPress={handlePayInstallment}
              >
                <Text style={styles.submitBtnText}>
                  {submittingPay ? "Recording..." : "Record Payment"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Doctor Drawer Navigation Sidepane */}
      <DoctorDrawerSidebar
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeRoute="packages"
      />

      {/* Bottom Nav */}
      <DoctorBottomNav activeTab="packages" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 85,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroSub: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
  },
  heroTotal: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 2,
  },
  heroAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  heroAddBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  heroSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  heroSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  heroSummaryLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
  },
  heroSummaryValue: {
    fontSize: 13.5,
    fontWeight: "900",
    marginTop: 2,
  },
  heroSummaryDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#e2e8f0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  branchFilterRow: {
    flexDirection: "row",
    gap: 6,
  },
  branchChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  branchChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  branchChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748b",
  },
  branchChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  memberCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  memberCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  memberName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  regText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  dialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dialBtnText: {
    color: "#0284c7",
    fontSize: 11,
    fontWeight: "800",
  },
  planBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  planTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  validityText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  ledgerItem: {
    flex: 1,
    alignItems: "center",
  },
  ledgerLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#94a3b8",
  },
  ledgerVal: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  ledgerDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#e2e8f0",
  },
  payDueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#d97706",
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  payDueBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
  emptyAddBtn: {
    marginTop: 12,
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalBody: {
    padding: 16,
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  durationRow: {
    flexDirection: "row",
    gap: 6,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  durationChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  durationChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  submitBtn: {
    backgroundColor: "#0284c7",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});