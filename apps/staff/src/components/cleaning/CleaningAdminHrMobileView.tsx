import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../config/api";

const COLORS = {
  primary: "#0284c7",
  primaryDark: "#0369a1",
  teal: "#0d9488",
  tealLight: "#ccfbf1",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#d97706",
  warningLight: "#fef3c7",
  danger: "#e11d48",
  dangerLight: "#ffe4e6",
  card: "#ffffff",
  bg: "#f8fafc",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
};

interface Photo {
  id: string;
  url: string;
  key: string;
  uploadedAt: string;
}

interface CleaningField {
  id: string;
  name: string;
  photos: Photo[];
  status: "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED";
  rejectReason?: string;
}

interface HistoryLog {
  action: string;
  performedBy: string;
  performedRole: string;
  timestamp: string;
  remarks?: string;
}

interface CleaningTask {
  id: string;
  branchId: string;
  branchName: string;
  assignedDate: string; // DD-MM-YYYY
  status: "PENDING_UPLOAD" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  assignedBy: string;
  assignedRole: "ADMIN" | "HR";
  fields: CleaningField[];
  reviewedBy?: string;
  reviewedRole?: string;
  reviewRemarks?: string;
  historyLogs: HistoryLog[];
  createdAt: string;
}

interface Props {
  role: "ADMIN" | "HR";
  userName: string;
  onBack?: () => void;
}

