import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";

const BRANCH_LIST = [
  "KPHB Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

const DAYS_LIST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRESET_SLOTS = [
  "10:00 AM - 01:00 PM",
  "11:00 AM - 02:00 PM",
  "02:00 PM - 05:00 PM",
  "05:00 PM - 08:00 PM",
  "06:00 PM - 09:00 PM",
];

export default function AdminDoctorTimingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);

  // Edit / Add Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [targetBranch, setTargetBranch] = useState("KPHB Branch");
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [dayStatus, setDayStatus] = useState<"Available" | "Closed">("Available");
  const [activeSlots, setActiveSlots] = useState<string[]>(["10:00 AM - 01:00 PM", "05:00 PM - 08:00 PM"]);

  const fetchDoctorTimings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/doctor-timings`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.schedules)) setSchedules(data.schedules);
          if (Array.isArray(data.doctors)) setAllDoctors(data.doctors);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch doctor timings on mobile:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDoctorTimings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDoctorTimings();
  }, []);

  const openEditModal = (doctor: any, branchName?: string) => {
    setSelectedDoctor(doctor);
    const bName = branchName || doctor.branchName || "KPHB Branch";
    setTargetBranch(bName);
    setSelectedDay("Mon");
    setDayStatus("Available");
    setActiveSlots(["10:00 AM - 01:00 PM", "05:00 PM - 08:00 PM"]);
    setEditModalVisible(true);
  };

  const toggleSlot = (slot: string) => {
    setActiveSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSaveTimings = async () => {
    if (!selectedDoctor) return;

    try {
      setSubmitting(true);
      // Find existing schedule or create payload
      const existingDoc = schedules.find(
        (s) => s.doctorId === selectedDoctor.id || s.id === selectedDoctor.id
      );

      let branchSchedules = existingDoc?.branchSchedules ? [...existingDoc.branchSchedules] : [];
      let bIdx = branchSchedules.findIndex(
        (bs: any) =>
          bs.branchName === targetBranch || bs.targetBranch === targetBranch
      );

      const daysObject: Record<string, any> = {};
      DAYS_LIST.forEach((d) => {
        if (d === selectedDay) {
          daysObject[d] = {
            day: d,
            isAvailable: dayStatus === "Available",
            status: dayStatus,
            slots: activeSlots.map((s, idx) => ({ id: `slot-${idx}`, displayText: s })),
          };
        } else {
          // preserve existing if any
          const prevDay = bIdx !== -1 ? branchSchedules[bIdx]?.days?.[d] : null;
          daysObject[d] = prevDay || {
            day: d,
            isAvailable: true,
            status: "Available",
            slots: [{ id: "slot-0", displayText: "10:00 AM - 01:00 PM" }],
          };
        }
      });

      if (bIdx !== -1) {
        branchSchedules[bIdx] = {
          ...branchSchedules[bIdx],
          branchName: targetBranch,
          targetBranch,
          days: daysObject,
        };
      } else {
        branchSchedules.push({
          id: `BS-${Date.now()}`,
          branchName: targetBranch,
          targetBranch,
          days: daysObject,
        });
      }

      const payload = {
        id: selectedDoctor.id,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name || selectedDoctor.doctorName,
        phone: selectedDoctor.phone || "",
        branchSchedules,
      };

      const res = await fetch(`${API_BASE_URL}/admin/doctor-timings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        Alert.alert(
          "Schedule Saved",
          `Timings for ${selectedDoctor.name || selectedDoctor.doctorName} at ${targetBranch} (${selectedDay}) updated successfully.`
        );
        setEditModalVisible(false);
        fetchDoctorTimings();
      } else {
        Alert.alert("Error", resData.error || "Failed to update doctor timings.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysSummary = (days: Record<string, any>): string => {
    if (!days) return "Available";
    const active = DAYS_LIST.filter((d) => days[d]?.isAvailable || days[d]?.status === "Available");
    if (active.length === 0) return "Closed";
    if (active.length === 7) return "Mon - Sun";
    return active.join(", ");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Doctor Timings</Text>
          <Text style={styles.headerSub}>Master Schedules &amp; OPD Consultation Hours</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDoctorTimings}>
          <Ionicons name="refresh" size={18} color="#0284c7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284c7"]} />}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="time" size={22} color="#0284c7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Clinic Timings Live Sync</Text>
            <Text style={styles.bannerDesc}>
              Configured branch slots automatically filter doctor lists on Reception booking.
            </Text>
          </View>
        </View>

        {/* Doctor Schedules List */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
        ) : schedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={42} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Doctor Schedules Configured</Text>
            <Text style={styles.emptySub}>
              Tap the edit button below on any practitioner to set OPD consultation timings.
            </Text>
          </View>
        ) : (
          schedules.map((doc) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{doc.doctorName}</Text>
                  <Text style={styles.docPhone}>📞 {doc.phone || "+91 Available"}</Text>
                </View>

                {/* Edit Timings Button */}
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(doc)}
                >
                  <Ionicons name="create-outline" size={14} color="#0284c7" />
                  <Text style={styles.editBtnText}>Edit Timings</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Branch Timings */}
              {(doc.branchSchedules || []).length === 0 ? (
                <Text style={styles.noBranchText}>No branch timings configured yet.</Text>
              ) : (
                doc.branchSchedules.map((bs: any) => {
                  const summary = getDaysSummary(bs.days);
                  return (
                    <View key={bs.id || bs.branchName} style={styles.branchBox}>
                      <View style={styles.branchTop}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="business" size={14} color="#0284c7" />
                          <Text style={styles.branchName}>{bs.branchName || bs.targetBranch}</Text>
                        </View>
                        <View style={styles.daysBadge}>
                          <Text style={styles.daysBadgeText}>{summary}</Text>
                        </View>
                      </View>

                      <View style={styles.slotsRow}>
                        {PRESET_SLOTS.slice(0, 2).map((s) => (
                          <View key={s} style={styles.slotPill}>
                            <Ionicons name="time-outline" size={11} color="#475569" />
                            <Text style={styles.slotPillText}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Doctor Timings Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="time" size={18} color="#0284c7" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Configure Doctor Timings</Text>
                  <Text style={styles.modalSub}>
                    {selectedDoctor?.name || selectedDoctor?.doctorName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Branch Selector */}
              <Text style={styles.fieldLabel}>Select Branch:</Text>
              <View style={styles.selectorWrap}>
                {BRANCH_LIST.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.chip,
                      targetBranch === b && styles.chipActive,
                    ]}
                    onPress={() => setTargetBranch(b)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        targetBranch === b && styles.chipTextActive,
                      ]}
                    >
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day Selector */}
              <Text style={styles.fieldLabel}>Select Day of Week:</Text>
              <View style={styles.daysRow}>
                {DAYS_LIST.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dayChip,
                      selectedDay === d && styles.dayChipActive,
                    ]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDay === d && styles.dayChipTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status Toggle */}
              <Text style={styles.fieldLabel}>OPD Availability Status:</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.statusBtn,
                    dayStatus === "Available" && styles.statusBtnAvailable,
                  ]}
                  onPress={() => setDayStatus("Available")}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={dayStatus === "Available" ? "#ffffff" : "#16a34a"}
                  />
                  <Text
                    style={[
                      styles.statusBtnText,
                      dayStatus === "Available" && styles.statusBtnTextActive,
                    ]}
                  >
                    Available
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusBtn,
                    dayStatus === "Closed" && styles.statusBtnClosed,
                  ]}
                  onPress={() => setDayStatus("Closed")}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={dayStatus === "Closed" ? "#ffffff" : "#ef4444"}
                  />
                  <Text
                    style={[
                      styles.statusBtnText,
                      dayStatus === "Closed" && styles.statusBtnTextActive,
                    ]}
                  >
                    Closed / Off Duty
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Slots Selection */}
              {dayStatus === "Available" && (
                <>
                  <Text style={styles.fieldLabel}>Available Consultation Slots:</Text>
                  <View style={styles.slotsGrid}>
                    {PRESET_SLOTS.map((s) => {
                      const selected = activeSlots.includes(s);
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.slotSelectChip,
                            selected && styles.slotSelectChipActive,
                          ]}
                          onPress={() => toggleSlot(s)}
                        >
                          <Ionicons
                            name={selected ? "checkmark-circle" : "ellipse-outline"}
                            size={14}
                            color={selected ? "#0284c7" : "#94a3b8"}
                          />
                          <Text
                            style={[
                              styles.slotSelectText,
                              selected && styles.slotSelectTextActive,
                            ]}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveTimings}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Schedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  refreshBtn: { padding: 8, backgroundColor: "#f0f9ff", borderRadius: 8 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTitle: { fontSize: 13.5, fontWeight: "800", color: "#0284c7" },
  bannerDesc: { fontSize: 11, color: "#475569", marginTop: 2, lineHeight: 16 },
  docCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  docHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  docName: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  docPhone: { fontSize: 11.5, color: "#64748b", marginTop: 2, fontWeight: "600" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editBtnText: { color: "#0284c7", fontSize: 11.5, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  noBranchText: { fontSize: 12, color: "#94a3b8", fontStyle: "italic", textAlign: "center", paddingVertical: 8 },
  branchBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  branchTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  branchName: { fontSize: 12.5, fontWeight: "700", color: "#334155" },
  daysBadge: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  daysBadgeText: { fontSize: 10.5, fontWeight: "800", color: "#0284c7" },
  slotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  slotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotPillText: { fontSize: 10.5, fontWeight: "600", color: "#475569" },
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
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  modalSub: { fontSize: 11.5, color: "#0284c7", fontWeight: "700" },
  fieldLabel: { fontSize: 11.5, fontWeight: "800", color: "#334155", marginTop: 10, marginBottom: 4 },
  selectorWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  chipText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  chipTextActive: { color: "#ffffff" },
  daysRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  dayChip: {
    width: 40,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  dayChipActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  dayChipText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  dayChipTextActive: { color: "#ffffff" },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 4,
  },
  statusBtnAvailable: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  statusBtnClosed: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  statusBtnText: { fontSize: 11.5, fontWeight: "700", color: "#475569" },
  statusBtnTextActive: { color: "#ffffff", fontWeight: "800" },
  slotsGrid: { gap: 6, marginTop: 4 },
  slotSelectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  slotSelectChipActive: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd",
  },
  slotSelectText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  slotSelectTextActive: { color: "#0284c7", fontWeight: "800" },
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
