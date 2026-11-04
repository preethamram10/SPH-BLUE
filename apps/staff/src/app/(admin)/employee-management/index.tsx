import React, { useState, useEffect } from "react";
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

  const sections = [
    {
      id: "DOCTORS",
      title: "Doctors",
      icon: "medkit",
      color: COLORS.themeBlue,
      bgColor: COLORS.themeBlueLight,
      count: 14,
      desc: "All branches: Consulting doctors, qualifications & schedules",
      route: "/(admin)/employee-management/doctors",
    },
    {
      id: "TELECALLERS",
      title: "Telecallers",
      icon: "headset",
      color: COLORS.purple,
      bgColor: COLORS.purpleLight,
      count: 22,
      desc: "Lead calling agents, inbound inquiry team & assigned queues",
      route: "/(admin)/employee-management/telecallers",
    },
    {
      id: "STAFF",
      title: "Staff & Helpers",
      icon: "people",
      color: COLORS.green,
      bgColor: COLORS.greenLight,
      count: 36,
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
            <Text style={styles.headerSub}>Admin Clinic Personnel Hub</Text>
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
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="people-circle" size={28} color={COLORS.themeBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Clinic Personnel Management</Text>
            <Text style={styles.bannerDesc}>
              Select department to register, edit and manage clinic staff
            </Text>
          </View>
        </View>

        {/* 3 Department Categories */}
        <Text style={styles.sectionHeader}>DEPARTMENTS</Text>

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
                      {sec.count} Registered
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
        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>ORGANIZATION OVERVIEW</Text>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewBox}>
            <Text style={[styles.overviewNum, { color: COLORS.themeBlue }]}>14</Text>
            <Text style={styles.overviewLabel}>Doctors</Text>
          </View>
          <View style={styles.overviewBox}>
            <Text style={[styles.overviewNum, { color: COLORS.purple }]}>22</Text>
            <Text style={styles.overviewLabel}>Telecallers</Text>
          </View>
          <View style={styles.overviewBox}>
            <Text style={[styles.overviewNum, { color: COLORS.green }]}>36</Text>
            <Text style={styles.overviewLabel}>Staff</Text>
          </View>
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
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeAdminText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.green,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  bannerDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.textLight,
    letterSpacing: 0.7,
    marginBottom: 10,
    marginLeft: 2,
  },
  cardsContainer: {
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
  overviewGrid: {
    flexDirection: "row",
    gap: 10,
  },
  overviewBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    alignItems: "center",
  },
  overviewNum: {
    fontSize: 20,
    fontWeight: "800",
  },
  overviewLabel: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