const DEFAULT_BRANCHES = [
  "ALL",
  "Kphb",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

const PRESET_AREAS = [
  "Bathroom / Restroom",
  "Reception Front Desk",
  "Waiting Lounge / Sitting Area",
  "Doctor Room 1",
  "Pharmacy",
  "Handwash Station",
];

function getTodayDDMMYYYY(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
}

export default function CleaningAdminHrMobileView({ role, userName, onBack }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("ALL");

  // Schedule Modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [newBranch, setNewBranch] = useState("Kphb");
  const [newDateStr, setNewDateStr] = useState(getTodayDDMMYYYY());
  const [newFields, setNewFields] = useState<string[]>([
    "Bathroom / Restroom",
    "Reception Front Desk",
    "Waiting Lounge / Sitting Area",
  ]);
  const [customAreaInput, setCustomAreaInput] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  // Review Modal
  const [reviewTask, setReviewTask] = useState<CleaningTask | null>(null);
  const [rejectedFieldIds, setRejectedFieldIds] = useState<string[]>([]);
  const [fieldRemarks, setFieldRemarks] = useState<Record<string, string>>({});
  const [overallRemarks, setOverallRemarks] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Full-screen Photo Preview
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Logs Modal
  const [logsTask, setLogsTask] = useState<CleaningTask | null>(null);

  const fetchTasks = async (isPull = false) => {
    if (!isPull) setIsLoading(true);
    try {
      let url = `${API_BASE_URL}/cleaning/tasks?`;
      if (selectedBranch !== "ALL") {
        url += `branchName=${encodeURIComponent(selectedBranch)}&`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedBranch]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTasks(true);
  };

  // Add Preset Area
  const handleAddPresetArea = (area: string) => {
    if (!newFields.includes(area)) {
      setNewFields([...newFields, area]);
    }
  };

  // Add Custom Area
  const handleAddCustomArea = () => {
    const trimmed = customAreaInput.trim();
    if (trimmed && !newFields.includes(trimmed)) {
      setNewFields([...newFields, trimmed]);
      setCustomAreaInput("");
    }
  };

  const handleRemoveField = (index: number) => {
    setNewFields(newFields.filter((_, i) => i !== index));
  };

  // Submit Schedule
  const handleScheduleSubmit = async () => {
    if (newFields.length === 0) {
      Alert.alert("Missing Areas", "Please configure at least one inspection area.");
      return;
    }

    setIsScheduling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cleaning/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: newBranch,
          assignedDate: newDateStr.trim(),
          assignedBy: userName || "Admin / HR",
          assignedRole: role,
          fieldNames: newFields,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert("Schedule Failed", data.error || "Could not schedule cleaning task.");
        return;
      }

      setIsScheduleOpen(false);
      fetchTasks();
      Alert.alert(
        "Task Scheduled",
        `Cleaning inspection assigned for ${newBranch} on ${newDateStr}!`
      );
    } catch (err: any) {
      Alert.alert("Network Error", err.message || "Failed to schedule.");
    } finally {
      setIsScheduling(false);
    }
  };

  // Toggle field rejection
  const toggleRejectField = (fieldId: string) => {
    if (rejectedFieldIds.includes(fieldId)) {
      setRejectedFieldIds(rejectedFieldIds.filter((id) => id !== fieldId));
    } else {
      setRejectedFieldIds([...rejectedFieldIds, fieldId]);
    }
  };

  // Submit Review (Approve or Reject)
  const handleReviewAction = async (action: "APPROVE" | "REJECT") => {
    if (!reviewTask) return;

    if (action === "REJECT" && rejectedFieldIds.length === 0 && !overallRemarks.trim()) {
      Alert.alert(
        "Action Required",
        "Please select at least one area to reject or provide a general remark."
      );
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cleaning/tasks/${reviewTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVIEW",
          reviewAction: action,
          reviewedBy: userName || "Admin / HR",
          reviewedRole: role,
          remarks: overallRemarks.trim(),
          rejectedFieldIds,
          fieldRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert("Review Failed", data.error || "Could not submit review.");
        return;
      }

      setReviewTask(null);
      fetchTasks();
      Alert.alert(
        action === "APPROVE" ? "Approved!" : "Rejected",
        data.message || (action === "APPROVE" ? "Reception unlocked." : "Notified reception to re-upload.")
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Delete task
  const handleDeleteTask = (id: string) => {
    Alert.alert("Delete Task", "Are you sure you want to delete this cleaning audit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API_BASE_URL}/cleaning/tasks/${id}`, { method: "DELETE" });
            fetchTasks();
          } catch (err) {
            Alert.alert("Error", "Failed to delete task.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack ? onBack : () => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="sparkles" size={16} color={COLORS.teal} />
            <Text style={styles.headerTitle}>Cleaning Audits</Text>
          </View>
          <Text style={styles.headerSub}>
            {role} Portal • Branch Hygiene Inspections
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setIsScheduleOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Branch Filter Chips */}
      <View style={styles.branchFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchFilterScroll}>
          {DEFAULT_BRANCHES.map((b) => {
            const active = selectedBranch === b;
            return (
              <TouchableOpacity
                key={b}
                onPress={() => setSelectedBranch(b)}
                style={[styles.branchChip, active && styles.branchChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.branchChipText, active && styles.branchChipTextActive]}>
                  {b}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Task List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading cleaning tasks...</Text>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Cleaning Audits</Text>
          <Text style={styles.emptySubtitle}>
            Tap &quot;Schedule&quot; above to allocate a cleaning date and inspection areas for a branch.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        >
          {tasks.map((task) => {
            const uploadedCount = task.fields.filter((f) => f.photos.length > 0).length;
            const totalFields = task.fields.length;
            const isComplete = uploadedCount === totalFields;

            return (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.branchPill}>
                    <Ionicons name="business" size={13} color={COLORS.primary} />
                    <Text style={styles.branchPillText}>{task.branchName}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      task.status === "APPROVED"
                        ? styles.statusApproved
                        : task.status === "UNDER_REVIEW"
                        ? styles.statusReview
                        : task.status === "REJECTED"
                        ? styles.statusRejected
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        task.status === "APPROVED"
                          ? styles.statusTextApproved
                          : task.status === "UNDER_REVIEW"
                          ? styles.statusTextReview
                          : task.status === "REJECTED"
                          ? styles.statusTextRejected
                          : styles.statusTextPending,
                      ]}
                    >
                      {task.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>

                {/* Date & Meta */}
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={15} color={COLORS.success} />
                  <Text style={styles.dateText}>
                    Date: <Text style={{ fontWeight: "900", color: COLORS.textDark }}>{task.assignedDate}</Text>
                  </Text>
                  <Text style={styles.assignedByText}>
                    • By {task.assignedBy} ({task.assignedRole})
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeaderRow}>
                    <Text style={styles.progressLabel}>Photos Uploaded</Text>
                    <Text style={styles.progressVal}>
                      {uploadedCount} of {totalFields} areas
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${totalFields > 0 ? (uploadedCount / totalFields) * 100 : 0}%`,
                          backgroundColor: isComplete ? COLORS.success : COLORS.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Areas chips */}
                <View style={styles.areasRow}>
                  {task.fields.map((f) => (
                    <View
                      key={f.id}
                      style={[
                        styles.areaChip,
                        f.status === "APPROVED"
                          ? styles.areaChipApproved
                          : f.status === "REJECTED"
                          ? styles.areaChipRejected
                          : f.photos.length > 0
                          ? styles.areaChipUploaded
                          : styles.areaChipPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.areaChipText,
                          f.status === "APPROVED"
                            ? styles.areaChipTextApproved
                            : f.status === "REJECTED"
                            ? styles.areaChipTextRejected
                            : f.photos.length > 0
                            ? styles.areaChipTextUploaded
                            : styles.areaChipTextPending,
                        ]}
                      >
                        {f.name} {f.photos.length > 0 ? `(${f.photos.length})` : ""}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Remarks if any */}
                {task.reviewRemarks ? (
                  <View style={styles.remarksBox}>
                    <Text style={styles.remarksLabel}>Remarks: </Text>
                    <Text style={styles.remarksText}>{task.reviewRemarks}</Text>
                  </View>
                ) : null}

                {/* Card Actions */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.logsBtn}
                    onPress={() => setLogsTask(task)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.logsBtnText}>Logs</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => {
                        setReviewTask(task);
                        setRejectedFieldIds([]);
                        setFieldRemarks({});
                        setOverallRemarks("");
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={14} color="#ffffff" />
                      <Text style={styles.reviewBtnText}>
                        {task.status === "APPROVED" ? "View Photos" : "Review & Verify"}
                      </Text>
                    </TouchableOpacity>

                    {role === "ADMIN" && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteTask(task.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ------------------------------------------------ */}
      {/* 1. SCHEDULE CLEANING MODAL                        */}
      {/* ------------------------------------------------ */}
      <Modal visible={isScheduleOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="sparkles" size={18} color={COLORS.teal} />
                <Text style={styles.modalTitle}>Schedule Cleaning Audit</Text>
              </View>
              <TouchableOpacity onPress={() => setIsScheduleOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Branch */}
              <View>
                <Text style={styles.inputLabel}>Clinic Branch</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {DEFAULT_BRANCHES.filter((b) => b !== "ALL").map((b) => (
                    <TouchableOpacity
                      key={b}
                      onPress={() => setNewBranch(b)}
                      style={[styles.modalBranchChip, newBranch === b && styles.modalBranchChipActive]}
                    >
                      <Text style={[styles.modalBranchChipText, newBranch === b && styles.modalBranchChipTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date (DD-MM-YYYY) */}
              <View>
                <Text style={styles.inputLabel}>Inspection Date (DD-MM-YYYY)</Text>
                <TextInput
                  value={newDateStr}
                  onChangeText={setNewDateStr}
                  placeholder="DD-MM-YYYY (e.g. 06-11-2026)"
                  style={styles.textInput}
                />
              </View>

              {/* Configured Areas */}
              <View>
                <Text style={styles.inputLabel}>
                  Inspection Areas ({newFields.length})
                </Text>
                <View style={styles.configuredAreasBox}>
                  {newFields.map((f, i) => (
                    <View key={i} style={styles.configuredAreaBadge}>
                      <Text style={styles.configuredAreaText}>{f}</Text>
                      <TouchableOpacity onPress={() => handleRemoveField(i)}>
                        <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* Quick Add Presets */}
              <View>
                <Text style={styles.inputLabel}>+ Quick Add Presets</Text>
                <View style={styles.presetChipsRow}>
                  {PRESET_AREAS.map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => handleAddPresetArea(preset)}
                      disabled={newFields.includes(preset)}
                      style={[styles.presetChip, newFields.includes(preset) && styles.presetChipDisabled]}
                    >
                      <Text style={[styles.presetChipText, newFields.includes(preset) && { color: COLORS.textMuted }]}>
                        + {preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Area */}
              <View>
                <Text style={styles.inputLabel}>+ Add Custom Area</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={customAreaInput}
                    onChangeText={setCustomAreaInput}
                    placeholder="e.g. Doctor Cabin, Terrace..."
                    style={[styles.textInput, { flex: 1 }]}
                  />
                  <TouchableOpacity style={styles.addCustomBtn} onPress={handleAddCustomArea}>
                    <Text style={styles.addCustomBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleScheduleSubmit}
                disabled={isScheduling}
                activeOpacity={0.8}
              >
                {isScheduling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Assign Cleaning Task</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------ */}
      {/* 2. REVIEW & VERIFY MODAL                          */}
      {/* ------------------------------------------------ */}
      {reviewTask && (
        <Modal visible={!!reviewTask} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={[styles.modalSheet, { maxHeight: "90%" }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{reviewTask.branchName}</Text>
                  <Text style={styles.headerSub}>Inspection Date: {reviewTask.assignedDate}</Text>
                </View>
                <TouchableOpacity onPress={() => setReviewTask(null)}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                <Text style={styles.inputLabel}>SUBMITTED PHOTOS PER AREA</Text>

                {reviewTask.fields.map((field) => {
                  const isMarked = rejectedFieldIds.includes(field.id);

                  return (
                    <View
                      key={field.id}
                      style={[
                        styles.reviewFieldBox,
                        isMarked && { borderColor: COLORS.danger, backgroundColor: "#fff1f2" },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.reviewFieldHeader}
                        onPress={() => toggleRejectField(field.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isMarked ? "checkbox" : "square-outline"}
                          size={18}
                          color={isMarked ? COLORS.danger : COLORS.textMuted}
                        />
                        <Text style={styles.reviewFieldName}>{field.name}</Text>
                        <Text
                          style={[
                            styles.reviewFieldStatus,
                            isMarked ? { color: COLORS.danger } : { color: COLORS.primary },
                          ]}
                        >
                          {isMarked ? "Marked for Rejection" : `${field.photos.length} Photo(s)`}
                        </Text>
                      </TouchableOpacity>

                      {/* Photo thumbnails */}
                      {field.photos.length === 0 ? (
                        <Text style={styles.noPhotoText}>No photo uploaded yet</Text>
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                          {field.photos.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              onPress={() => setPreviewPhoto(p.url)}
                              activeOpacity={0.8}
                              style={{ marginRight: 8 }}
                            >
                              <Image source={{ uri: p.url }} style={styles.reviewPhotoThumb} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}

                      {/* Field remark if marked */}
                      {isMarked && (
                        <TextInput
                          value={fieldRemarks[field.id] || ""}
                          onChangeText={(t) => setFieldRemarks({ ...fieldRemarks, [field.id]: t })}
                          placeholder="Rejection reason for this area..."
                          style={styles.rejectInput}
                        />
                      )}
                    </View>
                  );
                })}

                {/* Overall Remarks */}
                <View>
                  <Text style={styles.inputLabel}>General Remarks / Feedback</Text>
                  <TextInput
                    value={overallRemarks}
                    onChangeText={setOverallRemarks}
                    placeholder="Verification feedback for Reception..."
                    multiline
                    numberOfLines={2}
                    style={[styles.textInput, { height: 60 }]}
                  />
                </View>

                {/* Review Action Buttons */}
                <View style={styles.reviewActionsRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReviewAction("REJECT")}
                    disabled={isSubmittingReview}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
                    <Text style={styles.rejectBtnText}>
                      {rejectedFieldIds.length > 0
                        ? `Reject (${rejectedFieldIds.length})`
                        : "Reject All"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleReviewAction("APPROVE")}
                    disabled={isSubmittingReview}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                    <Text style={styles.approveBtnText}>Approve &amp; Unlock</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ------------------------------------------------ */}
      {/* 3. LOGS MODAL                                     */}
      {/* ------------------------------------------------ */}
      {logsTask && (
        <Modal visible={!!logsTask} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Audit History Logs</Text>
                <TouchableOpacity onPress={() => setLogsTask(null)}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {logsTask.historyLogs.map((log, i) => (
                  <View key={i} style={styles.logCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.logAction}>{log.action}</Text>
                      <Text style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <Text style={styles.logBy}>
                      By: {log.performedBy} ({log.performedRole})
                    </Text>
                    {log.remarks ? <Text style={styles.logRemarks}>&quot;{log.remarks}&quot;</Text> : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ------------------------------------------------ */}
      {/* 4. PHOTO PREVIEW MODAL                            */}
      {/* ------------------------------------------------ */}
      <Modal visible={!!previewPhoto} transparent animationType="fade">
        <View style={styles.fullPhotoBg}>
          <TouchableOpacity style={styles.closeFullPhoto} onPress={() => setPreviewPhoto(null)}>
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          {previewPhoto && (
            <Image source={{ uri: previewPhoto }} style={styles.fullPhoto} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: "600" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  branchFilterContainer: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  branchFilterScroll: { paddingHorizontal: 16, gap: 8 },
  branchChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  branchChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  branchChipText: { fontSize: 12, fontWeight: "700", color: COLORS.textDark },
  branchChipTextActive: { color: "#ffffff" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 18 },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  branchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
  },
  branchPillText: { fontSize: 12, fontWeight: "800", color: COLORS.textDark },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusApproved: { backgroundColor: COLORS.successLight },
  statusReview: { backgroundColor: COLORS.warningLight },
  statusRejected: { backgroundColor: COLORS.dangerLight },
  statusPending: { backgroundColor: "#f1f5f9" },
  statusText: { fontSize: 10.5, fontWeight: "800" },
  statusTextApproved: { color: COLORS.success },
  statusTextReview: { color: COLORS.warning },
  statusTextRejected: { color: COLORS.danger },
  statusTextPending: { color: COLORS.textMuted },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 12, color: COLORS.textDark },
  assignedByText: { fontSize: 11, color: COLORS.textMuted },
  progressContainer: { gap: 6 },
  progressHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11.5, color: COLORS.textMuted, fontWeight: "700" },
  progressVal: { fontSize: 11.5, color: COLORS.primary, fontWeight: "800" },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  areasRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  areaChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  areaChipApproved: { backgroundColor: COLORS.successLight, borderColor: "#bbf7d0" },
  areaChipRejected: { backgroundColor: COLORS.dangerLight, borderColor: "#fecdd3" },
  areaChipUploaded: { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" },
  areaChipPending: { backgroundColor: COLORS.bg, borderColor: COLORS.border },
  areaChipText: { fontSize: 10.5, fontWeight: "700" },
  areaChipTextApproved: { color: COLORS.success },
  areaChipTextRejected: { color: COLORS.danger },
  areaChipTextUploaded: { color: COLORS.primary },
  areaChipTextPending: { color: COLORS.textMuted },
  remarksBox: {
    backgroundColor: COLORS.bg,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
  },
  remarksLabel: { fontSize: 11, fontWeight: "800", color: COLORS.textDark },
  remarksText: { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  cardActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logsBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  logsBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  reviewBtnText: { color: "#ffffff", fontSize: 11.5, fontWeight: "800" },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "85%",
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textDark },
  inputLabel: { fontSize: 11.5, fontWeight: "800", color: COLORS.textDark, textTransform: "uppercase" },
  modalBranchChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  modalBranchChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalBranchChipText: { fontSize: 12, fontWeight: "700", color: COLORS.textDark },
  modalBranchChipTextActive: { color: "#ffffff" },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textDark,
    backgroundColor: COLORS.bg,
    marginTop: 4,
  },
  configuredAreasBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    minHeight: 50,
    marginTop: 4,
  },
  configuredAreaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  configuredAreaText: { fontSize: 11.5, fontWeight: "700", color: COLORS.textDark },
  presetChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.tealLight,
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  presetChipDisabled: { backgroundColor: "#f1f5f9", borderColor: COLORS.border },
  presetChipText: { fontSize: 11, fontWeight: "700", color: COLORS.teal },
  addCustomBtn: {
    backgroundColor: COLORS.textDark,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  addCustomBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  modalSubmitBtnText: { color: "#ffffff", fontSize: 13.5, fontWeight: "800" },
  reviewFieldBox: {
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  reviewFieldHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewFieldName: { fontSize: 13, fontWeight: "800", color: COLORS.textDark, flex: 1 },
  reviewFieldStatus: { fontSize: 11, fontWeight: "700" },
  reviewPhotoThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  noPhotoText: { fontSize: 11, color: COLORS.textMuted, fontStyle: "italic" },
  rejectInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fecdd3",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11.5,
    color: COLORS.danger,
  },
  reviewActionsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  approveBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  logCard: {
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  logAction: { fontSize: 12, fontWeight: "800", color: COLORS.textDark },
  logTime: { fontSize: 10.5, color: COLORS.textMuted },
  logBy: { fontSize: 11, color: COLORS.textMuted },
  logRemarks: { fontSize: 11, fontStyle: "italic", color: COLORS.textDark },
  fullPhotoBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  closeFullPhoto: { position: "absolute", top: 40, right: 20, zIndex: 10, padding: 8 },
  fullPhoto: { width: "100%", height: "80%" },
});

