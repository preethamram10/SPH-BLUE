import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { removeAuthToken } from "../../services/auth";

export default function TelecallerDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await removeAuthToken();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>TELECALLER PORTAL</Text>
        <Text style={styles.title}>Leads & Follow-ups</Text>
        <Text style={styles.subtitle}>Spiritual Homeo Clinic</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>32</Text>
          <Text style={styles.cardLabel}>Pending Leads</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>18</Text>
          <Text style={styles.cardLabel}>Calls Today</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Calling Tools</Text>
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuTitle}>📞 Dial Next Lead</Text>
          <Text style={styles.menuDesc}>Website inquiries and ad campaign leads</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuTitle}>📅 Book Phone Appointment</Text>
          <Text style={styles.menuDesc}>Schedule clinic or teleconsultation slot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuTitle}>📝 Log Call Status</Text>
          <Text style={styles.menuDesc}>Record outcomes: Interested, Callback, Not answering</Text>
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
  badge: { color: "#D97706", fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: "700", color: "#0F172A", marginTop: 4 },
  subtitle: { fontSize: 15, color: "#64748B" },
  grid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  card: { flex: 1, backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, elevation: 2 },
  cardNumber: { fontSize: 24, fontWeight: "700", color: "#D97706" },
  cardLabel: { fontSize: 13, color: "#64748B", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1E293B", marginBottom: 12 },
  menu: { gap: 10, marginBottom: 30 },
  menuItem: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, elevation: 1 },
  menuTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  menuDesc: { fontSize: 13, color: "#64748B", marginTop: 2 },
  logoutBtn: { backgroundColor: "#EF4444", padding: 14, borderRadius: 10, alignItems: "center" },
  logoutText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
});

