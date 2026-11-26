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
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { removeAuthToken, clearAllAuthData, getAssignedBranch, getActiveStaff } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";
import { TelecallerBottomNav } from "../../components/telecaller/TelecallerBottomNav";
import AnalogClockPicker from "../../components/AnalogClockPicker";

type TelecallerTab = "followups" | "log_call" | "logged_calls" | "book_appointment";

const LOGGED_CALLS_PAGE_SIZE = 26;

const LOG_OUTCOME_FILTER_OPTIONS = [
  "All Outcomes",
  "Interested",
  "Callback",
  "Not Interested",
  "No Response",
  "Switched Off / Busy",
  "Other",
];

function getLogMonthKey(log: any): string {
  const raw = log?.createdAt || log?.dateTime || "";
  if (!raw) return "";
  const str = String(raw).trim();
  const dmyMatch = str.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}`;
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  }
  return "";
}

function formatMonthLabel(monthKey: string): string {
  if (!monthKey) return "All Months";
  const [y, m] = monthKey.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] || m} ${y}`;
}

const DEFAULT_BOOKING_BRANCHES: string[] = [];

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
  { id: "Callback", label: "Callback", color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
  { id: "Not Interested", label: "Not Interested", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  { id: "No Response", label: "No Response", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
  { id: "Switched Off / Busy", label: "Switched Off / Busy", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { id: "Other", label: "Other", color: "#475569", bg: "#f8fafc", border: "#cbd5e1" },
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
  const searchParams = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TelecallerTab>("followups");

  useEffect(() => {
    if (
      searchParams?.tab === "book_appointment" ||
      searchParams?.tab === "log_call" ||
      searchParams?.tab === "logged_calls" ||
      searchParams?.tab === "followups"
    ) {
      setActiveTab(searchParams.tab as TelecallerTab);
    }
  }, [searchParams?.tab]);

  // Telecaller Profile info
  const [telecallerProfile, setTelecallerProfile] = useState({
    name: "Telecaller",
    telecallerId: "",
    assignedBranch: "All Branches",
    bookedCount: 0,
  });

  // Section 1: Follow-Ups State
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [refreshingFollowUps, setRefreshingFollowUps] = useState(false);
  const [followUpSearch, setFollowUpSearch] = useState("");
  const [followUpBranch, setFollowUpBranch] = useState("All Branches");
  const [followUpPeriod, setFollowUpPeriod] = useState("due_today");
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
  const [hospitalBranch, setHospitalBranch] = useState("");
  const [callDateTime, setCallDateTime] = useState(getFormattedNow());
  const [callOutcome, setCallOutcome] = useState("Interested");
  const [customCallOutcome, setCustomCallOutcome] = useState("");
  const [showOutcomeDropdown, setShowOutcomeDropdown] = useState(false);
  const [logCallbackDate, setLogCallbackDate] = useState(getTodayDDMMYYYY());
  const [logCallbackTime, setLogCallbackTime] = useState("10:00 AM");
  const [showCallClockModal, setShowCallClockModal] = useState(false);
  const [notesRemarks, setNotesRemarks] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logBranchFilter, setLogBranchFilter] = useState("All Branches");
  const [logOutcomeFilter, setLogOutcomeFilter] = useState("All Outcomes");
  const [logMonthFilter, setLogMonthFilter] = useState("");
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [showLogMonthModal, setShowLogMonthModal] = useState(false);

  // Section 3: Book Appointment State
  const [bookFollowUpId, setBookFollowUpId] = useState<string | null>(null);
  const [bookPatientName, setBookPatientName] = useState("");
  const [bookMobileNumber, setBookMobileNumber] = useState("");
  const [bookBranch, setBookBranch] = useState("");
  const [bookDoctor, setBookDoctor] = useState("");
  const [bookDate, setBookDate] = useState(getTodayDDMMYYYY());
  const [bookSlot, setBookSlot] = useState("11:00 AM");
  const [bookMode, setBookMode] = useState<"In-Clinic" | "Online">("In-Clinic");
  const [bookNotes, setBookNotes] = useState("");

  // Calendar Modal State
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<"book" | "reschedule" | "call_log">("book");
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

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

  const openCalendar = (target: "book" | "reschedule" | "call_log") => {
    setCalendarTarget(target);
    const currentDate =
      target === "book" ? bookDate : target === "call_log" ? logCallbackDate : rescheduleDate;
    if (currentDate && currentDate.includes("-")) {
      const parts = currentDate.split("-");
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          const y = parseInt(parts[2], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (!isNaN(y) && !isNaN(m)) {
            setCalYear(y);
            setCalMonth(m);
          }
        } else if (parts[0].length === 4) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (!isNaN(y) && !isNaN(m)) {
            setCalYear(y);
            setCalMonth(m);
          }
        }
      }
    }
    setCalendarModalOpen(true);
  };

  const handleSelectDay = (formatted: string) => {
    if (calendarTarget === "book") {
      setBookDate(formatted);
    } else if (calendarTarget === "call_log") {
      setLogCallbackDate(formatted);
    } else {
      setRescheduleDate(formatted);
    }
    setCalendarModalOpen(false);
  };
  const [bookingAppt, setBookingAppt] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/branches`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.branches) ? data.branches : []);
        if (list.length > 0) {
          const names: string[] = list.map((b: any) => (typeof b === "string" ? b.trim() : b.name?.trim())).filter(Boolean);
          if (names.length > 0) {
            const unique = Array.from(new Set(names));
            setBookingBranches(unique);
            setHospitalBranch((prev) => prev || unique[0]);
            setBookBranch((prev) => prev || unique[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Load telecaller profile & assigned branch on mount
  useEffect(() => {
    (async () => {
      try {
        const staffObj = await getActiveStaff();
        if (staffObj) {
          setTelecallerProfile((prev) => ({
            ...prev,
            name: staffObj.name || staffObj.fullName || prev.name,
            telecallerId: staffObj.id || staffObj.employeeId || staffObj.code || prev.telecallerId,
            assignedBranch: staffObj.branch || staffObj.branchName || prev.assignedBranch,
          }));
        }
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
        console.warn("Failed reading staff/assigned branch:", e);
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
          const prashant = data.employees.find((d: any) => (d.name || "").toLowerCase().includes("prashant"));
          const chosen = prashant || data.employees[0];
          if (chosen) {
            setBookDoctor((prev) => prev || chosen.name);
          }
        }
      } catch (err) {
        console.warn("Failed fetching doctors:", err);
      }
    })();
  }, []);

  // Fetch Follow-Ups (Synced with Reception Follow-ups)
  const fetchFollowUps = useCallback(async () => {
    try {
      setLoadingFollowUps(true);
      let branchQuery = followUpBranch;
      if (branchQuery === "All Branches") branchQuery = "";

      const url = `${API_BASE_URL}/reception/follow-ups?branch=${encodeURIComponent(
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

  // Fetch all logged call updates
  const fetchRecentLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch(`${API_BASE_URL}/telecaller/call-logs`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setRecentLogs(data.logs);
      }
    } catch (err) {
      console.warn("Failed fetching recent logs:", err);
    } finally {
      setLoadingLogs(false);
      setRefreshingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "log_call") {
      setCallDateTime(getFormattedNow());
    } else if (activeTab === "logged_calls") {
      fetchRecentLogs();
    }
  }, [activeTab, fetchRecentLogs]);

  const availableLogMonths = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    recentLogs.forEach((log) => {
      const k = getLogMonthKey(log);
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [recentLogs]);

  const filteredCallLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return recentLogs.filter((log) => {
      if (logBranchFilter !== "All Branches") {
        if ((log.branch || "").toLowerCase() !== logBranchFilter.toLowerCase()) return false;
      }
      if (logOutcomeFilter !== "All Outcomes") {
        const outcome = (log.callOutcome || "").trim().toLowerCase();
        if (logOutcomeFilter === "Other") {
          const standard = ["interested", "callback", "not interested", "no response", "switched off / busy"];
          if (standard.includes(outcome)) return false;
        } else if (outcome !== logOutcomeFilter.toLowerCase()) {
          return false;
        }
      }
      if (logMonthFilter) {
        if (getLogMonthKey(log) !== logMonthFilter) return false;
      }
      if (q) {
        const hay = `${log.patientName || ""} ${log.phone || ""} ${log.branch || ""} ${log.callOutcome || ""} ${log.notes || ""} ${log.agentName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recentLogs, logSearch, logBranchFilter, logOutcomeFilter, logMonthFilter]);

  useEffect(() => {
    setLogCurrentPage(1);
  }, [logSearch, logBranchFilter, logOutcomeFilter, logMonthFilter]);

  const logTotalPages = Math.max(1, Math.ceil(filteredCallLogs.length / LOGGED_CALLS_PAGE_SIZE));
  const safeLogPage = Math.min(logCurrentPage, logTotalPages);
  const paginatedCallLogs = useMemo(() => {
    const start = (safeLogPage - 1) * LOGGED_CALLS_PAGE_SIZE;
    return filteredCallLogs.slice(start, start + LOGGED_CALLS_PAGE_SIZE);
  }, [filteredCallLogs, safeLogPage]);

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

  // Submit reschedule (Synced with Reception PATCH endpoint)
  const handleConfirmReschedule = async () => {
    if (!selectedFollowUp) return;
    try {
      setRescheduling(true);
      const res = await fetch(`${API_BASE_URL}/reception/follow-ups`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: selectedFollowUp.appointmentId || selectedFollowUp.id,
          newFollowUpDate: rescheduleDate,
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
    setBookFollowUpId(item.appointmentId || item.id || null);
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
      const finalOutcome =
        callOutcome === "Other" ? customCallOutcome.trim() || "Other" : callOutcome;
      const isNotInterested = callOutcome === "Not Interested";
      const scheduleSuffix =
        !isNotInterested && logCallbackDate
          ? ` [Follow-up: ${logCallbackDate} ${logCallbackTime}]`
          : "";
      const finalNotes = `${notesRemarks.trim()}${scheduleSuffix}`.trim();

      const res = await fetch(`${API_BASE_URL}/telecaller/call-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName.trim(),
          phone: cleanPhone,
          branch: hospitalBranch,
          dateTime: new Date().toISOString(),
          callbackDate: isNotInterested ? undefined : logCallbackDate,
          callbackTime: isNotInterested ? undefined : logCallbackTime,
          callOutcome: finalOutcome,
          notes: finalNotes,
          agentName: telecallerProfile.name,
          telecallerId: telecallerProfile.telecallerId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Alert.alert(
          "Call Update Logged!",
          `Call outcome "${finalOutcome}" for ${patientName} has been saved.`
        );
        // Reset form
        setPatientName("");
        setMobileNumber("");
        setNotesRemarks("");
        setCustomCallOutcome("");
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

      const res = await fetch(`${API_BASE_URL}/reception/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: bookFollowUpId,
          followUpAppointmentId: bookFollowUpId,
          patientName: bookPatientName.trim(),
          phoneNumber: cleanPhone,
          branch: bookBranch,
          doctorId: matchedDoctor?.id || "1793864791241",
          doctorName: matchedDoctor?.name || bookDoctor,
          appointmentDate: bookDate,
          selectedTimeSlot: bookSlot,
          consultationMode: bookMode,
          diseases: "Follow-up Booking",
          notes: bookNotes.trim() || "Booked by telecaller desk",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTelecallerProfile((prev) => ({
          ...prev,
          bookedCount: prev.bookedCount + 1,
        }));
        if (bookFollowUpId) {
          setFollowUps((prev) =>
            prev.filter(
              (f) => f.id !== bookFollowUpId && f.appointmentId !== bookFollowUpId
            )
          );
        }
        Alert.alert(
          "Appointment Booked!",
          `Appointment confirmed for ${bookPatientName} with ${bookDoctor} on ${bookDate} at ${bookSlot} (${bookBranch}).\nPatient shifted from follow-up to confirmed appointments queue.\nToken: ${data.appointment?.token || "SPH-GEN"}`
        );
        // Clear
        setBookFollowUpId(null);
        setBookPatientName("");
        setBookMobileNumber("");
        setBookNotes("");
        setActiveTab("followups");
        fetchFollowUps();
      } else {
        Alert.alert("Booking Failed", data.error || "Unable to confirm appointment slot.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to book appointment.");
    } finally {
      setBookingAppt(false);
    }
  };

  // Telecallers have multi-branch access to call and book across all hospital branches
  const isRestrictedBranch = false;

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
          {/* Patient Follow-Up Calling Roster Header Card */}
          <View style={styles.rosterHeaderCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <View style={styles.rosterIconBox}>
                  <Ionicons name="calendar-outline" size={17} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rosterTitle} numberOfLines={1}>Patient Follow-Up Calling Roster</Text>
                  <Text style={styles.rosterSub} numberOfLines={1}>Live calling queue for branch reviews & bookings</Text>
                </View>
              </View>
              <View style={styles.rosterCountBadge}>
                <Text style={styles.rosterCountText}>{followUps.length} Patients</Text>
              </View>
            </View>
          </View>

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

          {/* Period Filter Pills (Exact Reception Sync: Today, Tomorrow, This Month, Next Month, Overdue, All) */}
          <View style={styles.periodFilterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {[
                { id: "due_today", label: "Today" },
                { id: "due_tomorrow", label: "Tomorrow" },
                { id: "this_month", label: "This Month" },
                { id: "next_month", label: "Next Month" },
                { id: "overdue", label: "Overdue" },
                { id: "all", label: "All Follow-Ups" },
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
            </ScrollView>
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
                        ID: {item.mrn || item.registrationId || item.regId || "—"} • {item.branch || "All Branches"}
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
                      {item.doctorName ? (item.doctorName.startsWith("Dr.") ? item.doctorName : `Dr. ${item.doctorName}`) : ""}
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
              <TouchableOpacity
                onPress={() => setActiveTab("logged_calls")}
                style={{
                  backgroundColor: "#f0f9ff",
                  borderWidth: 1,
                  borderColor: "#bae6fd",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#0284c7" }}>
                  Logged Calls
                </Text>
              </TouchableOpacity>
            </View>

            {/* Patient Name */}
            <Text style={styles.inputLabel}>
              Patient Name: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter patient full name"
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

            {/* Call Outcome Dropdown */}
            <Text style={styles.inputLabel}>
              Call Outcome: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowOutcomeDropdown(true)}
              style={styles.dateSelectorBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="list-outline" size={18} color="#0284c7" />
              <Text style={styles.dateSelectorBtnText}>
                {CALL_OUTCOMES.find((o) => o.id === callOutcome)?.label || callOutcome}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            {/* Custom Outcome Input when Other is selected */}
            {callOutcome === "Other" && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.inputLabel}>
                  Specify Other Outcome: <Text style={{ color: "#ef4444" }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter custom call outcome..."
                  placeholderTextColor="#94a3b8"
                  value={customCallOutcome}
                  onChangeText={setCustomCallOutcome}
                />
              </View>
            )}

            {/* Follow-up Date (Calendar) & Time (Analog Clock) - Hidden when Not Interested */}
            {callOutcome !== "Not Interested" && (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>
                    Follow-up Date: <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => openCalendar("call_log")}
                    style={styles.dateSelectorBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#0284c7" />
                    <Text style={[styles.dateSelectorBtnText, { fontSize: 12 }]}>
                      {logCallbackDate || "Select Date"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>
                    Follow-up Time: <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCallClockModal(true)}
                    style={styles.dateSelectorBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={16} color="#0284c7" />
                    <Text style={[styles.dateSelectorBtnText, { fontSize: 12 }]}>
                      {logCallbackTime || "10:00 AM"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2B: LOGGED CALL UPDATES (SEPARATE TAB WITH FILTERS & PAGINATION)  */}
      {/* ========================================================================= */}
      {activeTab === "logged_calls" && (
        <View style={{ flex: 1 }}>
          {/* Header Card */}
          <View style={styles.rosterHeaderCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.rosterIconBox}>
                <Ionicons name="list" size={18} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rosterTitle}>Logged Call Updates</Text>
                <Text style={styles.rosterSub}>
                  Filter by month, branch, outcome or search • 26 per page
                </Text>
              </View>
              <View style={styles.rosterCountBadge}>
                <Text style={styles.rosterCountText}>{filteredCallLogs.length} Logs</Text>
              </View>
            </View>
          </View>

          {/* Search & Month Filter Row */}
          <View style={{ paddingTop: 8, gap: 4 }}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchField}
                placeholder="Search patient, mobile, notes, outcome..."
                placeholderTextColor="#94a3b8"
                value={logSearch}
                onChangeText={setLogSearch}
              />
              {logSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLogSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.monthFilterRow, { paddingHorizontal: 16 }]}>
              <TouchableOpacity
                style={[styles.monthFilterBtn, logMonthFilter ? styles.monthFilterBtnActive : null]}
                onPress={() => setShowLogMonthModal(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={logMonthFilter ? "#0284c7" : "#64748b"}
                />
                <Text
                  style={[
                    styles.monthFilterBtnText,
                    logMonthFilter ? { color: "#0284c7" } : null,
                  ]}
                >
                  Month: {formatMonthLabel(logMonthFilter)}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#64748b" />
              </TouchableOpacity>

              {logMonthFilter ? (
                <TouchableOpacity
                  style={styles.monthClearBtn}
                  onPress={() => setLogMonthFilter("")}
                >
                  <Text style={styles.monthClearBtnText}>Clear</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.monthClearBtn}
                onPress={() => setActiveTab("log_call")}
              >
                <Text style={[styles.monthClearBtnText, { color: "#0284c7" }]}>+ Log Call</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Branch Filter Chips */}
          <View style={[styles.filterBar, { paddingBottom: 4 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {allBranches.map((br) => (
                <TouchableOpacity
                  key={`log-br-${br}`}
                  onPress={() => setLogBranchFilter(br)}
                  style={[
                    styles.branchFilterChip,
                    logBranchFilter === br && styles.branchFilterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.branchFilterText,
                      logBranchFilter === br && styles.branchFilterTextActive,
                    ]}
                  >
                    {br}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Call Outcome Filter Chips */}
          <View style={[styles.filterBar, { paddingTop: 2, paddingBottom: 8 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {LOG_OUTCOME_FILTER_OPTIONS.map((out) => (
                <TouchableOpacity
                  key={`log-out-${out}`}
                  onPress={() => setLogOutcomeFilter(out)}
                  style={[
                    styles.branchFilterChip,
                    logOutcomeFilter === out && styles.branchFilterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.branchFilterText,
                      logOutcomeFilter === out && styles.branchFilterTextActive,
                    ]}
                  >
                    {out}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshingLogs}
                onRefresh={() => {
                  setRefreshingLogs(true);
                  fetchRecentLogs();
                }}
              />
            }
          >
            {loadingLogs && recentLogs.length === 0 ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={styles.emptyText}>Loading logged call updates...</Text>
              </View>
            ) : paginatedCallLogs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={42} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Call Updates Found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your month, branch, outcome, or search filter.
                </Text>
              </View>
            ) : (
              <>
                {paginatedCallLogs.map((log) => (
                  <View key={log.id} style={styles.streamCard}>
                    <View style={styles.streamTop}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
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

                {/* Pagination Bar (26 per page) */}
                <View style={styles.paginationBar}>
                  <TouchableOpacity
                    disabled={safeLogPage <= 1}
                    onPress={() => setLogCurrentPage((p) => Math.max(1, p - 1))}
                    style={[styles.paginationBtn, safeLogPage <= 1 && styles.paginationBtnDisabled]}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={14}
                      color={safeLogPage <= 1 ? "#94a3b8" : "#0f172a"}
                    />
                    <Text
                      style={[
                        styles.paginationBtnText,
                        safeLogPage <= 1 && { color: "#94a3b8" },
                      ]}
                    >
                      Prev
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.paginationInfoText}>
                    Page {safeLogPage} of {logTotalPages} ({filteredCallLogs.length} total)
                  </Text>

                  <TouchableOpacity
                    disabled={safeLogPage >= logTotalPages}
                    onPress={() => setLogCurrentPage((p) => Math.min(logTotalPages, p + 1))}
                    style={[
                      styles.paginationBtn,
                      safeLogPage >= logTotalPages && styles.paginationBtnDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paginationBtnText,
                        safeLogPage >= logTotalPages && { color: "#94a3b8" },
                      ]}
                    >
                      Next
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={safeLogPage >= logTotalPages ? "#94a3b8" : "#0f172a"}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
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
              placeholder="Enter patient full name"
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

            {/* Appointment Date with Interactive Calendar Picker */}
            <Text style={styles.inputLabel}>
              Appointment Date: <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => openCalendar("book")}
              style={styles.dateSelectorBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color="#0284c7" />
              <Text style={styles.dateSelectorBtnText}>
                {bookDate || "Select Appointment Date"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

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

            <Text style={styles.inputLabel}>New Follow-Up Date: <Text style={{ color: "#ef4444" }}>*</Text></Text>
            <TouchableOpacity
              onPress={() => openCalendar("reschedule")}
              style={styles.dateSelectorBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color="#0284c7" />
              <Text style={styles.dateSelectorBtnText}>
                {rescheduleDate || "Select New Date"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

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

      {/* Interactive Calendar Modal */}
      <Modal
        visible={calendarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.calModalOverlay}
          activeOpacity={1}
          onPress={() => setCalendarModalOpen(false)}
        >
          <View style={styles.calModalContainer} onStartShouldSetResponder={() => true}>
            {/* Calendar Nav Header */}
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

              <Text style={styles.calMonthTitle}>
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

            {/* Weekdays Row */}
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
                const targetDate =
                  calendarTarget === "book"
                    ? bookDate
                    : calendarTarget === "call_log"
                    ? logCallbackDate
                    : rescheduleDate;
                const isSelected = targetDate === formatted;

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => handleSelectDay(formatted)}
                    style={[
                      styles.calDayCell,
                      isSelected && styles.calDayCellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        isSelected && styles.calDayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Actions (Today, Tomorrow, Close) */}
            <View style={styles.calQuickActionsRow}>
              <TouchableOpacity
                style={styles.calQuickBtn}
                onPress={() => handleSelectDay(getTodayDDMMYYYY())}
              >
                <Text style={styles.calQuickBtnText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calQuickBtn}
                onPress={() => {
                  const tom = new Date();
                  tom.setDate(tom.getDate() + 1);
                  const day = String(tom.getDate()).padStart(2, "0");
                  const month = String(tom.getMonth() + 1).padStart(2, "0");
                  const year = tom.getFullYear();
                  handleSelectDay(`${day}-${month}-${year}`);
                }}
              >
                <Text style={styles.calQuickBtnText}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calQuickBtn, { backgroundColor: "#f1f5f9" }]}
                onPress={() => setCalendarModalOpen(false)}
              >
                <Text style={[styles.calQuickBtnText, { color: "#475569" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month Filter Modal for Logged Call Updates */}
      <Modal
        visible={showLogMonthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogMonthModal(false)}
      >
        <TouchableOpacity
          style={styles.calModalOverlay}
          activeOpacity={1}
          onPress={() => setShowLogMonthModal(false)}
        >
          <View style={styles.calModalContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.calNavHeader}>
              <Text style={styles.calMonthTitle}>Filter by Month</Text>
              <TouchableOpacity onPress={() => setShowLogMonthModal(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              <TouchableOpacity
                onPress={() => {
                  setLogMonthFilter("");
                  setShowLogMonthModal(false);
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: !logMonthFilter ? "#e0f2fe" : "#f8fafc",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: "700",
                    color: !logMonthFilter ? "#0284c7" : "#0f172a",
                  }}
                >
                  All Months
                </Text>
              </TouchableOpacity>
              {availableLogMonths.map((mk) => {
                const selected = logMonthFilter === mk;
                return (
                  <TouchableOpacity
                    key={mk}
                    onPress={() => {
                      setLogMonthFilter(mk);
                      setShowLogMonthModal(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor: selected ? "#e0f2fe" : "#f8fafc",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13.5,
                        fontWeight: "700",
                        color: selected ? "#0284c7" : "#0f172a",
                      }}
                    >
                      {formatMonthLabel(mk)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Call Outcome Dropdown Modal */}
      <Modal
        visible={showOutcomeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOutcomeDropdown(false)}
      >
        <TouchableOpacity
          style={styles.calModalOverlay}
          activeOpacity={1}
          onPress={() => setShowOutcomeDropdown(false)}
        >
          <View style={styles.calModalContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.calNavHeader}>
              <Text style={styles.calMonthTitle}>Select Call Outcome</Text>
              <TouchableOpacity onPress={() => setShowOutcomeDropdown(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8, marginTop: 8 }}>
              {CALL_OUTCOMES.map((o) => {
                const isSel = callOutcome === o.id;
                return (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => {
                      setCallOutcome(o.id);
                      setShowOutcomeDropdown(false);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 11,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSel ? "#0284c7" : "#e2e8f0",
                      backgroundColor: isSel ? "#f0f9ff" : "#ffffff",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSel ? "800" : "600",
                        color: isSel ? "#0284c7" : "#0f172a",
                      }}
                    >
                      {o.label}
                    </Text>
                    {isSel && <Ionicons name="checkmark-circle" size={18} color="#0284c7" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Analog Clock Time Picker Modal for Call Update */}
      <Modal
        visible={showCallClockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCallClockModal(false)}
      >
        <View style={styles.calModalOverlay}>
          <View style={[styles.calModalContainer, { maxWidth: 360, width: "92%" }]}>
            <View style={styles.calNavHeader}>
              <Text style={styles.calMonthTitle}>Select Follow-up Time</Text>
              <TouchableOpacity onPress={() => setShowCallClockModal(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <AnalogClockPicker
              value={logCallbackTime}
              onChange={(t) => setLogCallbackTime(t)}
            />
            <TouchableOpacity
              style={[styles.submitBtn, { marginTop: 10 }]}
              onPress={() => setShowCallClockModal(false)}
            >
              <Text style={styles.submitBtnText}>Confirm Time</Text>
            </TouchableOpacity>
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
  rosterHeaderCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  rosterIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  rosterTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  rosterSub: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 1,
  },
  rosterCountBadge: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  rosterCountText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#0284c7",
  },
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
  dateSelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  dateSelectorBtnText: {
    fontWeight: "800",
    color: "#0f172a",
    fontSize: 13.5,
    flex: 1,
    marginLeft: 8,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 12.5,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "600",
  },
  monthFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthFilterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthFilterBtnActive: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd",
  },
  monthFilterBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  monthClearBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthClearBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  paginationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  paginationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  paginationBtnDisabled: {
    opacity: 0.5,
  },
  paginationBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  paginationInfoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  calModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calModalContainer: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  calNavHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calMonthTitle: {
    fontWeight: "800",
    fontSize: 16,
    color: "#0f172a",
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
    width: 38,
    textAlign: "center",
  },
  calDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calDayCell: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginVertical: 2,
  },
  calDayCellSelected: {
    backgroundColor: "#0284c7",
  },
  calDayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  calDayTextSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
  calQuickActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  calQuickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
  },
  calQuickBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0284c7",
  },
});
