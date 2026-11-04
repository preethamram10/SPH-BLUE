import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function MobileTelecallerAccountsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const telecallers = [
    { id: "1", name: "Salman Khan", phone: "+91 7842836959", email: "salman@sph.com", branch: "Nallagandla", target: "60 calls/day", status: "Active" },
    { id: "2", name: "K. Bhavani", phone: "+91 9848554433", email: "bhavani@sph.com", branch: "KPHB", target: "75 calls/day", status: "Active" },
    { id: "3", name: "T. Suresh", phone: "+91 9988442211", email: "suresh@sph.com", branch: "Chandanagar", target: "50 calls/day", status: "On Leave" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Telecaller Accounts</Text>
          <Text style={styles.headerSub}>Calling Team &amp; Quotas</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {telecallers.map((t) => (
          <View key={t.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.phoneText}>📞 {t.phone} • {t.email}</Text>
              </View>
              <View style={[styles.badge, t.status === "Active" ? styles.badgeGreen : styles.badgeMuted]}>
                <Text style={[styles.badgeText, t.status === "Active" ? { color: "#16a34a" } : { color: "#64748b" }]}>
                  {t.status}
                </Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.branchText}>Branch: {t.branch}</Text>
              <Text style={styles.targetText}>🎯 {t.target}</Text>
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
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  phoneText: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeMuted: { backgroundColor: "#f1f5f9" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  branchText: { fontSize: 11.5, color: "#475569", fontWeight: "600" },
  targetText: { fontSize: 11.5, color: "#0284c7", fontWeight: "800" },
});

