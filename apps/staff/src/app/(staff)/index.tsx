import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { clearAllAuthData, getAuthToken } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";

const COLORS = {
  blue: "#0284c7",
  blueLight: "#e0f2fe",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#d97706",
  amberLight: "#fef3c7",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate700: "#334155",
  slate800: "#1e293b",
  white: "#ffffff",
  errorRed: "#ef4444",
};

export default function MobileStaffDashboard() {
  const router = useRouter();

  const [staffName, setStaffName] = useState("Staff Member");
  const [branchName, setBranchName] = useState("KPHB Branch");
  const [currentTime, setCurrentTime] = useState("");
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState<string | null>(null);
  const [punchOutTime, setPunchOutTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePunchToggle = () => {
    const now = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (!isPunchedIn) {
      setIsPunchedIn(true);
      setPunchInTime(now);
      Alert.alert("Clocked In", `Punched in successfully at ${now}. Have a productive day!`);
    } else {
      setIsPunchedIn(false);
      setPunchOutTime(now);
      Alert.alert("Clocked Out", `Punched out successfully at ${now}. Work logged for today.`);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of Staff Portal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await clearAllAuthData();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.headerTitle}>{staffName}</Text>
            <View style={styles.staffBadge}>
              <Text style={styles.staffBadgeText}>STAFF</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>{branchName} • Shift: 09:00 AM - 08:30 PM</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.errorRed} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Live Attendance Clock Card */}
        <View style={styles.clockCard}>
          <Text style={styles.clockSub}>LIVE ATTENDANCE CLOCK</Text>
          <Text style={styles.clockDisplay}>{currentTime || "--:--:--"}</Text>

          <View style={styles.punchDetailsRow}>
            <View style={styles.punchDetailCol}>
              <Text style={styles.punchDetailLabel}>Punch-In Time</Text>
              <Text style={styles.punchDetailVal}>{punchInTime || "Not Punched"}</Text>
            </View>
            <View style={styles.punchDetailDivider} />
            <View style={styles.punchDetailCol}>
              <Text style={styles.punchDetailLabel}>Punch-Out Time</Text>
              <Text style={styles.punchDetailVal}>{punchOutTime || (isPunchedIn ? "In Clinic" : "—")}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.punchActionBtn, isPunchedIn ? styles.punchActionOut : styles.punchActionIn]}
            onPress={handlePunchToggle}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPunchedIn ? "stop-circle-outline" : "finger-print-outline"}
              size={22}
              color={COLORS.white}
            />
            <Text style={styles.punchActionText}>
              {isPunchedIn ? "PUNCH OUT FOR TODAY" : "PUNCH IN ATTENDANCE"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shift Compliance & Schedule Information */}
        <Text style={styles.sectionTitle}>MY SHIFT &amp; DUTY DETAILS</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={COLORS.blue} />
            <Text style={styles.infoLabel}>Shift Timings:</Text>
            <Text style={styles.infoValue}>09:00 AM - 08:30 PM</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="hourglass-outline" size={18} color={COLORS.amber} />
            <Text style={styles.infoLabel}>Grace Period:</Text>
            <Text style={styles.infoValue}>15 Minutes</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={18} color={COLORS.green} />
            <Text style={styles.infoLabel}>Assigned Branch:</Text>
            <Text style={styles.infoValue}>{branchName}</Text>
          </View>
        </View>

        {/* Quick Operations */}
        <Text style={styles.sectionTitle}>DAILY DUTIES &amp; OPERATIONS</Text>
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert("Daily Work", "Daily work submission logged.")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: "#f0f9ff" }]}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Daily Work Report</Text>
              <Text style={styles.menuDesc}>Submit daily patient coordination &amp; clinic tasks</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.slate400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert("Leave Request", "To apply for leave, please contact your Branch HR.")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Leave Request</Text>
              <Text style={styles.menuDesc}>View leave quota and apply for absence</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.slate400} />
          </TouchableOpacity>
        </View>

        {/* Direct Logout */}
        <TouchableOpacity style={styles.fullLogoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
          <Text style={styles.fullLogoutText}>Log Out from Staff Portal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  staffBadge: { backgroundColor: "#e0f2fe", paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 },
  staffBadgeText: { fontSize: 9, fontWeight: "900", color: "#0284c7" },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Live Clock Card
  clockCard: {
    backgroundColor: "#0284c7",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  clockSub: { fontSize: 10, fontWeight: "800", color: "#bae6fd", letterSpacing: 0.8 },
  clockDisplay: { fontSize: 32, fontWeight: "900", color: "#ffffff", marginVertical: 8 },
  punchDetailsRow: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 10,
    marginVertical: 12,
  },
  punchDetailCol: { flex: 1, alignItems: "center" },
  punchDetailDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  punchDetailLabel: { fontSize: 10, fontWeight: "700", color: "#bae6fd" },
  punchDetailVal: { fontSize: 13, fontWeight: "800", color: "#ffffff", marginTop: 2 },

  punchActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
  },
  punchActionIn: { backgroundColor: "#16a34a" },
  punchActionOut: { backgroundColor: "#dc2626" },
  punchActionText: { fontSize: 13, fontWeight: "800", color: "#ffffff", letterSpacing: 0.5 },

  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#64748b", letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },

  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  infoValue: { fontSize: 12, fontWeight: "700", color: "#0f172a", marginLeft: "auto" },

  menu: { gap: 10, marginBottom: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 12,
  },
  menuIconCircle: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  menuDesc: { fontSize: 11, color: "#64748b", marginTop: 1 },

  fullLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
  },
  fullLogoutText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
});

