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

export default function MobilePackageMembersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const members = [
    {
      id: "1",
      name: "M. Rajeshwar Rao",
      phone: "+91 9848011223",
      branch: "KPHB Branch",
      plan: "Annual Family Chronic Care Plan",
      validity: "Valid till Oct 2027",
      visits: "9 of 12 visits left",
      fee: "₹24,000 Paid",
      status: "Active",
    },
    {
      id: "2",
      name: "S. Swathi",
      phone: "+91 9700334455",
      branch: "Chandanagar Branch",
      plan: "6-Month Skin & Allergy Remedy Plan",
      validity: "Valid till Apr 2027",
      visits: "4 of 6 visits left",
      fee: "₹10,000 (₹4.5k Due)",
      status: "Active",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Package Members</Text>
          <Text style={styles.headerSub}>Chronic Treatment Subscriptions</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          placeholder="Search member or package..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {members.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.phoneText}>📞 {m.phone} • {m.branch}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{m.status}</Text>
              </View>
            </View>

            <View style={styles.planBox}>
              <Text style={styles.planTitle}>{m.plan}</Text>
              <Text style={styles.validity}>{m.validity}</Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.visits}>{m.visits}</Text>
              <Text style={styles.fee}>{m.fee}</Text>
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
  badge: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#16a34a" },
  planBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  planTitle: { fontSize: 12.5, fontWeight: "800", color: "#0284c7" },
  validity: { fontSize: 11, color: "#64748b", marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  visits: { fontSize: 11.5, fontWeight: "800", color: "#0f172a" },
  fee: { fontSize: 12, fontWeight: "800", color: "#16a34a" },
});

