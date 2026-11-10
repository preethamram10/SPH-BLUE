import React, { useState, useEffect } from "react";
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
  Dimensions,
  BackHandler,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getActiveBranch } from "../../../services/auth";
import { API_BASE_URL } from "../../../config/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  themeBlue: "#0284c7",
  themeBlueLight: "#e0f2fe",
  rose: "#e11d48",
  roseLight: "#ffe4e6",
  amber: "#d97706",
  amberLight: "#fef3c7",
  green: "#16a34a",
  greenLight: "#dcfce7",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

interface DoctorOption {
  doctorId: string;
  doctorName: string;
  phone?: string;
  scheduledDays?: string[];
  scheduleSummary?: string;
  days?: Record<string, { isAvailable: boolean; slots: string[] }>;
}

interface DoctorNoShowRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  branch: string;
  type: "FULL_DAY" | "HALF_DAY" | "SPECIFIC_TIME";
  startDate: string;
  endDate: string;
  halfDayType?: "FIRST_HALF" | "SECOND_HALF";
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt: string;
}

export default function ReceptionDoctorNoShowScreen() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [noShows, setNoShows] = useState<DoctorNoShowRecord[]>([]);
  const [branchDoctors, setBranchDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [branchScope, setBranchScope] = useState<"CURRENT" | "ALL">("CURRENT");
  const [dateRangeMode, setDateRangeMode] = useState<"SINGLE" | "RANGE">("SINGLE");
  const [startDate, setStartDate] = useState("05-11-2026");
  const [endDate, setEndDate] = useState("05-11-2026");
  const [noShowType, setNoShowType] = useState<"FULL_DAY" | "HALF_DAY" | "SPECIFIC_TIME">("FULL_DAY");
  const [halfDayType, setHalfDayType] = useState<"FIRST_HALF" | "SECOND_HALF">("FIRST_HALF");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("01:00 PM");
  const [reason, setReason] = useState("");

  const [showDoctorPickerModal, setShowDoctorPickerModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<"start" | "end">("start");
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  const getDayAbbrFromDate = (dStr: string) => {
    if (!dStr) return "";
    const parts = dStr.trim().split("-");
    let dateObj: Date;
    if (parts.length === 3 && parts[2].length === 4) {
      dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else if (parts.length === 3 && parts[0].length === 4) {
      dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      dateObj = new Date(dStr);
    }
    if (isNaN(dateObj.getTime())) return "";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dateObj.getDay()];
  };

  const getBranchCleanName = (branchObj: any) => {
    if (!branchObj?.name) return "KPHB Branch";
    const clean = branchObj.name.replace(/Spiritual Homeopathy/gi, "").trim();
    return clean || "KPHB Branch";
  };

  const loadData = async (bName: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/reception/doctor-no-show?branch=${encodeURIComponent(bName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNoShows(data.noShows || []);
          setBranchDoctors(data.doctors || []);
          if (data.doctors && data.doctors.length > 0 && !selectedDoctor) {
            setSelectedDoctor(data.doctors[0]);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch doctor no-shows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getActiveBranch().then((b) => {
      const bName = getBranchCleanName(b);
      if (b) setActiveBranch(b);
      loadData(bName);
    });

    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    const dt = `${d}-${m}-${y}`;
    setStartDate(dt);
    setEndDate(dt);
  }, []);

  const handleCreateNoShow = async () => {
    if (!selectedDoctor) {
      Alert.alert("Error", "Please select a branch doctor.");
      return;
    }

    const bName = getBranchCleanName(activeBranch);

    try {
      setSubmitting(true);
      const payload = {
        doctorId: selectedDoctor.doctorId,
        doctorName: selectedDoctor.doctorName,
        branch: branchScope === "ALL" ? "ALL" : bName,
        type: noShowType,
        startDate,
        endDate: dateRangeMode === "RANGE" ? endDate : startDate,
        halfDayType: noShowType === "HALF_DAY" ? halfDayType : undefined,
        startTime: noShowType === "SPECIFIC_TIME" ? startTime : undefined,
        endTime: noShowType === "SPECIFIC_TIME" ? endTime : undefined,
        reason: reason.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/reception/doctor-no-show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Alert.alert("Success", `No-show recorded for ${selectedDoctor.doctorName}. Affected appointment slots are now unavailable.`);
        setIsModalOpen(false);
        setReason("");
        loadData(bName);
      } else {
        Alert.alert("Error", data.error || "Failed to mark doctor no-show.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error while saving doctor no-show.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNoShow = (id: string, docName: string) => {
    Alert.alert(
      "Revoke No-Show",
      `Are you sure you want to remove the No-Show for ${docName}? Appointment booking slots will be reopened.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/reception/doctor-no-show?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
              });
              if (res.ok) {
                setNoShows((prev) => prev.filter((item) => item.id !== id));
                Alert.alert("Success", `No-Show removed for ${docName}`);
              } else {
                Alert.alert("Error", "Failed to remove no-show");
              }
            } catch {
              Alert.alert("Error", "Network error removing no-show");
            }
          },
        },
      ]
    );
  };

  const branchClean = getBranchCleanName(activeBranch);

  const filteredNoShows = noShows.filter((item) => {
    const matchesSearch =
      item.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "ALL" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(reception)" as any);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* TOP HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Doctor No-Show</Text>
            <Text style={styles.headerSubTitle}>{branchClean}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            if (branchDoctors.length > 0 && !selectedDoctor) {
              setSelectedDoctor(branchDoctors[0]);
            }
            setIsModalOpen(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addBtnText}>Add No-Show</Text>
        </TouchableOpacity>
      </View>

      {/* NOTICE BANNER */}
      <View style={styles.noticeBanner}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.themeBlue} />
        <Text style={styles.noticeText}>
          Only doctors scheduled at <Text style={{ fontWeight: "700" }}>{branchClean}</Text> under master doctor timings are selectable. Unavailable slots are automatically blocked in the booking screen.
        </Text>
      </View>

      {/* CONTROLS: SEARCH & FILTER */}
      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textLight} />
          <TextInput
            placeholder="Search doctor or reason..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadData(branchClean)}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={COLORS.themeBlue} />
        </TouchableOpacity>
      </View>

      {/* FILTER TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterTabsContainer}
      >
        {[
          { key: "ALL", label: "All" },
          { key: "FULL_DAY", label: "Full Day" },
          { key: "HALF_DAY", label: "Half Day" },
          { key: "SPECIFIC_TIME", label: "Custom Time" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filterType === tab.key && styles.filterTabActive]}
            onPress={() => setFilterType(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* RECORDS LIST */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={COLORS.themeBlue} />
            <Text style={styles.loadingText}>Loading doctor no-shows...</Text>
          </View>
        ) : filteredNoShows.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="checkmark-circle-outline" size={32} color={COLORS.green} />
            </View>
            <Text style={styles.emptyTitle}>All Doctors Available</Text>
            <Text style={styles.emptySubtitle}>
              No active or upcoming no-shows found for {branchClean}. All doctors are available for appointments as scheduled.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => setIsModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={COLORS.white} />
              <Text style={styles.emptyActionBtnText}>Mark Doctor No-Show</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredNoShows.map((item) => (
            <View key={item.id} style={styles.recordCard}>
              <View style={styles.recordCardTop}>
                <View style={styles.doctorInfoRow}>
                  <View style={styles.docAvatar}>
                    <Text style={styles.docAvatarText}>
                      {item.doctorName.replace("Dr.", "").trim().charAt(0) || "D"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docNameText}>{item.doctorName}</Text>
                    <Text style={styles.docBranchText}>{item.branch}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteNoShow(item.id, item.doctorName)}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.rose} />
                </TouchableOpacity>
              </View>

              {/* DETAILS ROW */}
              <View style={styles.recordDetailsBox}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.themeBlue} />
                  <Text style={styles.detailText}>
                    {item.startDate === item.endDate || !item.endDate
                      ? item.startDate
                      : `${item.startDate} to ${item.endDate}`}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color={COLORS.amber} />
                  <Text style={styles.detailText}>
                    {item.type === "FULL_DAY" && "Full Day (All Slots Locked)"}
                    {item.type === "HALF_DAY" &&
                      (item.halfDayType === "FIRST_HALF"
                        ? "1st Half (Until 02:00 PM)"
                        : "2nd Half (02:00 PM Onwards)")}
                    {item.type === "SPECIFIC_TIME" &&
                      `${item.startTime || "10:00 AM"} - ${item.endTime || "01:00 PM"}`}
                  </Text>
                </View>
              </View>

              {item.reason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>Note: {item.reason}</Text>
                </View>
              ) : null}

              {/* BADGE FOOTER */}
              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.typeBadge,
                    item.type === "FULL_DAY" && { backgroundColor: COLORS.roseLight },
                    item.type === "HALF_DAY" && { backgroundColor: COLORS.amberLight },
                    item.type === "SPECIFIC_TIME" && { backgroundColor: COLORS.themeBlueLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      item.type === "FULL_DAY" && { color: COLORS.rose },
                      item.type === "HALF_DAY" && { color: COLORS.amber },
                      item.type === "SPECIFIC_TIME" && { color: COLORS.themeBlue },
                    ]}
                  >
                    {item.type.replace("_", " ")}
                  </Text>
                </View>
                <Text style={styles.timestampText}>
                  Added {item.createdAt ? item.createdAt.substring(0, 10) : "Recently"}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* CREATE NO-SHOW MODAL */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Mark Doctor No-Show</Text>
                  <Text style={styles.modalSubtitle}>Branch: {branchClean}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsModalOpen(false)}
                  style={styles.closeModalBtn}
                >
                  <Ionicons name="close" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalForm}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
              {/* Scope Selector: This Branch vs All Branches */}
              <Text style={styles.inputLabel}>No-Show Scope *</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                <TouchableOpacity
                  style={[
                    styles.scopeBtn,
                    branchScope === "CURRENT" && styles.scopeBtnActive,
                  ]}
                  onPress={() => setBranchScope("CURRENT")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={branchScope === "CURRENT" ? COLORS.themeBlue : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.scopeBtnText,
                      branchScope === "CURRENT" && styles.scopeBtnTextActive,
                    ]}
                  >
                    {branchClean} Only
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scopeBtn,
                    branchScope === "ALL" && styles.scopeBtnActiveRose,
                  ]}
                  onPress={() => setBranchScope("ALL")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="globe-outline"
                    size={14}
                    color={branchScope === "ALL" ? COLORS.rose : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.scopeBtnText,
                      branchScope === "ALL" && styles.scopeBtnTextActiveRose,
                    ]}
                  >
                    All Clinic Branches
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Doctor Selector */}
              <Text style={styles.inputLabel}>Select Doctor *</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowDoctorPickerModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerTriggerText}>
                    {selectedDoctor ? selectedDoctor.doctorName : "Choose Doctor"}
                  </Text>
                  {selectedDoctor?.scheduledDays && selectedDoctor.scheduledDays.length > 0 ? (
                    <Text style={{ fontSize: 10, color: COLORS.themeBlue, fontWeight: "700", marginTop: 2 }}>
                      Working Days: {selectedDoctor.scheduledDays.join(", ")}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Date Configuration */}
              <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                <Text style={styles.inputLabel}>Date Configuration *</Text>
                <View style={styles.pillToggleBox}>
                  <TouchableOpacity
                    style={[
                      styles.pillToggleBtn,
                      dateRangeMode === "SINGLE" && styles.pillToggleBtnActive,
                    ]}
                    onPress={() => setDateRangeMode("SINGLE")}
                  >
                    <Text
                      style={[
                        styles.pillToggleText,
                        dateRangeMode === "SINGLE" && styles.pillToggleTextActive,
                      ]}
                    >
                      Single Date
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pillToggleBtn,
                      dateRangeMode === "RANGE" && styles.pillToggleBtnActive,
                    ]}
                    onPress={() => setDateRangeMode("RANGE")}
                  >
                    <Text
                      style={[
                        styles.pillToggleText,
                        dateRangeMode === "RANGE" && styles.pillToggleTextActive,
                      ]}
                    >
                      Date Range
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {dateRangeMode === "SINGLE" ? (
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => {
                    setCalendarTarget("start");
                    setShowCalendarModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name="calendar" size={18} color={COLORS.themeBlue} />
                    <Text style={styles.datePickerBtnText}>{startDate}</Text>
                  </View>
                  <Text style={styles.tapToChangeText}>Tap to pick</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.datePickerBtn, { flex: 1 }]}
                    onPress={() => {
                      setCalendarTarget("start");
                      setShowCalendarModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.subInputLabel}>From Date</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.themeBlue} />
                      <Text style={styles.datePickerBtnText}>{startDate}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.datePickerBtn, { flex: 1 }]}
                    onPress={() => {
                      setCalendarTarget("end");
                      setShowCalendarModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.subInputLabel}>To Date</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.themeBlue} />
                      <Text style={styles.datePickerBtnText}>{endDate}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Dynamic Doctor Schedule notice on this Date */}
              {(() => {
                if (!selectedDoctor) return null;
                const dayAbbr = getDayAbbrFromDate(startDate);
                if (!dayAbbr) return null;
                const isScheduled = selectedDoctor.scheduledDays ? selectedDoctor.scheduledDays.includes(dayAbbr) : true;
                const slots = selectedDoctor.days?.[dayAbbr]?.slots;

                return (
                  <View style={{ marginTop: 8 }}>
                    {isScheduled ? (
                      <View style={styles.availNoticeGreen}>
                        <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
                        <Text style={styles.availNoticeGreenText}>
                          Available on {dayAbbr}: {slots && slots.length > 0 ? slots.join(", ") : "Standard shifts"}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.availNoticeAmber}>
                        <Ionicons name="alert-circle" size={14} color={COLORS.amber} />
                        <Text style={styles.availNoticeAmberText}>
                          Doctor is normally OFF on {dayAbbr}s (Scheduled: {selectedDoctor.scheduledDays?.join(", ") || "None"}).
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* No-Show Type */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Duration Type *</Text>
              <View style={styles.typeSelectorRow}>
                {[
                  { key: "FULL_DAY", title: "Full Day", desc: "All slots off" },
                  { key: "HALF_DAY", title: "Half Day", desc: "1st/2nd half" },
                  { key: "SPECIFIC_TIME", title: "Custom", desc: "Set hours" },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.typeOptionCard,
                      noShowType === t.key && styles.typeOptionCardActive,
                    ]}
                    onPress={() => setNoShowType(t.key as any)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.typeOptionTitle,
                        noShowType === t.key && styles.typeOptionTitleActive,
                      ]}
                    >
                      {t.title}
                    </Text>
                    <Text style={styles.typeOptionDesc}>{t.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Conditional Half Day Options */}
              {noShowType === "HALF_DAY" && (
                <View style={styles.conditionalBox}>
                  <Text style={styles.conditionalTitle}>Select Half Day Window:</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.radioBtn,
                        halfDayType === "FIRST_HALF" && styles.radioBtnActive,
                      ]}
                      onPress={() => setHalfDayType("FIRST_HALF")}
                    >
                      <Ionicons
                        name={halfDayType === "FIRST_HALF" ? "radio-button-on" : "radio-button-off"}
                        size={16}
                        color={halfDayType === "FIRST_HALF" ? COLORS.amber : COLORS.textLight}
                      />
                      <Text style={styles.radioBtnText}>1st Half (Until 2 PM)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.radioBtn,
                        halfDayType === "SECOND_HALF" && styles.radioBtnActive,
                      ]}
                      onPress={() => setHalfDayType("SECOND_HALF")}
                    >
                      <Ionicons
                        name={halfDayType === "SECOND_HALF" ? "radio-button-on" : "radio-button-off"}
                        size={16}
                        color={halfDayType === "SECOND_HALF" ? COLORS.amber : COLORS.textLight}
                      />
                      <Text style={styles.radioBtnText}>2nd Half (2 PM+)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Conditional Custom Time Options */}
              {noShowType === "SPECIFIC_TIME" && (
                <View style={styles.conditionalBox}>
                  <Text style={styles.conditionalTitle}>Specify Time Window:</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subInputLabel}>Start Time</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          value={startTime}
                          onChangeText={setStartTime}
                          placeholder="10:00 AM"
                          style={styles.textInput}
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subInputLabel}>End Time</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          value={endTime}
                          onChangeText={setEndTime}
                          placeholder="01:00 PM"
                          style={styles.textInput}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Reason / Notes */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Reason / Notes (Optional)</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Branch visit cancelled, Emergency medical leave"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={2}
                style={styles.notesInput}
              />

              {/* Submit Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreateNoShow}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.submitBtnText}>Confirm No-Show</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* DOCTOR PICKER MODAL */}
      <Modal
        visible={showDoctorPickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDoctorPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalBox}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Doctors at {branchClean}</Text>
              <TouchableOpacity onPress={() => setShowDoctorPickerModal(false)}>
                <Ionicons name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {branchDoctors.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    No doctors configured for this branch.
                  </Text>
                </View>
              ) : (
                branchDoctors.map((doc) => (
                  <TouchableOpacity
                    key={doc.doctorId}
                    style={styles.pickerDoctorItem}
                    onPress={() => {
                      setSelectedDoctor(doc);
                      setShowDoctorPickerModal(false);
                    }}
                  >
                    <View style={styles.docAvatarSmall}>
                      <Text style={styles.docAvatarSmallText}>
                        {doc.doctorName.replace("Dr.", "").trim().charAt(0) || "D"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerDocName}>{doc.doctorName}</Text>
                      {doc.scheduledDays && doc.scheduledDays.length > 0 ? (
                        <Text style={{ fontSize: 10, color: COLORS.themeBlue, fontWeight: "700", marginTop: 2 }}>
                          Working: {doc.scheduledDays.join(", ")}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
                          General Timings
                        </Text>
                      )}
                    </View>
                    {selectedDoctor?.doctorId === doc.doctorId ? (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.themeBlue} />
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CALENDAR PICKER MODAL */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <View style={styles.calModalCard}>
            <View style={styles.calHeaderRow}>
              <Text style={styles.calMonthTitle}>
                {new Date(calYear, calMonth).toLocaleString("default", { month: "long" })} {calYear}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                  style={styles.calNavBtn}
                >
                  <Ionicons name="chevron-back" size={18} color={COLORS.themeBlue} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  style={styles.calNavBtn}
                >
                  <Ionicons name="chevron-forward" size={18} color={COLORS.themeBlue} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekday Row */}
            <View style={styles.calWeekdaysRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <Text key={d} style={styles.calWeekdayText}>{d}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calDaysGrid}>
              {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calDayCell} />
              ))}
              {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                const day = i + 1;
                const formatted = `${String(day).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                const isSelected = (calendarTarget === "start" ? startDate : endDate) === formatted;

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      if (calendarTarget === "start") {
                        setStartDate(formatted);
                        if (dateRangeMode === "SINGLE") {
                          setEndDate(formatted);
                        }
                      } else {
                        setEndDate(formatted);
                      }
                      setShowCalendarModal(false);
                    }}
                    style={[styles.calDayCell, isSelected && styles.calDayCellSelected]}
                  >
                    <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  headerSubTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.themeBlue,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.themeBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: COLORS.themeBlueLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textDark,
    lineHeight: 16,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
    padding: 0,
  },
  refreshBtn: {
    padding: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
  },
  filterTabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterTabActive: {
    backgroundColor: COLORS.themeBlue,
    borderColor: COLORS.themeBlue,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  centerBox: {
    padding: 30,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 24,
    alignItems: "center",
    marginTop: 16,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.themeBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  recordCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  doctorInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  docAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.roseLight,
    alignItems: "center",
    justifyContent: "center",
  },
  docAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.rose,
  },
  docNameText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  docBranchText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fff1f2",
  },
  recordDetailsBox: {
    gap: 6,
    marginBottom: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  reasonBox: {
    backgroundColor: COLORS.bg,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  timestampText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: "#f8fafc",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.themeBlue,
  },
  closeModalBtn: {
    padding: 6,
  },
  modalForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 6,
  },
  subInputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  pickerTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  pickerTriggerText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pillToggleBox: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 2,
  },
  pillToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillToggleBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  pillToggleText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  pillToggleTextActive: {
    color: COLORS.textDark,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
    padding: 0,
    fontWeight: "600",
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeOptionCard: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  typeOptionCardActive: {
    borderColor: COLORS.rose,
    backgroundColor: COLORS.roseLight,
  },
  typeOptionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  typeOptionTitleActive: {
    color: COLORS.rose,
  },
  typeOptionDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  conditionalBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  conditionalTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.amber,
    marginBottom: 8,
  },
  radioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  radioBtnActive: {},
  radioBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  notesInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 11,
    color: COLORS.textDark,
    textAlignVertical: "top",
  },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
    marginBottom: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  submitBtn: {
    backgroundColor: COLORS.rose,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  pickerModalBox: {
    width: "85%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  pickerModalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  pickerDoctorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  docAvatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.themeBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  docAvatarSmallText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.themeBlue,
  },
  pickerDocName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  pickerDocPhone: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  scopeBtnActive: {
    borderColor: COLORS.themeBlue,
    backgroundColor: COLORS.themeBlueLight,
  },
  scopeBtnActiveRose: {
    borderColor: COLORS.rose,
    backgroundColor: COLORS.roseLight,
  },
  scopeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  scopeBtnTextActive: {
    color: COLORS.themeBlue,
    fontWeight: "800",
  },
  scopeBtnTextActiveRose: {
    color: COLORS.rose,
    fontWeight: "800",
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  datePickerBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  tapToChangeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.themeBlue,
  },
  availNoticeGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  availNoticeGreenText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "700",
    flex: 1,
  },
  availNoticeAmber: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  availNoticeAmberText: {
    fontSize: 11,
    color: "#b45309",
    fontWeight: "600",
    flex: 1,
  },
  calModalCard: {
    width: "88%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  calHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calMonthTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.themeBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  calWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
    marginBottom: 8,
  },
  calWeekdayText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    width: 36,
    textAlign: "center",
  },
  calDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  calDayCell: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 3,
    borderRadius: 18,
  },
  calDayCellSelected: {
    backgroundColor: COLORS.themeBlue,
  },
  calDayText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  calDayTextSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
});

