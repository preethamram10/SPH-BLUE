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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { HRBottomNav } from "../../../components/hr/HRBottomNav";

interface EmployeeShift {
  id: string;
  name: string;
  phone: string;
  category: string;
  branchName: string;
  shiftType?: "SINGLE_STRICT" | "MULTI_STRICT";
  shiftHours?: string;
  dailyHours?: string;
  shift1Start?: string;
  shift1End?: string;
  shift2Start?: string;
  shift2End?: string;
  graceMinutes?: number;
  status?: string;
}

const PRESET_SHIFTS = [
  {
    name: "General OPD (9 AM - 6 PM)",
    type: "SINGLE_STRICT" as const,
    hours: "09:00 AM - 06:00 PM",
    daily: "9 hrs/day",
  },
  {
    name: "Morning OPD (8:30 AM - 4:30 PM)",
    type: "SINGLE_STRICT" as const,
    hours: "08:30 AM - 04:30 PM",
    daily: "8 hrs/day",
  },
  {
    name: "Evening OPD (1 PM - 9 PM)",
    type: "SINGLE_STRICT" as const,
    hours: "01:00 PM - 09:00 PM",
    daily: "8 hrs/day",
  },
  {
    name: "Split Shift (9-1 & 4:30-8:30)",
    type: "MULTI_STRICT" as const,
    hours: "09:00 AM - 01:00 PM & 04:30 PM - 08:30 PM",
    daily: "8 hrs/day",
    s1Start: "09:00 AM",
    s1End: "01:00 PM",
    s2Start: "04:30 PM",
    s2End: "08:30 PM",
  },
  {
    name: "Full Clinic (9 AM - 8:30 PM)",
    type: "SINGLE_STRICT" as const,
    hours: "09:00 AM - 08:30 PM",
    daily: "11.5 hrs/day",
  },
];

