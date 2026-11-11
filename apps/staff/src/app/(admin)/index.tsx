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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

const COLORS = {
  blue: "#268ec8",
  green: "#a8ce3a",
  white: "#ffffff",
  textDark: "#1e293b",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
  errorRed: "#ef4444",
};

export default function AdminDashboard() {
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
      console.warn("Failed fetching mobile admin stats:", e);
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
      {/* Top Navbar with Hamburger Menu Button */}
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
          <View style={styles.adminPill}>
            <Text style={styles.adminPillText}>ADMIN PORTAL</Text>
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
          <Text style={styles.greetingTitle}>Hello, Administrator</Text>
          <Text style={styles.greetingSubtitle}>
            Welcome to the centralized executive control hub.
          </Text>
        </View>

        {/* Live Metrics Grid */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/(admin)/total-revenue" as any)}
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
            onPress={() => router.push("/(admin)/global-patients" as any)}
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

        {/* 1. Branch-Wise Live Operations */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 4 }}>
          <Text style={styles.sectionTitle}>BRANCH-WISE LIVE OPERATIONS</Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textMuted }}>
            {statsData?.branchStats?.length || 0} Clinics
          </Text>
        </View>

        {/* Branch Cards */}
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

              {/* 4 Metrics in Grid */}
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>TODAY&apos;S STAFF PUNCH TIMINGS</Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textMuted }}>
            {statsData?.todayAttendance?.length || 0} Members
          </Text>
        </View>

        <View style={{ gap: 8, marginBottom: 18 }}>
          {(statsData?.todayAttendance || []).slice(0, 15).map((att: any) => {
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

        {/* Executive Quick Actions */}
        <Text style={styles.sectionTitle}>EXECUTIVE CONTROLS</Text>
        <View style={styles.menu}>
          {/* Action 1: Branch Management */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(admin)/branch-management" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="business-outline" size={22} color={COLORS.blue} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Branch Locations &amp; Facilities</Text>
              <Text style={styles.menuDesc}>
                Add new branches, contact numbers, addresses &amp; photos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Action 2: Analytics */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(admin)/reports-analytics" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="bar-chart-outline" size={22} color={COLORS.green} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Clinic Performance &amp; Analytics</Text>
              <Text style={styles.menuDesc}>
                Patient footfall, conversions, and monthly revenue
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Action 3: Staff Management */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(admin)/employee-management" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="people-outline" size={22} color={COLORS.blue} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Doctors &amp; Staff Directory</Text>
              <Text style={styles.menuDesc}>
                Manage doctor schedules, receptionists &amp; telecallers
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Action 3b: Doctor Timings */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(admin)/doctor-timings" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="time-outline" size={22} color={COLORS.blue} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Doctor Timings &amp; Master Schedules</Text>
              <Text style={styles.menuDesc}>
                Configure multi-branch hours &amp; 15-min consultation slots
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Action 3c: All Follow-Ups */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(admin)/all-follow-ups" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="calendar-outline" size={22} color={COLORS.blue} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>All Patient Follow-Ups</Text>
              <Text style={styles.menuDesc}>
                Centralized hospital follow-up call queue
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Action 4: Settings */}
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="settings-outline" size={22} color={COLORS.textMuted} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Clinic Master Settings</Text>
              <Text style={styles.menuDesc}>
                Consultation fees, slot timings &amp; department masters
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===================== SIDE NAVIGATION DRAWER ===================== */}
      {isDrawerOpen && (
        <View style={StyleSheet.absoluteFill}>
          {/* Backdrop Blur/Tint */}
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          {/* Sliding Drawer Container */}
          <Animated.View
            style={[
              styles.drawerContainer,
              {
                width: DRAWER_WIDTH,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Drawer Header with Logo & Admin Info */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerLogoRow}>
                <Image
                  source={require("../../../assets/images/logo.png")}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.closeDrawerBtn}
                  onPress={closeDrawer}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={22} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <Text style={styles.drawerClinicName}>Spiritual Homeopathy</Text>
              <Text style={styles.drawerClinicSub}>Executive Administration</Text>

              {/* Admin Profile Chip */}
              <View style={styles.adminProfileChip}>
                <View style={styles.adminAvatar}>
                  <Text style={styles.adminAvatarText}>AD</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminProfileName}>Administrator</Text>
                  <Text style={styles.adminProfileEmail} numberOfLines={1}>
                    admin@spiritualhomeo.com
                  </Text>
                </View>
              </View>
            </View>

            {/* Drawer Menu Items */}
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerMenuContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.drawerSectionLabel}>NAVIGATION MENU</Text>

              {/* Item 1: Dashboard */}
              <TouchableOpacity
                style={[styles.drawerMenuItem, styles.drawerMenuItemActive]}
                onPress={closeDrawer}
                activeOpacity={0.8}
              >
                <Ionicons name="grid" size={20} color={COLORS.white} style={styles.drawerMenuIcon} />
                <Text style={[styles.drawerMenuText, styles.drawerMenuTextActive]}>
                  Dashboard Overview
                </Text>
              </TouchableOpacity>

              {/* Item 2: Branch Management (KEY FEATURE) */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/branch-management")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={COLORS.blue}
                  style={styles.drawerMenuIcon}
                />
                <Text style={styles.drawerMenuText}>Branch Management</Text>
                <View style={styles.badgeNew}>
                  <Text style={styles.badgeNewText}>NEW</Text>
                </View>
              </TouchableOpacity>

              {/* Item 3: Add New Branch Direct Link */}
              <TouchableOpacity
                style={styles.drawerSubMenuItem}
                onPress={() => handleNavigate("/(admin)/branch-management/create")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={COLORS.green}
                  style={styles.drawerMenuIcon}
                />
                <Text style={styles.drawerSubMenuText}>+ Add New Branch</Text>
              </TouchableOpacity>

              {/* Item 4: Doctors & Staff (Employee Management) */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/employee-management")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={COLORS.blue}
                  style={styles.drawerMenuIcon}
                />
                <Text style={styles.drawerMenuText}>Employee Management</Text>
              </TouchableOpacity>

              {/* Item 4b: Doctor Timings & Master Schedules */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/doctor-timings")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={COLORS.blue}
                  style={styles.drawerMenuIcon}
                />
                <Text style={styles.drawerMenuText}>Doctor Timings &amp; Schedules</Text>
              </TouchableOpacity>

              {/* Item 5: Global Patients */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/global-patients")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={COLORS.blue}
                  style={styles.drawerMenuIcon}
                />
                <Text style={styles.drawerMenuText}>Global Patients List</Text>
              </TouchableOpacity>

              <Text style={[styles.drawerSectionLabel, { marginTop: 14 }]}>FINANCE &amp; BILLING</Text>

              {/* Total Revenue */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/total-revenue")}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={20} color="#16a34a" style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Total Revenue</Text>
              </TouchableOpacity>

              {/* Target Management */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/target-management")}
                activeOpacity={0.8}
              >
                <Ionicons name="locate-outline" size={20} color="#0284c7" style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Target Management</Text>
              </TouchableOpacity>

              {/* Pay Later Dues */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/pay-later")}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={20} color="#0284c7" style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Pay Later Dues</Text>
                <View style={{ backgroundColor: "#e0f2fe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: "auto" }}>
                  <Text style={{ fontSize: 9, fontWeight: "900", color: "#0284c7" }}>DUES</Text>
                </View>
              </TouchableOpacity>

              {/* Fee Requests */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/fee-requests")}
                activeOpacity={0.8}
              >
                <Ionicons name="receipt-outline" size={20} color={COLORS.blue} style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Fee Requests</Text>
              </TouchableOpacity>

              {/* Package Members */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/package-members")}
                activeOpacity={0.8}
              >
                <Ionicons name="ribbon-outline" size={20} color="#d97706" style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Package Members</Text>
              </TouchableOpacity>

              <Text style={[styles.drawerSectionLabel, { marginTop: 14 }]}>TELECALLING &amp; FOLLOW-UPS</Text>

              {/* All Follow-Ups */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/all-follow-ups")}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.blue} style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>All Follow-Ups</Text>
              </TouchableOpacity>

              {/* Telecaller Accounts */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/telecaller-accounts")}
                activeOpacity={0.8}
              >
                <Ionicons name="headset-outline" size={20} color={COLORS.blue} style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Telecaller Accounts</Text>
              </TouchableOpacity>

              {/* Telecaller Updates */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/telecaller-updates")}
                activeOpacity={0.8}
              >
                <Ionicons name="call-outline" size={20} color={COLORS.blue} style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Telecaller Updates</Text>
              </TouchableOpacity>

              <Text style={[styles.drawerSectionLabel, { marginTop: 14 }]}>HR &amp; OPERATIONS</Text>

              {/* Leave Requests */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/leave-requests")}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-clear-outline" size={20} color="#dc2626" style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Leave Requests</Text>
              </TouchableOpacity>

              {/* Attendance */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/employee-attendance")}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done-circle-outline" size={20} color={COLORS.blue} style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Employee Attendance</Text>
              </TouchableOpacity>

              {/* Daily Works */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/employee-daily-works")}
                activeOpacity={0.8}
              >
                <Ionicons name="briefcase-outline" size={20} color={COLORS.blue} style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Employee Daily Works</Text>
              </TouchableOpacity>

              {/* Branch Cleaning */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/branch-cleaning")}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles-outline" size={20} color="#0d9488" style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Branch Cleaning</Text>
              </TouchableOpacity>

              <Text style={[styles.drawerSectionLabel, { marginTop: 14 }]}>MEDIA &amp; SYSTEM</Text>

              {/* Manage Banners */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/manage-banners")}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.blue} style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Manage Banners</Text>
              </TouchableOpacity>

              {/* Reports & Analytics */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/reports-analytics")}
                activeOpacity={0.8}
              >
                <Ionicons name="analytics-outline" size={20} color={COLORS.blue} style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Reports &amp; Analytics</Text>
              </TouchableOpacity>

              {/* Delete Profiles */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => handleNavigate("/(admin)/delete-profiles")}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={20} color="#dc2626" style={styles.drawerMenuIcon} />
                <Text style={styles.drawerMenuText}>Delete Profiles (Phone)</Text>
              </TouchableOpacity>

              {/* Item 7: Master Settings */}
              <TouchableOpacity style={styles.drawerMenuItem} activeOpacity={0.8}>
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={COLORS.textDark}
                  style={styles.drawerMenuIcon}
                />
                <Text style={styles.drawerMenuText}>Clinic Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Drawer Footer with Logout */}
            <View style={styles.drawerFooter}>
              <TouchableOpacity
                style={styles.logoutDrawerBtn}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={20} color={COLORS.errorRed} />
                <Text style={styles.logoutDrawerText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  hamburgerButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f0f6fc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topBarTitleContainer: {
    flex: 1,
  },
  topBarClinicName: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  adminPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.green,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  adminPillText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0f8fd",
    justifyContent: "center",
    alignItems: "center",
  },
  profileIconBtn: {
    padding: 2,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  welcomeBanner: {
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconBoxBlue: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardIconBoxGreen: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  branchBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff8fd",
    borderWidth: 1.5,
    borderColor: "#cbe7f8",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  branchBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  branchBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  branchBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.blue,
  },
  branchBannerDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  menu: {
    gap: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  menuDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  /* ================= DRAWER STYLES ================= */
  backdrop: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    zIndex: 99,
  },
  drawerContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    zIndex: 100,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 16,
    flexDirection: "column",
  },
  drawerHeader: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
  },
  drawerLogoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  drawerLogo: {
    width: 44,
    height: 44,
  },
  closeDrawerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerClinicName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },
  drawerClinicSub: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 1,
  },
  adminProfileChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  adminAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  adminAvatarText: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: "800",
  },
  adminProfileName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  adminProfileEmail: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 10,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerMenuContent: {
    padding: 16,
  },
  drawerSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  drawerMenuItemActive: {
    backgroundColor: COLORS.blue,
  },
  drawerMenuIcon: {
    marginRight: 12,
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  drawerMenuTextActive: {
    color: COLORS.white,
  },
  drawerSubMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingLeft: 36,
    paddingRight: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#f0f8fd",
  },
  drawerSubMenuText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.green,
  },
  badgeNew: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeNewText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "900",
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  logoutDrawerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
  },
  logoutDrawerText: {
    color: COLORS.errorRed,
    fontSize: 14,
    fontWeight: "700",
  },
  branchBoxCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  branchBoxHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  branchBoxTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  branchBoxPhone: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.blue,
    marginTop: 2,
  },
  badgeActiveOpd: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeActiveOpdText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
    textTransform: "uppercase",
  },
  branchMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricItemSky: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#e0f2fe",
    borderRadius: 10,
    padding: 8,
  },
  metricLabelSky: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0369a1",
    textTransform: "uppercase",
  },
  metricItemGreen: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#dcfce7",
    borderRadius: 10,
    padding: 8,
  },
  metricLabelGreen: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803d",
    textTransform: "uppercase",
  },
  metricItemSlate: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 8,
  },
  metricLabelSlate: {
    fontSize: 9,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
  },
  metricItemRose: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#ffe4e6",
    borderRadius: 10,
    padding: 8,
  },
  metricLabelRose: {
    fontSize: 9,
    fontWeight: "800",
    color: "#be123c",
    textTransform: "uppercase",
  },
  metricVal: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.textDark,
    marginTop: 4,
  },
  punchRowCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  punchStaffName: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  roleTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  punchBranchName: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  punchTimeIn: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  punchTimeOut: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 2,
  },
  punchStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  punchStatusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  statusInClinic: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  statusTextInClinic: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "800",
  },
  statusLate: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  statusTextLate: {
    color: "#b45309",
    fontSize: 9,
    fontWeight: "800",
  },
  statusLeave: {
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#f3e8ff",
  },
  statusTextLeave: {
    color: "#7e22ce",
    fontSize: 9,
    fontWeight: "800",
  },
  statusDefault: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusTextDefault: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "800",
  },
});
