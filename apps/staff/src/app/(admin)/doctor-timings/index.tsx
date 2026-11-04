import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";

const COLORS = {
  themeBlue: "#0284c7",
  themeBlueLight: "#e0f2fe",
  green: "#16a34a",
  greenLight: "#dcfce7",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
  errorRed: "#ef4444",
  errorLight: "#fee2e2",
};

interface TimeSlotRange {
  id: string;
  displayText: string;
}

interface BranchSchedule {
  id: string;
  branchName: string;
  days: Record<string, { day: string; isAvailable: boolean; slots: TimeSlotRange[] }>;
}

interface DoctorSchedule {
  id: string;
  doctorId: string;
  doctorName: string;
  phone: string;
  branchSchedules: BranchSchedule[];
}

export default function AdminDoctorTimingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);

  const fetchDoctorTimings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doctor-timings`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.schedules)) {
          setSchedules(data.schedules);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch doctor timings on mobile:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDoctorTimings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctorTimings();
  };

  const getDaysSummary = (days: Record<string, any>): string => {
    const list = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const active = list.filter((d) => days[d]?.isAvailable);
    if (active.length === 0) return "Closed";
    if (active.length === 7) return "Mon - Sun";
    return active.join(", ");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Doctor Timings</Text>
            <Text style={styles.headerSub}>Master Schedules & Branch Hours</Text>
          </View>
        </View>

        <View style={styles.badgeAdmin}>
          <Text style={styles.badgeAdminText}>ADMIN</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.themeBlue]}
            tintColor={COLORS.themeBlue}
          />
        }
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="time" size={28} color={COLORS.themeBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Clinic Timings Live Sync</Text>
            <Text style={styles.bannerDesc}>
              Configured branch slots automatically filter doctor lists on Reception booking.
            </Text>
          </View>
        </View>

        {/* Doctor Schedules List */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={COLORS.themeBlue} />
            <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>
              Loading practitioner schedules...
            </Text>
          </View>
        ) : schedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={42} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Doctor Schedules Configured</Text>
            <Text style={styles.emptySub}>
              Configure practitioner branch timings on the Admin Web Portal to enable live slot booking.
            </Text>
          </View>
        ) : (
          schedules.map((doc) => (
            <View key={doc.id} style={styles.doctorCard}>
              {/* Doctor Card Header */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>{doc.doctorName}</Text>
                  <Text style={styles.doctorPhone}>📞 Phone: {doc.phone || "+91 Not Provided"}</Text>
                </View>
                <View style={styles.docBadge}>
                  <Text style={styles.docBadgeText}>Doctor</Text>
                </View>
              </View>

              <Text style={styles.sectionDividerText}>BRANCH SCHEDULE BREAKDOWN</Text>

              {/* Branch Schedules */}
              {doc.branchSchedules.length === 0 ? (
                <Text style={styles.noBranchText}>No branch timings set yet.</Text>
              ) : (
                doc.branchSchedules.map((bs) => {
                  const summary = getDaysSummary(bs.days);
                  const slots: string[] = [];
                  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => {
                    const ds = bs.days[d];
                    if (ds && ds.isAvailable) {
                      ds.slots?.forEach((s) => {
                        if (!slots.includes(s.displayText)) slots.push(s.displayText);
                      });
                    }
                  });

                  return (
                    <View key={bs.id} style={styles.branchBox}>
                      <View style={styles.branchRow}>
                        <View style={styles.branchNameRow}>
                          <Ionicons name="location-outline" size={16} color={COLORS.themeBlue} />
                          <Text style={styles.branchName}>{bs.branchName}</Text>
                        </View>
                        <View style={styles.daysPill}>
                          <Text style={styles.daysPillText}>{summary}</Text>
                        </View>
                      </View>

                      {/* Slots */}
                      <View style={styles.slotsRow}>
                        {slots.length === 0 ? (
                          <Text style={{ fontSize: 11, color: COLORS.textLight, fontStyle: "italic" }}>
                            No timings set
                          </Text>
                        ) : (
                          slots.map((st, i) => (
                            <View key={i} style={styles.slotPill}>
                              <Text style={styles.slotPillText}>{st}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ))
        )}
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  badgeAdmin: {
    backgroundColor: COLORS.themeBlueLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeAdminText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.themeBlue,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.themeBlueLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  bannerDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  doctorCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  doctorName: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  doctorPhone: {
    fontSize: 11.5,
    color: COLORS.themeBlue,
    fontWeight: "700",
    marginTop: 3,
  },
  docBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.themeBlueLight,
  },
  docBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.themeBlue,
  },
  sectionDividerText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 8,
  },
  noBranchText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  branchBox: {
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 8,
  },
  branchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  branchNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  branchName: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.themeBlue,
  },
  daysPill: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  daysPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: COLORS.green,
  },
  slotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  slotPill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slotPillText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.textDark,
  },
});