export default function HRShiftsScreen() {
  const router = useRouter();

  const [employees, setEmployees] = useState<EmployeeShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedShiftType, setSelectedShiftType] = useState<"ALL" | "SINGLE" | "SPLIT">("ALL");
  const [search, setSearch] = useState("");

  const [branches, setBranches] = useState<string[]>(["All Branches"]);

  // Edit Modal State
  const [editingStaff, setEditingStaff] = useState<EmployeeShift | null>(null);
  const [modalShiftType, setModalShiftType] = useState<"SINGLE_STRICT" | "MULTI_STRICT">("SINGLE_STRICT");
  const [modalShiftHours, setModalShiftHours] = useState("09:00 AM - 06:00 PM");
  const [modalDailyHours, setModalDailyHours] = useState("9 hrs/day");
  const [modalS1Start, setModalS1Start] = useState("09:00 AM");
  const [modalS1End, setModalS1End] = useState("01:00 PM");
  const [modalS2Start, setModalS2Start] = useState("04:30 PM");
  const [modalS2End, setModalS2End] = useState("08:30 PM");
  const [modalGrace, setModalGrace] = useState(15);
  const [saving, setSaving] = useState(false);

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

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/employees`);
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.warn("Failed fetching staff shifts list:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmployees();
  }, []);

  // Filtered staff
  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const branchNorm = selectedBranch.toLowerCase().replace(/\s+branch$/i, "").trim();

    return employees.filter((emp) => {
      // Branch filter
      if (selectedBranch !== "All Branches") {
        const itemBranch = (emp.branchName || "").toLowerCase().replace(/\s+branch$/i, "").trim();
        if (itemBranch !== branchNorm && !itemBranch.includes(branchNorm) && !branchNorm.includes(itemBranch)) {
          return false;
        }
      }

      // Shift Type Filter
      if (selectedShiftType === "SINGLE") {
        if (emp.shiftType === "MULTI_STRICT") return false;
      } else if (selectedShiftType === "SPLIT") {
        if (emp.shiftType !== "MULTI_STRICT") return false;
      }

      // Search Query
      if (q) {
        const nameMatch = (emp.name || "").toLowerCase().includes(q);
        const roleMatch = (emp.category || "").toLowerCase().includes(q);
        const phoneMatch = (emp.phone || "").toLowerCase().includes(q);
        const branchMatch = (emp.branchName || "").toLowerCase().includes(q);
        if (!nameMatch && !roleMatch && !phoneMatch && !branchMatch) return false;
      }

      return true;
    });
  }, [employees, selectedBranch, selectedShiftType, search]);

  // Counts
  const counts = useMemo(() => {
    let single = 0;
    let split = 0;
    employees.forEach((e) => {
      if (e.shiftType === "MULTI_STRICT") split++;
      else single++;
    });
    return { total: employees.length, single, split };
  }, [employees]);

  // Open edit modal
  const handleOpenEdit = (emp: EmployeeShift) => {
    setEditingStaff(emp);
    const isMulti = emp.shiftType === "MULTI_STRICT";
    setModalShiftType(isMulti ? "MULTI_STRICT" : "SINGLE_STRICT");
    setModalShiftHours(emp.shiftHours || "09:00 AM - 06:00 PM");
    setModalDailyHours(emp.dailyHours || "9 hrs/day");
    setModalS1Start(emp.shift1Start || "09:00 AM");
    setModalS1End(emp.shift1End || "01:00 PM");
    setModalS2Start(emp.shift2Start || "04:30 PM");
    setModalS2End(emp.shift2End || "08:30 PM");
    setModalGrace(emp.graceMinutes || 15);
  };

  // Apply preset
  const handleApplyPreset = (preset: (typeof PRESET_SHIFTS)[0]) => {
    setModalShiftType(preset.type);
    setModalShiftHours(preset.hours);
    setModalDailyHours(preset.daily);
    if (preset.s1Start) setModalS1Start(preset.s1Start);
    if (preset.s1End) setModalS1End(preset.s1End);
    if (preset.s2Start) setModalS2Start(preset.s2Start);
    if (preset.s2End) setModalS2End(preset.s2End);
  };

  // Save changes
  const handleSaveShift = async () => {
    if (!editingStaff) return;
    try {
      setSaving(true);
      const computedHours =
        modalShiftType === "MULTI_STRICT"
          ? `${modalS1Start} - ${modalS1End} & ${modalS2Start} - ${modalS2End}`
          : modalShiftHours;

      const payload = {
        id: editingStaff.id,
        shiftType: modalShiftType,
        shiftHours: computedHours,
        dailyHours: modalDailyHours,
        shift1Start: modalShiftType === "MULTI_STRICT" ? modalS1Start : undefined,
        shift1End: modalShiftType === "MULTI_STRICT" ? modalS1End : undefined,
        shift2Start: modalShiftType === "MULTI_STRICT" ? modalS2Start : undefined,
        shift2End: modalShiftType === "MULTI_STRICT" ? modalS2End : undefined,
        graceMinutes: modalGrace,
      };

      const res = await fetch(`${API_BASE_URL}/admin/employees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // Update local state
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === editingStaff.id
              ? {
                  ...e,
                  ...payload,
                }
              : e
          )
        );
        Alert.alert("Shift Updated", `Shift timings for ${editingStaff.name} saved successfully.`);
        setEditingStaff(null);
      } else {
        Alert.alert("Update Failed", data.error || "Failed to update shift.");
      }
    } catch (err: any) {
      Alert.alert("Network Error", err.message || "Failed to save shift timings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Staff Shifts &amp; Roster</Text>
          <Text style={styles.headerSub}>Manage Shift Timings &amp; Working Hours</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            fetchEmployees();
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
          <View style={[styles.metricCard, { borderLeftColor: "#0284c7", borderLeftWidth: 3 }]}>
            <Text style={[styles.metricNumber, { color: "#0284c7" }]}>{counts.single}</Text>
            <Text style={styles.metricLabel}>Single Shift</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: "#7c3aed", borderLeftWidth: 3 }]}>
            <Text style={[styles.metricNumber, { color: "#7c3aed" }]}>{counts.split}</Text>
            <Text style={styles.metricLabel}>Split / Double</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: "#16a34a", borderLeftWidth: 3 }]}>
            <Text style={[styles.metricNumber, { color: "#16a34a" }]}>15m</Text>
            <Text style={styles.metricLabel}>Grace Time</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff by name, role or department..."
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

        {/* SHIFT TYPE FILTER CHIPS */}
        <View style={styles.statusFiltersRow}>
          {[
            { label: "All Shifts", val: "ALL" as const },
            { label: "Single Shift", val: "SINGLE" as const },
            { label: "Split Shift", val: "SPLIT" as const },
          ].map((s) => {
            const isSelected = selectedShiftType === s.val;
            return (
              <TouchableOpacity
                key={s.val}
                style={[styles.statusFilterChip, isSelected && styles.statusFilterChipActive]}
                onPress={() => setSelectedShiftType(s.val)}
                activeOpacity={0.75}
              >
                <Text style={[styles.statusFilterText, isSelected && styles.statusFilterTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ROSTER LIST HEADER */}
        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>STAFF SCHEDULE ROSTER</Text>
          <Text style={styles.listSectionCount}>
            Showing {filteredEmployees.length} of {employees.length}
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={styles.loadingText}>Loading shift schedules...</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Staff Found</Text>
            <Text style={styles.emptySub}>No employee shift rosters match the current filter selection.</Text>
          </View>
        ) : (
          filteredEmployees.map((emp) => {
            const isSplit = emp.shiftType === "MULTI_STRICT";
            const shiftTitle = isSplit ? "SPLIT SHIFT" : "SINGLE SHIFT";
            const shiftHours = isSplit
              ? `${emp.shift1Start || "09:00 AM"} - ${emp.shift1End || "01:00 PM"} & ${emp.shift2Start || "04:30 PM"} - ${emp.shift2End || "08:30 PM"}`
              : emp.shiftHours || "09:00 AM - 06:00 PM";

            return (
              <View key={emp.id} style={styles.shiftCard}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {emp.name}
                      </Text>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{emp.category}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Ionicons name="business-outline" size={11} color="#64748b" />
                      <Text style={styles.branchName}>{emp.branchName || "All Branches"}</Text>
                    </View>
                  </View>

                  {/* Shift Badge */}
                  <View style={[styles.shiftTypeBadge, isSplit ? styles.badgeSplit : styles.badgeSingle]}>
                    <Text style={[styles.shiftTypeBadgeText, isSplit ? { color: "#7c3aed" } : { color: "#0284c7" }]}>
                      {shiftTitle}
                    </Text>
                  </View>
                </View>

                {/* Timing Details Box */}
                <View style={styles.timingDetailsBox}>
                  <View style={styles.timingRowItem}>
                    <Ionicons name="time-outline" size={14} color="#0284c7" />
                    <Text style={styles.timingText}>{shiftHours}</Text>
                  </View>
                  <View style={styles.subTimingRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="hourglass-outline" size={12} color="#64748b" />
                      <Text style={styles.subTimingText}>{emp.dailyHours || "9 hrs/day"}</Text>
                    </View>
                    <View style={styles.dotSeparator} />
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="shield-checkmark-outline" size={12} color="#16a34a" />
                      <Text style={styles.subTimingText}>{emp.graceMinutes || 15} mins grace</Text>
                    </View>
                  </View>
                </View>

                {/* Action Bar */}
                <View style={styles.cardActionBar}>
                  <TouchableOpacity
                    style={styles.editShiftBtn}
                    onPress={() => handleOpenEdit(emp)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pencil" size={13} color="#0284c7" />
                    <Text style={styles.editShiftBtnText}>Edit Shift Timings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* EDIT SHIFT MODAL */}
      <Modal visible={!!editingStaff} transparent animationType="slide" onRequestClose={() => setEditingStaff(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Shift Timing</Text>
                <Text style={styles.modalSub}>
                  {editingStaff?.name} • {editingStaff?.category}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingStaff(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 14, gap: 12 }}>
              {/* Shift Type Toggle */}
              <View>
                <Text style={styles.inputLabel}>SHIFT STRUCTURE</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, modalShiftType === "SINGLE_STRICT" && styles.toggleBtnActive]}
                    onPress={() => setModalShiftType("SINGLE_STRICT")}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="sunny-outline"
                      size={14}
                      color={modalShiftType === "SINGLE_STRICT" ? "#ffffff" : "#64748b"}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        modalShiftType === "SINGLE_STRICT" && styles.toggleBtnTextActive,
                      ]}
                    >
                      Single Continuous
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleBtn, modalShiftType === "MULTI_STRICT" && styles.toggleBtnActive]}
                    onPress={() => setModalShiftType("MULTI_STRICT")}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={14}
                      color={modalShiftType === "MULTI_STRICT" ? "#ffffff" : "#64748b"}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        modalShiftType === "MULTI_STRICT" && styles.toggleBtnTextActive,
                      ]}
                    >
                      Split / Double Shift
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Presets */}
              <View>
                <Text style={styles.inputLabel}>QUICK PRESETS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 4 }}>
                    {PRESET_SHIFTS.map((p, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.presetChip}
                        onPress={() => handleApplyPreset(p)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.presetChipText}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Timings Inputs */}
              {modalShiftType === "SINGLE_STRICT" ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.inputLabel}>WORK HOURS (START - END)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={modalShiftHours}
                    onChangeText={setModalShiftHours}
                    placeholder="e.g. 09:00 AM - 06:00 PM"
                  />
                  <Text style={styles.inputLabel}>DAILY HOURS</Text>
                  <TextInput
                    style={styles.textInput}
                    value={modalDailyHours}
                    onChangeText={setModalDailyHours}
                    placeholder="e.g. 9 hrs/day"
                  />
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text style={styles.inputLabel}>SHIFT 1 (MORNING BLOCK)</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={modalS1Start}
                      onChangeText={setModalS1Start}
                      placeholder="Start (09:00 AM)"
                    />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={modalS1End}
                      onChangeText={setModalS1End}
                      placeholder="End (01:00 PM)"
                    />
                  </View>

                  <Text style={styles.inputLabel}>SHIFT 2 (EVENING BLOCK)</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={modalS2Start}
                      onChangeText={setModalS2Start}
                      placeholder="Start (04:30 PM)"
                    />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={modalS2End}
                      onChangeText={setModalS2End}
                      placeholder="End (08:30 PM)"
                    />
                  </View>
                </View>
              )}

              {/* Grace Period */}
              <View>
                <Text style={styles.inputLabel}>GRACE PERIOD (PUNCH-IN TOLERANCE)</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[10, 15, 30].map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={[styles.gracePill, modalGrace === mins && styles.gracePillActive]}
                      onPress={() => setModalGrace(mins)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.gracePillText, modalGrace === mins && styles.gracePillTextActive]}>
                        {mins} Minutes
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingStaff(null)}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveShift}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                    <Text style={styles.saveBtnText}>Save Shift</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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

  // Shift Type Chips
  statusFiltersRow: {
    flexDirection: "row",
    gap: 6,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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

  // Shift Cards
  shiftCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  cardTopRow: {
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
  shiftTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSingle: {
    backgroundColor: "#e0f2fe",
  },
  badgeSplit: {
    backgroundColor: "#f3e8ff",
  },
  shiftTypeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  // Timings Box
  timingDetailsBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    gap: 6,
  },
  timingRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timingText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  subTimingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subTimingText: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "600",
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
  },

  // Action Bar
  cardActionBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  editShiftBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  editShiftBtnText: {
    fontSize: 11,
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#0284c7",
  },
  toggleBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748b",
  },
  toggleBtnTextActive: {
    color: "#ffffff",
  },
  presetChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  presetChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    color: "#0f172a",
    fontWeight: "600",
  },
  gracePill: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  gracePillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  gracePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  gracePillTextActive: {
    color: "#ffffff",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#0284c7",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
});
