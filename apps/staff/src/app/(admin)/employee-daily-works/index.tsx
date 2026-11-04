import React from "react";
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

export default function MobileEmployeeDailyWorksScreen() {
  const router = useRouter();

  const works = [
    {
      staff: "Anil Kumar M",
      role: "Reception Desk • KPHB",
      tasks: "Checked in 28 patients, reconciled ₹24,800 day-end cash, filed 8 lab reports",
      calls: 34,
      cases: 6,
      time: "08:15 PM",
      rating: "Excellent",
    },
    {
      staff: "Ashwini Begari",
      role: "Reception Desk • Chandanagar",
      tasks: "Managed consultation queue, dispensed 19 homeopathy remedy kits, confirmed 14 tomorrow visits",
      calls: 22,
      cases: 4,
      time: "06:20 PM",
      rating: "Good",
    },
    {
      staff: "Salman",
      role: "Telecalling Agent • Nallagandla",
      tasks: "Contacted 68 chronic patient leads, converted 9 new consultation bookings",
      calls: 68,
      cases: 9,
      time: "05:45 PM",
      rating: "Top Performer",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Daily Work Logs</Text>
          <Text style={styles.headerSub}>End-of-Day Employee Reports</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {works.map((w, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.staffName}>{w.staff}</Text>
                <Text style={styles.roleText}>{w.role}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{w.rating}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <Text style={styles.statPill}>📞 {w.calls} Calls</Text>
              <Text style={styles.statPill}>🏥 +{w.cases} Patients</Text>
              <Text style={styles.timeText}>Submitted: {w.time}</Text>
            </View>

            <Text style={styles.tasksText}>{w.tasks}</Text>
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  staffName: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  roleText: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  badge: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#16a34a" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  statPill: { fontSize: 11, fontWeight: "700", color: "#0284c7", backgroundColor: "#e0f2fe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  timeText: { fontSize: 10.5, color: "#94a3b8", marginLeft: "auto" },
  tasksText: { fontSize: 11.5, color: "#475569", lineHeight: 17 },
});

