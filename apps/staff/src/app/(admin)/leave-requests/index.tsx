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

export default function MobileLeaveRequestsScreen() {
  const router = useRouter();

  const [leaves, setLeaves] = useState([
    {
      id: "1",
      name: "Anil Kumar M",
      role: "Staff Member",
      branch: "KPHB Branch",
      type: "Sick Leave",
      dates: "10 Nov - 11 Nov (2 Days)",
      reason: "Viral fever and doctor consultation",
      status: "Pending",
    },
    {
      id: "2",
      name: "Dr. Padma priya",
      role: "Doctor",
      branch: "Nallagandla Branch",
      type: "Casual Leave",
      dates: "15 Nov - 16 Nov (2 Days)",
      reason: "Family function out of station",
      status: "Pending",
    },
  ]);

  const handleAction = (id: string, newStatus: string) => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Leave Requests</Text>
          <Text style={styles.headerSub}>Review &amp; Approve Employee Leaves</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {leaves.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.empName}>{item.name}</Text>
                <Text style={styles.roleText}>{item.role} • {item.branch}</Text>
              </View>
              <View style={[styles.badge, item.status === "Approved" ? styles.badgeGreen : styles.badgeAmber]}>
                <Text style={[styles.badgeText, item.status === "Approved" ? { color: "#16a34a" } : { color: "#d97706" }]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.leaveType}>{item.type}</Text>
              <Text style={styles.dates}>{item.dates}</Text>
              <Text style={styles.reason}>Reason: {item.reason}</Text>
            </View>

            {item.status === "Pending" && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleAction(item.id, "Approved")}
                >
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                  <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleAction(item.id, "Rejected")}
                >
                  <Ionicons name="close" size={16} color="#ef4444" />
                  <Text style={[styles.btnText, { color: "#ef4444" }]}>Reject</Text>
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  empName: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  roleText: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeAmber: { backgroundColor: "#fef3c7" },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  detailBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  leaveType: { fontSize: 12, fontWeight: "800", color: "#0284c7" },
  dates: { fontSize: 11.5, fontWeight: "700", color: "#0f172a", marginTop: 2 },
  reason: { fontSize: 11, color: "#64748b", marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  approveBtn: { backgroundColor: "#16a34a" },
  rejectBtn: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca" },
  btnText: { fontSize: 12, fontWeight: "800", color: "#ffffff" },
});

