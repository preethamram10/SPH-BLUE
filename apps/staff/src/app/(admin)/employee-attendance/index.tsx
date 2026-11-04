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

export default function MobileEmployeeAttendanceScreen() {
  const router = useRouter();

  const logs = [
    { name: "Dr. Prashanth k vaidya", role: "Doctor", branch: "KPHB Branch", in: "12:15 PM", out: "07:05 PM", time: "6h 50m", status: "Present" },
    { name: "Anil Kumar M", role: "Staff", branch: "KPHB Branch", in: "09:58 AM", out: "08:32 PM", time: "10h 34m", status: "Present" },
    { name: "Ashwini Begari", role: "Staff", branch: "Chandanagar Branch", in: "10:14 AM", out: "06:30 PM", time: "8h 16m", status: "Present" },
    { name: "Preetham Ram", role: "Staff", branch: "KPHB Branch", in: "—", out: "—", time: "0h", status: "On Leave" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Staff Attendance</Text>
          <Text style={styles.headerSub}>Clock-In &amp; Shift Compliance</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>16</Text>
            <Text style={styles.statLabel}>Present Today</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: "#0284c7" }]}>2</Text>
            <Text style={styles.statLabel}>On Leave</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>TODAY&apos;S STAFF LOGS</Text>
        {logs.map((item, i) => (
          <View key={i} style={styles.logCard}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.role}>{item.role} • {item.branch}</Text>
              </View>
              <View style={[styles.badge, item.status === "Present" ? styles.badgeGreen : styles.badgeBlue]}>
                <Text style={[styles.badgeText, item.status === "Present" ? { color: "#16a34a" } : { color: "#0284c7" }]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.timeBox}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>In Time</Text>
                <Text style={styles.timeVal}>{item.in}</Text>
              </View>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Out Time</Text>
                <Text style={styles.timeVal}>{item.out}</Text>
              </View>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Duration</Text>
                <Text style={[styles.timeVal, { color: "#0284c7" }]}>{item.time}</Text>
              </View>
            </View>
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
  statGrid: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    alignItems: "center",
  },
  statNum: { fontSize: 20, fontWeight: "900", color: "#16a34a" },
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  sectionHeader: { fontSize: 10.5, fontWeight: "800", color: "#8da2b5", letterSpacing: 0.6, marginTop: 4 },
  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  role: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeBlue: { backgroundColor: "#e0f2fe" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  timeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  timeItem: { alignItems: "center" },
  timeLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  timeVal: { fontSize: 12, fontWeight: "800", color: "#0f172a", marginTop: 2 },
});

