import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Linking,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../../services/auth";
import { getBranchPhone } from "../../(reception)/medical-requests/pdf/generateMedicineRequestPDF";

interface PayLaterRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  branch: string;
  doctorName?: string;
  totalBill: number;
  paidAmount: number;
  dueAmount: number;
  status: "PENDING" | "CLEARED" | "CANCELLED";
  createdAt: string;
  dueDate?: string;
  clearedAt?: string;
  notes?: string;
}

function normalizeBranchKey(str: string): string {
  if (!str) return "";
  let c = str.toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/branch/gi, "").trim();
  if (c.includes("chandanagar") || c.includes("chanda")) return "chandanagar";
  if (c === "kpb" || c === "kphb") return "kphb";
  if (c.includes("dilshuk")) return "dilshuknagar";
  if (c.includes("nalla")) return "nallagandla";
  return c;
}

const DEFAULT_BRANCHES = [
  "All",
  "Kphb Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

type DateFilterPreset = "THIS_MONTH" | "LAST_MONTH" | "ALL_HISTORY" | "CUSTOM";

export default function MobilePayLaterScreen() {
  const router = useRouter();

  const [records, setRecords] = useState<PayLaterRecord[]>([]);
  const [dynamicBranches, setDynamicBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "CLEARED">("PENDING");

  // Date Range Filters (Default: THIS_MONTH)
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("THIS_MONTH");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [dateBounds, setDateBounds] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  // Settle modal state
  const [settleModalRecord, setSettleModalRecord] = useState<PayLaterRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleMethod, setSettleMethod] = useState<string>("UPI");
  const [settleNotes, setSettleNotes] = useState<string>("");
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  const fetchPayLater = async () => {
    setIsLoading(true);
    try {
      const [recData, bData] = await Promise.all([
        apiFetch<any>("/pay-later"),
        apiFetch<any>("/branches").catch(() => null),
      ]);
      if (recData && recData.success) {
        setRecords(recData.records || []);
      }
      if (bData) {
        const list = Array.isArray(bData.data) ? bData.data : (Array.isArray(bData.branches) ? bData.branches : []);
        if (list.length > 0) {
          const names: string[] = list.map((b: any) => (typeof b === "string" ? b.trim() : b.name?.trim())).filter(Boolean);
          setDynamicBranches(names);
        }
      }
    } catch (err) {
      console.error("Failed to load mobile pay later:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const branchList = useMemo(() => {
    const list: string[] = ["All"];
    const seen = new Set<string>();

    const addBranch = (b: string) => {
      let trimmed = (b || "").trim();
      if (trimmed.toLowerCase().includes("chandanagar nagar")) {
        trimmed = "Chandanagar Branch";
      }
      if (!trimmed || trimmed === "All" || trimmed === "All Branches") return;
      const key = normalizeBranchKey(trimmed);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(trimmed);
      }
    };

    dynamicBranches.forEach(addBranch);
    records.forEach((r) => {
      if (r.branch) addBranch(r.branch);
    });

    if (!seen.has("kphb")) addBranch("Kphb Branch");
    if (!seen.has("chandanagar")) addBranch("Chandanagar Branch");
    if (!seen.has("dilshuknagar")) addBranch("Dilshuknagar Branch");
    if (!seen.has("nallagandla")) addBranch("Nallagandla Branch");

    return list;
  }, [dynamicBranches, records]);

  useEffect(() => {
    fetchPayLater();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayLater();
  };

  // Compute date boundaries in useEffect
  useEffect(() => {
    const now = new Date();
    if (datePreset === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      setDateBounds({ start, end });
    } else if (datePreset === "LAST_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      setDateBounds({ start, end });
    } else if (datePreset === "CUSTOM") {
      const start = customFromDate ? new Date(`${customFromDate}T00:00:00`) : null;
      const end = customToDate ? new Date(`${customToDate}T23:59:59`) : null;
      setDateBounds({ start, end });
    } else {
      setDateBounds({ start: null, end: null });
    }
  }, [datePreset, customFromDate, customToDate]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Date filter
      if (dateBounds.start || dateBounds.end) {
        const itemDate = new Date(r.createdAt);
        if (dateBounds.start && itemDate < dateBounds.start) return false;
        if (dateBounds.end && itemDate > dateBounds.end) return false;
      }

      // Branch filter
      if (selectedBranch !== "All") {
        const normSelected = normalizeBranchKey(selectedBranch);
        const normItemBranch = normalizeBranchKey(r.branch || "");
        const branchMatch =
          normItemBranch === normSelected ||
          normItemBranch.includes(normSelected) ||
          normSelected.includes(normItemBranch);
        if (!branchMatch) return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && r.status !== statusFilter) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.patientName || "").toLowerCase().includes(q);
        const phoneMatch = (r.patientPhone || "").includes(q);
        const branchMatch = (r.branch || "").toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !branchMatch) return false;
      }
      return true;
    });
  }, [records, dateBounds, selectedBranch, statusFilter, searchQuery]);

  // Dynamic summary metrics
  const metrics = useMemo(() => {
    const dateFiltered = records.filter((r) => {
      if (dateBounds.start || dateBounds.end) {
        const itemDate = new Date(r.createdAt);
        if (dateBounds.start && itemDate < dateBounds.start) return false;
        if (dateBounds.end && itemDate > dateBounds.end) return false;
      }
      return true;
    });

    const totalPending = dateFiltered
      .filter((r) => r.status === "PENDING")
      .reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);

    const totalCleared = dateFiltered
      .filter((r) => r.status === "CLEARED")
      .reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);

    const pendingCount = dateFiltered.filter((r) => r.status === "PENDING").length;

    return {
      totalPending,
      totalCleared,
      pendingCount,
      totalRecords: dateFiltered.length,
    };
  }, [records, dateBounds]);

  const handleOpenSettle = (r: PayLaterRecord) => {
    setSettleModalRecord(r);
    setSettleAmount(String(r.dueAmount));
    setSettleMethod("UPI");
    setSettleNotes("Settled via mobile staff app");
  };

  const handleConfirmSettle = async () => {
    if (!settleModalRecord) return;
    const amt = parseFloat(settleAmount) || 0;
    if (amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    setIsSubmittingSettle(true);
    try {
      const res = await apiFetch<any>("/pay-later", {
        method: "POST",
        body: JSON.stringify({
          action: "settle",
          payLaterId: settleModalRecord.id,
          settledAmount: amt,
          paymentMode: settleMethod,
          notes: settleNotes,
        }),
      });

      if (res && res.success) {
        Alert.alert("Success", "Balance settled successfully!");
        setSettleModalRecord(null);
        fetchPayLater();
      } else {
        Alert.alert("Error", res?.error || "Failed to settle balance.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const handleSendWhatsApp = (r: PayLaterRecord) => {
    const cleanPhone = (r.patientPhone || "").replace(/\D/g, "").slice(-10);
    if (!cleanPhone) {
      Alert.alert("Error", "No valid phone number found for this patient.");
      return;
    }

    const msg = encodeURIComponent(
      `Dear ${r.patientName},\n\n` +
      `This is a gentle reminder regarding your pending balance of ₹${r.dueAmount.toLocaleString()} from your visit at ${r.branch || "Spiritual Homeopathy"}.\n\n` +
      `Total Bill: ₹${r.totalBill.toLocaleString()}\n` +
      `Paid at Clinic: ₹${r.paidAmount.toLocaleString()}\n` +
      `Pending Pay Later Due: ₹${r.dueAmount.toLocaleString()}\n\n` +
      `You may clear this balance at your next visit or via UPI to sseomni9k9v0j291124pos@mairtel.\n\n` +
      `Spiritual Homeopathy Clinics (${r.branch || "Clinic"})\nBranch Contact: ${getBranchPhone(r.branch)}`
    );

    Linking.openURL(`https://wa.me/91${cleanPhone}?text=${msg}`).catch(() => {
      Alert.alert("Error", "Unable to launch WhatsApp.");
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Top Header - Blue & Green theme */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pay Later Dues</Text>
          <Text style={styles.headerSubtitle}>Partial bills &amp; pending balances</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchPayLater}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={isLoading ? "#94a3b8" : "#0284c7"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0284c7", "#16a34a"]}
            tintColor="#0284c7"
          />
        }
      >
        {/* Date Filter Chips (Default: This Month) */}
        <View style={styles.dateFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {(
              [
                { key: "THIS_MONTH", label: "This Month" },
                { key: "LAST_MONTH", label: "Last Month" },
                { key: "ALL_HISTORY", label: "All History" },
                { key: "CUSTOM", label: "Custom Range" },
              ] as const
            ).map((preset) => {
              const isSelected = datePreset === preset.key;
              return (
                <TouchableOpacity
                  key={preset.key}
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => setDatePreset(preset.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Custom Date Pickers */}
          {datePreset === "CUSTOM" && (
            <View style={styles.customDateRow}>
              <View style={styles.customDateBox}>
                <Text style={styles.customDateLabel}>From (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.customDateInput}
                  placeholder="2026-11-01"
                  placeholderTextColor="#94a3b8"
                  value={customFromDate}
                  onChangeText={setCustomFromDate}
                />
              </View>
              <View style={styles.customDateBox}>
                <Text style={styles.customDateLabel}>To (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.customDateInput}
                  placeholder="2026-11-30"
                  placeholderTextColor="#94a3b8"
                  value={customToDate}
                  onChangeText={setCustomToDate}
                />
              </View>
              {(customFromDate || customToDate) ? (
                <TouchableOpacity
                  onPress={() => {
                    setCustomFromDate("");
                    setCustomToDate("");
                  }}
                  style={styles.customClearBtn}
                >
                  <Text style={styles.customClearBtnText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        {/* KPI Summary Card - Blue & Green theme */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kpiLabel}>
                TOTAL PENDING DUE ({datePreset === "THIS_MONTH" ? "THIS MONTH" : datePreset === "LAST_MONTH" ? "LAST MONTH" : "SELECTED"})
              </Text>
              <Text style={styles.kpiAmountBlue}>
                ₹{metrics.totalPending.toLocaleString()}
              </Text>
              <Text style={styles.kpiSub}>Across all clinic branches</Text>
            </View>
            <View style={styles.kpiBadgeIcon}>
              <Ionicons name="time" size={24} color="#ffffff" />
            </View>
          </View>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiBottomRow}>
            <View style={styles.kpiBottomItem}>
              <Text style={styles.kpiBottomLabel}>Cleared</Text>
              <Text style={styles.kpiBottomValGreen}>
                ₹{metrics.totalCleared.toLocaleString()}
              </Text>
            </View>
            <View style={styles.kpiBottomItem}>
              <Text style={styles.kpiBottomLabel}>Pending Profiles</Text>
              <Text style={styles.kpiBottomValDark}>
                {metrics.pendingCount}
              </Text>
            </View>
            <View style={styles.kpiBottomItem}>
              <Text style={styles.kpiBottomLabel}>Total Bills</Text>
              <Text style={styles.kpiBottomValDark}>
                {metrics.totalRecords}
              </Text>
            </View>
          </View>
        </View>

        {/* Branch Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.branchScroll}
          contentContainerStyle={styles.branchScrollContent}
        >
          {branchList.map((b) => {
            const isSelected =
              selectedBranch === b ||
              (selectedBranch !== "All" && normalizeBranchKey(selectedBranch) === normalizeBranchKey(b));
            return (
              <TouchableOpacity
                key={b}
                style={[styles.branchChip, isSelected && styles.branchChipActive]}
                onPress={() => setSelectedBranch(b)}
                activeOpacity={0.7}
              >
                <Text style={[styles.branchChipText, isSelected && styles.branchChipTextActive]}>
                  {b}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search & Status Bar */}
        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patient or phone..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statusToggleRow}>
            {(["PENDING", "CLEARED", "ALL"] as const).map((st) => {
              const isSelected = statusFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusBtn, isSelected && styles.statusBtnActive]}
                  onPress={() => setStatusFilter(st)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusBtnText, isSelected && styles.statusBtnTextActive]}>
                    {st === "PENDING" ? "Pending" : st === "CLEARED" ? "Cleared" : "All"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Patient Cards List */}
        {isLoading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              Loading dues...
            </Text>
          </View>
        ) : filteredRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={44} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Pay Later dues found</Text>
            <Text style={styles.emptySub}>No pending balances match the selected filters.</Text>
          </View>
        ) : (
          filteredRecords.map((r) => {
            const isPending = r.status === "PENDING";
            return (
              <View key={r.id} style={styles.patientCard}>
                {/* Header */}
                <View style={styles.patientHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{r.patientName || "Patient"}</Text>
                    <View style={styles.phoneRow}>
                      <Ionicons name="call" size={12} color="#64748b" />
                      <Text style={styles.phoneText}>+91 {r.patientPhone || "N/A"}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, isPending ? styles.statusBadgeBlue : styles.statusBadgeGreen]}>
                    <Text style={[styles.statusBadgeText, isPending ? styles.statusBadgeTextBlue : styles.statusBadgeTextGreen]}>
                      {isPending ? "PENDING DUE" : "CLEARED ✓"}
                    </Text>
                  </View>
                </View>

                {/* Info row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Branch</Text>
                    <Text style={styles.infoVal}>{r.branch || "KPHB"}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Doctor</Text>
                    <Text style={styles.infoVal} numberOfLines={1}>{r.doctorName || "Consultant"}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Visit Date</Text>
                    <Text style={styles.infoVal}>
                      {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </Text>
                  </View>
                </View>

                {/* Amount breakdown pill */}
                <View style={styles.amountBox}>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Total Bill</Text>
                    <Text style={styles.amountVal}>₹{r.totalBill?.toLocaleString() || "0"}</Text>
                  </View>
                  <Text style={styles.amountMinus}>-</Text>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Paid Today</Text>
                    <Text style={[styles.amountVal, { color: "#16a34a" }]}>
                      ₹{r.paidAmount?.toLocaleString() || "0"}
                    </Text>
                  </View>
                  <Text style={styles.amountEqual}>=</Text>
                  <View style={[styles.amountItem, isPending && styles.amountDueActive]}>
                    <Text style={[styles.amountLabel, isPending && { color: "#ffffff" }]}>Due Amount</Text>
                    <Text style={[styles.amountVal, isPending ? { color: "#ffffff", fontWeight: "900" } : { color: "#94a3b8" }]}>
                      ₹{r.dueAmount?.toLocaleString() || "0"}
                    </Text>
                  </View>
                </View>

                {/* Action buttons - Blue and Green */}
                <View style={styles.cardActions}>
                  {isPending && (
                    <TouchableOpacity
                      style={styles.settleBtn}
                      onPress={() => handleOpenSettle(r)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                      <Text style={styles.settleBtnText}>Settle Balance</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.whatsappBtn}
                    onPress={() => handleSendWhatsApp(r)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
                    <Text style={styles.whatsappBtnText}>WhatsApp Reminder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Settle Modal */}
      {settleModalRecord && (
        <Modal
          visible={Boolean(settleModalRecord)}
          transparent
          animationType="fade"
          onRequestClose={() => setSettleModalRecord(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalBackdrop}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={styles.modalIconBox}>
                    <Ionicons name="time" size={18} color="#0284c7" />
                  </View>
                  <Text style={styles.modalTitle}>Settle Pay Later Due</Text>
                </View>
                <TouchableOpacity onPress={() => setSettleModalRecord(null)}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalPatientBanner}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>
                  {settleModalRecord.patientName}
                </Text>
                <Text style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                  Branch: {settleModalRecord.branch} • Phone: +91 {settleModalRecord.patientPhone}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#0284c7", marginTop: 4 }}>
                  Outstanding Due: ₹{settleModalRecord.dueAmount}
                </Text>
              </View>

              <Text style={styles.modalFieldLabel}>Settlement Amount (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={settleAmount}
                onChangeText={setSettleAmount}
              />

              <Text style={styles.modalFieldLabel}>Payment Method *</Text>
              <View style={styles.modalMethodRow}>
                {["UPI", "Cash", "Card"].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modalMethodBtn, settleMethod === m && styles.modalMethodBtnActive]}
                    onPress={() => setSettleMethod(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalMethodBtnText, settleMethod === m && styles.modalMethodBtnTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalFieldLabel}>Settlement Notes</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: "top" }]}
                multiline
                value={settleNotes}
                onChangeText={setSettleNotes}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSettleModalRecord(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleConfirmSettle}
                  disabled={isSubmittingSettle}
                >
                  {isSubmittingSettle ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirm Settlement ✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: "#64748b",
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 10,
    gap: 8,
  },
  dateFilterContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateChipActive: {
    backgroundColor: "#268ec8",
    borderColor: "#0284c7",
  },
  dateChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  dateChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  customDateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  customDateBox: {
    flex: 1,
  },
  customDateLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 2,
  },
  customDateInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 6,
    height: 30,
    fontSize: 10,
    color: "#0f172a",
    fontWeight: "700",
  },
  customClearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  customClearBtnText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  kpiCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: "#7dd3fc",
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0369a1",
    letterSpacing: 0.5,
  },
  kpiAmountBlue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0284c7",
    marginTop: 1,
  },
  kpiSub: {
    fontSize: 9.5,
    color: "#0369a1",
    marginTop: 0.5,
  },
  kpiBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiDivider: {
    height: 1,
    backgroundColor: "#bae6fd",
    marginVertical: 9,
  },
  kpiBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kpiBottomItem: {
    flex: 1,
  },
  kpiBottomLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0369a1",
  },
  kpiBottomValGreen: {
    fontSize: 12,
    fontWeight: "900",
    color: "#16a34a",
    marginTop: 1,
  },
  kpiBottomValDark: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 1,
  },
  branchScroll: {
    flexGrow: 0,
  },
  branchScrollContent: {
    gap: 6,
  },
  branchChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  branchChipActive: {
    backgroundColor: "#268ec8",
    borderColor: "#0284c7",
  },
  branchChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  branchChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  filterBar: {
    gap: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 34,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#0f172a",
  },
  statusToggleRow: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    padding: 2,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 4,
    alignItems: "center",
    borderRadius: 6,
  },
  statusBtnActive: {
    backgroundColor: "#ffffff",
  },
  statusBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  statusBtnTextActive: {
    color: "#0f172a",
    fontWeight: "900",
  },
  centerLoading: {
    padding: 30,
    alignItems: "center",
  },
  emptyCard: {
    padding: 30,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginTop: 6,
  },
  emptySub: {
    fontSize: 10.5,
    color: "#94a3b8",
    marginTop: 1,
    textAlign: "center",
  },
  patientCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 7,
  },
  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  patientName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  phoneText: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  statusBadgeBlue: {
    backgroundColor: "#e0f2fe",
  },
  statusBadgeGreen: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
  },
  statusBadgeTextBlue: {
    color: "#0284c7",
  },
  statusBadgeTextGreen: {
    color: "#15803d",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 7,
    padding: 6,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  infoVal: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
    marginTop: 1,
  },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 6,
  },
  amountItem: {
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  amountDueActive: {
    backgroundColor: "#0284c7",
  },
  amountLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#64748b",
  },
  amountVal: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 1,
  },
  amountMinus: {
    fontWeight: "900",
    color: "#94a3b8",
    fontSize: 11,
  },
  amountEqual: {
    fontWeight: "900",
    color: "#94a3b8",
    fontSize: 11,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  settleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#268ec8",
    paddingVertical: 6.5,
    borderRadius: 8,
  },
  settleBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#16a34a",
    paddingVertical: 6.5,
    borderRadius: 8,
  },
  whatsappBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 6,
  },
  modalIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
  },
  modalPatientBanner: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#7dd3fc",
  },
  modalFieldLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#334155",
    marginTop: 3,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 7,
    paddingHorizontal: 8,
    height: 34,
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalMethodRow: {
    flexDirection: "row",
    gap: 6,
  },
  modalMethodBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  modalMethodBtnActive: {
    backgroundColor: "#268ec8",
    borderColor: "#0284c7",
  },
  modalMethodBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  modalMethodBtnTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  modalActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  modalCancelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#268ec8",
  },
  modalConfirmText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#ffffff",
  },
});
