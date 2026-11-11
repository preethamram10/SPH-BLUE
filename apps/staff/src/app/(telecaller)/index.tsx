import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { removeAuthToken, clearAllAuthData, getAssignedBranch } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";
import { TelecallerBottomNav } from "../../components/telecaller/TelecallerBottomNav";

type TelecallerTab = "followups" | "log_call" | "book_appointment";

const DEFAULT_BOOKING_BRANCHES = [
  "Kphb Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

const TIME_SLOTS = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
];

const CALL_OUTCOMES = [
  { id: "Interested", label: "Interested", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  { id: "Callback Requested", label: "Callback", color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
  { id: "Not Interested", label: "Not Interested", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  { id: "No Response", label: "No Response", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
];

function getFormattedNow(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const strHours = String(hours).padStart(2, "0");
  return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
}

function getTodayDDMMYYYY(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function TelecallerPortalScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TelecallerTab>("followups");

  // Telecaller Profile info
  const [telecallerProfile, setTelecallerProfile] = useState({
    name: "Srikanth Reddy",
    telecallerId: "TC01",
    assignedBranch: "All Branches",
    bookedCount: 0,
  });

  // Section 1: Follow-Ups State
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [refreshingFollowUps, setRefreshingFollowUps] = useState(false);
  const [followUpSearch, setFollowUpSearch] = useState("");
  const [followUpBranch, setFollowUpBranch] = useState("All Branches");
  const [followUpPeriod, setFollowUpPeriod] = useState("all");
  const [bookingBranches, setBookingBranches] = useState<string[]>(DEFAULT_BOOKING_BRANCHES);
  const allBranches = useMemo(() => ["All Branches", ...bookingBranches], [bookingBranches]);

  // Follow-Up Reschedule Modal State
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("11:00 AM");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  // Section 2: Log Call Update State
  const [patientName, setPatientName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [hospitalBranch, setHospitalBranch] = useState("KPHB Branch");
  const [callDateTime, setCallDateTime] = useState(getFormattedNow());
  const [callOutcome, setCallOutcome] = useState("Interested");
  const [notesRemarks, setNotesRemarks] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // Section 3: Book Appointment State
  const [bookPatientName, setBookPatientName] = useState("");
  const [bookMobileNumber, setBookMobileNumber] = useState("");
  const [bookBranch, setBookBranch] = useState("KPHB Branch");
  const [bookDoctor, setBookDoctor] = useState("Dr. Prashanth K Vaidya");
  const [bookDate, setBookDate] = useState(getTodayDDMMYYYY());
  const [bookSlot, setBookSlot] = useState("11:00 AM");
  const [bookMode, setBookMode] = useState<"In-Clinic" | "Online">("In-Clinic");
  const [bookNotes, setBookNotes] = useState("");
  const [bookingAppt, setBookingAppt] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([
    { id: "1793864791241", name: "Dr. Prashanth K Vaidya", branchName: "All Branches" },
    { id: "1793864791242", name: "Dr. Jobeadh Begum", branchName: "Chandanagar Branch" },
    { id: "1793864791243", name: "Dr. Padma Priya", branchName: "KPHB Branch" },
    { id: "1793864791244", name: "Dr. Ramakrishna Chanduri", branchName: "Dilshuknagar Branch" },
  ]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/branches`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.branches) ? data.branches : []);
        if (list.length > 0) {
          const names: string[] = list.map((b: any) => (typeof b === "string" ? b.trim() : b.name?.trim())).filter(Boolean);
          if (names.length > 0) {
            setBookingBranches(Array.from(new Set(names)));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Load telecaller profile & assigned branch on mount
  useEffect(() => {
    (async () => {
      try {
        const branchObj = await getAssignedBranch();
        if (branchObj) {
          const bName = typeof branchObj === "string" ? branchObj : branchObj.name || "All Branches";
          setTelecallerProfile((prev) => ({
            ...prev,
            assignedBranch: bName,
          }));
          if (bName !== "All Branches") {
            setFollowUpBranch(bName);
            setHospitalBranch(bName);
            setBookBranch(bName);
          }
        }
      } catch (e) {
        console.warn("Failed reading assigned branch:", e);
      }
    })();
  }, []);

  // Fetch doctors
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/employees?category=DOCTOR`);
        const data = await res.json();
        if (data.success && Array.isArray(data.employees) && data.employees.length > 0) {
          setAvailableDoctors(data.employees);
        }
      } catch (err) {
        console.warn("Failed fetching doctors:", err);
      }
    })();
  }, []);

  // Fetch Follow-Ups
  const fetchFollowUps = useCallback(async () => {
    try {
      setLoadingFollowUps(true);
      let branchQuery = followUpBranch;
      if (branchQuery === "All Branches") branchQuery = "";

      const url = `${API_BASE_URL}/admin/all-follow-ups?branch=${encodeURIComponent(
        branchQuery
      )}&search=${encodeURIComponent(followUpSearch)}&period=${encodeURIComponent(
        followUpPeriod
      )}&pageSize=50`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.followUps)) {
        setFollowUps(data.followUps);
      }
    } catch (e) {
      console.warn("Failed fetching follow-ups:", e);
    } finally {
      setLoadingFollowUps(false);
      setRefreshingFollowUps(false);
    }
  }, [followUpBranch, followUpSearch, followUpPeriod]);

  useEffect(() => {
    if (activeTab === "followups") {
      fetchFollowUps();
    }
  }, [fetchFollowUps, activeTab]);

  // Fetch recent call logs for Section 2
  const fetchRecentLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/telecaller/call-logs`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setRecentLogs(data.logs.slice(0, 5));
      }
    } catch (err) {
      console.warn("Failed fetching recent logs:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "log_call") {
      fetchRecentLogs();
      setCallDateTime(getFormattedNow());
    }
  }, [activeTab]);

  // Handle Logout
  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out from the Telecaller desk?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await removeAuthToken();
          await clearAllAuthData();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  // One-click phone call
  const handleDial = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    Linking.openURL(`tel:${clean}`);
  };

  // Open reschedule modal for a follow-up
  const openRescheduleModal = (item: any) => {
    setSelectedFollowUp(item);
    setRescheduleDate(item.dueDate || getTodayDDMMYYYY());
    setRescheduleSlot(item.timeSlot || "11:00 AM");
    setRescheduleNotes(item.notes || "");
    setRescheduleModalVisible(true);
  };

  // Submit reschedule
  const handleConfirmReschedule = async () => {
    if (!selectedFollowUp) return;
    try {
      setRescheduling(true);
      const res = await fetch(`${API_BASE_URL}/admin/all-follow-ups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: selectedFollowUp.appointmentId || selectedFollowUp.id,
          rescheduleDate,
          rescheduleTimeSlot: rescheduleSlot,
          notes: rescheduleNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Alert.alert("Success", "Follow-up rescheduled successfully!");
        setRescheduleModalVisible(false);
        fetchFollowUps();
      } else {
        Alert.alert("Error", data.error || "Failed to reschedule follow-up.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reschedule.");
    } finally {
      setRescheduling(false);
    }
  };

  // Prefill Section 3 from follow-up card
  const handleBookFromFollowUp = (item: any) => {
    setBookPatientName(item.patientName || "");
    setBookMobileNumber((item.phone || "").replace(/\D/g, ""));
    if (item.branch) {
      setBookBranch(item.branch);
    }
    if (item.doctorName) {
      setBookDoctor(item.doctorName);
    }
    setBookDate(item.dueDate || getTodayDDMMYYYY());
    setActiveTab("book_appointment");
  };

  // Submit Call Update Form (Section 2)
  const handleSubmitCallUpdate = async () => {
    if (!patientName.trim()) {
      Alert.alert("Validation", "Patient Name is required.");
      return;
    }
    const cleanPhone = mobileNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      Alert.alert("Validation", "Please enter a valid 10-digit Mobile Number.");
      return;
    }
    if (!notesRemarks.trim()) {
      Alert.alert("Validation", "Notes & Remarks are required.");
      return;
    }

    try {
      setSubmittingLog(true);
      const res = await fetch(`${API_BASE_URL}/telecaller/call-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName.trim(),
          phone: cleanPhone,
          branch: hospitalBranch,
          dateTime: callDateTime,
          callOutcome,
          notes: notesRemarks.trim(),
          agentName: telecallerProfile.name,
          telecallerId: telecallerProfile.telecallerId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Alert.alert(
          "Call Update Logged!",
          `Call outcome "${callOutcome}" for ${patientName} has been saved and broadcasted to Admin & HR live stream.`
        );
        // Reset form
        setPatientName("");
        setMobileNumber("");
        setNotesRemarks("");
        setCallDateTime(getFormattedNow());
        fetchRecentLogs();
      } else {
        Alert.alert("Error", data.error || "Failed to log call update.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "An error occurred.");
    } finally {
      setSubmittingLog(false);
    }
  };

  // Submit Direct Appointment Booking (Section 3)
  const handleSubmitBooking = async () => {
    if (!bookPatientName.trim()) {
      Alert.alert("Validation", "Patient Name is required.");
      return;
    }
    const cleanPhone = bookMobileNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      Alert.alert("Validation", "Please enter a valid 10-digit Mobile Number.");
      return;
    }
    if (!bookDate.trim()) {
      Alert.alert("Validation", "Appointment Date is required.");
      return;
    }

    try {
      setBookingAppt(true);
      const matchedDoctor = availableDoctors.find((d) => d.name === bookDoctor) || availableDoctors[0];

      const res = await fetch(`${API_BASE_URL}/admin/all-follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: bookPatientName.trim(),
          phoneNumber: cleanPhone,
          branch: bookBranch,
          doctorId: matchedDoctor?.id || "1793864791241",
          doctorName: matchedDoctor?.name || bookDoctor,
          appointmentDate: bookDate,
          selectedTimeSlot: bookSlot,
          consultationMode: bookMode,
          notes: bookNotes.trim() || "Booked by telecaller desk",
          bookedByTelecallerId: telecallerProfile.telecallerId,
          bookedByTelecallerName: telecallerProfile.name,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTelecallerProfile((prev) => ({
          ...prev,
          bookedCount: prev.bookedCount + 1,
        }));
        Alert.alert(
          "Appointment Booked!",
          `Appointment confirmed for ${bookPatientName} with ${bookDoctor} on ${bookDate} at ${bookSlot} (${bookBranch}).\nToken: ${data.appointment?.token || "SPH-GEN"}`
        );
        // Clear
        setBookPatientName("");
        setBookMobileNumber("");
        setBookNotes("");
        setActiveTab("followups");
      } else {
        Alert.alert("Booking Failed", data.error || "Unable to confirm appointment slot.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to book appointment.");
    } finally {
      setBookingAppt(false);
    }
  };

  const isRestrictedBranch = telecallerProfile.assignedBranch !== "All Branches";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Telecaller Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={styles.avatarBox}>
              <Ionicons name="headset" size={16} color="#0284c7" />
            </View>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.headerName}>{telecallerProfile.name}</Text>
                <View style={styles.idChip}>
                  <Text style={styles.idChipText}>{telecallerProfile.telecallerId}</Text>
                </View>
              </View>
              <Text style={styles.headerBranch}>
                Branch: {telecallerProfile.assignedBranch}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color="#ef4444" />
          <Text style={styles.logoutBtnText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* SECTION 1: FOLLOW-UPS (BRANCH-WISE & RECEPTION STYLE FILTERS) */}
      {/* ========================================================================= */}
      {activeTab === "followups" && (
        <View style={{ flex: 1 }}>
          {/* Branch Filter Pills */}
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {isRestrictedBranch ? (
                <View style={[styles.branchFilterChip, styles.branchFilterChipActive]}>
                  <Text style={[styles.branchFilterText, styles.branchFilterTextActive]}>
                    🔒 {telecallerProfile.assignedBranch}
                  </Text>
                </View>
              ) : (
                allBranches.map((b: string) => (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.branchFilterChip,
                      followUpBranch === b && styles.branchFilterChipActive,
                    ]}
                    onPress={() => setFollowUpBranch(b)}
                  >
                    <Text
                      style={[
                        styles.branchFilterText,
                        followUpBranch === b && styles.branchFilterTextActive,
                      ]}
                    >
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {/* Period Filter Pills (Reception Style: All, Today, Week, Month) */}
          <View style={styles.periodFilterBar}>
            {[
              { id: "all", label: "All" },
              { id: "today", label: "Today" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
            ].map((p) => {
              const isSel = followUpPeriod === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.periodChip, isSel && styles.periodChipActive]}
                  onPress={() => setFollowUpPeriod(p.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.periodChipText, isSel && styles.periodChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchField}
              placeholder="Search patient, phone, reg ID..."
              placeholderTextColor="#94a3b8"
              value={followUpSearch}
              onChangeText={setFollowUpSearch}
              onSubmitEditing={fetchFollowUps}
            />
            {followUpSearch.length > 0 && (
              <TouchableOpacity onPress={() => setFollowUpSearch("")}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Follow-Ups List */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshingFollowUps}
                onRefresh={() => {
                  setRefreshingFollowUps(true);
                  fetchFollowUps();
                }}
                colors={["#0284c7"]}
              />
            }
          >
            {loadingFollowUps && !refreshingFollowUps ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
            ) : followUps.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No pending follow-ups</Text>
                <Text style={styles.emptySub}>
                  No patient follow-ups found for the selected branch filter.
                </Text>
              </View>
            ) : (
              followUps.map((item, idx) => (
                <View key={item.id || idx} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{item.patientName}</Text>
                      <Text style={styles.regText}>
                        ID: {item.registrationId || "SPH-GEN"} • {item.branch}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.dialBtn}
                      onPress={() => handleDial(item.phone)}
                    >
                      <Ionicons name="call" size={14} color="#ffffff" />
                      <Text style={styles.dialBtnText}>Call</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.badgeDue}>
                      <Ionicons name="calendar-outline" size={12} color="#b45309" />
                      <Text style={styles.badgeDueText}>
                        Due: {item.dueDate || item.followUpDate || "Overdue"}
                      </Text>
                    </View>
                    <Text style={styles.doctorText}>
                      Dr. {item.doctorName || "Prashanth K Vaidya"}
                    </Text>
                  </View>

                  {item.notes ? (
                    <Text style={styles.itemNotes} numberOfLines={2}>
                      📝 {item.notes}
                    </Text>
                  ) : null}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtnOutline}
                      onPress={() => openRescheduleModal(item)}
                    >
                      <Ionicons name="time-outline" size={14} color="#0284c7" />
                      <Text style={styles.actionBtnOutlineText}>Reschedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnSolid}
                      onPress={() => handleBookFromFollowUp(item)}
                    >
                      <Ionicons name="calendar" size={14} color="#ffffff" />
                      <Text style={styles.actionBtnSolidText}>Book Appt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: LOG CALL UPDATE FORM */}
      {/* ========================================================================= */}
      {activeTab === "log_call" && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconBox}>
                <Ionicons name="call" size={18} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Enter Telecaller Update</Text>
                <Text style={styles.formSubtitle}>
                  Log a patient call, conversation notes, and outcome
                </Text>
              </View>
            </View>

            {/* Patient Name */}
            <Text style={styles.inputLabel}>
              Patient Name: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#94a3b8"
              value={patientName}
              onChangeText={setPatientName}
            />

            {/* Mobile Number */}
            <Text style={styles.inputLabel}>
              Mobile Number: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobileNumber}
              onChangeText={(val) => setMobileNumber(val.replace(/\D/g, ""))}
            />

            {/* Hospital Branch */}
            <Text style={styles.inputLabel}>
              Hospital Branch: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <View style={styles.pillSelectorWrap}>
              {bookingBranches.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.selectorPill,
                    hospitalBranch === b && styles.selectorPillActive,
                  ]}
                  onPress={() => setHospitalBranch(b)}
                >
                  <Text
                    style={[
                      styles.selectorPillText,
                      hospitalBranch === b && styles.selectorPillTextActive,
                    ]}
                  >
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date & Time */}
            <Text style={styles.inputLabel}>
              Date &amp; Time: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={callDateTime}
              onChangeText={setCallDateTime}
              placeholder="DD/MM/YYYY hh:mm AM/PM"
              placeholderTextColor="#94a3b8"
            />

            {/* Call Outcome / Status */}
            <Text style={styles.inputLabel}>
              Call Outcome / Status: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <View style={styles.pillSelectorWrap}>
              {CALL_OUTCOMES.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={[
                    styles.outcomePill,
                    callOutcome === o.id && {
                      backgroundColor: o.bg,
                      borderColor: o.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setCallOutcome(o.id)}
                >
                  <Text
                    style={[
                      styles.outcomePillText,
                      callOutcome === o.id && { color: o.color, fontWeight: "900" },
                    ]}
                  >
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes & Remarks */}
            <Text style={styles.inputLabel}>
              Notes &amp; Remarks: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, { height: 90, textAlignVertical: "top" }]}
              multiline
              placeholder="Enter patient conversation details, medicine response, or follow-up feedback..."
              placeholderTextColor="#94a3b8"
              value={notesRemarks}
              onChangeText={setNotesRemarks}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitCallUpdate}
              disabled={submittingLog}
            >
              {submittingLog ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Submit Call Update</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Recent Call Logs Live Stream */}
          <Text style={styles.sectionHeaderTitle}>Live Telecaller Activity &amp; Call Logs</Text>
          {recentLogs.map((log) => (
            <View key={log.id} style={styles.streamCard}>
              <View style={styles.streamTop}>
                <View>
                  <Text style={styles.streamPatient}>{log.patientName}</Text>
                  <Text style={styles.streamPhone}>📞 {log.phone} • {log.branch}</Text>
                </View>
                <View style={styles.streamOutcomeBadge}>
                  <Text style={styles.streamOutcomeText}>{log.callOutcome}</Text>
                </View>
              </View>
              <Text style={styles.streamNotes}>{log.notes}</Text>
              <Text style={styles.streamTime}>{log.dateTime} • by {log.agentName}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: BOOK APPOINTMENT (MULTI-BRANCH) */}
      {/* ========================================================================= */}
      {activeTab === "book_appointment" && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconBox}>
                <Ionicons name="calendar" size={18} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Book Patient Appointment</Text>
                <Text style={styles.formSubtitle}>
                  Schedule in-clinic or teleconsultation across hospital branches
                </Text>
              </View>
            </View>

            {/* Patient Name */}
            <Text style={styles.inputLabel}>
              Patient Name: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#94a3b8"
              value={bookPatientName}
              onChangeText={setBookPatientName}
            />

            {/* Mobile Number */}
            <Text style={styles.inputLabel}>
              Mobile Number: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              value={bookMobileNumber}
              onChangeText={(val) => setBookMobileNumber(val.replace(/\D/g, ""))}
            />

            {/* Hospital Branch Selector */}
            <Text style={styles.inputLabel}>
              Hospital Branch: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <View style={styles.pillSelectorWrap}>
              {bookingBranches.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.selectorPill,
                    bookBranch === b && styles.selectorPillActive,
                  ]}
                  onPress={() => setBookBranch(b)}
                >
                  <Text
                    style={[
                      styles.selectorPillText,
                      bookBranch === b && styles.selectorPillTextActive,
                    ]}
                  >
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Doctor Selector */}
            <Text style={styles.inputLabel}>
              Select Doctor: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <View style={styles.pillSelectorWrap}>
              {availableDoctors.map((doc) => (
                <TouchableOpacity
                  key={doc.id || doc.name}
                  style={[
                    styles.selectorPill,
                    bookDoctor === doc.name && styles.selectorPillActive,
                  ]}
                  onPress={() => setBookDoctor(doc.name)}
                >
                  <Text
                    style={[
                      styles.selectorPillText,
                      bookDoctor === doc.name && styles.selectorPillTextActive,
                    ]}
                  >
                    {doc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Appointment Date */}
            <Text style={styles.inputLabel}>
              Appointment Date (DD-MM-YYYY): <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={bookDate}
              onChangeText={setBookDate}
              placeholder="DD-MM-YYYY"
              placeholderTextColor="#94a3b8"
            />

            {/* Time Slot */}
            <Text style={styles.inputLabel}>
              Time Slot: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <View style={styles.slotWrap}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.slotChip,
                    bookSlot === slot && styles.slotChipActive,
                  ]}
                  onPress={() => setBookSlot(slot)}
                >
                  <Text
                    style={[
                      styles.slotChipText,
                      bookSlot === slot && styles.slotChipTextActive,
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mode */}
            <Text style={styles.inputLabel}>Consultation Mode:</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  bookMode === "In-Clinic" && styles.modeBtnActive,
                ]}
                onPress={() => setBookMode("In-Clinic")}
              >
                <Ionicons
                  name="business"
                  size={14}
                  color={bookMode === "In-Clinic" ? "#ffffff" : "#475569"}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    bookMode === "In-Clinic" && styles.modeBtnTextActive,
                  ]}
                >
                  In-Clinic Visit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  bookMode === "Online" && styles.modeBtnActive,
                ]}
                onPress={() => setBookMode("Online")}
              >
                <Ionicons
                  name="videocam"
                  size={14}
                  color={bookMode === "Online" ? "#ffffff" : "#475569"}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    bookMode === "Online" && styles.modeBtnTextActive,
                  ]}
                >
                  Teleconsultation
                </Text>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <Text style={styles.inputLabel}>Notes / Complaints:</Text>
            <TextInput
              style={[styles.textInput, { height: 65, textAlignVertical: "top" }]}
              multiline
              placeholder="Reason for appointment or patient symptoms..."
              placeholderTextColor="#94a3b8"
              value={bookNotes}
              onChangeText={setBookNotes}
            />

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitBooking}
              disabled={bookingAppt}
            >
              {bookingAppt ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Confirm &amp; Book Appointment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Reschedule Follow-up Modal */}
      <Modal visible={rescheduleModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Follow-Up</Text>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedFollowUp && (
              <View style={styles.modalPatientBanner}>
                <Text style={styles.modalPatientName}>{selectedFollowUp.patientName}</Text>
                <Text style={styles.modalPatientSub}>
                  {selectedFollowUp.phone} • {selectedFollowUp.branch}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>New Follow-Up Date (DD-MM-YYYY):</Text>
            <TextInput
              style={styles.textInput}
              value={rescheduleDate}
              onChangeText={setRescheduleDate}
              placeholder="DD-MM-YYYY"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Preferred Time Slot:</Text>
            <View style={styles.slotWrap}>
              {TIME_SLOTS.slice(0, 8).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.slotChip,
                    rescheduleSlot === s && styles.slotChipActive,
                  ]}
                  onPress={() => setRescheduleSlot(s)}
                >
                  <Text
                    style={[
                      styles.slotChipText,
                      rescheduleSlot === s && styles.slotChipTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reschedule Reason / Notes:</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              multiline
              value={rescheduleNotes}
              onChangeText={setRescheduleNotes}
              placeholder="e.g. Patient requested Friday evening slot"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRescheduleModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleConfirmReschedule}
                disabled={rescheduling}
              >
                {rescheduling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Update Schedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom Navigation Bar */}
      <TelecallerBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  avatarBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  headerName: { fontSize: 14.5, fontWeight: "800", color: "#0f172a" },
  idChip: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  idChipText: { fontSize: 10, fontWeight: "900", color: "#0284c7", fontFamily: "monospace" },
  headerBranch: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  logoutBtnText: { fontSize: 11.5, fontWeight: "800", color: "#ef4444" },
  navBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 6,
  },
  navItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  navItemActive: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  navText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  navTextActive: { color: "#0284c7", fontWeight: "800" },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10 },
  branchFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  branchFilterChipActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  branchFilterText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  branchFilterTextActive: { color: "#ffffff" },
  periodFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  periodChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  periodChipTextActive: {
    color: "#ffffff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchField: { flex: 1, fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  patientName: { fontSize: 14.5, fontWeight: "800", color: "#0f172a" },
  regText: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  dialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dialBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  badgeDue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeDueText: { fontSize: 11, fontWeight: "800", color: "#b45309" },
  doctorText: { fontSize: 11.5, color: "#475569", fontWeight: "700" },
  itemNotes: { fontSize: 11.5, color: "#64748b", marginTop: 8, fontStyle: "italic" },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  actionBtnOutlineText: { fontSize: 11.5, fontWeight: "800", color: "#0284c7" },
  actionBtnSolid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0284c7",
  },
  actionBtnSolidText: { fontSize: 11.5, fontWeight: "800", color: "#ffffff" },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  formIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  formSubtitle: { fontSize: 11, color: "#64748b", marginTop: 2 },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#334155",
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  pillSelectorWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  selectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectorPillActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  selectorPillText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  selectorPillTextActive: { color: "#ffffff" },
  outcomePill: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  outcomePillText: { fontSize: 11.5, fontWeight: "700", color: "#475569" },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  slotChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  slotChipActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  slotChipText: { fontSize: 10.5, fontWeight: "700", color: "#475569" },
  slotChipTextActive: { color: "#ffffff" },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modeBtnActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  modeBtnText: { fontSize: 11.5, fontWeight: "700", color: "#475569" },
  modeBtnTextActive: { color: "#ffffff", fontWeight: "800" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#0284c7",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  sectionHeaderTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 16,
    marginBottom: 4,
  },
  streamCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  streamTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  streamPatient: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  streamPhone: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  streamOutcomeBadge: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  streamOutcomeText: { fontSize: 10.5, fontWeight: "800", color: "#16a34a" },
  streamNotes: { fontSize: 11.5, color: "#334155", marginVertical: 6, lineHeight: 16 },
  streamTime: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b", marginTop: 12 },
  emptySub: { fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  modalPatientBanner: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  modalPatientName: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  modalPatientSub: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { fontSize: 12.5, fontWeight: "800", color: "#64748b" },
  saveBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: { fontSize: 12.5, fontWeight: "800", color: "#ffffff" },
});
