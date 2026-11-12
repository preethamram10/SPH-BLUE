import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../../services/auth";

const COLORS = {
  blue: "#268ec8",
  themeBlue: "#0284c7",
  themeBlueLight: "#e0f2fe",
  purple: "#8b5cf6",
  purpleLight: "#f3e8ff",
  green: "#16a34a",
  greenLight: "#dcfce7",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
};

export default function AdminEmployeeManagementScreen() {
  const router = useRouter();
  const [counts, setCounts] = useState({
    doctors: 0,
    telecallers: 0,
    staff: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await apiFetch<any>("/admin/employees");
      const list = res?.employees || [];
      const docCount = list.filter((e: any) => e.category === "DOCTOR").length;
      const tcCount = list.filter((e: any) => e.category === "TELECALLER").length;
      const stCount = list.filter(
        (e: any) => e.category === "STAFF" || e.category === "RECEPTION"
      ).length;

      setCounts({
        doctors: docCount,
        telecallers: tcCount,
        staff: stCount,
      });
    } catch (err) {
      console.warn("Failed to load live employee counts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCounts();
  };

  const sections = [
    {
      id: "DOCTORS",
      title: "Doctors",
      icon: "medkit",
      color: COLORS.themeBlue,
      bgColor: COLORS.themeBlueLight,
      count: counts.doctors,
      desc: "All branches: Consulting doctors, qualifications & schedules",
      route: "/(admin)/employee-management/doctors",
    },
    {
      id: "TELECALLERS",
      title: "Telecallers",
      icon: "headset",
      color: COLORS.purple,
      bgColor: COLORS.purpleLight,
      count: counts.telecallers,
      desc: "Lead calling agents, inbound inquiry team & assigned queues",
      route: "/(admin)/employee-management/telecallers",
    },
    {
      id: "STAFF",
      title: "Staff & Helpers",
      icon: "people",
      color: COLORS.green,
      bgColor: COLORS.greenLight,
      count: counts.staff,
      desc: "Clinic assistants, operational team & maintenance crew",
      route: "/(admin)/employee-management/staff",
    },
  ];

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
            <Text style={styles.headerTitle}>Employee Management</Text>
            <Text style={styles.headerSub}>Admin & HR Personnel Hub</Text>
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
            <Ionicons name="people-circle" size={28} color={COLORS.themeBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Clinic Personnel Management</Text>
            <Text style={styles.bannerDesc}>
              Select department to register, edit and manage live clinic personnel
            </Text>
          </View>
        </View>

        {/* 3 Department Categories */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>DEPARTMENTS</Text>
          {loading && <ActivityIndicator size="small" color={COLORS.themeBlue} />}
        </View>

        <View style={styles.cardsContainer}>
          {sections.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              style={styles.card}
              onPress={() => router.push(sec.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconBox, { backgroundColor: sec.bgColor }]}>
                <Ionicons name={sec.icon as any} size={24} color={sec.color} />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>{sec.title}</Text>
                  <View style={[styles.pill, { backgroundColor: sec.bgColor }]}>
                    <Text style={[styles.pillText, { color: sec.color }]}>
                      {loading ? "..." : `${sec.count} Registered`}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardDesc}>{sec.desc}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Snapshot */}
        <Text style={[styles.sectionHeader, { marginTop: 22 }]}>LIVE ORGANIZATION OVERVIEW</Text>
        <View style={styles.overviewGrid}>
          <TouchableOpacity
            style={styles.overviewBox}
            onPress={() => router.push("/(admin)/employee-management/doctors" as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.overviewNum, { color: COLORS.themeBlue }]}>
              {loading ? "-" : counts.doctors}
            </Text>
            <Text style={styles.overviewLabel}>Doctors</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.overviewBox}
            onPress={() => router.push("/(admin)/employee-management/telecallers" as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.overviewNum, { color: COLORS.purple }]}>
              {loading ? "-" : counts.telecallers}
            </Text>
            <Text style={styles.overviewLabel}>Telecallers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.overviewBox}
            onPress={() => router.push("/(admin)/employee-management/staff" as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.overviewNum, { color: COLORS.green }]}>
              {loading ? "-" : counts.staff}
            </Text>
            <Text style={styles.overviewLabel}>Staff</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  badgeAdmin: {
    backgroundColor: COLORS.themeBlueLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  badgeAdminText: {
    color: COLORS.themeBlue,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
    gap: 12,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.themeBlueLight,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  bannerDesc: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.8,
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  overviewGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  overviewBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  overviewNum: {
    fontSize: 20,
    fontWeight: "800",
  },
  overviewLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
});
