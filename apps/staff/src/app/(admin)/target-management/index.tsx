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

export default function MobileTargetManagementScreen() {
  const router = useRouter();

  const targets = [
    {
      title: "Clinic Revenue Target",
      assignee: "KPHB Main Branch",
      goal: "₹5,00,000",
      achieved: "₹4,12,000",
      pct: "82.4%",
      status: "On Track",
    },
    {
      title: "New Chronic Patients",
      assignee: "Chandanagar Branch",
      goal: "120 Patients",
      achieved: "98 Patients",
      pct: "81.6%",
      status: "On Track",
    },
    {
      title: "Lead Calling Quota",
      assignee: "Salman (Telecalling)",
      goal: "1,500 Calls",
      achieved: "1,340 Calls",
      pct: "89.3%",
      status: "Top Performer",
    },
    {
      title: "Annual Package Signups",
      assignee: "All Branches",
      goal: "50 Packages",
      achieved: "32 Packages",
      pct: "64.0%",
      status: "Needs Attention",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Target Management</Text>
          <Text style={styles.headerSub}>Monthly Goals &amp; Branch KPIs</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Summary Card */}
        <View style={styles.topCard}>
          <Text style={styles.topLabel}>MONTHLY TOTAL REVENUE GOAL</Text>
          <Text style={styles.topVal}>₹18,50,000</Text>
          <Text style={styles.topSub}>81.4% Overall Achievement Achieved</Text>
        </View>

        <Text style={styles.sectionHeader}>ASSIGNED TARGETS</Text>
        {targets.map((t, idx) => (
          <View key={idx} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.cardTitle}>{t.title}</Text>
                <Text style={styles.assigneeText}>🎯 {t.assignee}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  t.status === "Needs Attention" ? styles.badgeAmber : styles.badgeGreen,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    t.status === "Needs Attention" ? { color: "#d97706" } : { color: "#16a34a" },
                  ]}
                >
                  {t.status}
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View>
                <Text style={styles.metricLabel}>Goal</Text>
                <Text style={styles.metricVal}>{t.goal}</Text>
              </View>
              <View>
                <Text style={styles.metricLabel}>Achieved</Text>
                <Text style={[styles.metricVal, { color: "#16a34a" }]}>{t.achieved}</Text>
              </View>
              <View>
                <Text style={styles.metricLabel}>Progress</Text>
                <Text style={[styles.metricVal, { color: "#0284c7" }]}>{t.pct}</Text>
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
  topCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },
  topLabel: { fontSize: 10, fontWeight: "800", color: "#94a3b8", letterSpacing: 0.6 },
  topVal: { fontSize: 24, fontWeight: "900", color: "#0f172a", marginTop: 4 },
  topSub: { fontSize: 11.5, fontWeight: "700", color: "#16a34a", marginTop: 4 },
  sectionHeader: { fontSize: 10.5, fontWeight: "800", color: "#8da2b5", letterSpacing: 0.6, marginTop: 4 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  assigneeText: { fontSize: 11, color: "#0284c7", fontWeight: "700", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeAmber: { backgroundColor: "#fef3c7" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  metricLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  metricVal: { fontSize: 12.5, fontWeight: "800", color: "#0f172a", marginTop: 2 },
});

