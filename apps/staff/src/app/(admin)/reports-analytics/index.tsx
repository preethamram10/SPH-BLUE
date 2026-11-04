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

export default function MobileReportsAnalyticsScreen() {
  const router = useRouter();

  const kpis = [
    { title: "Total Clinic Visits", val: "1,248", change: "+8.4%" },
    { title: "New Registrations", val: "312", change: "+12.1%" },
    { title: "Patient Retention", val: "81.6%", change: "+3.2%" },
    { title: "Remedy Dispenses", val: "2,840", change: "+9.0%" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Reports &amp; Analytics</Text>
          <Text style={styles.headerSub}>Executive Hospital Metrics</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {kpis.map((k, i) => (
            <View key={i} style={styles.kpiBox}>
              <Text style={styles.kpiTitle}>{k.title}</Text>
              <Text style={styles.kpiVal}>{k.val}</Text>
              <Text style={styles.kpiChange}>{k.change} vs last month</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>CASE DISTRIBUTION</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Chronic Cases (Allergy, Thyroid)</Text>
            <Text style={styles.rowVal}>74%</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: "74%" }]} />
          </View>

          <View style={[styles.row, { marginTop: 12 }]}>
            <Text style={styles.rowLabel}>Acute Illness (Fever, Migraine)</Text>
            <Text style={[styles.rowVal, { color: "#16a34a" }]}>26%</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: "26%", backgroundColor: "#16a34a" }]} />
          </View>
        </View>
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
  content: { padding: 16, gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiBox: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  kpiTitle: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  kpiVal: { fontSize: 18, fontWeight: "900", color: "#0f172a", marginTop: 4 },
  kpiChange: { fontSize: 10, fontWeight: "700", color: "#16a34a", marginTop: 2 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },
  cardHeader: { fontSize: 10.5, fontWeight: "800", color: "#8da2b5", letterSpacing: 0.6, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  rowLabel: { fontSize: 11.5, color: "#475569", fontWeight: "600" },
  rowVal: { fontSize: 11.5, fontWeight: "800", color: "#0284c7" },
  bar: { height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: "#0284c7", borderRadius: 3 },
});

