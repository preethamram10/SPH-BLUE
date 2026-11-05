import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch } from "../../../services/auth";
import { DoctorDrawerSidebar } from "../../../components/doctor/DoctorDrawerSidebar";
import { DoctorHeader } from "../../../components/doctor/DoctorHeader";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";

const COLORS = {
  primary: "#0284c7",
  card: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  success: "#16a34a",
  warning: "#d97706",
};

export default function DoctorPatientListScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<any>("/doctor/patients");
      if (data.success && Array.isArray(data.patients)) {
        setPatients(data.patients);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const onPullRefresh = async () => {
    setIsPullRefreshing(true);
    await fetchPatients();
    setIsPullRefreshing(false);
  };

  const handleWhatsApp = (phone?: string, patientName?: string) => {
    const clean = (phone || "").replace(/\D/g, "").slice(-10);
    if (!clean) {
      Alert.alert("No Phone", "This patient has no valid phone number.");
      return;
    }
    const msg = `Hello ${patientName || "Patient"}, this is regarding your homeopathic consultation follow-up with Dr. Prashanth K Vaidya at Spiritual Homeopathy.`;
    Linking.openURL(`https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`);
  };

  const handleCall = (phone?: string) => {
    const clean = (phone || "").replace(/\D/g, "").slice(-10);
    if (!clean) {
      Alert.alert("No Phone", "This patient has no valid phone number.");
      return;
    }
    Linking.openURL(`tel:${clean}`);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(doctor)");
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [router]);

  const filteredPatients = patients.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = (p.name || "").toLowerCase().includes(q);
    const phoneMatch = (p.phone || "").includes(q);
    const idMatch = (p.registrationId || "").toLowerCase().includes(q);
    const symptomsMatch = (p.primarySymptoms || "").toLowerCase().includes(q);
    return nameMatch || phoneMatch || idMatch || symptomsMatch;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Header with Back Arrow to Previous Screen in Stack */}
      <DoctorHeader
        title="All Patients"
        onBack={handleBack}
      />

      <View style={styles.container}>
        {/* Search Header Bar */}
        <View style={styles.searchHeader}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name, phone, or ID..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchTerm("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={17} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Metrics Banner */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryLeft}>
              <Ionicons name="people" size={14} color="#0284c7" />
              <Text style={styles.summaryText}>
                Showing <Text style={{ fontWeight: "700", color: "#0f172a" }}>{filteredPatients.length}</Text> of {patients.length} patients
              </Text>
            </View>
            <View style={styles.consultedBadge}>
              <Text style={styles.consultedBadgeText}>Consulted Records</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onPullRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          {isLoading && patients.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading patient records...</Text>
            </View>
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-remove-outline" size={44} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Patients Found</Text>
              <Text style={styles.emptySubtext}>
                {searchTerm
                  ? `No patient records match "${searchTerm}".`
                  : "No consulted patients registered under your profile yet."}
              </Text>
            </View>
          ) : (
            filteredPatients.map((p, idx) => (
              <View key={p.id || idx} style={styles.patientCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>
                      {(p.name || "P").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.patientName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <View style={styles.visitsBadge}>
                        <Ionicons name="repeat" size={11} color="#0284c7" />
                        <Text style={styles.visitsText}>
                          {p.totalVisits || 1} {p.totalVisits === 1 ? "Visit" : "Visits"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.metaText}>
                      ID: {p.registrationId || "SPH-GEN"} • Phone: {p.phone || "N/A"}
                    </Text>
                  </View>
                </View>

                {/* Symptoms / Chief Complaints */}
                {p.primarySymptoms ? (
                  <View style={styles.symptomsBox}>
                    <Ionicons name="pulse" size={12} color="#0284c7" />
                    <Text style={styles.symptomsText} numberOfLines={2}>
                      Chief Complaints: {p.primarySymptoms}
                    </Text>
                  </View>
                ) : null}

                {/* Last Visit Date */}
                <View style={styles.lastVisitRow}>
                  <Ionicons name="calendar-outline" size={12} color="#64748b" />
                  <Text style={styles.lastVisitText}>
                    Last Visit: {p.lastVisitDate || "Recent"}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.whatsappBtn}
                    onPress={() => handleWhatsApp(p.phone, p.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#16a34a" />
                    <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(p.phone)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={14} color="#0284c7" />
                    <Text style={styles.callBtnText}>Direct Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Persistent Bottom Nav */}
      <DoctorBottomNav activeTab="patient-list" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchHeader: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 2,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryText: {
    fontSize: 11,
    color: "#64748b",
  },
  consultedBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  consultedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284c7",
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748b",
  },
  emptyContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
  },
  patientCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284c7",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  visitsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  visitsText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0284c7",
  },
  metaText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  symptomsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  symptomsText: {
    fontSize: 11,
    color: "#334155",
    flex: 1,
  },
  lastVisitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  lastVisitText: {
    fontSize: 11,
    color: "#64748b",
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingVertical: 7,
    borderRadius: 8,
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingVertical: 7,
    borderRadius: 8,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284c7",
  },
});
