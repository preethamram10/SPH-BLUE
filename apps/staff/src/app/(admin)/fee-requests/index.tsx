import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function MobileFeeRequestsScreen() {
  const router = useRouter();

  const [requests, setRequests] = useState([
    {
      id: "1",
      patient: "G. Venkateswarlu",
      phone: "+91 9849112233",
      branch: "KPHB Branch",
      originalFee: "₹850",
      requestedFee: "₹500",
      discount: "₹350 (41% Off)",
      reason: "BPL card holder, chronic arthritis review",
      status: "Pending",
    },
    {
      id: "2",
      patient: "M. Lakshmi",
      phone: "+91 9701445566",
      branch: "Chandanagar Branch",
      originalFee: "₹1,200",
      requestedFee: "₹800",
      discount: "₹400 (33% Off)",
      reason: "Doctor recommended concession for pediatric follow-up",
      status: "Pending",
    },
  ]);

  const handleAction = (id: string, newStatus: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Fee Requests</Text>
          <Text style={styles.headerSub}>Discounts &amp; Concession Approvals</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {requests.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.patientName}>{r.patient}</Text>
                <Text style={styles.phoneText}>📞 {r.phone} • {r.branch}</Text>
              </View>
              <View style={[styles.badge, r.status === "Approved" ? styles.badgeGreen : styles.badgeAmber]}>
                <Text style={[styles.badgeText, r.status === "Approved" ? { color: "#16a34a" } : { color: "#d97706" }]}>
                  {r.status}
                </Text>
              </View>
            </View>

            <View style={styles.feeBox}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={styles.oldFee}>{r.originalFee}</Text>
                <Text style={styles.newFee}>{r.requestedFee}</Text>
                <Text style={styles.discountTag}>{r.discount}</Text>
              </View>
              <Text style={styles.reasonText}>Reason: {r.reason}</Text>
            </View>

            {r.status === "Pending" && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleAction(r.id, "Approved")}
                >
                  <Text style={styles.btnText}>Approve Discount</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleAction(r.id, "Declined")}
                >
                  <Text style={[styles.btnText, { color: "#ef4444" }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
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
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  patientName: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  phoneText: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeAmber: { backgroundColor: "#fef3c7" },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  feeBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  oldFee: { fontSize: 12, color: "#94a3b8", textDecorationLine: "line-through" },
  newFee: { fontSize: 16, fontWeight: "900", color: "#16a34a" },
  discountTag: { fontSize: 11, fontWeight: "800", color: "#0284c7" },
  reasonText: { fontSize: 11, color: "#64748b", marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  approveBtn: { backgroundColor: "#16a34a" },
  rejectBtn: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca" },
  btnText: { fontSize: 12, fontWeight: "800", color: "#ffffff" },
});

