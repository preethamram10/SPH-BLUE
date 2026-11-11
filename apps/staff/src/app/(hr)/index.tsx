import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  TouchableWithoutFeedback,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { removeAuthToken } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";
import { HRBottomNav } from "../../components/hr/HRBottomNav";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

const COLORS = {
  blue: "#0284c7",
  blueLight: "#e0f2fe",
  purple: "#7c3aed",
  purpleLight: "#f3e8ff",
  green: "#16a34a",
  greenLight: "#dcfce7",
  white: "#ffffff",
  textDark: "#1e293b",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
  errorRed: "#ef4444",
};

export default function HRDashboard() {
  const router = useRouter();

  // Side Drawer Animation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pull-to-refresh & Live Stats state
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatsData(data);
        }
      }
    } catch (e) {
      console.warn("Failed fetching mobile HR stats:", e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats().finally(() => setRefreshing(false));
  }, []);

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDrawerOpen(false);
    });
  };

  const handleNavigate = (route: string) => {
    closeDrawer();
    router.push(route as any);
  };

  const handleLogout = async () => {
    closeDrawer();
    await removeAuthToken();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Navbar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={openDrawer}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={26} color={COLORS.blue} />
        </TouchableOpacity>

        <View style={styles.topBarTitleContainer}>
          <Text style={styles.topBarClinicName}>Spiritual Homeopathy</Text>
          <View style={styles.hrPill}>
            <Text style={styles.hrPillText}>HR PORTAL</Text>
          </View>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={22} color={COLORS.blue} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileIconBtn}
            onPress={openDrawer}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={28} color={COLORS.blue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Dashboard Scroll Content with Pull-To-Refresh */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.blue, COLORS.green]}
            tintColor={COLORS.blue}
          />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.greetingTitle}>Hello, HR Executive</Text>
          <Text style={styles.greetingSubtitle}>
            Centralized staff coordination, branch timings and daily operations.
          </Text>
        </View>

        {/* Live Metrics Grid */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/(hr)/total-revenue" as any)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconBoxBlue}>
              <Ionicons name="cash-outline" size={20} color={COLORS.white} />
            </View>
            <Text style={styles.cardNumber}>
              ₹{statsData?.summary?.totalTodayRevenue ? statsData.summary.totalTodayRevenue.toLocaleString("en-IN") : "0"}
            </Text>
            <Text style={styles.cardLabel}>Today&apos;s Revenue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/(admin)/all-follow-ups" as any)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconBoxGreen}>
              <Ionicons name="people-outline" size={20} color={COLORS.white} />
            </View>
            <Text style={styles.cardNumber}>
              {statsData?.summary?.totalTodayPatients ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Today&apos;s Patients</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/(hr)/attendance" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.cardIconBoxBlue, { backgroundColor: "#7c3aed" }]}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={COLORS.white} />
            </View>
            <Text style={styles.cardNumber}>
              {statsData?.summary?.totalPresentStaff ?? 28}
            </Text>
            <Text style={styles.cardLabel}>Staff On Duty</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/(hr)/branch-management" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.cardIconBoxGreen, { backgroundColor: "#0284c7" }]}>
              <Ionicons name="business-outline" size={20} color={COLORS.white} />
            </View>
            <Text style={styles.cardNumber}>
              {statsData?.branchStats?.length || 4}
            </Text>
            <Text style={styles.cardLabel}>Active Branches</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Operations Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStripScroll}>
          <View style={styles.quickStrip}>
            {[
              { label: "Follow-Ups", route: "/(hr)/all-follow-ups", icon: "calendar" },
              { label: "Staff Mgmt", route: "/(hr)/employee-management", icon: "people" },
              { label: "Doctor Timings", route: "/(hr)/doctor-timings", icon: "time" },
              { label: "Total Revenue", route: "/(hr)/total-revenue", icon: "cash" },
              { label: "Target Mgmt", route: "/(hr)/target-management", icon: "locate" },
              { label: "Leave Requests", route: "/(hr)/leave-requests", icon: "calendar" },
              { label: "Attendance", route: "/(hr)/attendance", icon: "checkmark-circle" },
              { label: "Branches", route: "/(hr)/branch-management", icon: "business" },
              { label: "Cleaning", route: "/(hr)/branch-cleaning", icon: "sparkles" },
            ].map((op, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickOpBtn}
                onPress={() => router.push(op.route as any)}
                activeOpacity={0.8}
              >
                <Ionicons name={op.icon as any} size={15} color={COLORS.blue} />
                <Text style={styles.quickOpText}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* 1. Branch-Wise Real-Time Operations */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>BRANCH-WISE REAL-TIME OPERATIONS</Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textMuted }}>
            {statsData?.branchStats?.length || 0} Clinics
          </Text>
        </View>

        <View style={{ gap: 12, marginBottom: 18 }}>
          {(statsData?.branchStats || []).map((b: any) => (
            <View key={b.id} style={styles.branchBoxCard}>
              <View style={styles.branchBoxHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.branchBoxTitle}>{b.name}</Text>
                  <Text style={styles.branchBoxPhone}>{b.phone || "Active Clinic"}</Text>
                </View>
                <View style={styles.badgeActiveOpd}>
                  <Text style={styles.badgeActiveOpdText}>Active OPD</Text>
                </View>
              </View>

              <View style={styles.branchMetricsGrid}>
                <View style={styles.metricItemSky}>
                  <Text style={styles.metricLabelSky}>Today Patients</Text>
                  <Text style={styles.metricVal}>{b.todayPatients || 0}</Text>
                </View>
                <View style={styles.metricItemGreen}>
                  <Text style={styles.metricLabelGreen}>Today Revenue</Text>
                  <Text style={styles.metricVal}>₹{(b.todayRevenue || 0).toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.metricItemSlate}>
                  <Text style={styles.metricLabelSlate}>Present Members</Text>
                  <Text style={styles.metricVal}>{b.presentStaff || 0} / {b.totalStaff || 0}</Text>
                </View>
                <View style={styles.metricItemRose}>
                  <Text style={styles.metricLabelRose}>Staff on Leave</Text>
                  <Text style={styles.metricVal}>{b.leaveStaff || 0}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* 2. Today's Staff Punch In & Out Timings */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>TODAY&apos;S STAFF PUNCH-IN &amp; PUNCH-OUT TIMINGS</Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textMuted }}>
            {statsData?.todayAttendance?.length || 0} Members
          </Text>
        </View>

        <View style={{ gap: 8, marginBottom: 18 }}>
          {(statsData?.todayAttendance || []).slice(0, 20).map((att: any) => {
            const isInClinic = att.status === "In Clinic";
            const isLate = att.status === "Late";
            const isOnLeave = att.status === "On Leave";
            return (
              <View key={att.id} style={styles.punchRowCard}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.punchStaffName}>{att.staffName}</Text>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>{att.role}</Text>
                    </View>
                  </View>
                  <Text style={styles.punchBranchName}>{att.branch}</Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.punchTimeIn}>In: {att.punchInTime || "-"}</Text>
                  <Text style={styles.punchTimeOut}>
                    Out: {att.punchOutTime || (isInClinic ? "In Clinic" : "-")}
                  </Text>
                </View>

                <View
                  style={[
                    styles.punchStatusPill,
                    isInClinic
                      ? styles.statusInClinic
                      : isLate
                        ? styles.statusLate
                        : isOnLeave
                          ? styles.statusLeave
                          : styles.statusDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.punchStatusText,
                      isInClinic
                        ? styles.statusTextInClinic
                        : isLate
                          ? styles.statusTextLate
                          : isOnLeave
                            ? styles.statusTextLeave
                            : styles.statusTextDefault,
                    ]}
                  >
                    {att.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* HR Operations Menu */}
        <Text style={styles.sectionTitle}>HR OPERATIONS &amp; MANAGEMENT</Text>
        <View style={styles.menu}>
          {/* Staff Management */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(hr)/employee-management" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="people-outline" size={22} color={COLORS.blue} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Staff &amp; Employee Directory</Text>
              <Text style={styles.menuDesc}>Manage doctor roster, staff profiles, salaries and shifts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Doctor Timings */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(hr)/doctor-timings" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="time-outline" size={22} color={COLORS.blue} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Doctor Timings &amp; Duty Schedules</Text>
              <Text style={styles.menuDesc}>OPD consultation hours, branch rotations and slots</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Branch Management */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(hr)/branch-management" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="business-outline" size={22} color={COLORS.blue} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Branch Locations &amp; Facilities</Text>
              <Text style={styles.menuDesc}>Branch details, contact numbers &amp; facility status</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Total Revenue */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(hr)/total-revenue" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="cash-outline" size={22} color="#16a34a" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Total Clinic Revenue</Text>
              <Text style={styles.menuDesc}>Collections, date filters, payment modes &amp; pagination</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Target Management */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(hr)/target-management" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="locate-outline" size={22} color="#0284c7" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Branch &amp; Staff Target Management</Text>
              <Text style={styles.menuDesc}>Monthly patient conversion targets &amp; achievements</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Leave Approvals */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(hr)/leave-requests" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="calendar-clear-outline" size={22} color="#dc2626" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Staff Leave Requests</Text>
              <Text style={styles.menuDesc}>Approve or reject doctor and staff leave applications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Daily Attendance */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(hr)/attendance" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="checkmark-done-circle-outline" size={22} color={COLORS.blue} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Employee Attendance &amp; Punches</Text>
              <Text style={styles.menuDesc}>Daily check-ins, check-outs, hours worked and overtime</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Branch Cleaning */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(hr)/branch-cleaning" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="sparkles-outline" size={22} color="#059669" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Branch Cleaning &amp; Hygiene Audits</Text>
              <Text style={styles.menuDesc}>Review branch cleanliness photos, checklist &amp; compliance</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* HR Bottom Navigation */}
      <HRBottomNav activeTab="dashboard" />

      {/* ===================== SIDE NAVIGATION DRAWER ===================== */}
      {isDrawerOpen && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.drawerContainer,
              {
                width: DRAWER_WIDTH,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Drawer Header with Logo & Role info */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerLogoRow}>
                <Image
                  source={require("../../../assets/images/logo.png")}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
                <View style={styles.drawerTitleBox}>
                  <Text style={styles.drawerClinicName}>Spiritual Homeopathy</Text>
                  <View style={styles.drawerRoleBadge}>
                    <Text style={styles.drawerRoleText}>HR PORTAL</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeDrawerBtn}
                  onPress={closeDrawer}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Active HR Dept Info */}
              <View style={styles.drawerBranchBox}>
                <View style={styles.drawerBranchTop}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.drawerBranchName} numberOfLines={1}>
                    Human Resources Dept
                  </Text>
                </View>
                <Text style={styles.drawerBranchPhone}>hr@spiritualhomeo.com</Text>
              </View>
            </View>

            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerMenuContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.drawerSectionLabel}>MAIN NAVIGATION</Text>

              <TouchableOpacity
                style={[styles.drawerMenuItem, styles.drawerMenuItemActive]}
                onPress={closeDrawer}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="grid" size={18} color="#0284c7" />
                </View>
                <Text style={[styles.drawerMenuText, { color: "#0284c7", fontWeight: "700" }]}>
                  Dashboard Overview
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#0284c7" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/employee-management")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="people-outline" size={18} color="#7c3aed" />
                </View>
                <Text style={styles.drawerMenuText}>Staff Management</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/doctor-timings")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="time-outline" size={18} color="#d97706" />
                </View>
                <Text style={styles.drawerMenuText}>Doctor Timings & OPD</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/branch-management")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="business-outline" size={18} color="#0284c7" />
                </View>
                <Text style={styles.drawerMenuText}>Branch Management</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <Text style={styles.drawerSectionLabel}>FINANCE & REVENUE</Text>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/total-revenue")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="cash-outline" size={18} color="#16a34a" />
                </View>
                <Text style={styles.drawerMenuText}>Total Revenue</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/target-management")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="locate-outline" size={18} color="#0284c7" />
                </View>
                <Text style={styles.drawerMenuText}>Target Management</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/fee-requests")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="receipt-outline" size={18} color="#0284c7" />
                </View>
                <Text style={styles.drawerMenuText}>Fee Requests</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/package-members")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="ribbon-outline" size={18} color="#d97706" />
                </View>
                <Text style={styles.drawerMenuText}>Package Members</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <Text style={styles.drawerSectionLabel}>HR & OPERATIONS</Text>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/leave-requests")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="calendar-clear-outline" size={18} color="#dc2626" />
                </View>
                <Text style={styles.drawerMenuText}>Leave Requests</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/attendance")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="checkmark-done-circle-outline" size={18} color="#16a34a" />
                </View>
                <Text style={styles.drawerMenuText}>Employee Attendance</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/shifts")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="briefcase-outline" size={18} color="#9333ea" />
                </View>
                <Text style={styles.drawerMenuText}>Staff Shifts</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/payroll")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="wallet-outline" size={18} color="#ea580c" />
                </View>
                <Text style={styles.drawerMenuText}>Staff Payroll</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/branch-cleaning")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="sparkles-outline" size={18} color="#0d9488" />
                </View>
                <Text style={styles.drawerMenuText}>Branch Cleaning</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <Text style={styles.drawerSectionLabel}>TELECALLING DESK</Text>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(hr)/all-follow-ups")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="calendar-outline" size={18} color="#0284c7" />
                </View>
                <Text style={styles.drawerMenuText}>All Follow-Ups</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/telecaller-accounts")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="headset-outline" size={18} color="#0d9488" />
                </View>
                <Text style={styles.drawerMenuText}>Telecaller Accounts</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/telecaller-updates")}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="call-outline" size={18} color="#0284c7" />
                </View>
                <Text style={styles.drawerMenuText}>Telecaller Updates</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* Sign Out Navigation Item (Inside side navigation, not fixed) */}
              <TouchableOpacity
                style={[styles.drawerMenuItem, { marginTop: 16, marginBottom: 30 }]}
                onPress={handleLogout}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="log-out-outline" size={18} color={COLORS.errorRed} />
                </View>
                <Text style={[styles.drawerMenuText, { color: COLORS.errorRed, fontWeight: "700" }]}>
                  Sign Out
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.errorRed} />
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  hamburgerButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  topBarTitleContainer: {
    alignItems: "center",
  },
  topBarClinicName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  hrPill: {
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  hrPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.purple,
    letterSpacing: 0.8,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  refreshIconBtn: {
    padding: 6,
  },
  profileIconBtn: {
    padding: 4,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeBanner: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardIconBoxBlue: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardIconBoxGreen: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 2,
  },

  quickStripScroll: {
    marginBottom: 16,
    marginTop: 4,
  },
  quickStrip: {
    flexDirection: "row",
    gap: 8,
  },
  quickOpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickOpText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textDark,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.6,
  },

  // Branch cards
  branchBoxCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  branchBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  branchBoxTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  branchBoxPhone: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badgeActiveOpd: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActiveOpdText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16a34a",
  },
  branchMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricItemSky: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f0f9ff",
    padding: 10,
    borderRadius: 8,
  },
  metricLabelSky: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369a1",
  },
  metricItemGreen: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f0fdf4",
    padding: 10,
    borderRadius: 8,
  },
  metricLabelGreen: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803d",
  },
  metricItemSlate: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
  },
  metricLabelSlate: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  metricItemRose: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff1f2",
    padding: 10,
    borderRadius: 8,
  },
  metricLabelRose: {
    fontSize: 10,
    fontWeight: "700",
    color: "#be123c",
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
    marginTop: 4,
  },

  // Punch ledger
  punchRowCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  punchStaffName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  roleTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  punchBranchName: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  punchTimeIn: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  punchTimeOut: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  punchStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusInClinic: { backgroundColor: "#dcfce7" },
  statusLate: { backgroundColor: "#fef3c7" },
  statusLeave: { backgroundColor: "#fee2e2" },
  statusDefault: { backgroundColor: "#f1f5f9" },
  punchStatusText: { fontSize: 9, fontWeight: "800" },
  statusTextInClinic: { color: "#16a34a" },
  statusTextLate: { color: "#d97706" },
  statusTextLeave: { color: "#ef4444" },
  statusTextDefault: { color: "#64748b" },

  // Menu Items
  menu: { gap: 10, marginTop: 4, marginBottom: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextContainer: { flex: 1, marginRight: 8 },
  menuTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  menuDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Drawer (Reception Theme)
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    zIndex: 99,
  },
  drawerContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: COLORS.white,
    zIndex: 100,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  drawerHeader: {
    padding: 18,
    paddingTop: 36,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  drawerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  drawerLogo: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  drawerTitleBox: {
    flex: 1,
  },
  drawerClinicName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  drawerRoleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#16a34a",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 3,
  },
  drawerRoleText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  closeDrawerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerBranchBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  drawerBranchTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  drawerBranchName: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  drawerBranchPhone: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerMenuContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 20,
  },
  drawerSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
    paddingLeft: 4,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8.5,
    paddingHorizontal: 8,
    borderRadius: 9,
    marginBottom: 2,
    backgroundColor: "transparent",
  },
  drawerMenuItemActive: {
    backgroundColor: "#f0f9ff",
  },
  drawerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "transparent",
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#1e293b",
  },
  drawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: COLORS.white,
  },
  logoutDrawerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: "#fef2f2",
  },
  logoutDrawerText: {
    color: COLORS.errorRed,
    fontSize: 12.5,
    fontWeight: "700",
  },
});
