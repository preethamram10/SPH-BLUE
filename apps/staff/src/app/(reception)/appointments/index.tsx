import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { removeAuthToken, getActiveBranch, removeActiveBranch } from "../../../services/auth";
import { API_BASE_URL } from "../../../config/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

// Brand Colors matching screenshot
const COLORS = {
  themeBlue: "#0284c7",
  themeBlueLight: "#e0f2fe",
  blueBorder: "#0284c7",
  green: "#16a34a",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
  noticeBg: "#f8fafc",
  errorRed: "#ef4444",
};

interface DoctorOption {
  id: string;
  doctorId?: string;
  name: string;
  specialty?: string;
  qualification?: string;
  phone?: string;
  slots?: any[];
}

interface GeneratedSlot {
  time: string;
  bookedCount: number;
  maxCapacity: number;
  isFull: boolean;
  isNoShow?: boolean;
}

const MARKETING_SOURCES = [
  "Google Search / Maps",
  "Social Media (Instagram / Facebook)",
  "Friend / Family Referral",
  "Walk-in / Clinic Signboard",
  "Doctor Referral",
  "Newspaper / Pamphlet",
  "Website Enquiry",
  "Other",
];

const CONSULTATION_MODES = ["In-Clinic", "Video Consultation", "Phone Consultation"];

