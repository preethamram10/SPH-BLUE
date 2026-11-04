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

export default function MobileTotalRevenueScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState("This Month");

  const branches = [
    { name: "KPHB Main Branch", amount: "₹1,85,400", patients: 142, share: "38.4%" },
    { name: "Chandanagar Branch", amount: "₹1,42,100", patients: 118, share: "29.4%" },
    { name: "Nallagandla Branch", amount: "₹95,000", patients: 86, share: "19.7%" },
    { name: "Dilshuknagar Branch", amount: "₹60,000", patients: 54, share: "12.5%" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Total Revenue</Text>
          <Text style={styles.headerSub}>Clinic Collections &amp; Branch Earnings</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Main Gross Card */}
        <View style={styles.grossCard}>
          <Text style={styles.grossLabel}>GROSS CLINIC REVENUE</Text>
          <Text style={styles.grossValue}>₹4,82,500</Text>
          <View style={styles.growthRow}>
            <Ionicons name="trending-up" size={14} color="#16a34a" />
            <Text style={styles.growthText}>+14.2% higher vs last period</Text>
          </View>
        </View>

        {/* Quick split cards */}
        <View style={styles.row}>
          <View style={[styles.miniCard, { marginRight: 8 }]}>
            <Text style={styles.miniLabel}>Today&apos;s Collection</Text>
            <Text style={styles.miniValue}>₹24,800</Text>
            <Text style={styles.miniSub}>18 transactions</Text>
          </View>
          <View style={[styles.miniCard, { marginLeft: 8 }]}>
            <Text style={styles.miniLabel}>Digital / UPI</Text>
            <Text style={styles.miniValue}>₹3,37,300</Text>
            <Text style={styles.miniSub}>69.9% share</Text>
          </View>
        </View>

        {/* Branch-wise breakdown */}
        <Text style={styles.sectionHeader}>BRANCH-WISE REVENUE BREAKDOWN</Text>
        <View style={styles.branchList}>
          {branches.map((b, idx) => (
            <View key={idx} style={styles.branchCard}>
              <View style={styles.branchCardTop}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="business" size={16} color="#0284c7" />
                  <Text style={styles.branchName}>{b.name}</Text>
                </View>
                <Text style={styles.branchAmount}>{b.amount}</Text>
              </View>

              <View style={styles.branchCardBottom}>
                <Text style={styles.branchFootfall}>{b.patients} patients treated</Text>
                <View style={styles.shareBadge}>
                  <Text style={styles.shareBadgeText}>{b.share}</Text>
                </View>
              </View>
            </View>
          ))}
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
  content: { padding: 16 },
  grossCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
    marginBottom: 14,
  },
  grossLabel: { fontSize: 10, fontWeight: "800", color: "#94a3b8", letterSpacing: 0.6 },
  grossValue: { fontSize: 26, fontWeight: "900", color: "#0f172a", marginTop: 4 },
  growthRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  growthText: { fontSize: 11, fontWeight: "700", color: "#16a34a" },
  row: { flexDirection: "row", marginBottom: 16 },
  miniCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  miniLabel: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  miniValue: { fontSize: 17, fontWeight: "800", color: "#0284c7", marginTop: 3 },
  miniSub: { fontSize: 10, color: "#94a3b8", marginTop: 2 },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#8da2b5",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  branchList: { gap: 10 },
  branchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  branchCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  branchName: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  branchAmount: { fontSize: 14, fontWeight: "800", color: "#16a34a" },
  branchCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  branchFootfall: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  shareBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shareBadgeText: { fontSize: 10, fontWeight: "800", color: "#0284c7" },
});

