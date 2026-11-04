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

export default function MobileAllFollowUpsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const followUps = [
    {
      id: "1",
      patient: "K. Ramesh Kumar",
      phone: "+91 9848012345",
      doctor: "Dr. Prashanth k vaidya",
      branch: "KPHB Branch",
      due: "Today, 04:30 PM",
      status: "Scheduled",
      notes: "Post 15-day allergy follow up",
    },
    {
      id: "2",
      patient: "M. Sunitha Devi",
      phone: "+91 9700123456",
      doctor: "Dr. Padma priya",
      branch: "Chandanagar Branch",
      due: "Tomorrow, 11:00 AM",
      status: "Confirmed",
      notes: "Migraine medication course refill",
    },
    {
      id: "3",
      patient: "B. Venkatesh",
      phone: "+91 9988776655",
      doctor: "Dr. Jobeadh parveej",
      branch: "Nallagandla Branch",
      due: "08 Nov, 05:00 PM",
      status: "Pending Call",
      notes: "Routine chronic care review",
    },
  ];

  const filtered = followUps.filter(
    (f) =>
      f.patient.toLowerCase().includes(search.toLowerCase()) ||
      f.phone.includes(search) ||
      f.doctor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>All Follow-Ups</Text>
          <Text style={styles.headerSub}>Centralized Hospital Call Queue</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          placeholder="Search patient or doctor..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.patientName}>{item.patient}</Text>
                <Text style={styles.phoneText}>📞 {item.phone}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  item.status === "Confirmed"
                    ? styles.badgeGreen
                    : item.status === "Scheduled"
                    ? styles.badgeBlue
                    : styles.badgeAmber,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.status === "Confirmed"
                      ? { color: "#16a34a" }
                      : item.status === "Scheduled"
                      ? { color: "#0284c7" }
                      : { color: "#d97706" },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.label}>Doctor:</Text>
              <Text style={styles.value}>{item.doctor}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Branch:</Text>
              <Text style={styles.value}>{item.branch}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Scheduled Due:</Text>
              <Text style={[styles.value, { color: "#0284c7" }]}>{item.due}</Text>
            </View>

            <Text style={styles.notesText}>Notes: {item.notes}</Text>
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: { flex: 1, fontSize: 13, color: "#0f172a", fontWeight: "600" },
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
  patientName: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  phoneText: { fontSize: 11.5, color: "#0284c7", fontWeight: "700", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeBlue: { backgroundColor: "#e0f2fe" },
  badgeAmber: { backgroundColor: "#fef3c7" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 11.5, color: "#64748b", fontWeight: "600" },
  value: { fontSize: 11.5, color: "#0f172a", fontWeight: "700" },
  notesText: { fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 4 },
});

