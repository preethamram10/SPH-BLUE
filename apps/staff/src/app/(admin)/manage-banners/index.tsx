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

export default function MobileManageBannersScreen() {
  const router = useRouter();

  const [banners, setBanners] = useState([
    { id: "1", title: "Winter Allergy & Asthma Immunity Camp", audience: "Reception & App Home", status: "Active" },
    { id: "2", title: "Family Chronic Wellness Subscription Plan", audience: "Patient Portal", status: "Active" },
    { id: "3", title: "Special Sunday Pediatric Homeopathy Clinic", audience: "KPHB & Chandanagar", status: "Inactive" },
  ]);

  const toggle = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: b.status === "Active" ? "Inactive" : "Active" } : b))
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Banners</Text>
          <Text style={styles.headerSub}>Promotional App Carousels</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {banners.map((b) => (
          <View key={b.id} style={styles.bannerCard}>
            <View style={styles.bannerVisual}>
              <Ionicons name="image" size={24} color="#0284c7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.audience}>{b.audience}</Text>
              </View>
            </View>

            <View style={styles.bannerFooter}>
              <View style={[styles.badge, b.status === "Active" ? styles.badgeGreen : styles.badgeMuted]}>
                <Text style={[styles.badgeText, b.status === "Active" ? { color: "#16a34a" } : { color: "#64748b" }]}>
                  {b.status}
                </Text>
              </View>

              <TouchableOpacity style={styles.toggleBtn} onPress={() => toggle(b.id)}>
                <Text style={styles.toggleBtnText}>{b.status === "Active" ? "Deactivate" : "Activate"}</Text>
              </TouchableOpacity>
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
  bannerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  bannerVisual: { flexDirection: "row", alignItems: "center", gap: 10 },
  bannerTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  audience: { fontSize: 11, color: "#64748b", marginTop: 2 },
  bannerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeMuted: { backgroundColor: "#f1f5f9" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#cbd5e1" },
  toggleBtnText: { fontSize: 11, fontWeight: "700", color: "#0f172a" },
});

