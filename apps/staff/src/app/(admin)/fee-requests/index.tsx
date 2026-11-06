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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../../services/auth";

export default function MobileFeeRequestsScreen() {
  const router = useRouter();

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<any>("/admin/discounts");
      if (data && data.success && Array.isArray(data.discounts)) {
        setRequests(data.discounts);
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
    setProcessingId(apptId);
    try {
      const data = await apiFetch<any>("/admin/discounts", {
        method: "POST",
        body: JSON.stringify({
          appointmentId: apptId,
          action,
          approvedAmount: action === "ACCEPT" ? discountAmt : 0,
          notes: action === "ACCEPT" ? "Approved by Admin/HR" : "Declined by Admin/HR",
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Medical Discount Requests</Text>
          <Text style={styles.headerSub}>HR &amp; Admin Approvals</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDiscounts} disabled={isLoading}>
          <Ionicons name="refresh" size={19} color="#0284c7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDiscounts} />}
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={44} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Pending Discount Requests</Text>
            <Text style={styles.emptySub}>
              All reception fee concession requests have been resolved.
            </Text>
          </View>
        ) : (
          requests.map((r) => {
            const status = r.discountStatus || "PENDING";
            const discountAmt = r.discountRequested || 0;
            const targetAmt = r.consultationFee || 0;
            const netAmt = Math.max(0, targetAmt - discountAmt);
            const isPending = status === "PENDING";

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
                      {status}
                    </Text>
                  </View>
                </View>

                <View style={styles.feeBox}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                    <Text style={styles.oldFee}>₹{targetAmt}</Text>
                    <Text style={styles.newFee}>₹{netAmt}</Text>
                    <Text style={styles.discountTag}>Discount: -₹{discountAmt}</Text>
                  </View>
                  <Text style={styles.reasonText}>
                    Reception Notes: {r.discountNotes || "No reason specified."}
                  </Text>
                </View>

                {isPending && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.approveBtn]}
                      disabled={processingId === r.id}
                      onPress={() => handleAction(r.id, "ACCEPT", discountAmt)}
                    >
                      {processingId === r.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.btnText}>Approve Discount</Text>
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
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
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
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
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
    fontWeight: "500",
  },
  docText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 1,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeAmber: {
    backgroundColor: "#fef3c7",
  },
  badgeGreen: {
    backgroundColor: "#dcfce7",
  },
  badgeRed: {
    backgroundColor: "#fee2e2",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  feeBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 12,
  },
  oldFee: {
    fontSize: 12,
    color: "#94a3b8",
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  newFee: {
    fontSize: 16,
    fontWeight: "800",
    color: "#16a34a",
  },
  discountTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ef4444",
  },
  reasonText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 6,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
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
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  btnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 11.5,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },
});
