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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../../services/auth";

export default function MobileFeeRequestsScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Declined" | "All">("Pending");
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<any>("/admin/discounts?months=2");
      if (data && data.success && Array.isArray(data.discounts)) {
        setRequests(data.discounts);
        if (data.stats) {
          setStats(data.stats);
        } else {
          setStats({
            total: data.discounts.length,
            pending: data.discounts.filter((d: any) => (d.discountStatus || "PENDING") === "PENDING").length,
            approved: data.discounts.filter((d: any) => d.discountStatus === "APPROVED").length,
            rejected: data.discounts.filter((d: any) => d.discountStatus === "REJECTED").length,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load mobile fee requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleAction = async (apptId: string, action: "ACCEPT" | "REJECT", discountAmt: number) => {
    if (action === "REJECT") {
      Alert.alert(
        "Confirm Decline",
        "Are you sure you want to decline this fee concession request?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Decline",
            style: "destructive",
            onPress: () => submitAction(apptId, action, 0, "Declined by Admin/HR"),
          },
        ]
      );
      return;
    }
    submitAction(apptId, action, discountAmt, "Approved by Admin/HR");
  };

  const submitAction = async (apptId: string, action: "ACCEPT" | "REJECT", discountAmt: number, notes: string) => {
    setProcessingId(apptId);
    try {
      const data = await apiFetch<any>("/admin/discounts", {
        method: "POST",
        body: JSON.stringify({
          appointmentId: apptId,
          action,
          approvedAmount: discountAmt,
          notes,
        }),
      });
      if (data && data.success) {
        Alert.alert(
          "Success",
          `Discount request ${action === "ACCEPT" ? "APPROVED" : "REJECTED"} successfully!`
        );
        fetchDiscounts();
      } else {
        Alert.alert("Error", data?.error || "Failed to update discount request.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to communicate with server.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    const q = search.toLowerCase().trim();

    return requests.filter((r) => {
      const status = r.discountStatus || "PENDING";

      if (activeTab === "Pending" && status !== "PENDING") return false;
      if (activeTab === "Approved" && status !== "APPROVED") return false;
      if (activeTab === "Declined" && status !== "REJECTED") return false;

      if (q) {
        const pName = (r.patientName || "").toLowerCase();
        const phone = (r.phone || r.phoneNumber || "").toLowerCase();
        const reg = (r.registrationId || "").toLowerCase();
        const doc = (r.doctorName || "").toLowerCase();
        const branch = (r.branch || "").toLowerCase();

        if (
          !pName.includes(q) &&
          !phone.includes(q) &&
          !reg.includes(q) &&
          !doc.includes(q) &&
          !branch.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [requests, activeTab, search]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Medical Discount Requests</Text>
          <Text style={styles.headerSub}>HR &amp; Admin Approvals • Last 2 Months</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDiscounts} disabled={isLoading}>
          <Ionicons name="refresh" size={19} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, phone, reg ID..."
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

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {/* Pending Tab */}
          <TouchableOpacity
            style={[styles.tabChip, activeTab === "Pending" && styles.tabChipActiveAmber]}
            onPress={() => setActiveTab("Pending")}
          >
            <Ionicons
              name="time"
              size={13}
              color={activeTab === "Pending" ? "#ffffff" : "#d97706"}
            />
            <Text style={[styles.tabChipText, activeTab === "Pending" && styles.tabChipTextActive]}>
              Pending
            </Text>
            <View style={[styles.countBadge, activeTab === "Pending" ? styles.countBadgeWhite : styles.countBadgeAmber]}>
              <Text style={[styles.countBadgeText, activeTab === "Pending" ? { color: "#d97706" } : { color: "#92400e" }]}>
                {stats.pending}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Approved Tab */}
          <TouchableOpacity
            style={[styles.tabChip, activeTab === "Approved" && styles.tabChipActiveGreen]}
            onPress={() => setActiveTab("Approved")}
          >
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={activeTab === "Approved" ? "#ffffff" : "#16a34a"}
            />
            <Text style={[styles.tabChipText, activeTab === "Approved" && styles.tabChipTextActive]}>
              Approved
            </Text>
            <View style={[styles.countBadge, activeTab === "Approved" ? styles.countBadgeWhite : styles.countBadgeGreen]}>
              <Text style={[styles.countBadgeText, activeTab === "Approved" ? { color: "#16a34a" } : { color: "#14532d" }]}>
                {stats.approved}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Declined / Rejected Tab */}
          <TouchableOpacity
            style={[styles.tabChip, activeTab === "Declined" && styles.tabChipActiveRed]}
            onPress={() => setActiveTab("Declined")}
          >
            <Ionicons
              name="close-circle"
              size={13}
              color={activeTab === "Declined" ? "#ffffff" : "#ef4444"}
            />
            <Text style={[styles.tabChipText, activeTab === "Declined" && styles.tabChipTextActive]}>
              Declined
            </Text>
            <View style={[styles.countBadge, activeTab === "Declined" ? styles.countBadgeWhite : styles.countBadgeRed]}>
              <Text style={[styles.countBadgeText, activeTab === "Declined" ? { color: "#ef4444" } : { color: "#7f1d1d" }]}>
                {stats.rejected}
              </Text>
            </View>
          </TouchableOpacity>

          {/* All History Tab */}
          <TouchableOpacity
            style={[styles.tabChip, activeTab === "All" && styles.tabChipActiveDark]}
            onPress={() => setActiveTab("All")}
          >
            <Text style={[styles.tabChipText, activeTab === "All" && styles.tabChipTextActive]}>
              All (2 Mos)
            </Text>
            <View style={[styles.countBadge, activeTab === "All" ? styles.countBadgeWhite : styles.countBadgeSlate]}>
              <Text style={[styles.countBadgeText, activeTab === "All" ? { color: "#0f172a" } : { color: "#334155" }]}>
                {stats.total}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDiscounts} />}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No {activeTab} Requests Found</Text>
            <Text style={styles.emptySub}>
              {activeTab === "Pending"
                ? "All reception fee concession requests have been resolved."
                : `No discount requests recorded as "${activeTab}" in the last 2 months.`}
            </Text>
          </View>
        ) : (
          filteredRequests.map((r) => {
            const status = r.discountStatus || "PENDING";
            const discountRequested = r.discountRequested || 0;
            const discountApproved = typeof r.discountApproved === "number" ? r.discountApproved : discountRequested;
            const targetAmt = r.consultationFee || 0;
            const effectiveDiscount = status === "APPROVED" ? discountApproved : discountRequested;
            const netAmt = Math.max(0, targetAmt - effectiveDiscount);
            const isPending = status === "PENDING";

            const dateStr = r.discountRespondedAt
              ? new Date(r.discountRespondedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
              : r.appointmentDate || "Recent";

            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{r.patientName || "Unknown Patient"}</Text>
                    <Text style={styles.phoneText}>
                      📞 {r.phoneNumber || r.phone || "No Phone"} • {r.branch || "All Branches"}
                    </Text>
                    <Text style={styles.docText}>
                      Doctor: Dr. {r.doctorName || "Doctor"} • ID: {r.registrationId || "N/A"}
                    </Text>
                    <Text style={styles.dateText}>📅 {dateStr}</Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      status === "APPROVED"
                        ? styles.badgeGreen
                        : status === "REJECTED"
                        ? styles.badgeRed
                        : styles.badgeAmber,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        status === "APPROVED"
                          ? { color: "#16a34a" }
                          : status === "REJECTED"
                          ? { color: "#ef4444" }
                          : { color: "#d97706" },
                      ]}
                    >
                      {status === "APPROVED" ? "Approved ✓" : status === "REJECTED" ? "Declined ✕" : "Pending"}
                    </Text>
                  </View>
                </View>

                <View style={styles.feeBox}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                    <Text style={styles.oldFee}>₹{targetAmt}</Text>
                    <Text style={styles.newFee}>₹{status === "REJECTED" ? targetAmt : netAmt}</Text>
                    <Text
                      style={[
                        styles.discountTag,
                        status === "APPROVED"
                          ? { color: "#16a34a", backgroundColor: "#f0fdf4" }
                          : status === "REJECTED"
                          ? { color: "#ef4444", backgroundColor: "#fef2f2", textDecorationLine: "line-through" }
                          : { color: "#d97706", backgroundColor: "#fffbeb" },
                      ]}
                    >
                      {status === "APPROVED"
                        ? `Concession: ₹${discountApproved}`
                        : `Requested: ₹${discountRequested}`}
                    </Text>
                  </View>
                  <Text style={styles.reasonText}>
                    Reception Notes: {r.discountNotes || "No reason specified."}
                  </Text>
                </View>

                {isPending ? (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.approveBtn]}
                      disabled={processingId === r.id}
                      onPress={() => handleAction(r.id, "ACCEPT", discountRequested)}
                    >
                      {processingId === r.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.btnText}>Approve (₹{discountRequested})</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.rejectBtn]}
                      disabled={processingId === r.id}
                      onPress={() => handleAction(r.id, "REJECT", 0)}
                    >
                      <Text style={[styles.btnText, { color: "#ef4444" }]}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.resolvedRow}>
                    <Ionicons
                      name={status === "APPROVED" ? "checkmark-done-circle" : "close-circle"}
                      size={16}
                      color={status === "APPROVED" ? "#16a34a" : "#ef4444"}
                    />
                    <Text style={[styles.resolvedText, { color: status === "APPROVED" ? "#15803d" : "#b91c1c" }]}>
                      {status === "APPROVED" ? "Discount Approved & Settled" : "Concession Request Declined"}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0f172a",
  },
  tabsContainer: {
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 5,
  },
  tabChipActiveAmber: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },
  tabChipActiveGreen: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  tabChipActiveRed: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  tabChipActiveDark: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tabChipTextActive: {
    color: "#ffffff",
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeWhite: {
    backgroundColor: "#ffffff",
  },
  countBadgeAmber: {
    backgroundColor: "#fef3c7",
  },
  countBadgeGreen: {
    backgroundColor: "#dcfce7",
  },
  countBadgeRed: {
    backgroundColor: "#fee2e2",
  },
  countBadgeSlate: {
    backgroundColor: "#e2e8f0",
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  phoneText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  docText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 1,
  },
  dateText: {
    fontSize: 10.5,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeGreen: {
    backgroundColor: "#dcfce7",
  },
  badgeRed: {
    backgroundColor: "#fee2e2",
  },
  badgeAmber: {
    backgroundColor: "#fef3c7",
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  feeBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginTop: 10,
  },
  oldFee: {
    fontSize: 12,
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  newFee: {
    fontSize: 14,
    fontWeight: "800",
    color: "#16a34a",
  },
  discountTag: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  reasonText: {
    fontSize: 11.5,
    color: "#334155",
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtn: {
    backgroundColor: "#16a34a",
  },
  rejectBtn: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  btnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  resolvedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  resolvedText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
