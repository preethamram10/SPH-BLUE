import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch } from "../../services/auth";
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
  const [branchName, setBranchName] = useState("KPHB Branch");
  const [selectedDate, setSelectedDate] = useState("");
  const [todayStr, setTodayStr] = useState("");
  const [tomorrowStr, setTomorrowStr] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Reception-Style Filter: ALL | UPCOMING | ACTIVE | COMPLETED
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "ACTIVE" | "COMPLETED">("ALL");

  // Reschedule Modal State
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("10:30 AM");
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    const t = `${d}-${m}-${y}`;
    setTodayStr(t);
    setSelectedDate(t);

    const tmrw = new Date(now.getTime() + 86400000);
    const td = String(tmrw.getDate()).padStart(2, "0");
    const tm = String(tmrw.getMonth() + 1).padStart(2, "0");
    const ty = tmrw.getFullYear();
    setTomorrowStr(`${td}-${tm}-${ty}`);

    getActiveBranch().then((b) => {
      if (b?.name) setBranchName(b.name);
    });
  }, []);

  const fetchDoctorAppointments = async (dt: string, isSilent = false) => {
    if (!dt) return;
    if (!isSilent) setIsLoading(true);
    try {
      const cleanBranch = branchName.replace(/Spiritual Homeopathy/gi, "").trim();
      const data = await apiFetch<any>(
        `/doctor/appointments?doctorName=${encodeURIComponent(doctorName)}&date=${encodeURIComponent(dt)}&branch=${encodeURIComponent(cleanBranch)}`
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

  const handleStatusClick = async (appt: any) => {
    const status = (appt.status || "WAITING").toUpperCase();
    if (status === "WAITING" || status === "SCHEDULED") {
      try {
        const data = await apiFetch<any>("/doctor/appointments", {
          method: "PATCH",
          body: JSON.stringify({ id: appt.id, action: "START_CONSULTATION" }),
        });
        if (data.success) {
          Alert.alert("Consultation Started", `${appt.name || appt.patientName} has been called into Cabin.`);
          fetchDoctorAppointments(selectedDate, true);
        } else {
          Alert.alert("Error", data.error || "Failed to start consultation.");
        }
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to update.");
      }
    } else if (status === "IN_CONSULTATION") {
      Alert.alert(
        "Complete Consultation",
        `Mark consultation as COMPLETED for ${appt.name || appt.patientName}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Complete Case",
            onPress: async () => {
              try {
                const data = await apiFetch<any>("/doctor/appointments", {
                  method: "PATCH",
                  body: JSON.stringify({ id: appt.id, action: "COMPLETE_CONSULTATION" }),
                });
                if (data.success) {
                  Alert.alert("Success", "Consultation marked as Completed!");
                  fetchDoctorAppointments(selectedDate, true);
                }
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to complete.");
              }
            },
          },
        ]
      );
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

  const openRescheduleModal = (appt: any) => {
    setRescheduleTarget(appt);
    setRescheduleDate(appt.appointmentDate || selectedDate);
    setRescheduleSlot(appt.timeSlot || appt.slot || "10:30 AM");
    setIsRescheduleOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget) return;
    setIsRescheduling(true);
    try {
      const data = await apiFetch<any>("/doctor/appointments", {
        method: "PATCH",
        body: JSON.stringify({
          action: "RESCHEDULE",
          id: rescheduleTarget.id,
          appointmentDate: rescheduleDate,
          timeSlot: rescheduleSlot,
        }),
      });
      if (data.success) {
        Alert.alert(
          "Rescheduled",
          `Appointment for ${rescheduleTarget.name || rescheduleTarget.patientName} moved to ${rescheduleDate} (${rescheduleSlot})!`
        );
        setIsRescheduleOpen(false);
        fetchDoctorAppointments(selectedDate, true);
      } else {
        Alert.alert("Error", data.error || "Failed to reschedule appointment.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reschedule.");
    } finally {
      setIsRescheduling(false);
    }
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

  const filtered = appointments.filter((a) => {
    if (activeFilter === "ALL") return true;
    const st = (a.status || "WAITING").toUpperCase();
    if (activeFilter === "UPCOMING") return st === "WAITING" || st === "SCHEDULED";
    if (activeFilter === "ACTIVE") return st === "IN_CONSULTATION";
    if (activeFilter === "COMPLETED") return st === "COMPLETED";
    return true;
  });

  const totalCount = appointments.length;
  const upcomingCount = appointments.filter((a) => !a.status || a.status === "WAITING" || a.status === "SCHEDULED").length;
  const activeCount = appointments.filter((a) => a.status === "IN_CONSULTATION").length;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Header: Doctor Name Only (No branch name or Cabin 1) + Notification Tab on Right */}
      <DoctorHeader
        title={doctorName}
        onOpenDrawer={() => setIsDrawerOpen(true)}
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
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={onPullRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Reception-Style Date Navigation Bar */}
        <View style={styles.dateBarRow}>
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

          <View style={styles.currentDateBadge}>
            <Ionicons name="calendar-outline" size={13} color="#0284c7" />
            <Text style={styles.currentDateBadgeText}>{selectedDate}</Text>
          </View>
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
            style={[styles.filterChip, activeFilter === "COMPLETED" && styles.filterChipActive]}
            onPress={() => setActiveFilter("COMPLETED")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "COMPLETED" && styles.filterChipTextActive]}>
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading: Upcoming Appointments */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
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
                      isCompleted && { backgroundColor: "#dcfce7", borderColor: "#86efac" },
                    ]}
                  >
                    <Text style={styles.queueBoxLabel}>Q</Text>
                    <Text
                      style={[
                        styles.queueBoxNum,
                        isActive && { color: "#0891b2" },
                        isCompleted && { color: "#16a34a" },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>

                  {/* Name & ID & Revisit Badge + Phone */}
                  <View style={{ flex: 1, marginLeft: 8, justifyContent: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <Text style={styles.apptPatientName}>{patientName}</Text>
                      {/* Patient ID Pill */}
                      <View style={styles.patientIdBadge}>
                        <Text style={styles.patientIdBadgeText}>
                          {appt.registrationId || appt.patientId || "ID: SPH-GEN"}
                        </Text>
                      </View>
                      {isRevisit && (
                        <View style={styles.revisitBadge}>
                          <Ionicons name="refresh" size={9} color="#d97706" />
                          <Text style={styles.revisitBadgeText}>REVISIT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.apptPhoneText}>{displayPhone}</Text>
                  </View>

                  {/* START CONSULTATION / IN CONSULTATION / COMPLETED Button */}
                  <TouchableOpacity
                    style={[
                      styles.startConsultBtn,
                      isActive && { backgroundColor: "#16a34a" },
                      isCompleted && { backgroundColor: "#64748b" },
                    ]}
                    onPress={() => handleStatusClick(appt)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.startConsultBtnText}>
                      {isActive ? "IN CONSULTATION" : isCompleted ? "COMPLETED" : "START CONSULTATION"}
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

                    {/* Reschedule Calendar Icon Button */}
                    <TouchableOpacity
                      style={styles.outlineIconBtn}
                      onPress={() => openRescheduleModal(appt)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar-outline" size={14.5} color="#0284c7" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={isRescheduleOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRescheduleOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reschedule Appointment</Text>
                <Text style={styles.modalSub}>
                  {rescheduleTarget?.name || rescheduleTarget?.patientName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsRescheduleOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.modalInputLabel}>Appointment Date (DD-MM-YYYY)</Text>
              <TextInput
                style={styles.modalInput}
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
                placeholder="DD-MM-YYYY"
              />

              <Text style={styles.modalInputLabel}>Time Slot</Text>
              <TextInput
                style={styles.modalInput}
                value={rescheduleSlot}
                onChangeText={setRescheduleSlot}
                placeholder="e.g. 11:00 AM"
              />

              <TouchableOpacity
                style={[styles.confirmRescheduleBtn, isRescheduling && { opacity: 0.7 }]}
                onPress={handleConfirmReschedule}
                disabled={isRescheduling}
                activeOpacity={0.8}
              >
                {isRescheduling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                    <Text style={styles.confirmRescheduleBtnText}>Confirm Reschedule</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  datePill: {
    paddingHorizontal: 12,
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
    marginLeft: "auto",
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
    borderRadius: 4,
  },
  revisitBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#d97706",
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
  confirmRescheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  confirmRescheduleBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff",
  },
});
