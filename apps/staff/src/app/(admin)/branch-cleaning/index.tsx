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

export default function MobileBranchCleaningScreen() {
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState("KPHB Branch");

  const checklist = [
    { area: "Reception & Waiting Lounge", status: "Cleaned & Inspected", time: "08:30 AM", staff: "Ramesh", done: true },
    { area: "Doctor Consultation Rooms", status: "Cleaned & Sanitized", time: "08:50 AM", staff: "Ramesh", done: true },
    { area: "Pharmacy & Medicine Counter", status: "Cleaned & Inspected", time: "09:10 AM", staff: "Ramesh", done: true },
    { area: "Restrooms & Handwash", status: "Cleaned", time: "09:30 AM", staff: "Laxmi", done: true },
    { area: "Waste Disposal Clearance", status: "Pending Inspection", time: "01:00 PM", staff: "Laxmi", done: false },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Cleaning &amp; Sanitation</Text>
          <Text style={styles.headerSub}>Daily Hygiene Checklist</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.branchPill}>
          <Ionicons name="business" size={16} color="#0284c7" />
          <Text style={styles.branchPillText}>{selectedBranch}</Text>
        </View>

        <Text style={styles.sectionHeader}>HYGIENE AUDIT TASKS</Text>
        {checklist.map((c, i) => (
          <View key={i} style={styles.taskCard}>
            <View style={styles.taskLeft}>
              <View style={[styles.iconCircle, c.done ? styles.iconGreen : styles.iconAmber]}>
                <Ionicons
                  name={c.done ? "checkmark-circle" : "time-outline"}
                  size={18}
                  color={c.done ? "#16a34a" : "#d97706"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.areaTitle}>{c.area}</Text>
                <Text style={styles.staffTime}>
                  Staff: {c.staff} • {c.time}
                </Text>
              </View>
            </View>
            <View style={[styles.badge, c.done ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={[styles.badgeText, c.done ? { color: "#16a34a" } : { color: "#d97706" }]}>
                {c.status}
              </Text>
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
  content: { padding: 16, gap: 10 },
  branchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  branchPillText: { fontSize: 13, fontWeight: "800", color: "#0284c7" },
  sectionHeader: { fontSize: 10.5, fontWeight: "800", color: "#8da2b5", letterSpacing: 0.6, marginTop: 4 },
  taskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 8,
  },
  taskLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  iconGreen: { backgroundColor: "#dcfce7" },
  iconAmber: { backgroundColor: "#fef3c7" },
  areaTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  staffTime: { fontSize: 11, color: "#64748b", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeAmber: { backgroundColor: "#fef3c7" },
  badgeText: { fontSize: 10, fontWeight: "800" },
});

