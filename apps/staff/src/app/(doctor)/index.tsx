import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch, getActiveDoctor, clearAllAuthData } from "../../services/auth";
import { DoctorDrawerSidebar } from "../../components/doctor/DoctorDrawerSidebar";
import { DoctorHeader } from "../../components/doctor/DoctorHeader";
import { DoctorBottomNav } from "../../components/doctor/DoctorBottomNav";

const COLORS = {
  primary: "#0284c7",
  card: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e8edf2",
  success: "#16a34a",
  warning: "#d97706",
};

export default function DoctorDashboard() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [doctorName, setDoctorName] = useState("Dr. Prashanth K Vaidya");
  const [branchName, setBranchName] = useState("All Branches");
  const [selectedDate, setSelectedDate] = useState("");
  const [todayStr, setTodayStr] = useState("");
  const [yesterdayStr, setYesterdayStr] = useState("");
  const [tomorrowStr, setTomorrowStr] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Calendar Modal State
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = useMemo(() => new Date(calYear, calMonth + 1, 0).getDate(), [calYear, calMonth]);
  const firstDayOffset = useMemo(() => new Date(calYear, calMonth, 1).getDay(), [calYear, calMonth]);

  // Reception-Style Filter: ALL | UPCOMING | ACTIVE | SENT_TO_RECEPTION | COMPLETED
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "ACTIVE" | "SENT_TO_RECEPTION" | "COMPLETED">("ALL");

  useEffect(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    const t = `${d}-${m}-${y}`;
    setTodayStr(t);
    setSelectedDate(t);

    const yday = new Date(now.getTime() - 86400000);
    const yd = String(yday.getDate()).padStart(2, "0");
    const ym = String(yday.getMonth() + 1).padStart(2, "0");
    const yy = yday.getFullYear();
    setYesterdayStr(`${yd}-${ym}-${yy}`);

    const tmrw = new Date(now.getTime() + 86400000);
    const td = String(tmrw.getDate()).padStart(2, "0");
    const tm = String(tmrw.getMonth() + 1).padStart(2, "0");
    const ty = tmrw.getFullYear();
    setTomorrowStr(`${td}-${tm}-${ty}`);

    getActiveDoctor().then((d) => {
      if (d?.name) setDoctorName(d.name);
    });
  }, []);

  // Sync calendar year and month when selectedDate changes
  useEffect(() => {
    if (selectedDate && selectedDate !== "ALL") {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        setCalMonth(parseInt(parts[1], 10) - 1);
        setCalYear(parseInt(parts[2], 10));
      }
    }
  }, [selectedDate]);

  const handlePrevDay = () => {
    if (selectedDate === "ALL" || !selectedDate) {
      setSelectedDate(yesterdayStr);
      return;
    }
    const parts = selectedDate.split("-");
    if (parts.length === 3) {
      const cur = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      cur.setDate(cur.getDate() - 1);
      const d = String(cur.getDate()).padStart(2, "0");
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const y = cur.getFullYear();
      setSelectedDate(`${d}-${m}-${y}`);
    } else {
      setSelectedDate(yesterdayStr);
    }
  };

  const handleNextDay = () => {
    if (selectedDate === "ALL" || !selectedDate) {
      setSelectedDate(tomorrowStr);
      return;
    }
    const parts = selectedDate.split("-");
    if (parts.length === 3) {
      const cur = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      cur.setDate(cur.getDate() + 1);
      const d = String(cur.getDate()).padStart(2, "0");
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const y = cur.getFullYear();
      setSelectedDate(`${d}-${m}-${y}`);
    } else {
      setSelectedDate(tomorrowStr);
    }
  };

  const fetchDoctorAppointments = async (dt: string, isSilent = false) => {
    if (!dt) return;
    if (!isSilent) setIsLoading(true);
    try {
      const dateParam = dt === "ALL" ? "&date=ALL" : `&date=${encodeURIComponent(dt)}`;
      // No branch restriction for doctor: doctor sees appointments across ALL branches
      const data = await apiFetch<any>(
        `/doctor/appointments?doctorName=${encodeURIComponent(doctorName)}${dateParam}`
      );
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else if (!isSilent) {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Failed to load doctor appointments:", err);
      if (!isSilent) setAppointments([]);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    fetchDoctorAppointments(selectedDate, appointments.length > 0);

    const interval = setInterval(() => {
      fetchDoctorAppointments(selectedDate, true);
    }, 10000);

    return () => clearInterval(interval);
  }, [doctorName, branchName, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      if (selectedDate) {
        fetchDoctorAppointments(selectedDate, true);
      }
    }, [doctorName, branchName, selectedDate])
  );

  const openPatientFile = (appt: any) => {
    router.push({
      pathname: "/(doctor)/patient-file",
      params: {
        id: appt.id,
        name: appt.name || appt.patientName,
        phone: appt.phone || appt.phoneNumber,
        registrationId: appt.registrationId || appt.patientId || "SPH-GEN",
        branch: appt.branch || branchName || "All Branches",
      },
    } as any);
  };

  const openPatientHistory = (appt: any) => {
    const regId = appt.registrationId || appt.patientId || "SPH-GEN";
    const name = encodeURIComponent(appt.patientName || appt.name || "");
    const phone = encodeURIComponent((appt.phoneNumber || appt.phone || "").replace(/\D/g, "").slice(-10));
    const branch = encodeURIComponent(appt.branch || branchName || "Clinic");
    router.push(`/(doctor)/patient-history?id=${regId}&name=${name}&phone=${phone}&branch=${branch}` as any);
  };

  const handleStatusClick = async (appt: any) => {
    const status = (appt.status || "WAITING").toUpperCase();
    if (status === "WAITING" || status === "SCHEDULED") {
      try {
        await apiFetch<any>("/doctor/appointments", {
          method: "PATCH",
          body: JSON.stringify({ id: appt.id, action: "START_CONSULTATION" }),
        });
        fetchDoctorAppointments(selectedDate, true);
        openPatientFile(appt);
      } catch (err: any) {
        console.error("Status update error:", err);
        openPatientFile(appt);
      }
    } else if (status === "IN_CONSULTATION" || status === "COLLECT_FEE" || appt.isSentToReception) {
      openPatientFile(appt);
    }
  };

  // Reorder queue: Move UP
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const currentList = [...filtered];
    const temp = currentList[index];
    currentList[index] = currentList[index - 1];
    currentList[index - 1] = temp;

    setAppointments(currentList);

    try {
      const orderedIds = currentList.map((a) => a.id);
      await apiFetch("/doctor/appointments", {
        method: "PATCH",
        body: JSON.stringify({ action: "REORDER", orderedIds }),
      });
    } catch (err) {
      console.error("Failed to persist queue reorder:", err);
    }
  };

  // Reorder queue: Move DOWN
  const handleMoveDown = async (index: number) => {
    if (index >= filtered.length - 1) return;
    const currentList = [...filtered];
    const temp = currentList[index];
    currentList[index] = currentList[index + 1];
    currentList[index + 1] = temp;

    setAppointments(currentList);

    try {
      const orderedIds = currentList.map((a) => a.id);
      await apiFetch("/doctor/appointments", {
        method: "PATCH",
        body: JSON.stringify({ action: "REORDER", orderedIds }),
      });
    } catch (err) {
      console.error("Failed to persist queue reorder:", err);
    }
  };

  const handleCall = (phone?: string) => {
    const clean = (phone || "").replace(/\D/g, "").slice(-10);
    if (!clean) {
      Alert.alert("No Phone", "This patient has no valid phone number.");
      return;
    }
    Linking.openURL(`tel:${clean}`);
  };

  const handleWhatsApp = (phone?: string, patientName?: string, slot?: string) => {
    const clean = (phone || "").replace(/\D/g, "").slice(-10);
    if (!clean) {
      Alert.alert("No Phone", "This patient has no valid phone number.");
      return;
    }
    const msg = `Hello ${patientName || "Patient"}, Dr. Prashanth K Vaidya is reviewing your consultation slot (${slot || "today"}). Please be seated outside the doctor cabin.`;
    Linking.openURL(`https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`);
  };

  const onPullRefresh = async () => {
    setIsPullRefreshing(true);
    await fetchDoctorAppointments(selectedDate, false);
    setIsPullRefreshing(false);
  };

  const handleNotificationsClick = () => {
    Alert.alert(
      "Notifications",
      `You have ${upcomingCount} upcoming appointments scheduled and ${activeCount} active consultation today.`,
      [{ text: "OK" }]
    );
  };

  const renderVisitBadge = (appt: any) => {
    const badge = appt.visitBadge || (appt.hasPackage ? "In-Dur" : appt.isReback ? "Revisit" : "New");
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        {badge === "New" && (
          <View style={styles.badgeNew}>
            <Ionicons name="sparkles" size={9.5} color="#16a34a" />
            <Text style={styles.badgeNewText}>NEW</Text>
          </View>
        )}
        {badge === "In-Dur" && (
          <View style={styles.badgeInDur}>
            <Ionicons name="time" size={9.5} color="#0284c7" />
            <Text style={styles.badgeInDurText}>IN-DUR</Text>
          </View>
        )}
        {badge === "Revisit" && (
          <View style={styles.badgeRevisit}>
            <Ionicons name="repeat" size={9.5} color="#d97706" />
            <Text style={styles.badgeRevisitText}>REVISIT</Text>
          </View>
        )}
        {!!appt.hasPackage && (
          <View style={styles.badgePkg}>
            <Ionicons name="cube" size={9.5} color="#ffffff" />
            <Text style={styles.badgePkgText}>PKG</Text>
          </View>
        )}
      </View>
    );
  };

  const filtered = appointments.filter((a) => {
    if (activeFilter === "ALL") return true;
    const st = (a.status || "WAITING").toUpperCase();
    if (activeFilter === "UPCOMING") return st === "WAITING" || st === "SCHEDULED";
    if (activeFilter === "ACTIVE") return st === "IN_CONSULTATION";
    if (activeFilter === "SENT_TO_RECEPTION") return st === "COLLECT_FEE" || !!a.isSentToReception;
    if (activeFilter === "COMPLETED") return st === "COMPLETED";
    return true;
  });

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of Doctor Portal?", [
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

  const totalCount = appointments.length;
  const upcomingCount = appointments.filter((a) => !a.status || a.status === "WAITING" || a.status === "SCHEDULED").length;
  const activeCount = appointments.filter((a) => a.status === "IN_CONSULTATION").length;
  const sentCount = appointments.filter((a) => (a.status || "").toUpperCase() === "COLLECT_FEE" || !!a.isSentToReception).length;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Header: Doctor Name Only + Notifications & Direct Logout */}
      <DoctorHeader
        title={doctorName}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onLogout={handleLogout}
        rightAction={{
          icon: "notifications-outline",
          onPress: handleNotificationsClick,
          badgeCount: upcomingCount,
          color: "#0f172a",
        }}
      />

      {/* Minimized Sidebar Drawer */}
      <DoctorDrawerSidebar
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeRoute="dashboard"
        doctorName={doctorName}
        branchName={branchName}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={onPullRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Reception-Style Date Navigation Bar with Horizontal Scroll */}
        <View style={styles.dateBarRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScrollContent}
          >
            {/* Yesterday */}
            <TouchableOpacity
              style={[
                styles.datePill,
                selectedDate === yesterdayStr && styles.datePillActive,
              ]}
              onPress={() => setSelectedDate(yesterdayStr)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.datePillText,
                  selectedDate === yesterdayStr && styles.datePillTextActive,
                ]}
              >
                Yesterday
              </Text>
            </TouchableOpacity>

            {/* Today */}
            <TouchableOpacity
              style={[
                styles.datePill,
                selectedDate === todayStr && styles.datePillActive,
              ]}
              onPress={() => setSelectedDate(todayStr)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.datePillText,
                  selectedDate === todayStr && styles.datePillTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            {/* Tomorrow */}
            <TouchableOpacity
              style={[
                styles.datePill,
                selectedDate === tomorrowStr && styles.datePillActive,
              ]}
              onPress={() => setSelectedDate(tomorrowStr)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.datePillText,
                  selectedDate === tomorrowStr && styles.datePillTextActive,
                ]}
              >
                Tomorrow
              </Text>
            </TouchableOpacity>

            {/* Step Prev Day (<) */}
            <TouchableOpacity
              style={styles.dateNavArrowBtn}
              onPress={handlePrevDay}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={15} color="#0284c7" />
            </TouchableOpacity>

            {/* Interactive Calendar Badge (Clickable to open Calendar Modal) */}
            <TouchableOpacity
              style={[
                styles.currentDateBadge,
                selectedDate !== todayStr &&
                  selectedDate !== tomorrowStr &&
                  selectedDate !== yesterdayStr &&
                  styles.currentDateBadgeHighlight,
              ]}
              onPress={() => setCalendarModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar" size={13} color="#0284c7" />
              <Text style={styles.currentDateBadgeText}>
                {selectedDate === todayStr
                  ? `Today (${selectedDate})`
                  : selectedDate}
              </Text>
            </TouchableOpacity>

            {/* Step Next Day (>) */}
            <TouchableOpacity
              style={styles.dateNavArrowBtn}
              onPress={handleNextDay}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={15} color="#0284c7" />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Reception-Style Filter Pills: All, Upcoming, Active, Completed */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "ALL" && styles.filterChipActive]}
            onPress={() => setActiveFilter("ALL")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "ALL" && styles.filterChipTextActive]}>
              All ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "UPCOMING" && styles.filterChipActive]}
            onPress={() => setActiveFilter("UPCOMING")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "UPCOMING" && styles.filterChipTextActive]}>
              Upcoming ({upcomingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "ACTIVE" && styles.filterChipActive]}
            onPress={() => setActiveFilter("ACTIVE")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "ACTIVE" && styles.filterChipTextActive]}>
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "SENT_TO_RECEPTION" && styles.filterChipActive]}
            onPress={() => setActiveFilter("SENT_TO_RECEPTION")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "SENT_TO_RECEPTION" && styles.filterChipTextActive]}>
              Sent ({sentCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "COMPLETED" && styles.filterChipActive]}
            onPress={() => setActiveFilter("COMPLETED")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "COMPLETED" && styles.filterChipTextActive]}>
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {activeFilter === "UPCOMING"
              ? "Upcoming Appointments"
              : activeFilter === "ACTIVE"
              ? "Active Consultations"
              : activeFilter === "SENT_TO_RECEPTION"
              ? "Sent to Reception"
              : activeFilter === "COMPLETED"
              ? "Completed Consultations"
              : "All Appointments Queue"}
          </Text>
          <Text style={styles.sectionBadge}>
            {filtered.length} {filtered.length === 1 ? "Patient" : "Patients"}
          </Text>
        </View>

        {isLoading && appointments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === "ALL"
                ? "No appointments scheduled for this date."
                : `No appointments currently marked as ${activeFilter.toLowerCase()}.`}
            </Text>
          </View>
        ) : (
          filtered.map((appt, index) => {
            const status = (appt.status || "WAITING").toUpperCase();
            const isActive = status === "IN_CONSULTATION";
            const isSentToReception = status === "COLLECT_FEE" || !!appt.isSentToReception;
            const isCompleted = status === "COMPLETED";

            const patientName = appt.name || appt.patientName || "Patient";
            const phoneNum = appt.phoneNumber || appt.phone || "";
            const cleanPhone = phoneNum.replace(/\D/g, "").slice(-10);
            const displayPhone = cleanPhone || "No Mobile";
            const isFirst = index === 0;
            const isLast = index === filtered.length - 1;
            const isRevisit = !!appt.isReback;

            return (
              /* Reception-Style Appointment Card */
              <View
                key={appt.id || `appt-${index}`}
                style={[
                  styles.appointmentCard,
                  isActive && styles.appointmentCardActive,
                ]}
              >
                {/* Top Row: Queue #, Patient Details (Name, ID, Revisit, Mobile), and START CONSULTATION button */}
                <View style={styles.cardTopRow}>
                  {/* Queue Number Badge (Starts from 1) */}
                  <View
                    style={[
                      styles.queueBox,
                      isActive && { backgroundColor: "#cffafe", borderColor: "#06b6d4" },
                      isSentToReception && { backgroundColor: "#fef3c7", borderColor: "#fcd34d" },
                      isCompleted && { backgroundColor: "#dcfce7", borderColor: "#86efac" },
                    ]}
                  >
                    <Text style={[styles.queueBoxLabel, isSentToReception && { color: "#b45309" }]}>Q</Text>
                    <Text
                      style={[
                        styles.queueBoxNum,
                        isActive && { color: "#0891b2" },
                        isSentToReception && { color: "#b45309" },
                        isCompleted && { color: "#16a34a" },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>

                  {/* Name & ID & Revisit Badge + Phone */}
                  <TouchableOpacity
                    style={{ flex: 1, marginLeft: 8, justifyContent: "center" }}
                    onPress={() => {
                      if (isCompleted) {
                        openPatientHistory(appt);
                      } else {
                        openPatientFile(appt);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <Text style={styles.apptPatientName}>{patientName}</Text>
                      {/* Patient ID Pill */}
                      <View style={styles.patientIdBadge}>
                        <Text style={styles.patientIdBadgeText}>
                          {appt.registrationId || appt.patientId || "ID: SPH-GEN"}
                        </Text>
                      </View>
                      {renderVisitBadge(appt)}
                    </View>
                    <Text style={styles.apptPhoneText}>{displayPhone}</Text>
                  </TouchableOpacity>

                  {/* START CONSULTATION / IN CONSULTATION / SENT TO RECEPTION / COMPLETED Button */}
                  <TouchableOpacity
                    style={[
                      styles.startConsultBtn,
                      isActive && { backgroundColor: "#16a34a" },
                      isSentToReception && { backgroundColor: "#f59e0b" },
                      isCompleted && { backgroundColor: "#64748b", opacity: 0.85 },
                    ]}
                    onPress={() => {
                      if (isCompleted) {
                        openPatientHistory(appt);
                      } else {
                        handleStatusClick(appt);
                      }
                    }}
                    disabled={isCompleted}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.startConsultBtnText}>
                      {isActive
                        ? "IN CONSULTATION"
                        : isSentToReception
                        ? "SENT TO RECEPTION"
                        : isCompleted
                        ? "✓ COMPLETED"
                        : "START PRESCRIPTION"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Middle Row: Doctor (Stethoscope) • Time (Clock) • Branch (Pin) */}
                <View style={styles.cardInfoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="fitness-outline" size={13} color="#64748b" />
                    <Text style={styles.infoItemText} numberOfLines={1}>
                      {appt.doctorName?.startsWith("Dr.") ? appt.doctorName : `Dr. ${appt.doctorName || doctorName}`}
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={13} color="#64748b" />
                    <Text style={styles.infoItemText}>
                      {appt.timeSlot || appt.selectedTimeSlot || appt.slot || "Slot N/A"}
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={13} color="#0284c7" />
                    <Text style={[styles.infoItemText, { color: "#0284c7", fontWeight: "700" }]}>
                      {appt.appointmentDate || selectedDate}
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={13} color="#64748b" />
                    <Text style={styles.infoItemText} numberOfLines={1}>
                      {(appt.branch || branchName || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim()}
                    </Text>
                  </View>
                </View>

                {/* Symptoms / Chief Complaints Preview if present */}
                {appt.symptoms ? (
                  <View style={styles.symptomsRow}>
                    <Ionicons name="pulse-outline" size={12} color="#0284c7" />
                    <Text style={styles.symptomsText} numberOfLines={1}>
                      {appt.symptoms}
                    </Text>
                  </View>
                ) : null}

                {/* Bottom Action Row: [ ↑ ] [ ↓ ]  [ 📞 ]  [ 💬 ]  [ 📅 ] */}
                <View style={styles.cardActionRow}>
                  <View style={styles.arrowButtonGroup}>
                    {/* Up Arrow (Move up in queue) */}
                    <TouchableOpacity
                      style={[styles.arrowButton, isFirst && styles.arrowButtonDisabled]}
                      onPress={() => handleMoveUp(index)}
                      disabled={isFirst}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-up" size={14} color={isFirst ? "#93c5fd" : "#ffffff"} />
                    </TouchableOpacity>

                    {/* Down Arrow (Move down in queue) */}
                    <TouchableOpacity
                      style={[styles.arrowButton, isLast && styles.arrowButtonDisabled]}
                      onPress={() => handleMoveDown(index)}
                      disabled={isLast}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-down" size={14} color={isLast ? "#93c5fd" : "#ffffff"} />
                    </TouchableOpacity>
                  </View>

                  {/* Right Action Icons: Call, WhatsApp, Reschedule */}
                  <View style={styles.iconActionsGroup}>
                    {/* Call Icon Button */}
                    <TouchableOpacity
                      style={styles.outlineIconBtn}
                      onPress={() => handleCall(cleanPhone)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call-outline" size={14.5} color="#0284c7" />
                    </TouchableOpacity>

                    {/* WhatsApp Icon Button */}
                    <TouchableOpacity
                      style={[
                        styles.outlineIconBtn,
                        { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
                      ]}
                      onPress={() =>
                        handleWhatsApp(cleanPhone, patientName, appt.slot || appt.timeSlot)
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color="#16a34a" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Interactive Calendar Modal */}
      <Modal
        visible={calendarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalendarModalOpen(false)}
        >
          <View style={styles.calModalContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.calNavHeader}>
              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 0) {
                    setCalMonth(11);
                    setCalYear((y) => y - 1);
                  } else {
                    setCalMonth((m) => m - 1);
                  }
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-back" size={20} color="#0284c7" />
              </TouchableOpacity>

              <Text style={{ fontWeight: "800", fontSize: 16, color: "#0f172a" }}>
                {monthNames[calMonth]} {calYear}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 11) {
                    setCalMonth(0);
                    setCalYear((y) => y + 1);
                  } else {
                    setCalMonth((m) => m + 1);
                  }
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-forward" size={20} color="#0284c7" />
              </TouchableOpacity>
            </View>

            {/* Weekday Labels */}
            <View style={styles.calWeekdaysRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <Text key={d} style={styles.calWeekdayText}>{d}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calDaysGrid}>
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calDayCell} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const formatted = `${String(day).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                const isSelected = selectedDate === formatted;
                const isToday = formatted === todayStr;

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      setSelectedDate(formatted);
                      setCalendarModalOpen(false);
                    }}
                    style={[
                      styles.calDayCell,
                      isSelected && styles.calDayCellSelected,
                      isToday && !isSelected && styles.calDayCellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        isSelected && { color: "#ffffff", fontWeight: "800" },
                        isToday && !isSelected && { color: "#0284c7", fontWeight: "800" },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Actions in Calendar Modal */}
            <View style={styles.calModalFooter}>
              <TouchableOpacity
                style={styles.calFooterBtn}
                onPress={() => {
                  setSelectedDate("ALL");
                  setCalendarModalOpen(false);
                }}
              >
                <Ionicons name="sparkles" size={13} color="#0284c7" />
                <Text style={styles.calFooterBtnText}>All Dates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.calFooterBtn, { backgroundColor: "#0284c7" }]}
                onPress={() => {
                  setSelectedDate(todayStr);
                  setCalendarModalOpen(false);
                }}
              >
                <Text style={[styles.calFooterBtnText, { color: "#ffffff" }]}>Jump to Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Persistent Doctor Bottom Navigation */}
      <DoctorBottomNav activeTab="dashboard" />
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
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  dateBarRow: {
    marginBottom: 10,
  },
  dateScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  dateNavArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  datePillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  datePillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748b",
  },
  datePillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  currentDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentDateBadgeHighlight: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0284c7",
  },
  currentDateBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284c7",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionBadge: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748b",
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
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
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 11.5,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
  },

  /* Reception-Exact Appointment Card Styles */
  appointmentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: "#e8edf2",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 8,
  },
  appointmentCardActive: {
    borderColor: "#06b6d4",
    borderWidth: 1.5,
    backgroundColor: "#fcfdfe",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  queueBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    justifyContent: "center",
    alignItems: "center",
  },
  queueBoxLabel: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#0369a1",
    lineHeight: 8,
  },
  queueBoxNum: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0284c7",
    lineHeight: 15,
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
  symptomsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  symptomsText: {
    fontSize: 10.5,
    color: "#0284c7",
    fontWeight: "500",
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: 11.5,
    color: "#0284c7",
    fontWeight: "600",
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: "#0f172a",
  },

  // Calendar Modal Styles
  calModalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  calNavHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 6,
  },
  calWeekdayText: {
    width: 38,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  calDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  calDayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  calDayCellSelected: {
    backgroundColor: "#0284c7",
  },
  calDayCellToday: {
    borderWidth: 1,
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  calDayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  calModalFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  calFooterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  calFooterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7",
  },
});
