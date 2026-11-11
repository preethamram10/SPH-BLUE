import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Linking,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { removeAuthToken, getActiveBranch, removeActiveBranch, apiFetch, clearAllAuthData } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";
import { useNetwork } from "../../context/NetworkContext";
import { AppointmentPaymentModal } from "../../components/payment/AppointmentPaymentModal";

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
  const { isOnline, checkConnection } = useNetwork();
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
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Active Status Filter
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "ACTIVE" | "COLLECT_FEE" | "COMPLETED">("ALL");

  // Calendar Modal State for picking any future or past date
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // 24-Hour Deleted Appointments State (Reception Window)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [deletedAppointments, setDeletedAppointments] = useState<any[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);

  // Reschedule Modal State (Mobile)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTargetAppt, setRescheduleTargetAppt] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState(() => getTodayStr());
  const [rescheduleSlot, setRescheduleSlot] = useState("10:00 AM");
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Appointment Payment Modal State (Orange COLLECT FEE)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentAppt, setSelectedPaymentAppt] = useState<any>(null);

  // Live Branch Target State
  const [branchTarget, setBranchTarget] = useState<{
    targetGoal: number;
    targetReached: number;
    percentage: number;
    remaining: number;
    status: string;
  } | null>(null);

  const fetchBranchTarget = async (bName: string) => {
    try {
      const cleanBranch = (bName || "KPHB")
        .toLowerCase()
        .replace(/spiritual|homeopathy|clinic|branch/gi, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
      const data = await apiFetch<any>("/admin/targets?role=ADMIN");
      if (data && data.success && Array.isArray(data.branches)) {
        const match = data.branches.find((b: any) => {
          const bNorm = (b.branch || "")
            .toLowerCase()
            .replace(/spiritual|homeopathy|clinic|branch/gi, "")
            .replace(/[^a-z0-9]/g, "")
            .trim();
          return bNorm === cleanBranch || bNorm.includes(cleanBranch) || cleanBranch.includes(bNorm);
        });
        if (match) {
          setBranchTarget(match);
        } else if (data.branches.length > 0) {
          setBranchTarget(data.branches[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load branch target on mobile reception:", err);
    }
  };

  const openRescheduleModal = (appt: any) => {
    setRescheduleTargetAppt(appt);
    setRescheduleDate(appt.appointmentDate || selectedDate);
    setRescheduleSlot(appt.timeSlot || appt.selectedTimeSlot || "10:00 AM");
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTargetAppt) return;
    setIsRescheduling(true);
    try {
      const data = await apiFetch("/reception/appointments", {
        method: "PATCH",
        body: JSON.stringify({
          action: "RESCHEDULE",
          id: rescheduleTargetAppt.id,
          appointmentDate: rescheduleDate,
          timeSlot: rescheduleSlot,
        }),
      });
      if (data.success) {
        Alert.alert(
          "Rescheduled",
          `Appointment for ${rescheduleTargetAppt.patientName} moved to ${rescheduleDate} (${rescheduleSlot})!`
        );
        setRescheduleModalOpen(false);
        const bName = activeBranch?.name || "KPHB";
        fetchAppointments(bName, selectedDate);
      } else {
        Alert.alert("Error", data.error || "Failed to reschedule appointment.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsRescheduling(false);
    }
  };

  // Side Drawer Animation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch live appointments for the active branch and selected date
  const fetchAppointments = async (branch: string, dt: string, isSilent: boolean = false) => {
    if (!isSilent) {
      setIsLoadingAppointments(true);
    }
    try {
      const cleanBranch = (branch || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim();
      const data = await apiFetch(`/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dt)}`);
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else if (!isSilent) {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard appointments:", err);
      if (!isSilent) setAppointments([]);
    } finally {
      if (!isSilent) {
        setIsLoadingAppointments(false);
      }
    }
  };

  // Check mandatory cleaning audit lockout
  const checkCleaningAuditLockout = async (branch: string) => {
    try {
      const data = await apiFetch<any>(`/cleaning/lockout?branchName=${encodeURIComponent(branch)}`);
      if (data?.success && data.lockout && data.task) {
        router.replace({
          pathname: "/(reception)/branch-cleaning",
          params: { isLockout: "true" },
        } as any);
      }
    } catch {}
  };

  // Initial branch load and fetch
  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) {
        setActiveBranch(b);
        checkCleaningAuditLockout(b.name);
        fetchAppointments(b.name, selectedDate, appointments.length > 0);
        fetchBranchTarget(b.name);
      } else {
        checkCleaningAuditLockout("KPHB");
        fetchAppointments("KPHB", selectedDate, appointments.length > 0);
        fetchBranchTarget("KPHB");
      }
    });
  }, [selectedDate]);

  // Real-time synchronization interval (every 10 seconds silently in the background)
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      if (isMounted) {
        const bName = activeBranch?.name || "KPHB";
        fetchAppointments(bName, selectedDate, true); // SILENT: updates in-place without triggering loading spinner
        fetchBranchTarget(bName);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeBranch, selectedDate]);

  // When screen comes into focus (e.g. after booking an appointment), immediately reload appointments silently
  useFocusEffect(
    useCallback(() => {
      const bName = activeBranch?.name || "KPHB";
      fetchAppointments(bName, selectedDate, true);
    }, [activeBranch, selectedDate])
  );

  // Phone Call Action Handler
  const handleCallPatient = (phone: string | undefined) => {
    if (!phone) {
      Alert.alert("No Phone Number", "This appointment does not have a valid phone number.");
      return;
    }
    const clean = phone.replace(/\D/g, "").slice(-10);
    if (!clean) {
      Alert.alert("Invalid Phone Number", "Cannot dial this phone number.");
      return;
    }
    Linking.openURL(`tel:${clean}`).catch((err) => {
      Alert.alert("Call Error", "Could not open phone dialer: " + err.message);
    });
  };

  // WhatsApp Action Handler
  const handleWhatsAppPatient = (
    phone: string | undefined,
    patientName: string,
    doctorName?: string,
    timeSlot?: string
  ) => {
    if (!phone) {
      Alert.alert("No Phone Number", "This appointment does not have a valid phone number.");
      return;
    }
    const clean = phone.replace(/\D/g, "").slice(-10);
    if (!clean) {
      Alert.alert("Invalid Phone Number", "Cannot send WhatsApp to this phone number.");
      return;
    }
    const msg = `Hello ${patientName || "Patient"}, your appointment with ${doctorName || "Doctor"} is confirmed at Spiritual Homeopathy (${timeSlot || "today"}). Please reach 10 minutes prior.`;
    const waUrl = `whatsapp://send?phone=91${clean}&text=${encodeURIComponent(msg)}`;
    const webUrl = `https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(waUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(waUrl);
        } else {
          return Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl).catch((err) => {
          Alert.alert("WhatsApp Error", "Could not open WhatsApp: " + err.message);
        });
      });
  };

  // Extract Patient Initials for Avatar (e.g. Harshini -> HA, N Lakshmi -> NL)
  const getPatientInitials = (name: string) => {
    if (!name) return "PT";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  };

  // Reorder queue: Move appointment UP in Upcoming Queue
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const currentList = [...upcomingAppointments];
    const temp = currentList[index];
    currentList[index] = currentList[index - 1];
    currentList[index - 1] = temp;

    // Preserve active & completed appointments
    const otherList = appointments.filter(
      (a) => a.status === "IN_CONSULTATION" || a.status === "COLLECT_FEE" || a.status === "COMPLETED"
    );
    const nextList = [...currentList, ...otherList];

    // Optimistic local update
    setAppointments(nextList);

    // Persist to server
    try {
      const orderedIds = nextList.map((a) => a.id);
      await apiFetch("/reception/appointments", {
        method: "PATCH",
        body: JSON.stringify({ action: "REORDER", orderedIds }),
      });
    } catch (err) {
      console.error("Failed to persist queue reorder:", err);
    }
  };

  // Reorder queue: Move appointment DOWN in Upcoming Queue
  const handleMoveDown = async (index: number) => {
    if (index >= upcomingAppointments.length - 1) return;
    const currentList = [...upcomingAppointments];
    const temp = currentList[index];
    currentList[index] = currentList[index + 1];
    currentList[index + 1] = temp;

    const otherList = appointments.filter(
      (a) => a.status === "IN_CONSULTATION" || a.status === "COLLECT_FEE" || a.status === "COMPLETED"
    );
    const nextList = [...currentList, ...otherList];

    // Optimistic local update
    setAppointments(nextList);

    // Persist to server
    try {
      const orderedIds = nextList.map((a) => a.id);
      await apiFetch("/reception/appointments", {
        method: "PATCH",
        body: JSON.stringify({ action: "REORDER", orderedIds }),
      });
    } catch (err) {
      console.error("Failed to persist queue reorder:", err);
    }
  };

  const openPatientFile = (appt: any) => {
    router.push({
      pathname: "/(reception)/patient-file",
      params: {
        id: appt.id,
        name: appt.patientName || appt.name,
        phone: appt.phoneNumber || appt.phone,
        registrationId: appt.registrationId || appt.patientId || "SPH-GEN",
        branch: activeBranch?.name || "KPHB",
      },
    } as any);
  };

  const openPatientHistory = (appt: any) => {
    const regId = appt.registrationId || appt.patientId || "SPH-GEN";
    const name = encodeURIComponent(appt.patientName || appt.name || "");
    const phone = encodeURIComponent((appt.phoneNumber || appt.phone || "").replace(/\D/g, "").slice(-10));
    const branch = encodeURIComponent(appt.branch || activeBranch?.name || "Clinic");
    router.push(`/(reception)/patient-history?id=${regId}&name=${name}&phone=${phone}&branch=${branch}` as any);
  };

  // Start Consultation: Updates status to IN_CONSULTATION and immediately opens Patient File
  const handleStartConsultation = async (appt: any) => {
    // 1. Optimistic status update: patient leaves upcomingAppointments and appears in activeAppointments
    setAppointments((prev) =>
      prev.map((a) => (a.id === appt.id ? { ...a, status: "IN_CONSULTATION" } : a))
    );

    // 2. Persist to API
    apiFetch("/reception/appointments", {
      method: "PATCH",
      body: JSON.stringify({
        action: "UPDATE_STATUS",
        id: appt.id,
        status: "IN_CONSULTATION",
      }),
    }).catch((err) => console.error("Failed to update status:", err));

    // 3. Immediately open patient file for Reception
    openPatientFile({ ...appt, status: "IN_CONSULTATION" });
  };

  const fetchDeletedAppointments = async () => {
    setIsLoadingDeleted(true);
    try {
      const cleanBranch = (activeBranch?.name || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim();
      const data = await apiFetch(`/reception/deleted-appointments?branch=${encodeURIComponent(cleanBranch)}`);
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
      const data = await apiFetch("/reception/deleted-appointments", {
        method: "POST",
        body: JSON.stringify({ action: "RESTORE", id }),
      });
      if (data.success) {
        Alert.alert("Restored", `Appointment ${token} for ${patientName} has been restored!`);
        fetchDeletedAppointments();
        const bName = activeBranch?.name || "KPHB";
        fetchAppointments(bName, selectedDate);
      } else {
        Alert.alert("Error", data.error || "Failed to restore appointment.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to restore appointment.");
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
              const data = await apiFetch("/reception/deleted-appointments", {
                method: "POST",
                body: JSON.stringify({
                  action: "DELETE",
                  id,
                  deletedBy: "Reception",
                  reason: "Cancelled by reception",
                }),
              });
              if (data.success) {
                Alert.alert("Appointment Cancelled", `Appointment ${token} moved to 24h trash.`);
                const bName = activeBranch?.name || "KPHB";
                fetchAppointments(bName, selectedDate);
              } else {
                Alert.alert("Error", data.error || "Failed to delete appointment.");
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete appointment.");
            }
          },
        },
      ]
    );
  };

  const handleRestoreRefresh = () => {
    handleOpenRestoreModal();
  };

  // Categorized Appointments (Stacked vertically on dashboard)
  const upcomingAppointments = useMemo(
    () => appointments.filter((a) => !a.status || a.status === "SCHEDULED" || a.status === "WAITING"),
    [appointments]
  );
  const inConsultationAppointments = useMemo(
    () => appointments.filter((a) => a.status === "IN_CONSULTATION"),
    [appointments]
  );
  const collectFeeAppointments = useMemo(
    () => appointments.filter((a) => a.status === "COLLECT_FEE"),
    [appointments]
  );
  const completedAppointments = useMemo(
    () => appointments.filter((a) => a.status === "COMPLETED"),
    [appointments]
  );

  // Backward compatibility alias for in-consultation
  const activeAppointments = inConsultationAppointments;

  const renderVisitBadge = (appt: any) => {
    const badge = appt.visitBadge || (appt.isReback ? "Revisit" : "New");
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        {badge === "New" && (
          <View style={styles.badgeNew}>
            <Text style={styles.badgeNewText}>NEW</Text>
          </View>
        )}
        {badge === "In-Dur" && (
          <View style={styles.badgeInDur}>
            <Text style={styles.badgeInDurText}>IN-DUR</Text>
          </View>
        )}
        {badge === "Revisit" && (
          <View style={styles.badgeRevisit}>
            <Text style={styles.badgeRevisitText}>REVISIT</Text>
          </View>
        )}
        {!!appt.hasPackage && (
          <View style={styles.badgePkg}>
            <Text style={styles.badgePkgText}>PKG</Text>
          </View>
        )}
      </View>
    );
  };

  // Status Counts
  const totalCount = appointments.length;
  const waitingCount = upcomingAppointments.length;
  const inConsultationCount = inConsultationAppointments.length;
  const collectFeeCount = collectFeeAppointments.length;
  const activeCount = inConsultationCount;
  const completedCount = completedAppointments.length;

  const filteredAppointments = appointments;

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
    await clearAllAuthData();
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
      id: "old-entry",
      title: "Old Entry (Rx)",
      icon: "folder-open-outline",
      route: "/(reception)/old-entry",
    },
    {
      id: "follow-ups",
      title: "Follow-ups",
      icon: "call-outline",
      route: "/(reception)/follow-ups",
    },
    {
      id: "medical-requests",
      title: "Medical Requests",
      icon: "document-text-outline",
      route: "/(reception)/medical-requests",
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
            refreshing={isPullRefreshing}
            onRefresh={async () => {
              setIsPullRefreshing(true);
              const bName = activeBranch?.name || "KPHB";
              await fetchAppointments(bName, selectedDate, true);
              setIsPullRefreshing(false);
            }}
            colors={[COLORS.themeBlue]}
            tintColor={COLORS.themeBlue}
          />
        }
      >
        {/* 2. BRANCH TARGET CARD (Live Revenue & Monthly Goal) */}
        <View style={styles.targetCard}>
          <View style={styles.targetCardHeader}>
            <View style={styles.targetTitleRow}>
              <Ionicons name="radio-button-on" size={20} color={COLORS.themeBlue} />
              <Text style={styles.targetCardTitle}>{branchShortName} Branch Target</Text>
            </View>
            <View style={styles.achievedPill}>
              <Ionicons name="trending-up" size={14} color={COLORS.themeBlue} />
              <Text style={styles.achievedPillText}>
                {branchTarget ? `${branchTarget.percentage}% Achieved` : "0% Achieved"}
              </Text>
            </View>
          </View>

          {/* 3 Metric Columns */}
          <View style={styles.targetMetricsBox}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TARGET GOAL</Text>
              <Text style={styles.metricGoalValue}>
                ₹{branchTarget?.targetGoal ? branchTarget.targetGoal.toLocaleString() : "0"}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TARGET REACHED</Text>
              <Text style={styles.metricReachedValue}>
                ₹{branchTarget?.targetReached ? branchTarget.targetReached.toLocaleString() : "0"}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>REMAINING</Text>
              <Text style={styles.metricRemainingValue}>
                ₹{branchTarget?.remaining ? branchTarget.remaining.toLocaleString() : "0"}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, branchTarget?.percentage || 0)}%` },
              ]}
            />
          </View>

          <View style={styles.progressFooter}>
            <Text style={styles.remainingCaption}>
              ₹{branchTarget?.remaining ? branchTarget.remaining.toLocaleString() : "0"} remaining.
            </Text>
            <Text style={styles.percentCaption}>{branchTarget?.percentage || 0}%</Text>
          </View>
        </View>

        {/* 3. OVERVIEW SECTION */}
        <View style={styles.overviewSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.overviewTitleRow}>
              <Text style={styles.sectionMainTitle}>Overview</Text>
              {isOnline ? (
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => checkConnection()}
                  style={[styles.livePill, { backgroundColor: "#ffe4e6", borderColor: "#fecdd3" }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.liveDot, { backgroundColor: "#e11d48" }]} />
                  <Text style={[styles.liveText, { color: "#e11d48" }]}>OFFLINE</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.themeBlue} />
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: COLORS.themeBlue }}>
                {selectedDate}
              </Text>
            </View>
          </View>

          {/* Top 4 Stats Cards (Clickable Filter Boxes) */}
          <View style={styles.overviewGrid}>
            <TouchableOpacity
              style={[styles.overviewStatCard, activeFilter === "ALL" && styles.overviewStatCardActiveBlue]}
              onPress={() => setActiveFilter("ALL")}
              activeOpacity={0.7}
            >
              <Text style={styles.statBigBlue}>{totalCount}</Text>
              <Text style={styles.statCardSubtitle}>Total Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.overviewStatCard, activeFilter === "UPCOMING" && styles.overviewStatCardActiveBlue]}
              onPress={() => setActiveFilter("UPCOMING")}
              activeOpacity={0.7}
            >
              <Text style={styles.statBigBlue}>{waitingCount}</Text>
              <Text style={styles.statCardSubtitle}>Waiting</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.overviewStatCard, activeFilter === "ACTIVE" && styles.overviewStatCardActiveOrange]}
              onPress={() => setActiveFilter("ACTIVE")}
              activeOpacity={0.7}
            >
              <Text style={styles.statBigOrange}>{activeCount}</Text>
              <Text style={styles.statCardSubtitle}>Active Consult</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.overviewStatCard, activeFilter === "COMPLETED" && styles.overviewStatCardActiveGreen]}
              onPress={() => setActiveFilter("COMPLETED")}
              activeOpacity={0.7}
            >
              <Text style={styles.statBigGreen}>{completedCount}</Text>
              <Text style={styles.statCardSubtitle}>Completed</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom 3 Stats Cards */}
          <View style={styles.subStatsRow}>
            <TouchableOpacity
              style={styles.subStatCard}
              onPress={() => setActiveFilter("COLLECT_FEE")}
              activeOpacity={0.8}
            >
              <Text style={styles.subStatRed}>{collectFeeCount}</Text>
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

        {/* 4. DATE FILTER & RESTORE OPTION */}
        <View style={styles.upcomingSection}>
          <View style={styles.upcomingHeaderRow}>
            <View style={styles.upcomingTitleBadgeRow}>
              <Text style={styles.upcomingTitle}>Appointments Schedule</Text>
              <View style={styles.upcomingCountBadge}>
                <Text style={styles.upcomingCountText}>{appointments.length}</Text>
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

          {/* SEGMENTED FILTER PILLS / BOXES */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "ALL" && styles.filterPillActive]}
              onPress={() => setActiveFilter("ALL")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "ALL" && styles.filterPillTextActive]}>
                All ({appointments.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "UPCOMING" && styles.filterPillActiveUpcoming]}
              onPress={() => setActiveFilter("UPCOMING")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "UPCOMING" && styles.filterPillTextActive]}>
                Upcoming ({upcomingAppointments.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "ACTIVE" && styles.filterPillActive]}
              onPress={() => setActiveFilter("ACTIVE")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "ACTIVE" && styles.filterPillTextActive]}>
                In Consult ({inConsultationAppointments.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "COLLECT_FEE" && styles.filterPillActiveOrange]}
              onPress={() => setActiveFilter("COLLECT_FEE")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "COLLECT_FEE" && styles.filterPillTextActive]}>
                Collect Fee ({collectFeeAppointments.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "COMPLETED" && styles.filterPillActiveGreen]}
              onPress={() => setActiveFilter("COMPLETED")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "COMPLETED" && styles.filterPillTextActive]}>
                Completed ({completedAppointments.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Appointments List / Empty State */}
          {isLoadingAppointments && appointments.length === 0 ? (
            <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={COLORS.themeBlue} />
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Loading appointments for {selectedDate}...</Text>
            </View>
          ) : appointments.length === 0 ? (
            !isOnline ? (
              <View style={[styles.emptyAppointmentsCard, { borderColor: "#fecdd3", backgroundColor: "#fff1f2" }]}>
                <View style={[styles.calendarIconBox, { backgroundColor: "#ffe4e6" }]}>
                  <Ionicons name="cloud-offline-outline" size={32} color="#e11d48" />
                </View>

                <Text style={[styles.emptyCardMessage, { color: "#9f1239", fontWeight: "800" }]}>
                  No Internet Connection
                </Text>

                <Text style={{ fontSize: 11.5, color: "#be123c", textAlign: "center", paddingHorizontal: 12 }}>
                  You are currently offline. Switching between Wi-Fi and Mobile Data will automatically reconnect.
                </Text>

                <TouchableOpacity
                  style={[styles.bookAppointmentBtn, { backgroundColor: "#e11d48", marginTop: 6 }]}
                  onPress={() => checkConnection()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="reload" size={18} color={COLORS.white} />
                  <Text style={styles.bookAppointmentBtnText}>Retry Connection</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyAppointmentsCard}>
                <View style={styles.calendarIconBox}>
                  <Ionicons name="calendar-outline" size={32} color={COLORS.textLight} />
                </View>

                <Text style={styles.emptyCardMessage}>
                  No appointments found for {selectedDate}.
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
            )
          ) : (
            <View style={{ gap: 14 }}>
              {/* 5A. UPCOMING APPOINTMENTS SECTION */}
              {(activeFilter === "ALL" || activeFilter === "UPCOMING") && (
                <View style={styles.sectionContainer}>
                  <View style={styles.stackHeaderRow}>
                    <View style={styles.sectionTitleBadgeRow}>
                      <View style={styles.sectionIconBadge}>
                        <Ionicons name="time-outline" size={15} color="#0284c7" />
                      </View>
                      <Text style={styles.sectionHeaderTitle}>Upcoming Appointments</Text>
                      <View style={styles.upcomingCountBadge}>
                        <Text style={styles.upcomingCountText}>{upcomingAppointments.length}</Text>
                      </View>
                    </View>
                  </View>

                  {upcomingAppointments.length === 0 ? (
                    <View style={styles.compactEmptyCard}>
                      <Text style={styles.compactEmptyText}>No upcoming appointments scheduled</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {upcomingAppointments.map((appt, index) => {
                        const phoneNum = appt.phoneNumber || appt.phone || "";
                        const cleanPhone = phoneNum.replace(/\D/g, "").slice(-10);
                        const displayPhone = cleanPhone || "No Mobile";
                        const isFirst = index === 0;
                        const isLast = index === upcomingAppointments.length - 1;
                        const isRevisit = !!appt.isReback;

                        return (
                          <View key={appt.id || appt.token || `upcoming-${index}`} style={styles.appointmentCard}>
                            {/* Top Row: Q#, Name, ID, Revisit, Phone, and START CONSULTATION */}
                            <View style={styles.cardTopRow}>
                              <View style={styles.queueBox}>
                                <Text style={styles.queueBoxLabel}>Q</Text>
                                <Text style={styles.queueBoxNum}>{index + 1}</Text>
                              </View>

                              <TouchableOpacity
                                style={{ flex: 1, marginLeft: 7, justifyContent: "center" }}
                                onPress={() => openPatientFile(appt)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                  <Text style={styles.apptPatientName}>{appt.patientName}</Text>
                                  {renderVisitBadge(appt)}
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1.5 }}>
                                  <Text style={styles.apptPhoneText}>{displayPhone}</Text>
                                  <View style={styles.patientIdBadge}>
                                    <Text style={styles.patientIdBadgeText}>
                                      {appt.registrationId || appt.patientId || "ID: N/A"}
                                    </Text>
                                  </View>
                                  {(appt.status === "COLLECT_FEE" || !!appt.isSentToReception) && (
                                    <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: "#fde68a" }}>
                                      <Text style={{ color: "#92400e", fontSize: 9.5, fontWeight: "900" }}>
                                        Ready to Collect Fee
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>

                              {/* START PRESCRIPTION Button */}
                              <TouchableOpacity
                                style={styles.startConsultBtn}
                                onPress={() => handleStartConsultation(appt)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="play" size={10} color="#ffffff" style={{ marginRight: 3 }} />
                                <Text style={styles.startConsultBtnText}>START PRESCRIPTION</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Middle Row: Doctor • Time • Branch */}
                            <View style={styles.cardInfoRow}>
                              <View style={styles.infoItem}>
                                <Ionicons name="fitness-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText} numberOfLines={1}>
                                  {appt.doctorName?.startsWith("Dr.") ? appt.doctorName : `Dr. ${appt.doctorName || "Doctor"}`}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Ionicons name="time-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText}>
                                  {appt.timeSlot || appt.selectedTimeSlot || "Slot N/A"}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Ionicons name="location-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText} numberOfLines={1}>
                                  {(appt.branch || activeBranch?.name || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim()}
                                </Text>
                              </View>
                            </View>

                            {/* Bottom Action Row: [ ↑ ] [ ↓ ]  [ 📄 ]  [ 📞 ]  [ 💬 ]  [ 📅 ]  [ 🗑️ ] */}
                            <View style={styles.cardActionRow}>
                              <View style={styles.arrowButtonGroup}>
                                <TouchableOpacity
                                  style={[styles.arrowButton, isFirst && styles.arrowButtonDisabled]}
                                  onPress={() => handleMoveUp(index)}
                                  disabled={isFirst}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="arrow-up" size={14} color={isFirst ? "#93c5fd" : "#ffffff"} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.arrowButton, isLast && styles.arrowButtonDisabled]}
                                  onPress={() => handleMoveDown(index)}
                                  disabled={isLast}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="arrow-down" size={14} color={isLast ? "#93c5fd" : "#ffffff"} />
                                </TouchableOpacity>
                              </View>

                              <View style={styles.iconActionsGroup}>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => openPatientFile(appt)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="document-text-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => handleCallPatient(cleanPhone)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="call-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() =>
                                    handleWhatsAppPatient(
                                      cleanPhone,
                                      appt.patientName,
                                      appt.doctorName,
                                      appt.timeSlot || appt.selectedTimeSlot
                                    )
                                  }
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="logo-whatsapp" size={15.5} color="#25D366" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => openRescheduleModal(appt)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="calendar-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => handleDeleteAppointment(appt.id, appt.token, appt.patientName)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="trash-outline" size={14.5} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* 5B. ACTIVE CONSULTATIONS SECTION */}
              {(activeFilter === "ALL" || activeFilter === "ACTIVE") && (
                <View style={styles.sectionContainer}>
                  <View style={styles.stackHeaderRow}>
                    <View style={styles.sectionTitleBadgeRow}>
                      <View style={styles.sectionIconBadge}>
                        <Ionicons name="pulse" size={15} color="#0284c7" />
                      </View>
                      <Text style={styles.sectionHeaderTitle}>Active Consultations</Text>
                      <View style={styles.upcomingCountBadge}>
                        <Text style={styles.upcomingCountText}>{inConsultationAppointments.length}</Text>
                      </View>
                    </View>
                  </View>

                  {inConsultationAppointments.length === 0 ? (
                    <View style={styles.compactEmptyCard}>
                      <Text style={styles.compactEmptyText}>No active consultations in progress</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {inConsultationAppointments.map((appt, index) => {
                        const phoneNum = appt.phoneNumber || appt.phone || "";
                        const cleanPhone = phoneNum.replace(/\D/g, "").slice(-10);
                        const displayPhone = cleanPhone || "No Mobile";
                        const isRevisit = !!appt.isReback;

                        return (
                          <View
                            key={appt.id || appt.token || `active-${index}`}
                            style={styles.appointmentCard}
                          >
                            {/* Top Row: Q#, Name, ID, Revisit, Phone, and IN CONSULTATION */}
                            <View style={styles.cardTopRow}>
                              <View style={styles.queueBox}>
                                <Text style={styles.queueBoxLabel}>Q</Text>
                                <Text style={styles.queueBoxNum}>{index + 1}</Text>
                              </View>

                              <TouchableOpacity
                                style={{ flex: 1, marginLeft: 7, justifyContent: "center" }}
                                onPress={() => openPatientFile(appt)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                  <Text style={styles.apptPatientName}>{appt.patientName}</Text>
                                  {renderVisitBadge(appt)}
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1.5 }}>
                                  <Text style={styles.apptPhoneText}>{displayPhone}</Text>
                                  <View style={styles.patientIdBadge}>
                                    <Text style={styles.patientIdBadgeText}>
                                      {appt.registrationId || appt.patientId || "ID: N/A"}
                                    </Text>
                                  </View>
                                  {(appt.status === "COLLECT_FEE" || !!appt.isSentToReception) && (
                                    <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: "#fde68a" }}>
                                      <Text style={{ color: "#92400e", fontSize: 9.5, fontWeight: "900" }}>
                                        Ready to Collect Fee
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>

                              {/* IN CONSULTATION Button */}
                              <TouchableOpacity
                                style={[styles.startConsultBtn, { backgroundColor: "#0284c7" }]}
                                onPress={() => openPatientFile(appt)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="pulse" size={11} color="#ffffff" style={{ marginRight: 3 }} />
                                <Text style={styles.startConsultBtnText}>IN CONSULTATION</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Middle Row: Doctor • Time • Branch */}
                            <View style={styles.cardInfoRow}>
                              <View style={styles.infoItem}>
                                <Ionicons name="fitness-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText} numberOfLines={1}>
                                  {appt.doctorName?.startsWith("Dr.") ? appt.doctorName : `Dr. ${appt.doctorName || "Doctor"}`}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Ionicons name="time-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText}>
                                  {appt.timeSlot || appt.selectedTimeSlot || "Slot N/A"}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Ionicons name="location-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText} numberOfLines={1}>
                                  {(appt.branch || activeBranch?.name || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim()}
                                </Text>
                              </View>
                            </View>

                            {/* Bottom Action Row */}
                            <View style={styles.cardActionRow}>
                              <View style={{ flex: 1 }} />

                              <View style={styles.iconActionsGroup}>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => openPatientFile(appt)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="document-text-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => handleCallPatient(cleanPhone)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="call-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() =>
                                    handleWhatsAppPatient(
                                      cleanPhone,
                                      appt.patientName,
                                      appt.doctorName,
                                      appt.timeSlot || appt.selectedTimeSlot
                                    )
                                  }
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="logo-whatsapp" size={15.5} color="#25D366" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => openRescheduleModal(appt)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="calendar-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => handleDeleteAppointment(appt.id, appt.token, appt.patientName)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="trash-outline" size={14.5} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* 5C. COLLECT FEE SECTION */}
              {(activeFilter === "ALL" || activeFilter === "COLLECT_FEE") && (
                <View style={styles.sectionContainer}>
                  <View style={styles.stackHeaderRow}>
                    <View style={styles.sectionTitleBadgeRow}>
                      <View style={styles.sectionIconBadge}>
                        <Ionicons name="wallet-outline" size={15} color="#ea580c" />
                      </View>
                      <Text style={styles.sectionHeaderTitle}>Collect Fee</Text>
                      <View style={[styles.upcomingCountBadge, { backgroundColor: "#ffedd5" }]}>
                        <Text style={[styles.upcomingCountText, { color: "#ea580c" }]}>{collectFeeAppointments.length}</Text>
                      </View>
                    </View>
                  </View>

                  {collectFeeAppointments.length === 0 ? (
                    <View style={styles.compactEmptyCard}>
                      <Text style={styles.compactEmptyText}>No pending fee collections</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {collectFeeAppointments.map((appt, index) => {
                        const phoneNum = appt.phoneNumber || appt.phone || "";
                        const cleanPhone = phoneNum.replace(/\D/g, "").slice(-10);
                        const displayPhone = cleanPhone || "No Mobile";
                        const isRevisit = !!appt.isReback;

                        return (
                          <View
                            key={appt.id || appt.token || `fee-${index}`}
                            style={styles.appointmentCard}
                          >
                            {/* Top Row: Q#, Name, ID, Revisit, Phone, and COLLECT FEE Button */}
                            <View style={styles.cardTopRow}>
                              <View style={[styles.queueBox, { backgroundColor: "#fff7ed", borderColor: "#fdba74" }]}>
                                <Text style={[styles.queueBoxLabel, { color: "#c2410c" }]}>Q</Text>
                                <Text style={[styles.queueBoxNum, { color: "#ea580c" }]}>{index + 1}</Text>
                              </View>

                              <TouchableOpacity
                                style={{ flex: 1, marginLeft: 7, justifyContent: "center" }}
                                onPress={() => openPatientFile(appt)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                  <Text style={styles.apptPatientName}>{appt.patientName}</Text>
                                  {renderVisitBadge(appt)}
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1.5 }}>
                                  <Text style={styles.apptPhoneText}>{displayPhone}</Text>
                                  <View style={styles.patientIdBadge}>
                                    <Text style={styles.patientIdBadgeText}>
                                      {appt.registrationId || appt.patientId || "ID: N/A"}
                                    </Text>
                                  </View>
                                  {(appt.status === "COLLECT_FEE" || !!appt.isSentToReception) && (
                                    <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: "#fde68a" }}>
                                      <Text style={{ color: "#92400e", fontSize: 9.5, fontWeight: "900" }}>
                                        Ready to Collect Fee
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>

                              {/* COLLECT FEE Button */}
                              <TouchableOpacity
                                style={[styles.startConsultBtn, { backgroundColor: "#f59e0b" }]}
                                onPress={() => {
                                  setSelectedPaymentAppt(appt);
                                  setPaymentModalVisible(true);
                                }}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="card" size={11} color="#ffffff" style={{ marginRight: 3 }} />
                                <Text style={styles.startConsultBtnText}>COLLECT FEE</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Middle Row: Doctor • Time • Branch */}
                            <View style={styles.cardInfoRow}>
                              <View style={styles.infoItem}>
                                <Ionicons name="fitness-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText} numberOfLines={1}>
                                  {appt.doctorName?.startsWith("Dr.") ? appt.doctorName : `Dr. ${appt.doctorName || "Doctor"}`}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Ionicons name="time-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText}>
                                  {appt.timeSlot || appt.selectedTimeSlot || "Slot N/A"}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Ionicons name="location-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText} numberOfLines={1}>
                                  {(appt.branch || activeBranch?.name || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim()}
                                </Text>
                              </View>
                            </View>

                            {/* Bottom Action Row */}
                            <View style={styles.cardActionRow}>
                              <View style={{ flex: 1 }} />

                              <View style={styles.iconActionsGroup}>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => openPatientFile(appt)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="document-text-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => handleCallPatient(cleanPhone)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="call-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() =>
                                    handleWhatsAppPatient(
                                      cleanPhone,
                                      appt.patientName,
                                      appt.doctorName,
                                      appt.timeSlot || appt.selectedTimeSlot
                                    )
                                  }
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="logo-whatsapp" size={15.5} color="#25D366" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => openRescheduleModal(appt)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="calendar-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => handleDeleteAppointment(appt.id, appt.token, appt.patientName)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="trash-outline" size={14.5} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* 5D. COMPLETED CONSULTATIONS SECTION */}
              {(activeFilter === "ALL" || activeFilter === "COMPLETED") && (
                <View style={styles.sectionContainer}>
                  <View style={styles.stackHeaderRow}>
                    <View style={styles.sectionTitleBadgeRow}>
                      <View style={styles.sectionIconBadge}>
                        <Ionicons name="checkmark-done-circle-outline" size={15} color="#0284c7" />
                      </View>
                      <Text style={styles.sectionHeaderTitle}>Completed Consultations</Text>
                      <View style={styles.upcomingCountBadge}>
                        <Text style={styles.upcomingCountText}>
                          {completedAppointments.length}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {completedAppointments.length === 0 ? (
                    <View style={styles.compactEmptyCard}>
                      <Text style={styles.compactEmptyText}>No completed consultations yet for {selectedDate}</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {completedAppointments.map((appt, index) => {
                        const phoneNum = appt.phoneNumber || appt.phone || "";
                        const cleanPhone = phoneNum.replace(/\D/g, "").slice(-10);
                        const displayPhone = cleanPhone || "No Mobile";
                        const isRevisit = !!appt.isReback;

                        return (
                          <View
                            key={appt.id || appt.token || `completed-${index}`}
                            style={styles.appointmentCard}
                          >
                            {/* Top Row: Q#, Name, ID, Revisit, Phone, and COMPLETED */}
                            <View style={styles.cardTopRow}>
                              <View style={styles.queueBox}>
                                <Text style={styles.queueBoxLabel}>Q</Text>
                                <Text style={styles.queueBoxNum}>{index + 1}</Text>
                              </View>

                              <TouchableOpacity
                                style={{ flex: 1, marginLeft: 7, justifyContent: "center" }}
                                onPress={() => openPatientHistory(appt)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                  <Text style={styles.apptPatientName}>{appt.patientName}</Text>
                                  {renderVisitBadge(appt)}
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1.5 }}>
                                  <Text style={styles.apptPhoneText}>{displayPhone}</Text>
                                  <View style={styles.patientIdBadge}>
                                    <Text style={styles.patientIdBadgeText}>
                                      {appt.registrationId || appt.patientId || "ID: N/A"}
                                    </Text>
                                  </View>
                                  {(appt.status === "COLLECT_FEE" || !!appt.isSentToReception) && (
                                    <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: "#fde68a" }}>
                                      <Text style={{ color: "#92400e", fontSize: 9.5, fontWeight: "900" }}>
                                        Ready to Collect Fee
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>

                              {/* COMPLETED Badge -> Opens Payment Receipt */}
                              <TouchableOpacity
                                style={[styles.startConsultBtn, { backgroundColor: "#15803d", flexDirection: "row", alignItems: "center", gap: 3 }]}
                                onPress={() => {
                                  setSelectedPaymentAppt(appt);
                                  setPaymentModalVisible(true);
                                }}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="receipt-outline" size={11} color="#ffffff" />
                                <Text style={styles.startConsultBtnText}>COMPLETED</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Middle Row */}
                            <View style={styles.cardInfoRow}>
                              <View style={styles.infoItem}>
                                <Ionicons name="fitness-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText} numberOfLines={1}>
                                  {appt.doctorName?.startsWith("Dr.") ? appt.doctorName : `Dr. ${appt.doctorName || "Doctor"}`}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Ionicons name="time-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText}>
                                  {appt.timeSlot || appt.selectedTimeSlot || "Slot N/A"}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Ionicons name="location-outline" size={13} color="#64748b" />
                                <Text style={styles.infoItemText} numberOfLines={1}>
                                  {(appt.branch || activeBranch?.name || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim()}
                                </Text>
                              </View>
                            </View>

                            {/* Bottom Action Row */}
                            <View style={styles.cardActionRow}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                                <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#16a34a" }}>Consultation Done</Text>
                              </View>

                              <View style={styles.iconActionsGroup}>
                                <TouchableOpacity
                                  style={[styles.outlineIconBtn, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}
                                  onPress={() => {
                                    setSelectedPaymentAppt(appt);
                                    setPaymentModalVisible(true);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="receipt-outline" size={14.5} color="#15803d" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => openPatientHistory(appt)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="time-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() => handleCallPatient(cleanPhone)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="call-outline" size={14.5} color="#0284c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.outlineIconBtn}
                                  onPress={() =>
                                    handleWhatsAppPatient(
                                      cleanPhone,
                                      appt.patientName,
                                      appt.doctorName,
                                      appt.timeSlot || appt.selectedTimeSlot
                                    )
                                  }
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="logo-whatsapp" size={15.5} color="#25D366" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
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

        {/* Med Req Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/(reception)/medical-requests" as any)}
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
      {/* RESCHEDULE APPOINTMENT MODAL (MOBILE) */}
      <Modal visible={rescheduleModalOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setRescheduleModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContainer, { maxWidth: 360, padding: 18 }]}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 10, marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#f0f9ff", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="calendar" size={18} color="#0284c7" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>Reschedule</Text>
                      <Text style={{ fontSize: 10.5, color: "#64748b" }}>
                        {rescheduleTargetAppt?.patientName} • {rescheduleTargetAppt?.registrationId}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setRescheduleModalOpen(false)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="close" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Date Selection */}
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#334155", marginBottom: 6 }}>
                  Select New Date (Currently: {rescheduleDate})
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={[styles.datePill, rescheduleDate === todayStr && styles.datePillActive, { flex: 1, alignItems: "center" }]}
                    onPress={() => setRescheduleDate(todayStr)}
                  >
                    <Text style={[styles.datePillText, rescheduleDate === todayStr && styles.datePillTextActive, { fontSize: 11 }]}>
                      Today
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePill, rescheduleDate === tomorrowStr && styles.datePillActive, { flex: 1, alignItems: "center" }]}
                    onPress={() => setRescheduleDate(tomorrowStr)}
                  >
                    <Text style={[styles.datePillText, rescheduleDate === tomorrowStr && styles.datePillTextActive, { fontSize: 11 }]}>
                      Tomorrow
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Time Slot Picker */}
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#334155", marginBottom: 6 }}>
                  Select Time Slot
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[
                      "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
                      "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
                      "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM",
                      "05:00 PM", "05:15 PM", "05:30 PM", "05:45 PM",
                      "06:00 PM", "06:15 PM", "06:30 PM", "06:45 PM",
                      "07:00 PM", "07:15 PM", "07:30 PM",
                    ].map((slot) => {
                      const isSel = rescheduleSlot === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          onPress={() => setRescheduleSlot(slot)}
                          style={[
                            { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
                            isSel && { backgroundColor: "#0284c7", borderColor: "#0284c7" },
                          ]}
                        >
                          <Text style={[{ fontSize: 11, fontWeight: "700", color: "#334155" }, isSel && { color: "#ffffff" }]}>
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                  <TouchableOpacity
                    onPress={() => setRescheduleModalOpen(false)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f1f5f9" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={isRescheduling}
                    onPress={handleConfirmReschedule}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "#0284c7" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#ffffff" }}>
                      {isRescheduling ? "Saving..." : "Confirm"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
      {/* Appointment Payment Modal (Collect Fee) */}
      <AppointmentPaymentModal
        visible={paymentModalVisible}
        appointment={selectedPaymentAppt}
        onClose={() => {
          setPaymentModalVisible(false);
          setSelectedPaymentAppt(null);
        }}
        onPaymentSuccess={() => {
          const b = activeBranch?.name || "KPHB";
          fetchAppointments(b, selectedDate);
          fetchBranchTarget(b);
        }}
        onOpenPatientFile={() => {
          setPaymentModalVisible(false);
          if (selectedPaymentAppt) {
            openPatientFile(selectedPaymentAppt);
          }
        }}
      />
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
    paddingHorizontal: 8,
    paddingTop: 12,
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
  overviewStatCardActiveBlue: {
    borderColor: "#0284c7",
    borderWidth: 1.5,
    backgroundColor: "#f0f9ff",
  },
  overviewStatCardActiveOrange: {
    borderColor: "#f97316",
    borderWidth: 1.5,
    backgroundColor: "#fff7ed",
  },
  overviewStatCardActiveGreen: {
    borderColor: "#16a34a",
    borderWidth: 1.5,
    backgroundColor: "#f0fdf4",
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
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterPill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterPillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  filterPillActiveUpcoming: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  filterPillActiveOrange: {
    backgroundColor: "#f97316",
    borderColor: "#f97316",
  },
  filterPillActiveGreen: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  filterPillTextActive: {
    color: COLORS.white,
    fontWeight: "800",
  },

  // 5. APPOINTMENTS STACK SECTIONS & BOXES
  sectionCardBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    width: "100%",
  },
  sectionIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionSubBadgeBlue: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionSubBadgeTextBlue: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284c7",
  },
  sectionSubBadgeOrange: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionSubBadgeTextOrange: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ea580c",
  },
  sectionSubBadgeGreen: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionSubBadgeTextGreen: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16a34a",
  },
  sectionContainer: {
    marginBottom: 16,
    width: "100%",
  },
  stackHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  compactEmptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e8edf2",
    alignItems: "center",
    justifyContent: "center",
  },
  compactEmptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  upcomingSection: {
    marginBottom: 16,
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
    paddingTop: 48,
    borderBottomWidth: 0,
    backgroundColor: COLORS.white,
  },
  drawerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  drawerLogo: {
    width: 38,
    height: 38,
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
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 2,
  },
  drawerRoleText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  drawerBranchBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 0,
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
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  drawerMenuList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  drawerSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
    backgroundColor: "transparent",
  },
  drawerIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#1e293b",
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 0,
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

  // Appointment Cards Matching UI/UX Reference Design (Compact, Sleek Height & Reduced Text)
  appointmentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e8edf2",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 8,
    width: "100%",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  queueBox: {
    width: 25,
    height: 25,
    borderRadius: 6,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    justifyContent: "center",
    alignItems: "center",
  },
  queueBoxLabel: {
    fontSize: 6,
    fontWeight: "900",
    color: "#0369a1",
    lineHeight: 6.5,
  },
  queueBoxNum: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0284c7",
    lineHeight: 11,
  },
  patientIdBadge: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  patientIdBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#0284c7",
    letterSpacing: 0.2,
  },
  apptPatientName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  revisitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  revisitBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#d97706",
    letterSpacing: 0.3,
  },
  badgeNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgeNewText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#16a34a",
    letterSpacing: 0.3,
  },
  badgeInDur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#7dd3fc",
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgeInDurText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#0284c7",
    letterSpacing: 0.3,
  },
  badgeRevisit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgeRevisitText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#d97706",
    letterSpacing: 0.3,
  },
  badgePkg: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgePkgText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  apptPhoneText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
    marginTop: 1,
  },
  startConsultBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  startConsultBtnText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  cardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  infoItemText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#475569",
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  arrowButtonGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  arrowButton: {
    width: 32,
    height: 27,
    borderRadius: 7,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowButtonDisabled: {
    backgroundColor: "#dbeafe",
  },
  iconActionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  outlineIconBtn: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
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
