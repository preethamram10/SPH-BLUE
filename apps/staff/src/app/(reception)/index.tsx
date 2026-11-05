import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { removeAuthToken, getActiveBranch, removeActiveBranch } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

// Brand Colors matching user reference screenshot
const COLORS = {
  blue: "#268ec8",
  themeBlue: "#0284c7",
  green: "#16a34a",
  brandGreen: "#a8ce3a",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
  lightBlueBg: "#f0f9ff",
  pillBorder: "#bae6fd",
  amber: "#d97706",
  errorRed: "#ef4444",
};

export default function ReceptionDashboard() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<any>(null);

  // Date Helpers (DD-MM-YYYY)
  const getTodayStr = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const getTomorrowStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = String(tomorrow.getDate()).padStart(2, "0");
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const y = tomorrow.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const todayStr = useMemo(() => getTodayStr(), []);
  const tomorrowStr = useMemo(() => getTomorrowStr(), []);

  // Selected Date Filter for Appointments (Default: Today)
  const [selectedDate, setSelectedDate] = useState(() => getTodayStr());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  // Active Status Filter
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "ACTIVE" | "COMPLETED">("ALL");

  // Calendar Modal State for picking any future or past date
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // 24-Hour Deleted Appointments State (Reception Window)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [deletedAppointments, setDeletedAppointments] = useState<any[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);

  // Side Drawer Animation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch live appointments for the active branch and selected date
  const fetchAppointments = async (branch: string, dt: string) => {
    setIsLoadingAppointments(true);
    try {
      const cleanBranch = (branch || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim();
      const res = await fetch(`${API_BASE_URL}/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dt)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard appointments:", err);
      setAppointments([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  // Initial branch load and fetch
  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) {
        setActiveBranch(b);
        fetchAppointments(b.name, selectedDate);
      } else {
        fetchAppointments("KPHB", selectedDate);
      }
    });
  }, [selectedDate]);

  // Real-time synchronization interval (every 10 seconds)
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      if (isMounted) {
        const bName = activeBranch?.name || "KPHB";
        fetchAppointments(bName, selectedDate);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeBranch, selectedDate]);

  const fetchDeletedAppointments = async () => {
    setIsLoadingDeleted(true);
    try {
      const cleanBranch = (activeBranch?.name || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim();
      const res = await fetch(`${API_BASE_URL}/reception/deleted-appointments?branch=${encodeURIComponent(cleanBranch)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setDeletedAppointments(data.appointments);
      } else {
        setDeletedAppointments([]);
      }
    } catch (err) {
      console.error("Failed to fetch deleted appointments:", err);
      setDeletedAppointments([]);
    } finally {
      setIsLoadingDeleted(false);
    }
  };

  const handleOpenRestoreModal = () => {
    setIsRestoreModalOpen(true);
    fetchDeletedAppointments();
  };

  const handleRestoreAppointment = async (id: string, token: string, patientName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/reception/deleted-appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE", id }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Restored", `Appointment ${token} for ${patientName} has been restored!`);
        fetchDeletedAppointments();
        const bName = activeBranch?.name || "KPHB";
        fetchAppointments(bName, selectedDate);
      } else {
        Alert.alert("Error", data.error || "Failed to restore appointment.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
  };

  const handleDeleteAppointment = (id: string, token: string, patientName: string) => {
    Alert.alert(
      "Cancel Appointment",
      `Cancel appointment ${token} for ${patientName}? You can restore it from the 'Restore (24h)' button within 24 hours.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Appointment",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/reception/deleted-appointments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "DELETE",
                  id,
                  deletedBy: "Reception",
                  reason: "Cancelled by reception",
                }),
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert("Appointment Cancelled", `Appointment ${token} moved to 24h trash.`);
                const bName = activeBranch?.name || "KPHB";
                fetchAppointments(bName, selectedDate);
              } else {
                Alert.alert("Error", data.error || "Failed to delete appointment.");
              }
            } catch {
              Alert.alert("Error", "Network error. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleRestoreRefresh = () => {
    handleOpenRestoreModal();
  };

  // Status Counts
  const totalCount = appointments.length;
  const waitingCount = useMemo(
    () => appointments.filter((a) => !a.status || a.status === "SCHEDULED" || a.status === "WAITING").length,
    [appointments]
  );
  const activeCount = useMemo(
    () => appointments.filter((a) => a.status === "IN_CONSULTATION").length,
    [appointments]
  );
  const completedCount = useMemo(
    () => appointments.filter((a) => a.status === "COMPLETED").length,
    [appointments]
  );

  // Filtered Appointments List
  const filteredAppointments = useMemo(() => {
    if (activeFilter === "ALL") return appointments;
    if (activeFilter === "UPCOMING") {
      return appointments.filter(
        (a) => !a.status || a.status === "SCHEDULED" || a.status === "WAITING"
      );
    }
    if (activeFilter === "ACTIVE") {
      return appointments.filter((a) => a.status === "IN_CONSULTATION");
    }
    if (activeFilter === "COMPLETED") {
      return appointments.filter((a) => a.status === "COMPLETED");
    }
    return appointments;
  }, [appointments, activeFilter]);

  // Calendar Helpers
  const daysInMonth = useMemo(() => {
    return new Date(calYear, calMonth + 1, 0).getDate();
  }, [calYear, calMonth]);

  const firstDayOffset = useMemo(() => {
    return new Date(calYear, calMonth, 1).getDay();
  }, [calYear, calMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handleSelectCalDate = (dayNum: number) => {
    const d = String(dayNum).padStart(2, "0");
    const m = String(calMonth + 1).padStart(2, "0");
    setSelectedDate(`${d}-${m}-${calYear}`);
    setCalendarModalOpen(false);
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
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
    await removeActiveBranch();
    router.replace("/(auth)/login");
  };

  // Branch Name helper (e.g., "KPHB" or short name)
  const getBranchShortName = () => {
    if (!activeBranch?.name) return "KPHB";
    const clean = activeBranch.name.replace(/Spiritual Homeopathy/gi, "").replace(/Branch/gi, "").trim();
    return clean.replace(/^-+\s*/, "").trim() || "KPHB";
  };

  const branchShortName = getBranchShortName();

  const navMenuItems = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: "grid-outline",
      route: "/(reception)",
    },
    {
      id: "appointments",
      title: "Appointments",
      icon: "calendar-outline",
      route: "/(reception)/appointments",
    },
    {
      id: "all-patients",
      title: "All Patients List",
      icon: "people-outline",
      route: "/(reception)/all-patients",
    },
    {
      id: "follow-ups",
      title: "Follow-ups",
      icon: "call-outline",
      route: "/(reception)/follow-ups",
    },
    {
      id: "doctor-no-show",
      title: "Doctor No-Show",
      icon: "person-remove-outline",
      route: "/(reception)/doctor-no-show",
    },
    {
      id: "branch-cleaning",
      title: "Branch Cleaning",
      icon: "sparkles-outline",
      route: "/(reception)/branch-cleaning",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* 1. TOP NAVBAR (Matching Reference Screenshot) */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={openDrawer}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={26} color="#0f172a" />
          </TouchableOpacity>

          {/* User Profile Avatar */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color={COLORS.themeBlue} />
          </View>

          {/* User & Branch Info */}
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerMainTitle}>{branchShortName} Reception</Text>
            <Text style={styles.headerPhoneText}>
              {activeBranch?.phone || "+91 90301 76176"}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.receptionBadge}>
                <Text style={styles.receptionBadgeText}>RECEPTION</Text>
              </View>
              <View style={styles.branchLocationPill}>
                <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.branchLocationText}>{branchShortName} Branch</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Action Icons: Notification Bell & Logout */}
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color="#0f172a" />
            <View style={styles.bellDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingAppointments}
            onRefresh={() => {
              const bName = activeBranch?.name || "KPHB";
              fetchAppointments(bName, selectedDate);
            }}
            colors={[COLORS.themeBlue]}
            tintColor={COLORS.themeBlue}
          />
        }
      >
        {/* 2. BRANCH TARGET CARD */}
        <View style={styles.targetCard}>
          <View style={styles.targetCardHeader}>
            <View style={styles.targetTitleRow}>
              <Ionicons name="radio-button-on" size={20} color={COLORS.themeBlue} />
              <Text style={styles.targetCardTitle}>{branchShortName} Branch Target</Text>
            </View>
            <View style={styles.achievedPill}>
              <Ionicons name="trending-up" size={14} color={COLORS.themeBlue} />
              <Text style={styles.achievedPillText}>57% Achieved</Text>
            </View>
          </View>

          {/* 3 Metric Columns */}
          <View style={styles.targetMetricsBox}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TARGET GOAL</Text>
              <Text style={styles.metricGoalValue}>₹7,25,000</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TARGET REACHED</Text>
              <Text style={styles.metricReachedValue}>₹4,11,000</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>REMAINING</Text>
              <Text style={styles.metricRemainingValue}>₹3,14,000</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: "57%" }]} />
          </View>

          <View style={styles.progressFooter}>
            <Text style={styles.remainingCaption}>₹3,14,000 remaining.</Text>
            <Text style={styles.percentCaption}>57%</Text>
          </View>
        </View>

        {/* 3. OVERVIEW SECTION */}
        <View style={styles.overviewSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.overviewTitleRow}>
              <Text style={styles.sectionMainTitle}>Overview</Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.themeBlue} />
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: COLORS.themeBlue }}>
                {selectedDate}
              </Text>
            </View>
          </View>

          {/* Top 4 Stats Cards */}
          <View style={styles.overviewGrid}>
            <View style={styles.overviewStatCard}>
              <Text style={styles.statBigBlue}>{totalCount}</Text>
              <Text style={styles.statCardSubtitle}>Total Bookings</Text>
            </View>

            <View style={styles.overviewStatCard}>
              <Text style={styles.statBigBlue}>{waitingCount}</Text>
              <Text style={styles.statCardSubtitle}>Waiting</Text>
            </View>

            <View style={styles.overviewStatCard}>
              <Text style={styles.statBigOrange}>{activeCount}</Text>
              <Text style={styles.statCardSubtitle}>Active Consult</Text>
            </View>

            <View style={styles.overviewStatCard}>
              <Text style={styles.statBigGreen}>{completedCount}</Text>
              <Text style={styles.statCardSubtitle}>Completed</Text>
            </View>
          </View>

          {/* Bottom 3 Stats Cards */}
          <View style={styles.subStatsRow}>
            <TouchableOpacity
              style={styles.subStatCard}
              onPress={() => router.push("/(reception)/appointments" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.subStatRed}>0</Text>
              <Text style={styles.subStatTextRed}>Pay Pending →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subStatCard}
              onPress={() => router.push("/(reception)/follow-ups" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.subStatBlue}>0</Text>
              <Text style={styles.subStatTextBlue}>Follow-up Opted →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subStatCard}
              onPress={() => router.push("/(reception)/follow-ups" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.subStatSlate}>0</Text>
              <Text style={styles.subStatTextSlate}>Not Opted →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. SEGMENTED FILTER PILLS */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "ALL" && styles.filterPillActive]}
            onPress={() => setActiveFilter("ALL")}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === "ALL" && styles.filterPillTextActive]}>
              All ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "UPCOMING" && styles.filterPillActive]}
            onPress={() => setActiveFilter("UPCOMING")}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === "UPCOMING" && styles.filterPillTextActive]}>
              Upcoming ({waitingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "ACTIVE" && styles.filterPillActive]}
            onPress={() => setActiveFilter("ACTIVE")}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === "ACTIVE" && styles.filterPillTextActive]}>
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "COMPLETED" && styles.filterPillActive]}
            onPress={() => setActiveFilter("COMPLETED")}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === "COMPLETED" && styles.filterPillTextActive]}>
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. UPCOMING APPOINTMENTS SECTION */}
        <View style={styles.upcomingSection}>
          <View style={styles.upcomingHeaderRow}>
            <View style={styles.upcomingTitleBadgeRow}>
              <Text style={styles.upcomingTitle}>Upcoming Appointments</Text>
              <View style={styles.upcomingCountBadge}>
                <Text style={styles.upcomingCountText}>{filteredAppointments.length}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.restoreBtn} onPress={handleRestoreRefresh} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={13} color={COLORS.themeBlue} />
              <Text style={styles.restoreBtnText}>Restore (24h)</Text>
            </TouchableOpacity>
          </View>

          {/* DATE FILTER BELOW RESTORE OPTION */}
          <View style={styles.dateFilterContainer}>
            <View style={styles.datePillsRow}>
              <TouchableOpacity
                style={[styles.datePill, selectedDate === todayStr && styles.datePillActive]}
                onPress={() => setSelectedDate(todayStr)}
                activeOpacity={0.8}
              >
                <Text style={[styles.datePillText, selectedDate === todayStr && styles.datePillTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePill, selectedDate === tomorrowStr && styles.datePillActive]}
                onPress={() => setSelectedDate(tomorrowStr)}
                activeOpacity={0.8}
              >
                <Text style={[styles.datePillText, selectedDate === tomorrowStr && styles.datePillTextActive]}>
                  Tomorrow
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.datePillCalendar,
                  selectedDate !== todayStr && selectedDate !== tomorrowStr && styles.datePillActive,
                ]}
                onPress={() => {
                  setCalYear(new Date().getFullYear());
                  setCalMonth(new Date().getMonth());
                  setCalendarModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={selectedDate !== todayStr && selectedDate !== tomorrowStr ? COLORS.white : COLORS.themeBlue}
                />
                <Text
                  style={[
                    styles.datePillText,
                    selectedDate !== todayStr && selectedDate !== tomorrowStr && styles.datePillTextActive,
                  ]}
                >
                  {selectedDate}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color={selectedDate !== todayStr && selectedDate !== tomorrowStr ? COLORS.white : COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Appointments List / Empty State */}
          {isLoadingAppointments ? (
            <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={COLORS.themeBlue} />
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Loading appointments for {selectedDate}...</Text>
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={styles.emptyAppointmentsCard}>
              <View style={styles.calendarIconBox}>
                <Ionicons name="calendar-outline" size={32} color={COLORS.textLight} />
              </View>

              <Text style={styles.emptyCardMessage}>
                No upcoming appointments for {selectedDate}.
              </Text>

              <TouchableOpacity
                style={styles.bookAppointmentBtn}
                onPress={() => router.push("/(reception)/appointments" as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
                <Text style={styles.bookAppointmentBtnText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredAppointments.map((appt) => {
                const status = (appt.status || "WAITING").toUpperCase();
                const isWaiting = status === "WAITING" || status === "SCHEDULED";
                const isActive = status === "IN_CONSULTATION";
                const isCompleted = status === "COMPLETED";

                return (
                  <View key={appt.id || appt.token} style={styles.appointmentCard}>
                    {/* Header: Token & Reg ID left, Status Badge & Cancel Action right */}
                    <View style={styles.apptCardHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                        <View style={styles.apptTokenBadge}>
                          <Text style={styles.apptTokenText}>{appt.token || "#A"}</Text>
                        </View>
                        <Text style={styles.apptRegIdText}>{appt.registrationId}</Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View
                          style={[
                            styles.statusBadge,
                            isWaiting && { backgroundColor: "#fef3c7" },
                            isActive && { backgroundColor: "#e0f2fe" },
                            isCompleted && { backgroundColor: "#dcfce7" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isWaiting && { color: "#b45309" },
                              isActive && { color: "#0284c7" },
                              isCompleted && { color: "#15803d" },
                            ]}
                          >
                            {status.replace("_", " ")}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleDeleteAppointment(appt.id, appt.token, appt.patientName)}
                          style={{ padding: 4 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Patient Name & Phone / Diseases */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.apptPatientName}>{appt.patientName}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <Text style={styles.apptMetaText}>📞 {appt.phone || appt.phoneNumber}</Text>
                        {appt.diseases ? (
                          <Text style={[styles.apptMetaText, { color: "#64748b", flex: 1 }]} numberOfLines={1}>
                            • {appt.diseases}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Footer: Doctor, Time Slot, Mode */}
                    <View style={styles.apptFooterRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                        <Ionicons name="medkit-outline" size={13} color="#0284c7" />
                        <Text style={styles.apptDoctorText} numberOfLines={1}>
                          {appt.doctorName}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="time-outline" size={13} color="#64748b" />
                          <Text style={styles.apptTimeText}>{appt.timeSlot || appt.selectedTimeSlot}</Text>
                        </View>

                        <View style={styles.apptModeBadge}>
                          <Text style={styles.apptModeText}>{appt.consultationMode || "In-Clinic"}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 5b. DOCTOR NO-SHOW QUICK ACCESS CARD */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#fecdd3",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
          onPress={() => router.push("/(reception)/doctor-no-show" as any)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "#fff1f2",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person-remove" size={18} color="#e11d48" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>
                Doctor No-Show Management
              </Text>
              <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                Mark leaves or unavailable timings for {branchShortName} doctors
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#e11d48" />
        </TouchableOpacity>
      </ScrollView>

      {/* 6. FIXED BOTTOM NAVIGATION BAR (Matching Reference Screenshot) */}
      <View style={styles.bottomTabBar}>
        {/* Dashboard Tab */}
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.8}>
          <Ionicons name="grid" size={22} color={COLORS.themeBlue} />
          <Text style={[styles.tabLabel, { color: COLORS.themeBlue }]}>Dashboard</Text>
        </TouchableOpacity>

        {/* Book Appt Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/(reception)/appointments" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Book Appt</Text>
        </TouchableOpacity>

        {/* Patient List Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/(reception)/all-patients" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Patient List</Text>
        </TouchableOpacity>

        {/* Med Req / Follow-up Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/(reception)/follow-ups" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="medkit-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Med Req</Text>
        </TouchableOpacity>

        {/* Logout Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.errorRed} />
          <Text style={[styles.tabLabel, { color: COLORS.errorRed }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* 7. ANIMATED SIDE NAVIGATION DRAWER (Sidebar with all reception folders) */}
      {isDrawerOpen && (
        <View style={styles.drawerOverlayContainer}>
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View style={[styles.drawerBackdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.drawerContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Drawer Header with Logo & Branch info */}
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
                    <Text style={styles.drawerRoleText}>RECEPTION DESK</Text>
                  </View>
                </View>
              </View>

              {/* Active Branch Info */}
              <View style={styles.drawerBranchBox}>
                <View style={styles.drawerBranchTop}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.drawerBranchName} numberOfLines={1}>
                    {activeBranch?.name || "Clinic Branch"}
                  </Text>
                </View>
                {activeBranch?.phone && (
                  <Text style={styles.drawerBranchPhone}>📞 {activeBranch.phone}</Text>
                )}
              </View>
            </View>

            {/* Navigation Menu List */}
            <ScrollView style={styles.drawerMenuList} showsVerticalScrollIndicator={false}>
              <Text style={styles.drawerSectionLabel}>RECEPTION FOLDERS</Text>

              {navMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.drawerMenuItem}
                  onPress={() => handleNavigate(item.route)}
                  activeOpacity={0.75}
                >
                  <View style={styles.drawerIconBox}>
                    <Ionicons name={item.icon as any} size={20} color={COLORS.themeBlue} />
                  </View>
                  <Text style={styles.drawerMenuText}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              ))}
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
      {/* CALENDAR DATE PICKER MODAL */}
      <Modal visible={calendarModalOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setCalendarModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                {/* Month / Year Header */}
                <View style={styles.calNavHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      if (calMonth === 0) {
                        setCalMonth(11);
                        setCalYear(calYear - 1);
                      } else {
                        setCalMonth(calMonth - 1);
                      }
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="chevron-back" size={20} color="#0f172a" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#0f172a" }}>
                    {monthNames[calMonth]} {calYear}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (calMonth === 11) {
                        setCalMonth(0);
                        setCalYear(calYear + 1);
                      } else {
                        setCalMonth(calMonth + 1);
                      }
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Weekdays */}
                <View style={styles.calWeekdaysRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((w, idx) => (
                    <Text key={idx} style={styles.calWeekdayText}>{w}</Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {Array.from({ length: firstDayOffset }).map((_, i) => (
                    <View key={`empty-${i}`} style={{ width: "14.28%", height: 38 }} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${String(dayNum).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                    const isSelected = selectedDate === dateStr;
                    return (
                      <TouchableOpacity
                        key={dayNum}
                        onPress={() => handleSelectCalDate(dayNum)}
                        style={{
                          width: "14.28%",
                          height: 38,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: isSelected ? "#0284c7" : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? "800" : "600",
                              color: isSelected ? "#ffffff" : "#0f172a",
                            }}
                          >
                            {dayNum}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setCalendarModalOpen(false)}
                  style={{
                    marginTop: 14,
                    paddingVertical: 10,
                    backgroundColor: "#f1f5f9",
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569" }}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 24-HOUR RESTORE DELETED APPOINTMENTS MODAL */}
      <Modal visible={isRestoreModalOpen} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsRestoreModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContainer,
                  { maxHeight: Dimensions.get("window").height * 0.78, width: "92%" },
                ]}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: "#f1f5f9",
                    paddingBottom: 12,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#f0f9ff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="reload" size={16} color={COLORS.themeBlue} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>
                        Restore Appointments (24h)
                      </Text>
                      <Text style={{ fontSize: 10.5, color: "#64748b" }}>
                        Cancelled bookings restorable for 24 hours
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setIsRestoreModalOpen(false)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                {isLoadingDeleted ? (
                  <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color={COLORS.themeBlue} />
                    <Text style={{ fontSize: 12, color: "#64748b" }}>Loading deleted appointments...</Text>
                  </View>
                ) : deletedAppointments.length === 0 ? (
                  <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
                    <Ionicons name="trash-outline" size={32} color="#cbd5e1" />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569" }}>
                      No deleted appointments
                    </Text>
                    <Text style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                      No bookings have been deleted in the past 24 hours for {activeBranch?.name || "this branch"}.
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 8 }}>
                      {deletedAppointments.map((item) => (
                        <View
                          key={item.id}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                            backgroundColor: "#ffffff",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  backgroundColor: "#f0f9ff",
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: "#bae6fd",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: "800",
                                    color: COLORS.themeBlue,
                                  }}
                                >
                                  {item.token}
                                </Text>
                              </View>
                              <Text
                                style={{ fontSize: 12.5, fontWeight: "800", color: "#0f172a" }}
                                numberOfLines={1}
                              >
                                {item.patientName}
                              </Text>
                            </View>

                            <Text style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                              👨‍⚕️ {item.doctorName} • {item.appointmentDate} @ {item.timeSlot}
                            </Text>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                marginTop: 3,
                              }}
                            >
                              <Ionicons name="time-outline" size={11} color="#d97706" />
                              <Text style={{ fontSize: 10, fontWeight: "700", color: "#d97706" }}>
                                {item.hoursRemaining}h left to restore
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            onPress={() =>
                              handleRestoreAppointment(item.id, item.token, item.patientName)
                            }
                            style={{
                              backgroundColor: "#16a34a",
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="reload" size={11} color="#ffffff" />
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#ffffff" }}>
                              Restore
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}

                {/* Footer */}
                <TouchableOpacity
                  onPress={() => setIsRestoreModalOpen(false)}
                  style={{
                    marginTop: 12,
                    paddingVertical: 10,
                    backgroundColor: "#f1f5f9",
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#475569" }}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // 1. TOP BAR
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: COLORS.white,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  hamburgerButton: {
    padding: 6,
    marginRight: 6,
    borderRadius: 8,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerMainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerPhoneText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  receptionBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  receptionBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0284c7",
    letterSpacing: 0.5,
  },
  branchLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  branchLocationText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  headerLogoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },

  // MAIN CONTAINER
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },

  // 2. TARGET CARD
  targetCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  targetCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  targetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  achievedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  achievedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  targetMetricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  metricColumn: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#e2e8f0",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricGoalValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricReachedValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16a34a",
  },
  metricRemainingValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0284c7",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#0284c7",
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remainingCaption: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  percentCaption: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },

  // 3. OVERVIEW SECTION
  overviewSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionMainTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16a34a",
  },
  todayDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  todayDropdownText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },

  // Top 4 Stat Cards
  overviewGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
  },
  overviewStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statBigBlue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0284c7",
    marginBottom: 1,
  },
  statBigOrange: {
    fontSize: 16,
    fontWeight: "900",
    color: "#d97706",
    marginBottom: 1,
  },
  statBigGreen: {
    fontSize: 16,
    fontWeight: "900",
    color: "#16a34a",
    marginBottom: 1,
  },
  statCardSubtitle: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 11,
  },

  // Sub Stats 3 Row
  subStatsRow: {
    flexDirection: "row",
    gap: 6,
  },
  subStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  subStatRed: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ef4444",
  },
  subStatTextRed: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#ef4444",
    marginTop: 1,
  },
  subStatBlue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0284c7",
  },
  subStatTextBlue: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0284c7",
    marginTop: 1,
  },
  subStatSlate: {
    fontSize: 15,
    fontWeight: "900",
    color: "#64748b",
  },
  subStatTextSlate: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 1,
  },

  // 4. FILTER PILLS
  filterPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  filterPill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: "#0284c7",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  filterPillTextActive: {
    color: COLORS.white,
  },

  // 5. UPCOMING APPOINTMENTS SECTION
  upcomingSection: {
    marginBottom: 20,
  },
  upcomingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  upcomingTitleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  upcomingCountBadge: {
    backgroundColor: "#e0f2fe",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  upcomingCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },

  // Empty Appointments Card
  emptyAppointmentsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  calendarIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyCardMessage: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  bookAppointmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 26,
    shadowColor: "#0284c7",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookAppointmentBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  // 6. FIXED BOTTOM TAB BAR
  bottomTabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // 7. SIDEBAR DRAWER STYLES
  drawerOverlayContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  drawerBackdrop: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 16,
    justifyContent: "space-between",
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#f8fafc",
  },
  drawerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  drawerLogo: {
    width: 42,
    height: 42,
    marginRight: 12,
  },
  drawerTitleBox: {
    flex: 1,
  },
  drawerClinicName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  drawerRoleBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  drawerRoleText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  drawerBranchBox: {
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  drawerBranchPhone: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  drawerMenuList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  drawerSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#f8fafc",
  },
  drawerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logoutDrawerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutDrawerText: {
    color: COLORS.errorRed,
    fontSize: 14,
    fontWeight: "800",
  },

  // Date Filter below Restore (24h)
  dateFilterContainer: {
    marginBottom: 14,
  },
  datePillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  datePillCalendar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  datePillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  datePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  datePillTextActive: {
    color: "#ffffff",
  },

  // Appointment Cards
  appointmentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  apptCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  apptTokenBadge: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  apptTokenText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  apptRegIdText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  apptPatientName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  apptMetaText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  apptFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  apptDoctorText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7",
  },
  apptTimeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  apptModeBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  apptModeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },

  // Calendar Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    width: "100%",
    maxWidth: 340,
  },
  calNavHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  calWeekdayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
});
