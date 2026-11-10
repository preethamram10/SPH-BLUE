import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  BackHandler,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch } from "../../../services/auth";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";

interface FollowUpItem {
  id: string;
  appointmentId: string;
  patientName: string;
  mrn: string;
  phone: string;
  doctorName: string;
  branch: string;
  condition?: string;
  dueDate: string;
  dueTime?: number;
  dueMonth?: number;
  dueYear?: number;
  isOverdue?: boolean;
  isDueToday?: boolean;
  isThisMonth?: boolean;
  isNextMonth?: boolean;
  followUpInterval: string;
  consultationFee: number;
  notes?: string;
  prescriptionImages?: string[];
  status: "Due Today" | "Overdue" | "Upcoming" | "Confirmed" | "Scheduled" | "Completed" | string;
}

export default function ReceptionFollowUpsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);

  // Period / Month Filters matching Web portal exactly
  const [periodFilter, setPeriodFilter] = useState<
    "this_month" | "next_month" | "due_today" | "overdue" | "all" | "month" | "range"
  >("this_month");

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Aggregate Stats matching Web
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    thisMonth: 0,
    nextMonth: 0,
    completed: 0,
  });

  // Modal State for Choose Month and Date Range
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calTarget, setCalTarget] = useState<"from" | "to">("from");
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  }, []);

  // Load Branch Info
  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });
  }, []);

  // Fetch Follow-ups synced with Web backend
  const loadFollowUps = async () => {
    setIsLoading(true);
    try {
      const cleanBranch = (activeBranch?.name || "").replace(/Spiritual Homeopathy/gi, "").trim();
      let url = `/reception/follow-ups?period=${periodFilter}`;
      if (cleanBranch && cleanBranch !== "All Branches") {
        url += `&branch=${encodeURIComponent(cleanBranch)}`;
      }
      if (periodFilter === "month" && selectedMonth) {
        url += `&selectedMonth=${encodeURIComponent(selectedMonth)}`;
      } else if (periodFilter === "range" && startDate && endDate) {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await apiFetch<any>(url);
      if (res && res.success) {
        if (Array.isArray(res.followUps)) {
          setFollowUps(res.followUps);
        }
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        setFollowUps([]);
      }
    } catch (err) {
      console.error("Failed to fetch follow-ups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [periodFilter, selectedMonth, startDate, endDate, activeBranch]);

  // Handle Search Input Debounce / Filter
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFollowUps();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCall = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "").slice(-10);
    Linking.openURL(`tel:${clean}`);
  };

  const handleWhatsApp = (phone: string, patientName: string, doctorName: string, dueDate: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "").slice(-10);
    const text = encodeURIComponent(
      `Hello ${patientName},\nThis is Spiritual Homeopathy Clinic. Your follow-up consultation with ${doctorName} is scheduled on ${dueDate}.\nPlease let us know if you would like to confirm your appointment.`
    );
    Linking.openURL(`whatsapp://send?phone=+91${clean}&text=${text}`);
  };

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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Patient Follow-Ups</Text>
          <Text style={styles.headerSub}>
            {(activeBranch?.name || "KPHB Branch").replace(/Spiritual Homeopathy/gi, "").trim()} • Live Queue
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadFollowUps} activeOpacity={0.7}>
          <Ionicons name="refresh" size={17} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* 2. Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={17} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, phone, or MRN..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={17} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Modern Period Filter Bar (Synced exactly with Web UI) */}
      <View style={styles.periodBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodScrollContent}
        >
          {/* This Month (Default) */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "this_month" && styles.periodChipActiveSky]}
            onPress={() => setPeriodFilter("this_month")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={periodFilter === "this_month" ? "#ffffff" : "#0284c7"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "this_month" && styles.periodChipTextActive,
              ]}
            >
              This Month
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "this_month" ? styles.countBadgeActiveWhite : styles.countBadgeSky,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "this_month" ? styles.countBadgeTextSky : styles.countBadgeTextSkyDark,
                ]}
              >
                {stats.thisMonth}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Next Month */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "next_month" && styles.periodChipActiveIndigo]}
            onPress={() => setPeriodFilter("next_month")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={periodFilter === "next_month" ? "#ffffff" : "#4f46e5"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "next_month" && styles.periodChipTextActive,
              ]}
            >
              Next Month
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "next_month" ? styles.countBadgeActiveWhite : styles.countBadgeIndigo,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "next_month" ? styles.countBadgeTextIndigo : styles.countBadgeTextIndigoDark,
                ]}
              >
                {stats.nextMonth}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Due Today */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "due_today" && styles.periodChipActiveAmber]}
            onPress={() => setPeriodFilter("due_today")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="time"
              size={13}
              color={periodFilter === "due_today" ? "#ffffff" : "#d97706"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "due_today" && styles.periodChipTextActive,
              ]}
            >
              Due Today
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "due_today" ? styles.countBadgeActiveWhite : styles.countBadgeAmber,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "due_today" ? styles.countBadgeTextAmber : styles.countBadgeTextAmberDark,
                ]}
              >
                {stats.dueToday}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Overdue (Date Passed) */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "overdue" && styles.periodChipActiveRose]}
            onPress={() => setPeriodFilter("overdue")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="alert-circle"
              size={13}
              color={periodFilter === "overdue" ? "#ffffff" : "#e11d48"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "overdue" && styles.periodChipTextActive,
              ]}
            >
              Overdue
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "overdue" ? styles.countBadgeActiveWhite : styles.countBadgeRose,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "overdue" ? styles.countBadgeTextRose : styles.countBadgeTextRoseDark,
                ]}
              >
                {stats.overdue}
              </Text>
            </View>
          </TouchableOpacity>

          {/* All Follow-Ups */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "all" && styles.periodChipActiveDark]}
            onPress={() => setPeriodFilter("all")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="list"
              size={13}
              color={periodFilter === "all" ? "#ffffff" : "#475569"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "all" && styles.periodChipTextActive,
              ]}
            >
              All Follow-Ups
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "all" ? styles.countBadgeActiveWhite : styles.countBadgeSlate,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "all" ? styles.countBadgeTextDark : styles.countBadgeTextSlateDark,
                ]}
              >
                {stats.total}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Choose Month Picker Button */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "month" && styles.periodChipActiveSky]}
            onPress={() => setShowMonthModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={periodFilter === "month" ? "#ffffff" : "#0284c7"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "month" && styles.periodChipTextActive,
              ]}
            >
              {periodFilter === "month" && selectedMonth ? selectedMonth : "Choose Month"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={periodFilter === "month" ? "#ffffff" : "#64748b"}
            />
          </TouchableOpacity>

          {/* Date Range Picker Button */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "range" && styles.periodChipActiveSky]}
            onPress={() => setShowRangeModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="git-compare-outline"
              size={13}
              color={periodFilter === "range" ? "#ffffff" : "#0284c7"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "range" && styles.periodChipTextActive,
              ]}
            >
              {periodFilter === "range" && startDate && endDate
                ? `${startDate.slice(0, 5)} - ${endDate.slice(0, 5)}`
                : "Date Range"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={periodFilter === "range" ? "#ffffff" : "#64748b"}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. Follow-up List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isLoading ? (
          <View style={styles.emptyStateContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.emptySubText}>Loading scheduled follow-ups...</Text>
          </View>
        ) : followUps.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#16a34a" />
            <Text style={styles.emptyTitleText}>No Follow-ups in This Filter</Text>
            <Text style={styles.emptySubText}>
              All patients are up to date! Try selecting "This Month" or "All Follow-Ups".
            </Text>
            <TouchableOpacity
              style={styles.showAllBtn}
              onPress={() => setPeriodFilter("all")}
              activeOpacity={0.7}
            >
              <Text style={styles.showAllBtnText}>Show All Follow-ups ({stats.total})</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {followUps.map((item, index) => {
              const cleanPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
              const isToday = item.dueDate === todayStr || item.isDueToday;
              const isOverdue = item.isOverdue || item.status === "Overdue";

              return (
                <View key={item.id || index} style={styles.followUpCard}>
                  {/* Top Row: Name, MRN, Due Date Pill */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{item.patientName}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <View style={styles.mrnBadge}>
                          <Text style={styles.mrnBadgeText}>{item.mrn}</Text>
                        </View>
                        <Text style={styles.phoneText}>{cleanPhone || "No Mobile"}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isOverdue
                          ? styles.statusOverdue
                          : isToday
                          ? styles.statusToday
                          : styles.statusUpcoming,
                      ]}
                    >
                      <Ionicons
                        name={isOverdue ? "alert-circle" : isToday ? "time" : "calendar-outline"}
                        size={11}
                        color={isOverdue ? "#e11d48" : isToday ? "#b45309" : "#0369a1"}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          isOverdue
                            ? styles.statusTextOverdue
                            : isToday
                            ? styles.statusTextToday
                            : styles.statusTextUpcoming,
                        ]}
                      >
                        {isOverdue ? "Overdue" : isToday ? "Due Today" : item.dueDate}
                      </Text>
                    </View>
                  </View>

                  {/* Middle Row: Doctor & Interval Chip */}
                  <View style={styles.cardInfoRow}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Doctor</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {item.doctorName?.startsWith("Dr.") ? item.doctorName : `Dr. ${item.doctorName || "Consultant"}`}
                      </Text>
                    </View>

                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Interval</Text>
                      <View style={styles.intervalChipSmall}>
                        <Text style={styles.intervalChipSmallText}>{item.followUpInterval || "1 Month"}</Text>
                      </View>
                    </View>

                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Branch</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {item.branch || "KPHB"}
                      </Text>
                    </View>
                  </View>

                  {/* Diagnosis / Notes if present */}
                  {item.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText} numberOfLines={2}>
                        📝 {item.notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Actions Row: Call, WhatsApp, Open Patient File */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.patientFileLinkBtn}
                      onPress={() =>
                        router.push({
                          pathname: "/(reception)/patient-file" as any,
                          params: {
                            id: item.appointmentId || item.id,
                            name: item.patientName,
                            phone: item.phone,
                            registrationId: item.mrn,
                            branch: item.branch,
                          },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="document-text-outline" size={13} color="#0284c7" />
                      <Text style={styles.patientFileLinkText}>Patient File</Text>
                    </TouchableOpacity>

                    <View style={styles.contactActionsRow}>
                      <TouchableOpacity
                        style={styles.callIconBtn}
                        onPress={() => handleCall(item.phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={14} color="#ffffff" />
                        <Text style={styles.callBtnText}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.whatsAppIconBtn}
                        onPress={() =>
                          handleWhatsApp(item.phone, item.patientName, item.doctorName, item.dueDate)
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                        <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 5. CHOOSE MONTH MODAL */}
      <Modal
        visible={showMonthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Follow-Up Month ({calYear})</Text>
              <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.monthsGrid}>
              {monthNames.map((name, idx) => {
                const monthKey = `${calYear}-${String(idx + 1).padStart(2, "0")}`;
                const isSelected = selectedMonth === monthKey && periodFilter === "month";
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.monthCell, isSelected && styles.monthCellActive]}
                    onPress={() => {
                      setSelectedMonth(monthKey);
                      setPeriodFilter("month");
                      setShowMonthModal(false);
                    }}
                  >
                    <Text style={[styles.monthCellText, isSelected && styles.monthCellTextActive]}>
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 6. DATE RANGE MODAL */}
      <Modal
        visible={showRangeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRangeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowRangeModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowRangeModal(false)}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, paddingVertical: 10 }}>
              <View>
                <Text style={styles.rangeInputLabel}>From Date</Text>
                <TouchableOpacity
                  style={styles.rangeDateBtn}
                  onPress={() => {
                    setCalTarget("from");
                    setShowCalendarModal(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color="#0284c7" />
                  <Text style={styles.rangeDateBtnText}>{startDate || "Pick From Date"}</Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.rangeInputLabel}>To Date</Text>
                <TouchableOpacity
                  style={styles.rangeDateBtn}
                  onPress={() => {
                    setCalTarget("to");
                    setShowCalendarModal(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color="#0284c7" />
                  <Text style={styles.rangeDateBtnText}>{endDate || "Pick To Date"}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.applyRangeBtn}
                onPress={() => {
                  if (!startDate || !endDate) {
                    alert("Please select both From and To dates.");
                    return;
                  }
                  setPeriodFilter("range");
                  setShowRangeModal(false);
                }}
              >
                <Text style={styles.applyRangeBtnText}>Apply Date Range</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 7. CALENDAR DATE SELECTOR MODAL */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <View style={styles.calModalCard}>
            <View style={styles.calHeaderRow}>
              <Text style={styles.calMonthTitle}>
                {monthNames[calMonth]} {calYear}
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
                  <Ionicons name="chevron-back" size={18} color="#0284c7" />
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
                  <Ionicons name="chevron-forward" size={18} color="#0284c7" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.calWeekdaysRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <Text key={d} style={styles.calWeekdayText}>{d}</Text>
              ))}
            </View>

            <View style={styles.calDaysGrid}>
              {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calDayCell} />
              ))}
              {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                const day = i + 1;
                const formatted = `${String(day).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                const isSelected = (calTarget === "from" ? startDate : endDate) === formatted;

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      if (calTarget === "from") {
                        setStartDate(formatted);
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

      {/* 8. Fixed Bottom Navigation Bar */}
      <ReceptionBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748b",
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0f172a",
    padding: 0,
  },
  periodBarContainer: {
    marginTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  periodScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  periodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  periodChipActiveSky: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  periodChipActiveIndigo: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  periodChipActiveAmber: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },
  periodChipActiveRose: {
    backgroundColor: "#e11d48",
    borderColor: "#e11d48",
  },
  periodChipActiveDark: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  periodChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  periodChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
  },
  countBadgeActiveWhite: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  countBadgeSky: {
    backgroundColor: "#e0f2fe",
  },
  countBadgeIndigo: {
    backgroundColor: "#e0e7ff",
  },
  countBadgeAmber: {
    backgroundColor: "#fef3c7",
  },
  countBadgeRose: {
    backgroundColor: "#ffe4e6",
  },
  countBadgeSlate: {
    backgroundColor: "#f1f5f9",
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  countBadgeTextSky: {
    color: "#ffffff",
  },
  countBadgeTextSkyDark: {
    color: "#0284c7",
  },
  countBadgeTextIndigo: {
    color: "#ffffff",
  },
  countBadgeTextIndigoDark: {
    color: "#4f46e5",
  },
  countBadgeTextAmber: {
    color: "#ffffff",
  },
  countBadgeTextAmberDark: {
    color: "#b45309",
  },
  countBadgeTextRose: {
    color: "#ffffff",
  },
  countBadgeTextRoseDark: {
    color: "#e11d48",
  },
  countBadgeTextDark: {
    color: "#ffffff",
  },
  countBadgeTextSlateDark: {
    color: "#334155",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  emptyTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  showAllBtn: {
    marginTop: 16,
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  showAllBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  followUpCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 13,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  patientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  mrnBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mrnBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
  phoneText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusToday: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  statusOverdue: {
    backgroundColor: "#ffe4e6",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  statusUpcoming: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  statusTextToday: {
    color: "#b45309",
  },
  statusTextOverdue: {
    color: "#e11d48",
  },
  statusTextUpcoming: {
    color: "#0369a1",
  },
  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 9,
    borderRadius: 10,
    marginTop: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 1,
  },
  intervalChipSmall: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  intervalChipSmallText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  notesBox: {
    marginTop: 8,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 11,
    color: "#475569",
    fontStyle: "italic",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  patientFileLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  patientFileLinkText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  contactActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  callIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  whatsAppIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  whatsAppBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  monthCell: {
    width: "30%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  monthCellActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  monthCellText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  monthCellTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  rangeInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  rangeDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  rangeDateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  applyRangeBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  applyRangeBtnText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "800",
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
    color: "#0f172a",
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
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
    color: "#64748b",
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
    backgroundColor: "#0284c7",
  },
  calDayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  calDayTextSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
