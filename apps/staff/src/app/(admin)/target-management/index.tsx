import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../../services/auth";

interface BranchTargetItem {
  id: string;
  branch: string;
  branchId: string;
  monthYear: string;
  targetGoal: number;
  targetReached: number;
  percentage: number;
  remaining: number;
  status: string;
  completedAppointmentsCount: number;
  setByRole: "ADMIN" | "HR" | null;
  setByName: string | null;
  hrLocked: boolean;
  canEdit: boolean;
}

interface MonthOption {
  key: string;
  label: string;
  isNextMonth?: boolean;
  isCurrentMonth?: boolean;
  isPastMonth?: boolean;
  windowOpen?: boolean;
}

export default function MobileTargetManagementScreen() {
  const router = useRouter();

  const [userRole, setUserRole] = useState<"ADMIN" | "HR">("ADMIN");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthsList, setMonthsList] = useState<MonthOption[]>([]);
  const [branches, setBranches] = useState<BranchTargetItem[]>([]);
  const [totalGoal, setTotalGoal] = useState(0);
  const [totalReached, setTotalReached] = useState(0);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [isNextMonthWindowOpen, setIsNextMonthWindowOpen] = useState(false);
  const [daysUntilWindow, setDaysUntilWindow] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Edit / Set Target Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchTargetItem | null>(null);
  const [inputTargetAmount, setInputTargetAmount] = useState("");
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  const fetchTargets = async (monthKey?: string) => {
    setIsLoading(true);
    try {
      const url = `/admin/targets?role=${userRole}${monthKey ? `&month=${encodeURIComponent(monthKey)}` : ""}`;
      const data = await apiFetch<any>(url);
      if (data && data.success) {
        setBranches(data.branches || []);
        setTotalGoal(data.totalGoal || 0);
        setTotalReached(data.totalReached || 0);
        setOverallPercentage(data.overallPercentage || 0);
        setIsNextMonthWindowOpen(data.isNextMonthWindowOpen);
        setDaysUntilWindow(data.daysUntilNextMonthWindow || 0);
        if (Array.isArray(data.monthsList) && data.monthsList.length > 0) {
          setMonthsList(data.monthsList);
          if (!selectedMonth) {
            setSelectedMonth(data.monthYear);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load mobile branch targets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets(selectedMonth || undefined);
  }, [selectedMonth, userRole]);

  const handleOpenEdit = (b: BranchTargetItem) => {
    setEditBranch(b);
    setInputTargetAmount(b.targetGoal > 0 ? String(b.targetGoal) : "");
    setIsEditModalOpen(true);
  };

  const handleSaveTarget = async () => {
    if (!editBranch) return;
    const num = parseFloat(inputTargetAmount);
    if (isNaN(num) || num < 0) {
      Alert.alert("Invalid Input", "Please enter a valid numeric target amount (₹).");
      return;
    }

    setIsSavingTarget(true);
    try {
      const data = await apiFetch<any>("/admin/targets", {
        method: "POST",
        body: JSON.stringify({
          branch: editBranch.branch,
          monthYear: selectedMonth,
          targetAmount: num,
          role: userRole,
          userName: userRole === "ADMIN" ? "Admin" : "HR Manager",
        }),
      });
      if (data && data.success) {
        Alert.alert("Success", data.message || `Target for ${editBranch.branch} saved successfully!`);
        setIsEditModalOpen(false);
        fetchTargets(selectedMonth);
      } else {
        Alert.alert("Notice", data?.error || "Failed to save target.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsSavingTarget(false);
    }
  };

  const selectedMonthObj = monthsList.find((m) => m.key === selectedMonth);
  const isSelectedNextMonth = Boolean(selectedMonthObj?.isNextMonth);
  const isNextMonthLocked = isSelectedNextMonth && !isNextMonthWindowOpen;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Branch Targets &amp; KPIs</Text>
          <Text style={styles.headerSub}>
            Live Revenue vs Target • Role: {userRole}
          </Text>
        </View>

        {/* Role Toggle for convenience */}
        <TouchableOpacity
          style={styles.roleToggleBtn}
          onPress={() => setUserRole(userRole === "ADMIN" ? "HR" : "ADMIN")}
        >
          <Text style={styles.roleToggleText}>{userRole}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchTargets(selectedMonth)}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={19} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* Month Selector Bar */}
      <View style={styles.monthBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
          {monthsList.map((m) => {
            const isSelected = selectedMonth === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.monthChip, isSelected && styles.monthChipActive]}
                onPress={() => setSelectedMonth(m.key)}
              >
                <Text style={[styles.monthChipText, isSelected && styles.monthChipTextActive]}>
                  {m.label}
                </Text>
                {m.isNextMonth && !m.windowOpen && (
                  <Ionicons name="lock-closed" size={11} color={isSelected ? "#ffffff" : "#94a3b8"} style={{ marginLeft: 3 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchTargets(selectedMonth)} />}
      >
        {/* Next Month Locked Banner */}
        {isSelectedNextMonth && (
          <View
            style={[
              styles.banner,
              isNextMonthWindowOpen ? styles.bannerGreen : styles.bannerAmber,
            ]}
          >
            <Ionicons
              name={isNextMonthWindowOpen ? "checkmark-circle" : "lock-closed"}
              size={18}
              color={isNextMonthWindowOpen ? "#16a34a" : "#d97706"}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text
                style={[
                  styles.bannerTitle,
                  { color: isNextMonthWindowOpen ? "#166534" : "#92400e" },
                ]}
              >
                {isNextMonthWindowOpen
                  ? "Next Month Target Entry Is Open!"
                  : `Next Month Locked • Opens in ${daysUntilWindow} Day(s)`}
              </Text>
              <Text
                style={[
                  styles.bannerSub,
                  { color: isNextMonthWindowOpen ? "#166534" : "#92400e" },
                ]}
              >
                {isNextMonthWindowOpen
                  ? "HR and Admin can now set targets for next month."
                  : "Target entry unlocks 3 days before the end of the active month."}
              </Text>
            </View>
          </View>
        )}

        {/* Top KPI Card */}
        <View style={styles.topCard}>
          <Text style={styles.topLabel}>MONTHLY TOTAL TARGET GOAL</Text>
          <Text style={styles.topVal}>₹{totalGoal.toLocaleString()}</Text>

          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, overallPercentage)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPct}>{overallPercentage}%</Text>
          </View>

          <View style={styles.subMetricsRow}>
            <View>
              <Text style={styles.subMetricLabel}>Live Reached</Text>
              <Text style={[styles.subMetricVal, { color: "#16a34a" }]}>
                ₹{totalReached.toLocaleString()}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.subMetricLabel}>Remaining Deficit</Text>
              <Text style={[styles.subMetricVal, { color: "#ea580c" }]}>
                ₹{Math.max(0, totalGoal - totalReached).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>BRANCH REVENUE BREAKDOWN</Text>

        {branches.map((b) => {
          const isLocked = isNextMonthLocked || (!b.canEdit && userRole === "HR");

          return (
            <View key={b.branchId} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.branch}</Text>
                  <Text style={styles.consultCount}>
                    {b.completedAppointmentsCount} paid consultations
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    b.status === "Achieved"
                      ? styles.badgeGreen
                      : b.status === "On Track"
                      ? styles.badgeSky
                      : b.status === "In Progress"
                      ? styles.badgeAmber
                      : b.status === "Not Set"
                      ? styles.badgeSlate
                      : styles.badgeRed,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      b.status === "Achieved"
                        ? { color: "#16a34a" }
                        : b.status === "On Track"
                        ? { color: "#0284c7" }
                        : b.status === "In Progress"
                        ? { color: "#d97706" }
                        : b.status === "Not Set"
                        ? { color: "#64748b" }
                        : { color: "#ef4444" },
                    ]}
                  >
                    {b.status}
                  </Text>
                </View>
              </View>

              {/* Metrics Grid */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Target Goal</Text>
                  <Text style={styles.metricVal}>
                    {b.targetGoal > 0 ? `₹${b.targetGoal.toLocaleString()}` : "Not Set"}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Live Reached</Text>
                  <Text style={[styles.metricVal, { color: "#16a34a" }]}>
                    ₹{b.targetReached.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Progress</Text>
                  <Text style={[styles.metricVal, { color: "#0284c7" }]}>
                    {b.percentage}%
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.cardProgressBarBg}>
                <View
                  style={[
                    styles.cardProgressBarFill,
                    {
                      width: `${Math.min(100, b.percentage)}%`,
                      backgroundColor:
                        b.percentage >= 100
                          ? "#16a34a"
                          : b.percentage >= 75
                          ? "#0284c7"
                          : b.percentage >= 40
                          ? "#f59e0b"
                          : "#ef4444",
                    },
                  ]}
                />
              </View>

              {/* Footer info & Action */}
              <View style={styles.cardFooter}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.footerInfo}>
                    Remaining: ₹{b.remaining.toLocaleString()}
                  </Text>
                  {b.setByRole ? (
                    <Text style={styles.footerSub}>
                      Set by: {b.setByName || b.setByRole}
                      {b.hrLocked ? " (HR Locked)" : ""}
                    </Text>
                  ) : (
                    <Text style={styles.footerSub}>Default quota</Text>
                  )}
                </View>

                {isLocked ? (
                  <View style={styles.lockedBtn}>
                    <Ionicons name="lock-closed" size={13} color="#94a3b8" />
                    <Text style={styles.lockedBtnText}>Locked</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleOpenEdit(b)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pencil" size={13} color="#ffffff" />
                    <Text style={styles.editBtnText}>
                      {b.targetGoal > 0 ? "Edit Target" : "Set Target"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Set / Edit Target Modal */}
      {isEditModalOpen && editBranch && (
        <Modal visible={isEditModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Set Branch Target</Text>
                  <Text style={styles.modalSub}>
                    {editBranch.branch} • {selectedMonth}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalInputLabel}>Target Revenue (₹)</Text>
                <View style={styles.modalInputWrapper}>
                  <Text style={styles.modalRupee}>₹</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="numeric"
                    placeholder="e.g. 500000"
                    placeholderTextColor="#94a3b8"
                    value={inputTargetAmount}
                    onChangeText={setInputTargetAmount}
                  />
                </View>

                {userRole === "HR" && (
                  <View style={styles.modalWarningBox}>
                    <Ionicons name="alert-circle" size={16} color="#d97706" />
                    <Text style={styles.modalWarningText}>
                      HR can set this target once per month. Once confirmed, only Admin can edit it.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsEditModalOpen(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, isSavingTarget && { opacity: 0.6 }]}
                  disabled={isSavingTarget}
                  onPress={handleSaveTarget}
                >
                  {isSavingTarget ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSaveText}>Save Target</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  roleToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  roleToggleText: { fontSize: 10, fontWeight: "800", color: "#0284c7" },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
  },
  monthBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
  },
  monthScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  monthChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  monthChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  monthChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  monthChipTextActive: {
    color: "#ffffff",
  },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerGreen: {
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
  },
  bannerAmber: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  bannerSub: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: "500",
  },
  topCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
  },
  topVal: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 7,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#0284c7",
    borderRadius: 4,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284c7",
  },
  subMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  subMetricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  subMetricVal: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  consultCount: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeGreen: { backgroundColor: "#dcfce7", borderColor: "#bbf7d0" },
  badgeSky: { backgroundColor: "#e0f2fe", borderColor: "#bae6fd" },
  badgeAmber: { backgroundColor: "#fef3c7", borderColor: "#fde68a" },
  badgeSlate: { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
  badgeRed: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
  },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 10, color: "#64748b", fontWeight: "600" },
  metricVal: { fontSize: 13, fontWeight: "800", color: "#0f172a", marginTop: 2 },
  cardProgressBarBg: {
    height: 5,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  cardProgressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  footerInfo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  footerSub: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 1,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  lockedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lockedBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  modalSub: { fontSize: 11, color: "#64748b", marginTop: 1 },
  modalBody: { gap: 10 },
  modalInputLabel: { fontSize: 11, fontWeight: "700", color: "#334155" },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
  },
  modalRupee: { fontSize: 14, fontWeight: "700", color: "#64748b", marginRight: 6 },
  modalTextInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef3c7",
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 10.5,
    color: "#92400e",
    fontWeight: "600",
    lineHeight: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  modalCancelText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#0284c7",
    alignItems: "center",
  },
  modalSaveText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
});
