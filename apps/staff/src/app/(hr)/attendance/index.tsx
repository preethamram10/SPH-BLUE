import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { HRBottomNav } from "../../../components/hr/HRBottomNav";

interface AttendanceItem {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  branch: string;
  reportTime?: string;
  shiftType?: "SINGLE_STRICT" | "MULTI_STRICT";
  shiftHours?: string;
  dailyHours?: string;
  shift1Start?: string;
  shift1End?: string;
  shift1PunchInTime?: string | null;
  shift1PunchOutTime?: string | null;
  shift1PunchInPhoto?: string;
  shift1PunchOutPhoto?: string;
  shift1PunchInLocation?: string;
  shift1PunchOutLocation?: string;
  shift2Start?: string;
  shift2End?: string;
  shift2PunchInTime?: string | null;
  shift2PunchOutTime?: string | null;
  shift2PunchInPhoto?: string;
  shift2PunchOutPhoto?: string;
  shift2PunchInLocation?: string;
  shift2PunchOutLocation?: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  workingHours: string;
  status: "Present" | "Late" | "Half Day" | "Absent" | "On Leave" | "In Clinic";
  punchInLocation?: string;
  punchInPhoto?: string;
  punchOutLocation?: string;
  punchOutPhoto?: string;
  punches?: Array<{
    id: string;
    type: "in" | "out";
    time: string;
    location?: string;
    photo?: string;
    shift?: string;
  }>;
}

const STATUS_FILTERS = ["All", "Present", "Late", "On Leave", "Absent"];

