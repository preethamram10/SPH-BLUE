import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getActiveBranch } from "../../../services/auth";

const COLORS = {
  blue: "#268ec8",
  green: "#a8ce3a",
  white: "#ffffff",
  textDark: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

interface FollowUp {
  id: string;
  patientName: string;
  mrn: string;
  phone: string;
  doctorName: string;
  condition: string;
  dueDate: string;
  status: "DUE_TODAY" | "OVERDUE" | "CALLED";
}

export default function ReceptionFollowUpsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState<any>(null);

  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });
  }, []);

  const [followUps, setFollowUps] = useState<FollowUp[]>([
    {
      id: "1",
      patientName: "Kavitha Reddy",
      mrn: "SPH-2026-0612",
      phone: "+91 98490 11223",
      doctorName: "Dr. Ramesh Gupta",
      condition: "Chronic Migraine & Sleep Pattern",
      dueDate: "Today",
      status: "DUE_TODAY",
    },
    {
      id: "2",
      patientName: "Rajesh Kumar",
      mrn: "SPH-2026-0731",
      phone: "+91 90001 44556",
      doctorName: "Dr. Sneha Reddy",
      condition: "Allergic Rhinitis Follow-up",
      dueDate: "Today",
      status: "DUE_TODAY",
    },
    {
      id: "3",
      patientName: "Sunitha Rao",
      mrn: "SPH-2026-0520",
      phone: "+91 81211 77889",
      doctorName: "Dr. Ramesh Gupta",
      condition: "Thyroid & Weight Management",
      dueDate: "Yesterday",
      status: "OVERDUE",
    },
  ]);

  const handleMarkCalled = (id: string) => {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "CALLED" } : f))
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const filtered = followUps.filter(
    (f) =>
      f.patientName.toLowerCase().includes(search.toLowerCase()) ||
      f.mrn.toLowerCase().includes(search.toLowerCase()) ||
      f.phone.includes(search)
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.blue} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Follow-ups</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activeBranch?.name ? `${activeBranch.name} • Review Schedule` : "Patient Review Schedule"}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, MRN or condition..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.mrnText}>{item.mrn}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.status === "CALLED"
                    ? styles.statusCalled
                    : item.status === "OVERDUE"
                    ? styles.statusOverdue
                    : styles.statusDue,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === "CALLED"
                      ? styles.statusTextCalled
                      : item.status === "OVERDUE"
                      ? styles.statusTextOverdue
                      : styles.statusTextDue,
                  ]}
                >
                  {item.status === "CALLED"
                    ? "CALLED"
                    : item.status === "OVERDUE"
                    ? "OVERDUE"
                    : "DUE TODAY"}
                </Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.conditionText}>📌 {item.condition}</Text>
              <Text style={styles.doctorText}>👨‍⚕️ {item.doctorName}</Text>
            </View>

            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(item.phone)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={14} color={COLORS.blue} />
                <Text style={styles.callButtonText}>Call {item.phone}</Text>
              </TouchableOpacity>

              {item.status !== "CALLED" ? (
                <TouchableOpacity
                  style={styles.markButton}
                  onPress={() => handleMarkCalled(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                  <Text style={styles.markButtonText}>Mark Called</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.doneTag}>
                  <Ionicons name="checkmark-done" size={16} color={COLORS.green} />
                  <Text style={styles.doneTagText}>Confirmed</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f0f6fc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  mrnText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDue: {
    backgroundColor: "#fef3c7",
  },
  statusOverdue: {
    backgroundColor: "#ffe4e6",
  },
  statusCalled: {
    backgroundColor: "#dcfce7",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusTextDue: {
    color: "#b45309",
  },
  statusTextOverdue: {
    color: "#e11d48",
  },
  statusTextCalled: {
    color: "#15803d",
  },
  infoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  conditionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  doctorText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.blue,
  },
  markButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  doneTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doneTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.green,
  },
});

