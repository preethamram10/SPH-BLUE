import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { removeAuthToken } from "../../services/auth";

export default function DoctorDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await removeAuthToken();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>DOCTOR PORTAL</Text>
        <Text style={styles.title}>Dr. Consultations</Text>
        <Text style={styles.subtitle}>Spiritual Homeo Clinic</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>8</Text>
          <Text style={styles.cardLabel}>Today's Queue</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>14</Text>
          <Text style={styles.cardLabel}>Completed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Doctor Clinical Tools</Text>
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuTitle}>📋 Start Consultation</Text>
          <Text style={styles.menuDesc}>Call next patient from waiting token</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuTitle}>💊 Write Prescription</Text>
          <Text style={styles.menuDesc}>Homeopathic remedies and dosages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuTitle}>📁 Patient Case Histories</Text>
          <Text style={styles.menuDesc}>View chronic symptoms and follow-ups</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20 },
  header: { marginBottom: 20 },
  badge: { color: "#0284C7", fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: "700", color: "#0F172A", marginTop: 4 },
  subtitle: { fontSize: 15, color: "#64748B" },
  grid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  card: { flex: 1, backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, elevation: 2 },
  cardNumber: { fontSize: 24, fontWeight: "700", color: "#0284C7" },
  cardLabel: { fontSize: 13, color: "#64748B", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1E293B", marginBottom: 12 },
  menu: { gap: 10, marginBottom: 30 },
  menuItem: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, elevation: 1 },
  menuTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  menuDesc: { fontSize: 13, color: "#64748B", marginTop: 2 },
  logoutBtn: { backgroundColor: "#EF4444", padding: 14, borderRadius: 10, alignItems: "center" },
  logoutText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
});

