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

export default function MobileGlobalPatientsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const patients = [
    { mrn: "SPH-00214", name: "S. Swathi Rao", phone: "+91 9848011111", age: "34 / F", branch: "KPHB Branch", doctor: "Dr. Prashanth", visits: 12 },
    { mrn: "SPH-00215", name: "M. Rajesh Kumar", phone: "+91 9849222222", age: "45 / M", branch: "Chandanagar", doctor: "Dr. Padma priya", visits: 8 },
    { mrn: "SPH-00216", name: "B. Venkatesh", phone: "+91 9700333333", age: "29 / M", branch: "Nallagandla", doctor: "Dr. Jobeadh", visits: 4 },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Global Patients</Text>
          <Text style={styles.headerSub}>Master Directory Across All Branches</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          placeholder="Search patient, MRN or mobile..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {patients.map((p) => (
          <View key={p.mrn} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.mrnTag}>{p.mrn}</Text>
                  <Text style={styles.name}>{p.name}</Text>
                </View>
                <Text style={styles.phoneText}>📞 {p.phone}</Text>
              </View>
              <Text style={styles.visitsBadge}>{p.visits} visits</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoText}>{p.age} • {p.branch}</Text>
              <Text style={styles.docText}>Dr: {p.doctor}</Text>
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
  content: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  mrnTag: { fontSize: 10, fontWeight: "800", color: "#0284c7", backgroundColor: "#e0f2fe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  name: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  phoneText: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 4 },
  visitsBadge: { fontSize: 11, fontWeight: "800", color: "#0284c7" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  docText: { fontSize: 11, color: "#0f172a", fontWeight: "700" },
});

