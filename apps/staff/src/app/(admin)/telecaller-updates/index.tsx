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

export default function MobileTelecallerUpdatesScreen() {
  const router = useRouter();

  const updates = [
    {
      agent: "Salman Khan",
      patient: "K. Ramesh Kumar",
      phone: "+91 9848012345",
      time: "Today, 11:24 AM (3m 45s)",
      disposition: "Booked Consultation",
      notes: "Agreed to visit Dr. Prashanth on Friday 05:00 PM for chronic allergy.",
    },
    {
      agent: "K. Bhavani",
      patient: "G. Srilatha",
      phone: "+91 9700112233",
      time: "Today, 10:50 AM (2m 10s)",
      disposition: "Callback Requested",
      notes: "Traveling currently. Call back tomorrow after 03:00 PM.",
    },
    {
      agent: "K. Bhavani",
      patient: "P. Rajesh",
      phone: "+91 9876543210",
      time: "Today, 09:40 AM (1m 30s)",
      disposition: "Package Renewed",
      notes: "Renewed 6-month skin plan online payment link sent.",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Telecaller Updates</Text>
          <Text style={styles.headerSub}>Live Outbound Call Stream</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {updates.map((u, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.patient}>{u.patient}</Text>
                <Text style={styles.callerText}>Caller: {u.agent} • {u.time}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{u.disposition}</Text>
              </View>
            </View>

            <Text style={styles.notesText}>{u.notes}</Text>
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
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  patient: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  callerText: { fontSize: 11, color: "#64748b", marginTop: 2 },
  badge: { backgroundColor: "#e0f2fe", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#0284c7" },
  notesText: { fontSize: 11.5, color: "#475569", lineHeight: 16, marginTop: 4 },
});

