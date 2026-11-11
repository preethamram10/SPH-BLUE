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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { AdminBottomNav } from "../../../components/admin/AdminBottomNav";

const FILTER_TABS = ["All", "Pending", "Approved", "Rejected"];

export default function MobileLeaveRequestsScreen() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/leaves`);
      const data = await res.json();
      if (data.success && Array.isArray(data.leaves)) {
        setLeaves(data.leaves);
      }
    } catch (err) {
      console.warn("Failed fetching mobile leaves:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaves();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    try {
      setActionLoading(id);
      const res = await fetch(`${API_BASE_URL}/admin/leaves/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        Alert.alert("Approved", `Leave request for ${name} has been approved.`);
        fetchLeaves();
      } else {
        Alert.alert("Error", "Failed to approve leave request.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (id: string, name: string) => {
    Alert.alert(
      "Confirm Reject",
      `Are you sure you want to decline leave for ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(id);
              const res = await fetch(`${API_BASE_URL}/admin/leaves/${id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rejectionReason: "Operational staff coverage requirement" }),
              });
              if (res.ok) {
                Alert.alert("Declined", `Leave request for ${name} has been declined.`);
                fetchLeaves();
              }
            } catch (err) {
              console.warn("Reject leave err:", err);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const filteredLeaves = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leaves.filter((l) => {
      const matchesSearch =
        !q ||
        (l.staffName || "").toLowerCase().includes(q) ||
        (l.branch || "").toLowerCase().includes(q) ||
        (l.leaveType || "").toLowerCase().includes(q) ||
        (l.reason || "").toLowerCase().includes(q);

      const matchesFilter =
        activeFilter === "All" ||
        (l.status || "").toLowerCase() === activeFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [leaves, search, activeFilter]);

  const pendingCount = leaves.filter((l) => l.status === "Pending").length;
  const approvedCount = leaves.filter((l) => l.status === "Approved").length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Leave Approvals</Text>
          <Text style={styles.headerSub}>Review &amp; Authorize Clinic Duty Leaves</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchLeaves}>
          <Ionicons name="refresh" size={18} color="#0284c7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284c7"]} />}
      >
        {/* Modern Clean White Hero Card (matches Total Revenue / PayLater UI) */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroSub}>TOTAL LEAVE REQUESTS</Text>
              <Text style={styles.heroTotal}>{leaves.length}</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="calendar" size={24} color="#0284c7" />
            </View>
          </View>

          {/* Inline Summary Strip */}
          <View style={styles.heroSummaryRow}>
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>PENDING</Text>
              <Text style={[styles.heroSummaryValue, { color: "#d97706" }]}>{pendingCount}</Text>
            </View>
            <View style={styles.heroSummaryDivider} />
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>APPROVED</Text>
              <Text style={[styles.heroSummaryValue, { color: "#16a34a" }]}>{approvedCount}</Text>
            </View>
            <View style={styles.heroSummaryDivider} />
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>DECISION RATE</Text>
              <Text style={[styles.heroSummaryValue, { color: "#0284c7" }]}>
                {leaves.length > 0 ? Math.round(((leaves.length - pendingCount) / leaves.length) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee, branch, or reason..."
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

        {/* Filter Strip */}
        <View style={styles.filterStrip}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, activeFilter === tab && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text style={[styles.filterChipText, activeFilter === tab && styles.filterChipTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leave Requests Card List */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
        ) : filteredLeaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No leave requests found</Text>
            <Text style={styles.emptySub}>All employee leave applications are currently processed.</Text>
          </View>
        ) : (
          filteredLeaves.map((item) => {
            const isPending = item.status === "Pending";
            const isApproved = item.status === "Approved";
            const isBusy = actionLoading === item.id;

            return (
              <View key={item.id} style={styles.leaveCard}>
                <View style={styles.leaveCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.empName}>{item.staffName}</Text>
                    <View style={styles.branchRow}>
                      <Ionicons name="business" size={11} color="#64748b" />
                      <Text style={styles.branchText}>{item.branch}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isApproved ? styles.badgeApproved : isPending ? styles.badgePending : styles.badgeRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isApproved ? { color: "#16a34a" } : isPending ? { color: "#d97706" } : { color: "#ef4444" },
                      ]}
                    >
                      ● {item.status}
                    </Text>
                  </View>
                </View>

                {/* Dates & Leave Type Banner */}
                <View style={styles.datesBox}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>LEAVE TYPE</Text>
                    <Text style={styles.leaveTypeVal}>{item.leaveType} Leave</Text>
                  </View>
                  <View style={styles.dateDivider} />
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>DURATION</Text>
                    <Text style={styles.datesVal}>
                      {item.fromDate} to {item.toDate}
                    </Text>
                  </View>
                </View>

                {/* Reason */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>💬 "{item.reason || "Personal work"}"</Text>
                </View>

                {/* Action Buttons for Pending */}
                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      disabled={isBusy}
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(item.id, item.staffName)}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                          <Text style={styles.approveBtnText}>Approve Leave</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={isBusy}
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleReject(item.id, item.staffName)}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                      <Text style={styles.rejectBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Embedded Admin Bottom Navigation */}
      <AdminBottomNav activeTab="leave-approvals" />
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
  refreshBtn: { padding: 8, backgroundColor: "#f0f9ff", borderRadius: 8 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
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
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroSub: { fontSize: 10.5, fontWeight: "800", color: "#64748b", letterSpacing: 0.8 },
  heroTotal: { fontSize: 26, fontWeight: "900", color: "#0f172a", marginTop: 2 },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
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
  heroSummaryItem: { flex: 1, alignItems: "center" },
  heroSummaryLabel: { fontSize: 9.5, fontWeight: "800", color: "#64748b" },
  heroSummaryValue: { fontSize: 14, fontWeight: "900", marginTop: 2 },
  heroSummaryDivider: { width: 1, height: 22, backgroundColor: "#e2e8f0" },
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
  searchInput: { flex: 1, fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  filterStrip: { flexDirection: "row", gap: 8 },
  filterChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  filterChipActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  filterChipText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  filterChipTextActive: { color: "#ffffff", fontWeight: "800" },
  leaveCard: {
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
  leaveCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  empName: { fontSize: 14.5, fontWeight: "800", color: "#0f172a" },
  branchRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  branchText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeApproved: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  badgePending: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  badgeRejected: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  statusBadgeText: { fontSize: 10.5, fontWeight: "800" },
  datesBox: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 9.5, fontWeight: "800", color: "#94a3b8" },
  leaveTypeVal: { fontSize: 12, fontWeight: "800", color: "#0284c7", marginTop: 2 },
  datesVal: { fontSize: 11.5, fontWeight: "700", color: "#334155", marginTop: 2 },
  dateDivider: { width: 1, backgroundColor: "#e2e8f0", marginHorizontal: 8 },
  reasonBox: { marginTop: 8, paddingHorizontal: 2 },
  reasonText: { fontSize: 12, color: "#475569", lineHeight: 16, fontStyle: "italic" },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  approveBtn: { backgroundColor: "#16a34a" },
  approveBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  rejectBtn: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  rejectBtnText: { color: "#ef4444", fontSize: 12, fontWeight: "800" },
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
});
