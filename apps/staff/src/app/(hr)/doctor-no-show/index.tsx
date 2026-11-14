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
import { API_BASE_URL } from "../../../config/api";
import { HRBottomNav } from "../../../components/hr/HRBottomNav";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  themePurple: "#7c3aed",
  themePurpleLight: "#f3e8ff",
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

export default function HRDoctorNoShowScreen() {
  const router = useRouter();

  // Branch filter state
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [branchesList, setBranchesList] = useState<string[]>([
    "KPHB Branch",
    "Chandanagar Branch",
    "Dilsukhnagar Branch",
    "Nallagandla Branch",
  ]);
  const [showBranchFilterModal, setShowBranchFilterModal] = useState(false);

  // Data state
  const [noShows, setNoShows] = useState<DoctorNoShowRecord[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [branchScope, setBranchScope] = useState<"SPECIFIC" | "ALL">("ALL");
  const [targetSpecificBranch, setTargetSpecificBranch] = useState<string>("KPHB Branch");
  const [showTargetBranchModal, setShowTargetBranchModal] = useState(false);
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

  // Fetch branches
  useEffect(() => {
    fetch(`${API_BASE_URL}/branches`)
      .then((res) => res.json())
      .then((json) => {
        const branchArray = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        const names = branchArray.map((b: any) => b.name).filter(Boolean);
        if (names.length > 0) {
          setBranchesList(names);
          setTargetSpecificBranch(names[0]);
        }
      })
      .catch((e) => console.warn("Failed fetching branches for HR doctor no-show:", e));

    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    const dt = `${d}-${m}-${y}`;
    setStartDate(dt);
    setEndDate(dt);
  }, []);

  const loadData = async (branchFilter: string) => {
    try {
      setLoading(true);
      const url =
        branchFilter === "ALL"
          ? `${API_BASE_URL}/reception/doctor-no-show?branch=ALL`
          : `${API_BASE_URL}/reception/doctor-no-show?branch=${encodeURIComponent(branchFilter)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNoShows(data.noShows || []);
          setDoctorsList(data.doctors || []);
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
    loadData(selectedBranchFilter);
  }, [selectedBranchFilter]);

  const handleCreateNoShow = async () => {
    if (!selectedDoctor) {
      Alert.alert("Error", "Please select a doctor.");
      return;
    }

    try {
      setSubmitting(true);
      const targetBranch = branchScope === "ALL" ? "ALL" : targetSpecificBranch;
      const payload = {
        doctorId: selectedDoctor.doctorId,
        doctorName: selectedDoctor.doctorName,
        branch: targetBranch,
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
        Alert.alert(
          "Success",
          `No-Show assigned to ${selectedDoctor.doctorName} for ${
            branchScope === "ALL" ? "All Clinic Branches" : targetSpecificBranch
          }. Booking slots are now blocked.`
        );
        setIsModalOpen(false);
        setReason("");
        loadData(selectedBranchFilter);
      } else {
        Alert.alert("Error", data.error || "Failed to mark doctor no-show.");
      }
    } catch {
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

  const filteredNoShows = noShows.filter((item) => {
    const matchesSearch =
      item.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.branch.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "ALL" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(hr)" as any);
    }
  };

  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.headerTitle}>Doctor No-Show</Text>
              <View style={styles.hrBadge}>
                <Text style={styles.hrBadgeText}>HR</Text>
              </View>
            </View>
            {/* Branch Filter Selector Pill */}
            <TouchableOpacity
              onPress={() => setShowBranchFilterModal(true)}
              style={styles.branchFilterPill}
              activeOpacity={0.8}
            >
              <Ionicons
                name={selectedBranchFilter === "ALL" ? "globe-outline" : "business-outline"}
                size={12}
                color={COLORS.themePurple}
              />
              <Text style={styles.branchFilterPillText}>
                {selectedBranchFilter === "ALL" ? "All Clinic Branches" : selectedBranchFilter}
              </Text>
              <Ionicons name="chevron-down" size={12} color={COLORS.themePurple} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (doctorsList.length > 0 && !selectedDoctor) {
              setSelectedDoctor(doctorsList[0]);
            }
            setIsModalOpen(true);
          }}
          style={styles.headerAddBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.headerAddBtnText}>Assign</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary Strip */}
      <View style={styles.statsSummaryRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: COLORS.themePurpleLight }]}>
            <Ionicons name="person-remove" size={16} color={COLORS.themePurple} />
          </View>
          <View>
            <Text style={styles.statNumber}>{noShows.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: COLORS.roseLight }]}>
            <Ionicons name="calendar" size={16} color={COLORS.rose} />
          </View>
          <View>
            <Text style={[styles.statNumber, { color: COLORS.rose }]}>
              {noShows.filter((n) => n.type === "FULL_DAY").length}
            </Text>
            <Text style={styles.statLabel}>Full Day</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: COLORS.amberLight }]}>
            <Ionicons name="time" size={16} color={COLORS.amber} />
          </View>
          <View>
            <Text style={[styles.statNumber, { color: COLORS.amber }]}>
              {noShows.filter((n) => n.type === "HALF_DAY").length}
            </Text>
            <Text style={styles.statLabel}>Half Day</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: COLORS.themeBlueLight }]}>
            <Ionicons name="stopwatch" size={16} color={COLORS.themeBlue} />
          </View>
          <View>
            <Text style={[styles.statNumber, { color: COLORS.themeBlue }]}>
              {noShows.filter((n) => n.type === "SPECIFIC_TIME").length}
            </Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textLight} />
          <TextInput
            placeholder="Search by doctor, branch or reason..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsScroll}>
          <View style={styles.filterPillsRow}>
            {[
              { key: "ALL", label: "All Types" },
              { key: "FULL_DAY", label: "Full Day" },
              { key: "HALF_DAY", label: "Half Day" },
              { key: "SPECIFIC_TIME", label: "Specific Hours" },
            ].map((p) => {
              const active = filterType === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setFilterType(p.key)}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.themePurple} />
            <Text style={styles.loadingText}>Loading Doctor No-Show records...</Text>
          </View>
        ) : filteredNoShows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="person-remove-outline" size={48} color={COLORS.cardBorder} />
            <Text style={styles.emptyTitle}>No Doctor No-Show Records</Text>
            <Text style={styles.emptySubtitle}>
              {selectedBranchFilter === "ALL"
                ? "All doctors are currently active across all clinics."
                : `No active leaves recorded for ${selectedBranchFilter}.`}
            </Text>
          </View>
        ) : (
          filteredNoShows.map((item) => {
            const isGlobal =
              item.branch.toUpperCase() === "ALL" || item.branch.toLowerCase() === "all branches";
            return (
              <View key={item.id} style={styles.recordCard}>
                <View style={styles.recordCardHeader}>
                  <View style={styles.docInfoRow}>
                    <View style={styles.docAvatar}>
                      <Text style={styles.docAvatarText}>
                        {item.doctorName.replace("Dr.", "").trim().charAt(0) || "D"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>{item.doctorName}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                        {isGlobal ? (
                          <View style={styles.globalBadge}>
                            <Ionicons name="globe-outline" size={10} color={COLORS.rose} />
                            <Text style={styles.globalBadgeText}>All Branches</Text>
                          </View>
                        ) : (
                          <View style={styles.branchBadge}>
                            <Ionicons name="business-outline" size={10} color={COLORS.themePurple} />
                            <Text style={styles.branchBadgeText}>{item.branch}</Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.typeBadge,
                            item.type === "FULL_DAY"
                              ? styles.typeBadgeFull
                              : item.type === "HALF_DAY"
                              ? styles.typeBadgeHalf
                              : styles.typeBadgeHours,
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              item.type === "FULL_DAY"
                                ? { color: COLORS.rose }
                                : item.type === "HALF_DAY"
                                ? { color: COLORS.amber }
                                : { color: COLORS.themeBlue },
                            ]}
                          >
                            {item.type === "FULL_DAY"
                              ? "Full Day"
                              : item.type === "HALF_DAY"
                              ? `Half Day (${item.halfDayType === "FIRST_HALF" ? "1st" : "2nd"})`
                              : "Specific Hours"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteNoShow(item.id, item.doctorName)}
                    style={styles.deleteBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.rose} />
                  </TouchableOpacity>
                </View>

                {/* Date & Time details */}
                <View style={styles.cardDetailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.detailText}>
                      {item.startDate}
                      {item.endDate && item.endDate !== item.startDate ? ` to ${item.endDate}` : ""}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.detailText}>
                      {item.type === "FULL_DAY"
                        ? "All Day OPD"
                        : item.type === "HALF_DAY"
                        ? item.halfDayType === "FIRST_HALF"
                          ? "10:00 AM – 02:00 PM"
                          : "02:00 PM – 09:00 PM"
                        : `${item.startTime || ""} – ${item.endTime || ""}`}
                    </Text>
                  </View>
                </View>

                {item.reason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonText}>"{item.reason}"</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* HR Bottom Navigation */}
      <HRBottomNav activeTab="dashboard" />

      {/* ================= BRANCH FILTER MODAL ================= */}
      <Modal
        visible={showBranchFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBranchFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBranchFilterModal(false)}
        >
          <View style={styles.dropdownModalCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Branch Filter</Text>
              <TouchableOpacity onPress={() => setShowBranchFilterModal(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.branchModalItem,
                selectedBranchFilter === "ALL" && styles.branchModalItemSelected,
              ]}
              onPress={() => {
                setSelectedBranchFilter("ALL");
                setShowBranchFilterModal(false);
              }}
            >
              <Ionicons name="globe-outline" size={18} color={COLORS.themePurple} />
              <Text
                style={[
                  styles.branchModalItemText,
                  selectedBranchFilter === "ALL" && styles.branchModalItemTextSelected,
                ]}
              >
                🌐 All Clinic Branches
              </Text>
              {selectedBranchFilter === "ALL" && (
                <Ionicons name="checkmark-circle" size={18} color={COLORS.themePurple} />
              )}
            </TouchableOpacity>

            {branchesList.map((b) => (
              <TouchableOpacity
                key={b}
                style={[
                  styles.branchModalItem,
                  selectedBranchFilter === b && styles.branchModalItemSelected,
                ]}
                onPress={() => {
                  setSelectedBranchFilter(b);
                  setShowBranchFilterModal(false);
                }}
              >
                <Ionicons name="business-outline" size={18} color={COLORS.themePurple} />
                <Text
                  style={[
                    styles.branchModalItemText,
                    selectedBranchFilter === b && styles.branchModalItemTextSelected,
                  ]}
                >
                  📍 {b}
                </Text>
                {selectedBranchFilter === b && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.themePurple} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= ASSIGN NO-SHOW MODAL ================= */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="person-remove" size={18} color={COLORS.themePurple} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Assign Doctor No-Show</Text>
                  <Text style={styles.modalSubtitle}>HR Multi-Branch Control</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Branch Scope: Specific Branch vs All Branches */}
              <Text style={styles.fieldLabel}>Branch Scope</Text>
              <View style={styles.scopeRow}>
                <TouchableOpacity
                  style={[styles.scopeBtn, branchScope === "SPECIFIC" && styles.scopeBtnActive]}
                  onPress={() => setBranchScope("SPECIFIC")}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={branchScope === "SPECIFIC" ? COLORS.themePurple : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.scopeBtnText,
                      branchScope === "SPECIFIC" && styles.scopeBtnTextActive,
                    ]}
                  >
                    Specific Branch
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.scopeBtn, branchScope === "ALL" && styles.scopeBtnActiveAll]}
                  onPress={() => setBranchScope("ALL")}
                >
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color={branchScope === "ALL" ? COLORS.rose : COLORS.textMuted}
                  />
                  <Text
                    style={[styles.scopeBtnText, branchScope === "ALL" && { color: COLORS.rose }]}
                  >
                    All Branches
                  </Text>
                </TouchableOpacity>
              </View>

              {/* If Specific Branch is selected, choose which branch */}
              {branchScope === "SPECIFIC" && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.fieldLabel}>Select Target Branch</Text>
                  <TouchableOpacity
                    style={styles.pickerSelector}
                    onPress={() => setShowTargetBranchModal(true)}
                  >
                    <Ionicons name="business-outline" size={18} color={COLORS.themePurple} />
                    <Text style={styles.pickerSelectorText}>{targetSpecificBranch}</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Doctor Picker */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Select Doctor</Text>
                <TouchableOpacity
                  style={styles.pickerSelector}
                  onPress={() => setShowDoctorPickerModal(true)}
                >
                  <Ionicons name="medical" size={18} color={COLORS.themePurple} />
                  <Text style={styles.pickerSelectorText}>
                    {selectedDoctor ? selectedDoctor.doctorName : "Select a Doctor"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              {/* Date Scope Mode: Single Day vs Date Range */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Date Range</Text>
                <View style={styles.dateModeRow}>
                  <TouchableOpacity
                    style={[
                      styles.dateModeBtn,
                      dateRangeMode === "SINGLE" && styles.dateModeBtnActive,
                    ]}
                    onPress={() => {
                      setDateRangeMode("SINGLE");
                      setEndDate(startDate);
                    }}
                  >
                    <Text
                      style={[
                        styles.dateModeBtnText,
                        dateRangeMode === "SINGLE" && styles.dateModeBtnTextActive,
                      ]}
                    >
                      Single Day
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateModeBtn,
                      dateRangeMode === "RANGE" && styles.dateModeBtnActive,
                    ]}
                    onPress={() => setDateRangeMode("RANGE")}
                  >
                    <Text
                      style={[
                        styles.dateModeBtnText,
                        dateRangeMode === "RANGE" && styles.dateModeBtnTextActive,
                      ]}
                    >
                      Date Range
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Inputs */}
              <View style={styles.datesGrid}>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => {
                    setCalendarTarget("start");
                    setShowCalendarModal(true);
                  }}
                >
                  <Text style={styles.datePickerLabel}>
                    {dateRangeMode === "RANGE" ? "Start Date" : "Date"}
                  </Text>
                  <View style={styles.datePickerValRow}>
                    <Ionicons name="calendar-outline" size={15} color={COLORS.themePurple} />
                    <Text style={styles.datePickerValText}>{startDate}</Text>
                  </View>
                </TouchableOpacity>

                {dateRangeMode === "RANGE" ? (
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => {
                      setCalendarTarget("end");
                      setShowCalendarModal(true);
                    }}
                  >
                    <Text style={styles.datePickerLabel}>End Date</Text>
                    <View style={styles.datePickerValRow}>
                      <Ionicons name="calendar-outline" size={15} color={COLORS.themePurple} />
                      <Text style={styles.datePickerValText}>{endDate}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.datePickerBtn, { backgroundColor: "#f1f5f9" }]}>
                    <Text style={styles.datePickerLabel}>Day of Week</Text>
                    <Text style={[styles.datePickerValText, { color: COLORS.textMuted }]}>
                      {getDayAbbrFromDate(startDate) || "—"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Absence Type */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Absence Type</Text>
                <View style={styles.typeButtonsRow}>
                  <TouchableOpacity
                    style={[styles.typeBtn, noShowType === "FULL_DAY" && styles.typeBtnFullActive]}
                    onPress={() => setNoShowType("FULL_DAY")}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        noShowType === "FULL_DAY" && { color: COLORS.rose, fontWeight: "800" },
                      ]}
                    >
                      Full Day
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeBtn, noShowType === "HALF_DAY" && styles.typeBtnHalfActive]}
                    onPress={() => setNoShowType("HALF_DAY")}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        noShowType === "HALF_DAY" && { color: COLORS.amber, fontWeight: "800" },
                      ]}
                    >
                      Half Day
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      noShowType === "SPECIFIC_TIME" && styles.typeBtnHoursActive,
                    ]}
                    onPress={() => setNoShowType("SPECIFIC_TIME")}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        noShowType === "SPECIFIC_TIME" && {
                          color: COLORS.themeBlue,
                          fontWeight: "800",
                        },
                      ]}
                    >
                      Specific Hours
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dynamic Half-Day Selection */}
              {noShowType === "HALF_DAY" && (
                <View style={styles.halfDaySection}>
                  <Text style={styles.halfDaySectionTitle}>Choose Half</Text>
                  <View style={styles.halfDayRow}>
                    <TouchableOpacity
                      style={[
                        styles.halfDayCard,
                        halfDayType === "FIRST_HALF" && styles.halfDayCardActive,
                      ]}
                      onPress={() => setHalfDayType("FIRST_HALF")}
                    >
                      <Text style={styles.halfDayTitle}>First Half</Text>
                      <Text style={styles.halfDaySubtitle}>10:00 AM – 02:00 PM</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.halfDayCard,
                        halfDayType === "SECOND_HALF" && styles.halfDayCardActive,
                      ]}
                      onPress={() => setHalfDayType("SECOND_HALF")}
                    >
                      <Text style={styles.halfDayTitle}>Second Half</Text>
                      <Text style={styles.halfDaySubtitle}>02:00 PM – 09:00 PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Dynamic Specific Hours */}
              {noShowType === "SPECIFIC_TIME" && (
                <View style={styles.specificHoursSection}>
                  <Text style={styles.specificHoursTitle}>Unavailable Hours</Text>
                  <View style={styles.specificHoursRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeLabel}>From Time</Text>
                      <TextInput
                        value={startTime}
                        onChangeText={setStartTime}
                        style={styles.timeInput}
                        placeholder="10:00 AM"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeLabel}>To Time</Text>
                      <TextInput
                        value={endTime}
                        onChangeText={setEndTime}
                        style={styles.timeInput}
                        placeholder="01:00 PM"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Reason */}
              <View style={{ marginTop: 14, marginBottom: 20 }}>
                <Text style={styles.fieldLabel}>Reason (Optional)</Text>
                <TextInput
                  placeholder="e.g. Personal leave, emergency, conference..."
                  value={reason}
                  onChangeText={setReason}
                  style={styles.reasonInput}
                  multiline
                  numberOfLines={2}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateNoShow}
                disabled={submitting}
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={16} color={COLORS.white} />
                    <Text style={styles.submitBtnText}>Confirm &amp; Block Slots</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= TARGET BRANCH PICKER MODAL ================= */}
      <Modal
        visible={showTargetBranchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTargetBranchModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTargetBranchModal(false)}
        >
          <View style={styles.dropdownModalCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Clinic Branch</Text>
              <TouchableOpacity onPress={() => setShowTargetBranchModal(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {branchesList.map((b) => (
              <TouchableOpacity
                key={b}
                style={[
                  styles.branchModalItem,
                  targetSpecificBranch === b && styles.branchModalItemSelected,
                ]}
                onPress={() => {
                  setTargetSpecificBranch(b);
                  setShowTargetBranchModal(false);
                }}
              >
                <Ionicons name="business-outline" size={18} color={COLORS.themePurple} />
                <Text
                  style={[
                    styles.branchModalItemText,
                    targetSpecificBranch === b && styles.branchModalItemTextSelected,
                  ]}
                >
                  📍 {b}
                </Text>
                {targetSpecificBranch === b && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.themePurple} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= DOCTOR PICKER MODAL ================= */}
      <Modal
        visible={showDoctorPickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDoctorPickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDoctorPickerModal(false)}
        >
          <View style={styles.dropdownModalCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choose Doctor</Text>
              <TouchableOpacity onPress={() => setShowDoctorPickerModal(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {doctorsList.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    No doctors found.
                  </Text>
                </View>
              ) : (
                doctorsList.map((doc) => (
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
                      <Text style={{ fontSize: 10, color: COLORS.themePurple, fontWeight: "700", marginTop: 2 }}>
                        {doc.scheduledDays && doc.scheduledDays.length > 0
                          ? `Working: ${doc.scheduledDays.join(", ")}`
                          : "All Days (General)"}
                      </Text>
                    </View>
                    {selectedDoctor?.doctorId === doc.doctorId && (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.themePurple} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= CALENDAR PICKER MODAL ================= */}
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
                  <Ionicons name="chevron-back" size={18} color={COLORS.themePurple} />
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
                  <Ionicons name="chevron-forward" size={18} color={COLORS.themePurple} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.calWeekdaysRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <Text key={d} style={styles.calWeekdayText}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.calDaysGrid}>
              {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calDayCell} />
              ))}
              {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                const day = i + 1;
                const formatted = `${String(day).padStart(2, "0")}-${String(
                  calMonth + 1
                ).padStart(2, "0")}-${calYear}`;
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
    gap: 10,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  hrBadge: {
    backgroundColor: COLORS.themePurpleLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  hrBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.themePurple,
  },
  branchFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 3,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  branchFilterPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.themePurple,
  },
  headerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.themePurple,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: COLORS.themePurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.white,
  },
  statsSummaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
    padding: 0,
  },
  filterPillsScroll: {
    marginTop: 8,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterPillActive: {
    backgroundColor: COLORS.themePurple,
    borderColor: COLORS.themePurple,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  listContainer: {
    flex: 1,
    marginTop: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  emptyBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  emptySubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  recordCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  docInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  docAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.themePurpleLight,
    alignItems: "center",
    justifyContent: "center",
  },
  docAvatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.themePurple,
  },
  docName: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  globalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.roseLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  globalBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.rose,
  },
  branchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.themePurpleLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  branchBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.themePurple,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  typeBadgeFull: {
    backgroundColor: COLORS.roseLight,
  },
  typeBadgeHalf: {
    backgroundColor: COLORS.amberLight,
  },
  typeBadgeHours: {
    backgroundColor: COLORS.themeBlueLight,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fff1f2",
  },
  cardDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  reasonBox: {
    marginTop: 8,
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
  },
  reasonText: {
    fontSize: 11,
    fontStyle: "italic",
    color: COLORS.textMuted,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "88%",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: "#faf5ff",
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.themePurpleLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  modalSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.themePurple,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  scopeRow: {
    flexDirection: "row",
    gap: 8,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  scopeBtnActive: {
    backgroundColor: COLORS.themePurpleLight,
    borderColor: COLORS.themePurple,
  },
  scopeBtnActiveAll: {
    backgroundColor: COLORS.roseLight,
    borderColor: COLORS.rose,
  },
  scopeBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
  },
  scopeBtnTextActive: {
    color: COLORS.themePurple,
  },
  pickerSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  pickerSelectorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  dateModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  dateModeBtnActive: {
    backgroundColor: COLORS.themePurpleLight,
    borderColor: COLORS.themePurple,
  },
  dateModeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  dateModeBtnTextActive: {
    color: COLORS.themePurple,
    fontWeight: "800",
  },
  datesGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  datePickerBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  datePickerLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  datePickerValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  datePickerValText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  typeButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },
  typeBtnFullActive: {
    backgroundColor: COLORS.roseLight,
    borderColor: COLORS.rose,
  },
  typeBtnHalfActive: {
    backgroundColor: COLORS.amberLight,
    borderColor: COLORS.amber,
  },
  typeBtnHoursActive: {
    backgroundColor: COLORS.themeBlueLight,
    borderColor: COLORS.themeBlue,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  halfDaySection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: COLORS.amberLight,
    borderRadius: 10,
  },
  halfDaySectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.amber,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  halfDayRow: {
    flexDirection: "row",
    gap: 8,
  },
  halfDayCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  halfDayCardActive: {
    borderColor: COLORS.amber,
    backgroundColor: "#fffbeb",
  },
  halfDayTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  halfDaySubtitle: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  specificHoursSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: COLORS.themeBlueLight,
    borderRadius: 10,
  },
  specificHoursTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.themeBlue,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  specificHoursRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  timeInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    color: COLORS.textDark,
    backgroundColor: COLORS.bg,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.themePurple,
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.white,
  },

  // Dropdown card styles
  dropdownModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  branchModalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  branchModalItemSelected: {
    backgroundColor: COLORS.themePurpleLight,
  },
  branchModalItemText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  branchModalItemTextSelected: {
    color: COLORS.themePurple,
    fontWeight: "800",
  },
  pickerDoctorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  docAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.themePurpleLight,
    alignItems: "center",
    justifyContent: "center",
  },
  docAvatarSmallText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.themePurple,
  },
  pickerDocName: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  // Calendar styles
  calModalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  calHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calMonthTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  calNavBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
  },
  calWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
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
  },
  calDayCell: {
    width: "14.28%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  calDayCellSelected: {
    backgroundColor: COLORS.themePurple,
  },
  calDayText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  calDayTextSelected: {
    color: COLORS.white,
    fontWeight: "800",
  },
});