export default function ReceptionBookAppointmentScreen() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<any>(null);

  // Form Fields
  const [patientName, setPatientName] = useState("");
  const [diseases, setDiseases] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [marketingSource, setMarketingSource] = useState("");
  const [modeOfConsultation, setModeOfConsultation] = useState("In-Clinic");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [selectedDate, setSelectedDate] = useState("05-11-2026");
  const [selectedSlot, setSelectedSlot] = useState("");

  // Modals state
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<any>(null);

  // Side Drawer Animation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Live Doctors & Timing slots state
  const [availableDoctors, setAvailableDoctors] = useState<DoctorOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [activeNoShows, setActiveNoShows] = useState<any[]>([]);

  // Helper to extract day abbreviation (Mon, Tue, Wed, etc.) from DD-MM-YYYY
  const getDayOfWeekAbbr = (dateStr: string): string => {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days[d.getDay()] || "Mon";
    }
    return "Mon";
  };

  const branchDisplay = activeBranch?.name || "KPHB Branch";
  const selectedDayAbbr = getDayOfWeekAbbr(selectedDate);

  // Fetch doctors who are scheduled at this branch on this day
  const fetchAvailableDoctors = async (bName: string, dt: string) => {
    try {
      setLoadingDoctors(true);
      const day = getDayOfWeekAbbr(dt);
      const branchClean = bName.replace(/Spiritual Homeopathy/gi, "").trim();

      const [timingsRes, noShowRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/doctor-timings?branch=${encodeURIComponent(branchClean)}&day=${day}`),
        fetch(`${API_BASE_URL}/reception/doctor-no-show?branch=${encodeURIComponent(branchClean)}&date=${encodeURIComponent(dt)}`),
      ]);

      if (noShowRes.ok) {
        const noShowData = await noShowRes.json();
        if (noShowData.success && Array.isArray(noShowData.noShows)) {
          setActiveNoShows(noShowData.noShows);
        } else {
          setActiveNoShows([]);
        }
      }

      if (timingsRes.ok) {
        const data = await timingsRes.json();
        if (data.success && Array.isArray(data.doctors)) {
          const mapped: DoctorOption[] = data.doctors.map((d: any) => ({
            id: d.doctorId || d.id,
            doctorId: d.doctorId || d.id,
            name: d.doctorName || d.name,
            phone: d.phone,
            specialty: d.specialty || "Homeopathic Consultant",
            qualification: "Specialist",
            slots: d.slots || [],
          }));
          setAvailableDoctors(mapped);
          return;
        }
      }
      setAvailableDoctors([]);
    } catch (err) {
      console.warn("Failed to fetch available doctors for slot:", err);
      setAvailableDoctors([]);
      setActiveNoShows([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) {
        setActiveBranch(b);
        fetchAvailableDoctors(b.name, selectedDate);
      } else {
        fetchAvailableDoctors("KPHB Branch", selectedDate);
      }
    });

    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    const todayStr = `${d}-${m}-${y}`;
    setSelectedDate(todayStr);
  }, []);

  // When date or branch changes, re-fetch available doctors for that day
  useEffect(() => {
    if (activeBranch?.name) {
      fetchAvailableDoctors(activeBranch.name, selectedDate);
    } else {
      fetchAvailableDoctors("KPHB Branch", selectedDate);
    }
  }, [selectedDate, activeBranch]);

  // Helper to parse time string like "12:30 PM" to minutes from midnight
  const parseTimeToMinutes = (t: string): number => {
    const parts = t.trim().split(" ");
    if (parts.length < 2) return 600;
    const [hStr, mStr] = parts[0].split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const ap = parts[1].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  // Helper to format minutes from midnight to "12:30 PM"
  const formatMinutesToTime = (min: number): string => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
  };

  // 15-Minute Slot Generation with 3 Appointments Capacity
  const generatedSlots = useMemo((): GeneratedSlot[] => {
    if (!selectedDoctor) return [];

    const slots: GeneratedSlot[] = [];
    const ranges = selectedDoctor.slots || [];

    // Find if selected doctor has active no-show on this branch & date
    const doctorNoShow = activeNoShows.find(
      (ns) =>
        ns.doctorId === selectedDoctor.doctorId ||
        ns.doctorId === selectedDoctor.id ||
        ns.doctorName === selectedDoctor.name
    );

    const checkIsSlotNoShow = (curMin: number): boolean => {
      if (!doctorNoShow) return false;
      if (doctorNoShow.type === "FULL_DAY") return true;
      if (doctorNoShow.type === "HALF_DAY") {
        if (doctorNoShow.halfDayType === "FIRST_HALF") {
          return curMin < 840; // Before 2:00 PM
        } else {
          return curMin >= 840; // 2:00 PM onwards
        }
      }
      if (doctorNoShow.type === "SPECIFIC_TIME" && doctorNoShow.startTime && doctorNoShow.endTime) {
        const startNoShow = parseTimeToMinutes(doctorNoShow.startTime);
        const endNoShow = parseTimeToMinutes(doctorNoShow.endTime);
        return curMin >= startNoShow && curMin < endNoShow;
      }
      return false;
    };

    if (ranges.length === 0) {
      // Default 15-minute intervals
      for (let t = 600; t < 780; t += 15) {
        const isNoShow = checkIsSlotNoShow(t);
        slots.push({
          time: formatMinutesToTime(t),
          bookedCount: 0,
          maxCapacity: 3,
          isFull: isNoShow,
          isNoShow,
        });
      }
      for (let t = 960; t < 1140; t += 15) {
        const isNoShow = checkIsSlotNoShow(t);
        slots.push({
          time: formatMinutesToTime(t),
          bookedCount: 0,
          maxCapacity: 3,
          isFull: isNoShow,
          isNoShow,
        });
      }
      return slots;
    }

    ranges.forEach((r: any) => {
      const startMin = r.startHour
        ? parseTimeToMinutes(`${r.startHour}:${r.startMin} ${r.startAmPm}`)
        : parseTimeToMinutes(r.displayText?.split("-")[0] || "10:00 AM");
      const endMin = r.endHour
        ? parseTimeToMinutes(`${r.endHour}:${r.endMin} ${r.endAmPm}`)
        : parseTimeToMinutes(r.displayText?.split("-")[1] || "01:00 PM");

      for (let cur = startMin; cur < endMin; cur += 15) {
        const timeStr = formatMinutesToTime(cur);
        if (!slots.some((s) => s.time === timeStr)) {
          const isNoShow = checkIsSlotNoShow(cur);
          slots.push({
            time: timeStr,
            bookedCount: 0,
            maxCapacity: 3,
            isFull: isNoShow,
            isNoShow,
          });
        }
      }
    });

    return slots;
  }, [selectedDoctor, activeNoShows]);

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

  const handleConfirmAppointment = () => {
    if (!patientName.trim()) {
      Alert.alert("Required Field", "Please enter the patient's name.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      Alert.alert("Required Field", "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!selectedDoctor) {
      Alert.alert("Doctor Required", "Please select a doctor to proceed with booking.");
      return;
    }
    if (!selectedSlot) {
      Alert.alert("Time Slot Required", "Please select an available time slot.");
      return;
    }

    const tokenNumber = Math.floor(10 + Math.random() * 90);
    const details = {
      token: `SPH-${tokenNumber}`,
      name: patientName.trim(),
      phone: phone.trim(),
      doctor: selectedDoctor.name,
      branch: activeBranch?.name || "KPHB Branch",
      date: selectedDate,
      time: selectedSlot,
      mode: modeOfConsultation,
      diseases: diseases.trim() || "General Consultation",
    };

    setBookedDetails(details);
    setShowSuccessModal(true);
  };

  const handleResetForm = () => {
    setPatientName("");
    setDiseases("");
    setPhone("");
    setEmail("");
    setMarketingSource("");
    setModeOfConsultation("In-Clinic");
    setSelectedDoctor(null);
    setSelectedSlot("");
    setShowSuccessModal(false);
  };

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
      {/* 1. TOP BAR (Matching Reference Screenshot) */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Book Appointment</Text>
        </View>

        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={openDrawer}
          activeOpacity={0.7}
        >
          <Ionicons name="menu-outline" size={26} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      {/* 2. SCROLLABLE FORM CONTAINER */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: PATIENT DETAILS CARD */}
        <View style={styles.card}>
          {/* Card Header with Step Badge 1 */}
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.cardTitle}>Patient Details</Text>
            <View style={styles.headerDivider} />
          </View>

          {/* Row 1: Patient Name & Diseases */}
          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.inputLabel}>Patient Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter patient's name"
                placeholderTextColor={COLORS.textLight}
                value={patientName}
                onChangeText={setPatientName}
              />
            </View>

            <View style={styles.formCol}>
              <Text style={styles.inputLabel}>Diseases</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter diseases"
                placeholderTextColor={COLORS.textLight}
                value={diseases}
                onChangeText={setDiseases}
              />
            </View>
          </View>

          {/* Row 2: Phone (+91) & Email Address */}
          <View style={[styles.formRow, { marginTop: 14 }]}>
            <View style={styles.formCol}>
              <Text style={styles.inputLabel}>Phone (+91)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Phone"
                placeholderTextColor={COLORS.textLight}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.formCol}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Email"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Row 3: Marketing Source & Mode of Consultation */}
          <View style={[styles.formRow, { marginTop: 14 }]}>
            <View style={styles.formCol}>
              <Text style={styles.inputLabel}>Marketing Source</Text>
              <TouchableOpacity
                style={styles.selectorInput}
                onPress={() => setShowSourceModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectorLeft}>
                  <Ionicons
                    name="megaphone-outline"
                    size={16}
                    color={COLORS.textLight}
                    style={styles.selectorIcon}
                  />
                  <Text
                    style={[
                      styles.selectorText,
                      marketingSource ? { color: COLORS.textDark } : { color: COLORS.textLight },
                    ]}
                    numberOfLines={1}
                  >
                    {marketingSource || "Select"}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.formCol}>
              <Text style={styles.inputLabel}>Mode of Consultation</Text>
              <TouchableOpacity
                style={styles.selectorInput}
                onPress={() => setShowModeModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectorLeft}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={COLORS.textLight}
                    style={styles.selectorIcon}
                  />
                  <Text style={[styles.selectorText, { color: COLORS.textDark, fontWeight: "600" }]} numberOfLines={1}>
                    {modeOfConsultation}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 2: APPOINTMENT INFORMATION CARD */}
        <View style={styles.card}>
          {/* Card Header with Step Badge 2 */}
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.cardTitle}>Appointment Information</Text>
            <View style={styles.headerDivider} />
          </View>

          {/* Select Branch * */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.inputLabel}>Select Branch *</Text>
            <View style={styles.branchBox}>
              <Ionicons name="business" size={20} color={COLORS.themeBlue} style={{ marginRight: 10 }} />
              <Text style={styles.branchNameText}>{branchDisplay}</Text>
            </View>
          </View>

          {/* Date Picker (Blue border container as in reference screenshot) */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateBox}
              onPress={() => setShowDateModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.themeBlue} />
              <Text style={styles.dateText}>{selectedDate}</Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.themeBlue} />
            </TouchableOpacity>
          </View>

          {/* Select Doctor */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.inputLabel}>Select Doctor</Text>
            <TouchableOpacity
              style={styles.doctorSelectBox}
              onPress={() => setShowDoctorModal(true)}
              activeOpacity={0.85}
            >
              <View style={styles.doctorSelectLeft}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={COLORS.textLight}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.doctorSelectText,
                    selectedDoctor ? { color: COLORS.textDark, fontWeight: "600" } : { color: COLORS.textLight },
                  ]}
                  numberOfLines={1}
                >
                  {selectedDoctor ? selectedDoctor.name : "Select Doctor"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {/* Available Slots */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.slotsHeaderRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.themeBlue} style={{ marginRight: 6 }} />
              <Text style={styles.slotsHeaderText}>Available Slots</Text>
            </View>

            {!selectedDoctor ? (
              /* Notice box matching screenshot: Please select a doctor and branch to check availability. */
              <View style={styles.noticeBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={COLORS.textLight}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.noticeText}>
                  Please select a doctor and branch to check availability.
                </Text>
              </View>
            ) : generatedSlots.length === 0 ? (
              <View style={styles.noticeBox}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={COLORS.errorRed}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.noticeText}>
                  No active 15-minute slots found for this practitioner on {selectedDate}.
                </Text>
              </View>
            ) : (
              /* Slots Chips (15-min each, max 3 appointments per slot) */
              <View style={styles.slotsGrid}>
                {generatedSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.time;
                  return (
                    <TouchableOpacity
                      key={slot.time}
                      disabled={slot.isFull || slot.isNoShow}
                      style={[
                        styles.slotChip,
                        isSelected && styles.slotChipSelected,
                        (slot.isFull || slot.isNoShow) && { backgroundColor: "#fee2e2", borderColor: "#fca5a5", opacity: 0.8 },
                      ]}
                      onPress={() => !slot.isNoShow && setSelectedSlot(slot.time)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.slotChipText,
                          isSelected && styles.slotChipTextSelected,
                          (slot.isFull || slot.isNoShow) && { color: "#b91c1c" },
                        ]}
                      >
                        {slot.time}
                      </Text>
                      {slot.isNoShow ? (
                        <View style={{ backgroundColor: "#e11d48", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: "#ffffff" }}>NO-SHOW</Text>
                        </View>
                      ) : slot.isFull ? (
                        <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: "#ffffff" }}>FULL</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 10, color: isSelected ? "#e0f2fe" : "#94a3b8", marginLeft: 3 }}>
                          ({slot.bookedCount}/3)
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* 3. CONFIRM APPOINTMENT BUTTON (Matching Reference Screenshot) */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmAppointment}
          activeOpacity={0.88}
        >
          <View style={styles.confirmButtonLeft}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.confirmButtonText}>Confirm Appointment</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </ScrollView>

      {/* 4. FIXED BOTTOM NAVIGATION BAR (Matching Reference Screenshot) */}
      <View style={styles.bottomTabBar}>
        {/* Dashboard Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/(reception)" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Dashboard</Text>
        </TouchableOpacity>

        {/* Book Appt Tab (Active Blue) */}
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.8}>
          <Ionicons name="calendar" size={22} color={COLORS.themeBlue} />
          <Text style={[styles.tabLabel, { color: COLORS.themeBlue, fontWeight: "700" }]}>
            Book Appt
          </Text>
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
          onPress={() => router.push("/(reception)/follow-ups" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="medkit-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Med Req</Text>
        </TouchableOpacity>

        {/* Logout Tab */}
        <TouchableOpacity style={styles.tabItem} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.errorRed} />
          <Text style={[styles.tabLabel, { color: COLORS.errorRed }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* 5. ANIMATED SIDE NAVIGATION DRAWER */}
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
                  source={require("../../../../assets/images/logo.png")}
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
            <ScrollView style={styles.drawerNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.drawerSectionTitle}>RECEPTION MODULES</Text>

              {navMenuItems.map((item) => {
                const isActive = item.id === "appointments";
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.drawerNavItem,
                      isActive && styles.drawerNavItemActive,
                    ]}
                    onPress={() => handleNavigate(item.route)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={isActive ? COLORS.themeBlue : COLORS.textMuted}
                      style={styles.drawerNavIcon}
                    />
                    <Text
                      style={[
                        styles.drawerNavLabel,
                        isActive && styles.drawerNavLabelActive,
                      ]}
                    >
                      {item.title}
                    </Text>
                    {isActive && <View style={styles.activePillIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Drawer Footer with Logout */}
            <View style={styles.drawerFooter}>
              <TouchableOpacity
                style={styles.drawerLogoutBtn}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={18} color={COLORS.errorRed} />
                <Text style={styles.drawerLogoutText}>Sign Out from Reception</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* 6. SELECT DOCTOR MODAL */}
      <Modal visible={showDoctorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Consulting Doctor</Text>
              <TouchableOpacity onPress={() => setShowDoctorModal(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {loadingDoctors ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={COLORS.themeBlue} />
                  <Text style={{ marginTop: 8, fontSize: 12, color: COLORS.textMuted }}>
                    Checking scheduled doctors for {branchDisplay} on {selectedDayAbbr}...
                  </Text>
                </View>
              ) : availableDoctors.length === 0 ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={36} color={COLORS.textLight} />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.textDark, marginTop: 8 }}>
                    No Doctors Scheduled
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, textAlign: "center", marginTop: 4, lineHeight: 17 }}>
                    No doctors are configured for {branchDisplay} on {selectedDayAbbr} ({selectedDate}). Please choose another date or configure branch schedules in Admin.
                  </Text>
                </View>
              ) : (
                availableDoctors.map((doc) => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  const isFullDayOff = activeNoShows.some(
                    (ns) =>
                      (ns.doctorId === doc.id || ns.doctorId === doc.doctorId || ns.doctorName === doc.name) &&
                      ns.type === "FULL_DAY"
                  );
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        styles.modalOptionCard,
                        isSelected && styles.modalOptionCardSelected,
                        isFullDayOff && { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
                      ]}
                      onPress={() => {
                        setSelectedDoctor(doc);
                        setShowDoctorModal(false);
                      }}
                    >
                      <View style={[styles.docAvatar, isFullDayOff && { backgroundColor: "#ffe4e6" }]}>
                        <Ionicons
                          name={isFullDayOff ? "close-circle" : "person"}
                          size={20}
                          color={isFullDayOff ? COLORS.errorRed : COLORS.themeBlue}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={styles.docOptionName}>{doc.name}</Text>
                          {isFullDayOff ? (
                            <View style={{ backgroundColor: "#fecdd3", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: "800", color: "#b91c1c" }}>NO-SHOW (LEAVE)</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.docOptionSpecialty}>
                          {isFullDayOff
                            ? "Marked unavailable for this branch today"
                            : doc.slots && doc.slots.length > 0
                            ? `Available: ${doc.slots.map((s: any) => s.displayText).join(", ")}`
                            : "General Timings"}
                        </Text>
                        {doc.phone ? (
                          <Text style={styles.docOptionQual}>📞 {doc.phone}</Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.themeBlue} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 7. SELECT MARKETING SOURCE MODAL */}
      <Modal visible={showSourceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Marketing Source</Text>
              <TouchableOpacity onPress={() => setShowSourceModal(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {MARKETING_SOURCES.map((src) => {
                const isSelected = marketingSource === src;
                return (
                  <TouchableOpacity
                    key={src}
                    style={[
                      styles.simpleOptionItem,
                      isSelected && styles.simpleOptionItemSelected,
                    ]}
                    onPress={() => {
                      setMarketingSource(src);
                      setShowSourceModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.simpleOptionText,
                        isSelected && styles.simpleOptionTextSelected,
                      ]}
                    >
                      {src}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={COLORS.themeBlue} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 8. SELECT MODE OF CONSULTATION MODAL */}
      <Modal visible={showModeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mode of Consultation</Text>
              <TouchableOpacity onPress={() => setShowModeModal(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {CONSULTATION_MODES.map((mode) => {
              const isSelected = modeOfConsultation === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.simpleOptionItem,
                    isSelected && styles.simpleOptionItemSelected,
                  ]}
                  onPress={() => {
                    setModeOfConsultation(mode);
                    setShowModeModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.simpleOptionText,
                      isSelected && styles.simpleOptionTextSelected,
                    ]}
                  >
                    {mode}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={COLORS.themeBlue} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* 9. SELECT DATE MODAL */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Appointment Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {/* Quick Date Presets */}
            {[
              { label: "Today (05-11-2026)", val: "05-11-2026" },
              { label: "Tomorrow (06-11-2026)", val: "06-11-2026" },
              { label: "Day After (07-11-2026)", val: "07-11-2026" },
              { label: "Next Monday (09-11-2026)", val: "09-11-2026" },
            ].map((d) => (
              <TouchableOpacity
                key={d.val}
                style={[
                  styles.simpleOptionItem,
                  selectedDate === d.val && styles.simpleOptionItemSelected,
                ]}
                onPress={() => {
                  setSelectedDate(d.val);
                  setShowDateModal(false);
                }}
              >
                <Text
                  style={[
                    styles.simpleOptionText,
                    selectedDate === d.val && styles.simpleOptionTextSelected,
                  ]}
                >
                  {d.label}
                </Text>
                {selectedDate === d.val && (
                  <Ionicons name="checkmark" size={18} color={COLORS.themeBlue} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* 10. BOOKING SUCCESS MODAL */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={54} color={COLORS.green} />
            </View>

            <Text style={styles.successTitle}>Appointment Booked!</Text>
            <Text style={styles.successSub}>
              Token #{bookedDetails?.token} generated for {bookedDetails?.name}
            </Text>

            <View style={styles.successSummaryBox}>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Doctor:</Text>
                <Text style={styles.successVal}>{bookedDetails?.doctor}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Branch:</Text>
                <Text style={styles.successVal}>{bookedDetails?.branch}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Date & Time:</Text>
                <Text style={styles.successVal}>
                  {bookedDetails?.date} at {bookedDetails?.time}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Mode:</Text>
                <Text style={styles.successVal}>{bookedDetails?.mode}</Text>
              </View>
            </View>

            <View style={styles.successBtnRow}>
              <TouchableOpacity
                style={styles.bookAnotherBtn}
                onPress={handleResetForm}
                activeOpacity={0.8}
              >
                <Text style={styles.bookAnotherBtnText}>+ Book Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push("/(reception)" as any);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.doneBtnText}>Go to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* 1. TOP BAR */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topBarTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  hamburgerButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  /* 2. SCROLLVIEW */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 90,
  },

  /* CARDS */
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.themeBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  stepBadgeText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textDark,
    marginLeft: 10,
  },
  headerDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#f1f5f9",
    marginLeft: 12,
  },

  /* FORM LAYOUT */
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 5,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 12,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
  selectorInput: {
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 4,
  },
  selectorIcon: {
    marginRight: 6,
  },
  selectorText: {
    fontSize: 12,
  },

  /* SECTION 2 SPECIFICS */
  branchBox: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  branchNameText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },

  dateBox: {
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.blueBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
  },

  doctorSelectBox: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
  },
  doctorSelectLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  doctorSelectText: {
    fontSize: 12,
  },

  slotsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  slotsHeaderText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  noticeBox: {
    backgroundColor: COLORS.noticeBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  noticeText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  slotChipSelected: {
    backgroundColor: COLORS.themeBlue,
    borderColor: COLORS.themeBlue,
  },
  slotChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  slotChipTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },

  /* 3. CONFIRM APPOINTMENT BUTTON */
  confirmButton: {
    backgroundColor: COLORS.themeBlue,
    borderRadius: 14,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 16,
    shadowColor: COLORS.themeBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 13.5,
    fontWeight: "700",
  },

  /* 4. FIXED BOTTOM NAVIGATION BAR */
  bottomTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 2,
  },

  /* 5. SIDE DRAWER */
  drawerOverlayContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  drawerBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  drawerContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
    flexDirection: "column",
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#f0f9ff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0f2fe",
  },
  drawerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerLogo: {
    width: 36,
    height: 36,
  },
  drawerTitleBox: {
    flex: 1,
  },
  drawerClinicName: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  drawerRoleBadge: {
    backgroundColor: COLORS.themeBlueLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  drawerRoleText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.themeBlue,
    letterSpacing: 0.5,
  },
  drawerBranchBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  drawerBranchTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  drawerBranchName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
    flex: 1,
  },
  drawerBranchPhone: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
    marginLeft: 13,
  },
  drawerNavList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  drawerSectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 8,
  },
  drawerNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  drawerNavItemActive: {
    backgroundColor: "#f0f9ff",
  },
  drawerNavIcon: {
    marginRight: 12,
  },
  drawerNavLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    flex: 1,
  },
  drawerNavLabelActive: {
    color: COLORS.themeBlue,
    fontWeight: "800",
  },
  activePillIndicator: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.themeBlue,
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  drawerLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
  },
  drawerLogoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.errorRed,
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  modalOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 8,
  },
  modalOptionCardSelected: {
    borderColor: COLORS.themeBlue,
    backgroundColor: "#f0f9ff",
  },
  docAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  docOptionName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  docOptionSpecialty: {
    fontSize: 11,
    color: COLORS.themeBlue,
    fontWeight: "600",
  },
  docOptionQual: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  simpleOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  simpleOptionItemSelected: {
    backgroundColor: "#f0f9ff",
  },
  simpleOptionText: {
    fontSize: 12.5,
    color: COLORS.textDark,
  },
  simpleOptionTextSelected: {
    color: COLORS.themeBlue,
    fontWeight: "700",
  },

  /* SUCCESS CARD */
  successCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: "auto",
    marginTop: "auto",
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconBox: {
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textDark,
    textAlign: "center",
  },
  successSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 3,
    marginBottom: 14,
  },
  successSummaryBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    gap: 7,
  },
  successRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  successLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  successVal: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  successBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  bookAnotherBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.themeBlue,
    alignItems: "center",
  },
  bookAnotherBtnText: {
    color: COLORS.themeBlue,
    fontSize: 12,
    fontWeight: "700",
  },
  doneBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.themeBlue,
    alignItems: "center",
  },
  doneBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
});