export default function HRAttendanceScreen() {
  const router = useRouter();

  const [dateType, setDateType] = useState<"today" | "yesterday" | "custom">("today");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [branches, setBranches] = useState<string[]>(["All Branches"]);

  const [activeStatusFilter, setActiveStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; location?: string } | null>(null);

  // Fetch branches
  useEffect(() => {
    fetch(`${API_BASE_URL}/branches`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.branches) ? data.branches : [];
        if (list.length > 0) {
          const names: string[] = list
            .map((b: any) => (typeof b === "string" ? b.trim() : b.name?.trim()))
            .filter(Boolean);
          if (names.length > 0) {
            setBranches(["All Branches", ...Array.from(new Set(names))]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Set date based on quick selector
  const handleDateTypeSelect = (type: "today" | "yesterday") => {
    setDateType(type);
    const d = new Date();
    if (type === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    const ymd = d.toISOString().split("T")[0];
    setSelectedDate(ymd);
  };

  // Fetch attendance records from backend
  const fetchAttendance = async () => {
    try {
      setLoading(true);

      // Fetch from both admin/attendance and dashboard/stats in parallel
      const [attRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/attendance?branch=${encodeURIComponent(selectedBranch)}&date=${selectedDate}`),
        fetch(`${API_BASE_URL}/admin/dashboard/stats?date=${selectedDate}`),
      ]);

      const attData = await attRes.json();
      const statsData = await statsRes.json();

      let items: AttendanceItem[] = [];

      // If dashboard stats has enriched todayAttendance (which merges employees + leaves + punches)
      if (statsData.success && Array.isArray(statsData.todayAttendance) && statsData.todayAttendance.length > 0) {
        items = statsData.todayAttendance.map((a: any, idx: number) => ({
          id: a.id || `att-${idx}`,
          staffId: a.staffId || `S-${idx}`,
          staffName: a.staffName || a.name || "",
          role: a.role || a.category || "Staff",
          branch: a.branch || a.branchName || "",
          reportTime: a.reportTime || a.shiftStartTime || "09:00 AM",
          shiftType: a.shiftType || "SINGLE_STRICT",
          shiftHours: a.shiftHours,
          dailyHours: a.dailyHours,
          shift1Start: a.shift1Start,
          shift1End: a.shift1End,
          shift1PunchInTime: a.shift1PunchInTime || null,
          shift1PunchOutTime: a.shift1PunchOutTime || null,
          shift1PunchInPhoto: a.shift1PunchInPhoto || a.punchInPhoto,
          shift1PunchOutPhoto: a.shift1PunchOutPhoto,
          shift1PunchInLocation: a.shift1PunchInLocation || a.punchInLocation,
          shift1PunchOutLocation: a.shift1PunchOutLocation,
          shift2Start: a.shift2Start,
          shift2End: a.shift2End,
          shift2PunchInTime: a.shift2PunchInTime || null,
          shift2PunchOutTime: a.shift2PunchOutTime || null,
          shift2PunchInPhoto: a.shift2PunchInPhoto,
          shift2PunchOutPhoto: a.shift2PunchOutPhoto,
          shift2PunchInLocation: a.shift2PunchInLocation,
          shift2PunchOutLocation: a.shift2PunchOutLocation,
          punchInTime: a.punchInTime || null,
          punchOutTime: a.punchOutTime || null,
          punchInPhoto: a.punchInPhoto || undefined,
          punchOutPhoto: a.punchOutPhoto || undefined,
          punchInLocation: a.punchInLocation || undefined,
          punchOutLocation: a.punchOutLocation || undefined,
          workingHours: a.workingHours || "-",
          status: a.status || (a.punchInTime ? "Present" : "Absent"),
          punches: a.punches || [],
        }));
      } else if (attData.success && Array.isArray(attData.records)) {
        items = attData.records.map((r: any, idx: number) => ({
          id: r.id || `att-${idx}`,
          staffId: r.staffId || `S-${idx}`,
          staffName: r.staffName || r.name || "",
          role: r.role || r.category || "Staff",
          branch: r.branch || r.branchName || "",
          reportTime: r.reportTime || r.shiftStartTime || "09:00 AM",
          shiftType: r.shiftType || "SINGLE_STRICT",
          shiftHours: r.shiftHours,
          dailyHours: r.dailyHours,
          shift1Start: r.shift1Start,
          shift1End: r.shift1End,
          shift1PunchInTime: r.shift1PunchInTime || null,
          shift1PunchOutTime: r.shift1PunchOutTime || null,
          shift1PunchInPhoto: r.shift1PunchInPhoto || r.punchInPhoto,
          shift1PunchOutPhoto: r.shift1PunchOutPhoto,
          shift1PunchInLocation: r.shift1PunchInLocation || r.punchInLocation,
          shift1PunchOutLocation: r.shift1PunchOutLocation,
          shift2Start: r.shift2Start,
          shift2End: r.shift2End,
          shift2PunchInTime: r.shift2PunchInTime || null,
          shift2PunchOutTime: r.shift2PunchOutTime || null,
          shift2PunchInPhoto: r.shift2PunchInPhoto,
          shift2PunchOutPhoto: r.shift2PunchOutPhoto,
          shift2PunchInLocation: r.shift2PunchInLocation,
          shift2PunchOutLocation: r.shift2PunchOutLocation,
          punchInTime: r.punchInTime || null,
          punchOutTime: r.punchOutTime || null,
          punchInPhoto: r.punchInPhoto || undefined,
          punchOutPhoto: r.punchOutPhoto || undefined,
          punchInLocation: r.punchInLocation || undefined,
          punchOutLocation: r.punchOutLocation || undefined,
          workingHours: r.workingHours || "-",
          status: r.status || (r.punchInTime ? "Present" : "Absent"),
          punches: r.punches || [],
        }));
      }

      setRecords(items);
    } catch (err) {
      console.warn("Failed fetching attendance data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedBranch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendance();
  }, [selectedDate, selectedBranch]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const branchNorm = selectedBranch.toLowerCase().replace(/\s+branch$/i, "").trim();

    return records.filter((item) => {
      // Branch filter
      if (selectedBranch !== "All Branches") {
        const itemBranchNorm = (item.branch || "").toLowerCase().replace(/\s+branch$/i, "").trim();
        if (
          itemBranchNorm !== branchNorm &&
          !itemBranchNorm.includes(branchNorm) &&
          !branchNorm.includes(itemBranchNorm)
        ) {
          return false;
        }
      }

      // Status filter
      if (activeStatusFilter !== "All") {
        if (activeStatusFilter === "Present") {
          if (item.status !== "Present" && item.status !== "In Clinic") return false;
        } else if (activeStatusFilter === "On Leave") {
          if (item.status !== "On Leave") return false;
        } else if (activeStatusFilter === "Late") {
          if (item.status !== "Late") return false;
        } else if (activeStatusFilter === "Absent") {
          if (item.status !== "Absent") return false;
        }
      }

      // Search query
      if (q) {
        const nameMatch = (item.staffName || "").toLowerCase().includes(q);
        const roleMatch = (item.role || "").toLowerCase().includes(q);
        const branchMatch = (item.branch || "").toLowerCase().includes(q);
        if (!nameMatch && !roleMatch && !branchMatch) return false;
      }

      return true;
    });
  }, [records, selectedBranch, activeStatusFilter, search]);

  // Counts
  const counts = useMemo(() => {
    let present = 0;
    let late = 0;
    let onLeave = 0;
    let absent = 0;

    records.forEach((r) => {
      if (r.status === "Present" || r.status === "In Clinic") present++;
      else if (r.status === "Late") late++;
      else if (r.status === "On Leave") onLeave++;
      else absent++;
    });

    return { total: records.length, present, late, onLeave, absent };
  }, [records]);

  // Formatted date string
  const formattedDisplayDate = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Staff Attendance</Text>
          <Text style={styles.headerSub}>Clock-In, Punches &amp; Shift Compliance</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            fetchAttendance();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color="#0284c7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284c7"]} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* DATE & QUICK SELECTOR */}
        <View style={styles.dateSelectorCard}>
          <View style={styles.dateRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="calendar-outline" size={16} color="#0284c7" />
              <Text style={styles.dateDisplayTitle}>{formattedDisplayDate}</Text>
            </View>
            <View style={styles.quickDateToggle}>
              <TouchableOpacity
                style={[styles.quickDateBtn, dateType === "today" && styles.quickDateBtnActive]}
                onPress={() => handleDateTypeSelect("today")}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickDateText, dateType === "today" && styles.quickDateTextActive]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateBtn, dateType === "yesterday" && styles.quickDateBtnActive]}
                onPress={() => handleDateTypeSelect("yesterday")}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickDateText, dateType === "yesterday" && styles.quickDateTextActive]}>
                  Yesterday
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* BRANCH FILTER PILLS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
          <View style={styles.pillsRow}>
            {branches.map((b) => {
              const isSelected = selectedBranch === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={[styles.branchPill, isSelected && styles.branchPillActive]}
                  onPress={() => setSelectedBranch(b)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.branchPillText, isSelected && styles.branchPillTextActive]}>{b}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* KPI METRIC CARDS */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{counts.total}</Text>
            <Text style={styles.metricLabel}>Total Staff</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: "#16a34a", borderLeftWidth: 3 }]}>
            <Text style={[styles.metricNumber, { color: "#16a34a" }]}>{counts.present}</Text>
            <Text style={styles.metricLabel}>Present</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: "#d97706", borderLeftWidth: 3 }]}>
            <Text style={[styles.metricNumber, { color: "#d97706" }]}>{counts.late}</Text>
            <Text style={styles.metricLabel}>Late</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: "#0284c7", borderLeftWidth: 3 }]}>
            <Text style={[styles.metricNumber, { color: "#0284c7" }]}>{counts.onLeave}</Text>
            <Text style={styles.metricLabel}>On Leave</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff by name, role or branch..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={17} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* STATUS FILTER CHIPS */}
        <View style={styles.statusFiltersRow}>
          {STATUS_FILTERS.map((s) => {
            const isSelected = activeStatusFilter === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.statusFilterChip, isSelected && styles.statusFilterChipActive]}
                onPress={() => setActiveStatusFilter(s)}
                activeOpacity={0.75}
              >
                <Text style={[styles.statusFilterText, isSelected && styles.statusFilterTextActive]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ATTENDANCE RECORD LIST */}
        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>EMPLOYEE LOGS</Text>
          <Text style={styles.listSectionCount}>
            Showing {filteredRecords.length} of {records.length}
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={styles.loadingText}>Loading attendance punches...</Text>
          </View>
        ) : filteredRecords.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="person-circle-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Attendance Records</Text>
            <Text style={styles.emptySub}>
              {search
                ? "No employees match your search query."
                : "No punch-in logs recorded for this date and branch selection."}
            </Text>
          </View>
        ) : (
          filteredRecords.map((item) => {
            const isPresent = item.status === "Present" || item.status === "In Clinic";
            const isLate = item.status === "Late";
            const isOnLeave = item.status === "On Leave";
            const isAbsent = item.status === "Absent";

            let badgeBg = "#f1f5f9";
            let badgeColor = "#475569";
            if (isPresent) {
              badgeBg = "#dcfce7";
              badgeColor = "#16a34a";
            } else if (isLate) {
              badgeBg = "#fef3c7";
              badgeColor = "#d97706";
            } else if (isOnLeave) {
              badgeBg = "#e0f2fe";
              badgeColor = "#0284c7";
            } else if (isAbsent) {
              badgeBg = "#fee2e2";
              badgeColor = "#ef4444";
            }

            return (
              <View key={item.id} style={styles.recordCard}>
                {/* Top Row: Name, Role & Status Badge */}
                <View style={styles.recordTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {item.staffName}
                      </Text>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{item.role}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Ionicons name="business-outline" size={11} color="#64748b" />
                      <Text style={styles.branchName}>{item.branch}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{item.status}</Text>
                  </View>
                </View>

                {/* Timings Strip */}
                {item.shiftType === "MULTI_STRICT" || Boolean(item.shift2PunchInTime || item.shift2PunchOutTime || item.shift2Start) ? (
                  <View style={{ marginTop: 10, gap: 7 }}>
                    {/* Shift 1 Strip */}
                    <View style={{ backgroundColor: "#f0f9ff", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#bae6fd" }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <View style={{ backgroundColor: "#0284c7", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: "900", color: "#ffffff" }}>SHIFT 1</Text>
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#0369a1" }}>Morning Shift</Text>
                        </View>
                        {item.shift1PunchOutTime ? (
                          <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#16a34a" }}>✓ Completed</Text>
                        ) : (item.shift1PunchInTime || item.punchInTime) ? (
                          <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#0284c7" }}>● Active</Text>
                        ) : (
                          <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#94a3b8" }}>Pending</Text>
                        )}
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {item.shift1PunchInPhoto && (
                            <TouchableOpacity
                              onPress={() =>
                                setPreviewPhoto({
                                  url: item.shift1PunchInPhoto!,
                                  title: `Shift 1 Login - ${item.staffName}`,
                                  location: item.shift1PunchInLocation,
                                })
                              }
                            >
                              <Image source={{ uri: item.shift1PunchInPhoto }} style={{ width: 22, height: 22, borderRadius: 4 }} />
                            </TouchableOpacity>
                          )}
                          <View>
                            <Text style={{ fontSize: 9, color: "#64748b" }}>Login 1</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#0f172a" }}>
                              {item.shift1PunchInTime || item.punchInTime || "—"}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 9, color: "#64748b" }}>Logout 1</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#0f172a" }}>
                              {item.shift1PunchOutTime || "—"}
                            </Text>
                          </View>
                          {item.shift1PunchOutPhoto && (
                            <TouchableOpacity
                              onPress={() =>
                                setPreviewPhoto({
                                  url: item.shift1PunchOutPhoto!,
                                  title: `Shift 1 Logout - ${item.staffName}`,
                                  location: item.shift1PunchOutLocation,
                                })
                              }
                            >
                              <Image source={{ uri: item.shift1PunchOutPhoto }} style={{ width: 22, height: 22, borderRadius: 4 }} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Shift 2 Strip */}
                    <View style={{ backgroundColor: "#faf5ff", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#e9d5ff" }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <View style={{ backgroundColor: "#7c3aed", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: "900", color: "#ffffff" }}>SHIFT 2</Text>
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#6b21a8" }}>Evening Shift</Text>
                        </View>
                        {item.shift2PunchOutTime ? (
                          <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#16a34a" }}>✓ Completed</Text>
                        ) : item.shift2PunchInTime ? (
                          <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#7c3aed" }}>● Active</Text>
                        ) : (
                          <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#94a3b8" }}>Pending</Text>
                        )}
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {item.shift2PunchInPhoto && (
                            <TouchableOpacity
                              onPress={() =>
                                setPreviewPhoto({
                                  url: item.shift2PunchInPhoto!,
                                  title: `Shift 2 Login - ${item.staffName}`,
                                  location: item.shift2PunchInLocation,
                                })
                              }
                            >
                              <Image source={{ uri: item.shift2PunchInPhoto }} style={{ width: 22, height: 22, borderRadius: 4 }} />
                            </TouchableOpacity>
                          )}
                          <View>
                            <Text style={{ fontSize: 9, color: "#64748b" }}>Login 2</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#0f172a" }}>
                              {item.shift2PunchInTime || "—"}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 9, color: "#64748b" }}>Logout 2</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#0f172a" }}>
                              {item.shift2PunchOutTime || "—"}
                            </Text>
                          </View>
                          {item.shift2PunchOutPhoto && (
                            <TouchableOpacity
                              onPress={() =>
                                setPreviewPhoto({
                                  url: item.shift2PunchOutPhoto!,
                                  title: `Shift 2 Logout - ${item.staffName}`,
                                  location: item.shift2PunchOutLocation,
                                })
                              }
                            >
                              <Image source={{ uri: item.shift2PunchOutPhoto }} style={{ width: 22, height: 22, borderRadius: 4 }} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Total Hours & Logs Footnote */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 2, paddingHorizontal: 2 }}>
                      <Text style={{ fontSize: 10.5, color: "#475569" }}>
                        Total Hours: <Text style={{ color: "#0284c7", fontWeight: "800" }}>{item.workingHours && item.workingHours !== "-" ? item.workingHours : "—"}</Text>
                      </Text>
                      <View style={{ backgroundColor: "#e2e8f0", paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#334155" }}>
                          {[item.shift1PunchInTime || item.punchInTime, item.shift1PunchOutTime, item.shift2PunchInTime, item.shift2PunchOutTime].filter(Boolean).length}/4 Logs Recorded
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.timingsStrip}>
                    <View style={styles.timingCol}>
                      <Text style={styles.timingLabel}>Report</Text>
                      <Text style={styles.timingValue}>{item.reportTime || "09:00 AM"}</Text>
                    </View>
                    <View style={styles.timingDivider} />
                    <View style={styles.timingCol}>
                      <Text style={styles.timingLabel}>Punch In</Text>
                      <Text style={styles.timingValue}>{item.punchInTime || "—"}</Text>
                    </View>
                    <View style={styles.timingDivider} />
                    <View style={styles.timingCol}>
                      <Text style={styles.timingLabel}>Punch Out</Text>
                      <Text style={styles.timingValue}>
                        {item.punchOutTime || (isPresent ? "In Clinic" : "—")}
                      </Text>
                    </View>
                    <View style={styles.timingDivider} />
                    <View style={styles.timingCol}>
                      <Text style={styles.timingLabel}>Total Hours</Text>
                      <Text style={[styles.timingValue, { color: "#0284c7", fontWeight: "800" }]}>
                        {item.workingHours && item.workingHours !== "-" ? item.workingHours : "—"}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Location / Photo footnote if available */}
                {(item.punchInLocation || item.punchInPhoto) && (
                  <View style={styles.footnoteRow}>
                    {item.punchInLocation && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
                        <Ionicons name="location-outline" size={12} color="#0284c7" />
                        <Text style={styles.footnoteText} numberOfLines={1}>
                          {item.punchInLocation}
                        </Text>
                      </View>
                    )}
                    {item.punchInPhoto && (
                      <TouchableOpacity
                        style={styles.photoPill}
                        onPress={() =>
                          setPreviewPhoto({
                            url: item.punchInPhoto!,
                            title: item.staffName,
                            location: item.punchInLocation,
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera" size={11} color="#0284c7" />
                        <Text style={styles.photoPillText}>Photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* PHOTO PREVIEW MODAL */}
      <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalCard}>
            <View style={styles.photoModalHeader}>
              <View>
                <Text style={styles.photoModalTitle}>{previewPhoto?.title} - Punch Photo</Text>
                {previewPhoto?.location && (
                  <Text style={styles.photoModalSub} numberOfLines={1}>
                    📍 {previewPhoto.location}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setPreviewPhoto(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            {previewPhoto?.url && (
              <Image source={{ uri: previewPhoto.url }} style={styles.previewImage} resizeMode="cover" />
            )}
          </View>
        </View>
      </Modal>

      <HRBottomNav activeTab="dashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  refreshBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
  },
  scroll: { flex: 1 },
  content: { padding: 14, gap: 12 },

  // Date Card
  dateSelectorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateDisplayTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  quickDateToggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  quickDateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickDateBtnActive: {
    backgroundColor: "#0284c7",
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  quickDateTextActive: {
    color: "#ffffff",
  },

  // Branch Pills
  pillsScroll: {
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 6,
  },
  branchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  branchPillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  branchPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  branchPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  // Metrics
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    paddingVertical: 0,
  },

  // Status Filters
  statusFiltersRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  statusFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  statusFilterChipActive: {
    backgroundColor: "#0f172a",
  },
  statusFilterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  statusFilterTextActive: {
    color: "#ffffff",
  },

  // List Section Header
  listSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  listSectionCount: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },

  // Record Cards
  recordCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  recordTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  staffName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  roleTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  branchName: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },

  // Timings Strip
  timingsStrip: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  timingCol: {
    flex: 1,
    alignItems: "center",
  },
  timingLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 2,
  },
  timingValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  timingDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#e2e8f0",
  },

  // Footnote
  footnoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 8,
  },
  footnoteText: {
    fontSize: 10.5,
    color: "#64748b",
  },
  photoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  photoPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284c7",
  },

  // Loading & Empty
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748b",
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptySub: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // Photo Modal
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  photoModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
    maxWidth: 360,
  },
  photoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  photoModalTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  photoModalSub: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
  },
  previewImage: {
    width: "100%",
    height: 280,
  },
});
