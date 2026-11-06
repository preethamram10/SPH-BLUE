import React, { useState, useEffect, useCallback } from "react";
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
  BackHandler,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getActiveBranch } from "../../../services/auth";
import { API_BASE_URL } from "../../../config/api";

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
}

export default function ReceptionBranchCleaningScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ isLockout?: string }>();
  const isLockoutMode = params.isLockout === "true";

  const [branchName, setBranchName] = useState("Kphb");
  const [task, setTask] = useState<CleaningTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Load branch and check task
  const fetchActiveAudit = async (currentBranch: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/cleaning/lockout?branchName=${encodeURIComponent(currentBranch)}`
      );
      const data = await res.json();
      if (data.success && data.task) {
        setTask(data.task);
      } else {
        setTask(null);
      }
    } catch (err) {
      console.error("Failed to load cleaning audit:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getActiveBranch().then((b) => {
      const bName = b?.name || "Kphb";
      setBranchName(bName);
      fetchActiveAudit(bName);
    });
  }, []);

  // Poll for status updates (e.g. Admin/HR approval)
  useEffect(() => {
    if (!branchName) return;
    const interval = setInterval(() => {
      fetchActiveAudit(branchName);
    }, 5000);
    return () => clearInterval(interval);
  }, [branchName]);

  // Handle Hardware Back Button if in mandatory lockout
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (task && task.status !== "APPROVED" && isLockoutMode) {
          Alert.alert(
            "Lockout Active",
            "Daily cleaning audit is mandatory. Please upload all photos or wait for Admin/HR approval to unlock reception."
          );
          return true; // Prevent going back
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [task, isLockoutMode])
  );

  // Image Upload helper
  const uploadAssetToS3 = async (asset: ImagePicker.ImagePickerAsset, field: CleaningField) => {
    if (!task) return;

    setUploadingFieldId(field.id);
    try {
      const res = await fetch(`${API_BASE_URL}/cleaning/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64: asset.base64,
          branchName,
          assignedDate: task.assignedDate,
          fieldName: field.name,
          contentType: asset.mimeType || "image/jpeg",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert("Upload Failed", data.error || "Could not upload photo to AWS S3.");
        return;
      }

      // Add to task fields
      const newPhoto: Photo = {
        id: `p-${Date.now()}`,
        url: data.url,
        key: data.key,
        uploadedAt: data.uploadedAt,
      };

      const updatedFields = task.fields.map((f) => {
        if (f.id === field.id) {
          return {
            ...f,
            photos: [...f.photos, newPhoto],
            status: "UPLOADED" as const,
            rejectReason: undefined,
          };
        }
        return f;
      });

      setTask({ ...task, fields: updatedFields });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload image.");
    } finally {
      setUploadingFieldId(null);
    }
  };

  // Launch Camera
  const handleTakePhoto = async (field: CleaningField) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera permission is required to capture cleaning photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAssetToS3(result.assets[0], field);
    }
  };

  // Choose from Gallery
  const handleChoosePhoto = async (field: CleaningField) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Gallery permission is required to select photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAssetToS3(result.assets[0], field);
    }
  };

  // Delete photo
  const handleDeletePhoto = (fieldId: string, photoId: string) => {
    if (!task) return;
    const updatedFields = task.fields.map((f) => {
      if (f.id === fieldId) {
        const remaining = f.photos.filter((p) => p.id !== photoId);
        return {
          ...f,
          photos: remaining,
          status: remaining.length > 0 ? f.status : ("PENDING" as const),
        };
      }
      return f;
    });
    setTask({ ...task, fields: updatedFields });
  };

  // Submit for Verification
  const handleSubmitForVerification = async () => {
    if (!task) return;
    const allDone = task.fields.every((f) => f.photos.length > 0);
    if (!allDone) {
      Alert.alert(
        "Photos Incomplete",
        "Please upload photos for all inspection areas before sending for verification."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const fieldsData = task.fields.map((f) => ({
        fieldId: f.id,
        photos: f.photos,
      }));

      const res = await fetch(`${API_BASE_URL}/cleaning/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          fieldsData,
          submittedBy: `${branchName} Reception Staff`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert("Submission Failed", data.error || "Could not submit photos.");
        return;
      }

      setTask(data.task);
      Alert.alert(
        "Submitted Successfully",
        "Cleaning photos have been sent for Admin / HR review. This screen will unlock once approved."
      );
    } catch (err: any) {
      Alert.alert("Network Error", err.message || "Failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (task && task.status !== "APPROVED" && isLockoutMode) {
      Alert.alert(
        "Lockout Active",
        "Cleaning audit is required before normal reception use."
      );
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(reception)" as any);
    }
  };

  const uploadedCount = task ? task.fields.filter((f) => f.photos.length > 0).length : 0;
  const totalCount = task ? task.fields.length : 0;
  const isAllUploaded = totalCount > 0 && uploadedCount === totalCount;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        {(!isLockoutMode || task?.status === "APPROVED") && (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="sparkles" size={16} color={COLORS.teal} />
            <Text style={styles.headerTitle}>Branch Cleaning Audit</Text>
          </View>
          <Text style={styles.headerSub}>
            {branchName} • {task ? task.assignedDate : "Daily Inspection"}
          </Text>
        </View>

        {task && (
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
        )}
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading cleaning tasks...</Text>
        </View>
      ) : !task ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="checkmark-done-circle" size={48} color={COLORS.success} />
          </View>
          <Text style={styles.emptyTitle}>No Cleaning Audit Pending</Text>
          <Text style={styles.emptySubtitle}>
            There is currently no mandatory cleaning inspection assigned for {branchName}.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Message Banner */}
          {task.status === "PENDING_UPLOAD" && (
            <View style={[styles.banner, styles.bannerAmber]}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>Photos Required to Unlock</Text>
                <Text style={styles.bannerText}>
                  Please capture clear photos of each assigned area. You can take a live photo or pick from gallery.
                </Text>
              </View>
            </View>
          )}

          {task.status === "UNDER_REVIEW" && (
            <View style={[styles.banner, styles.bannerSky]}>
              <Ionicons name="hourglass" size={20} color={COLORS.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>Under Verification</Text>
                <Text style={styles.bannerText}>
                  Photos submitted to Admin / HR for review. Screen unlocks immediately upon approval.
                </Text>
              </View>
            </View>
          )}

          {task.status === "REJECTED" && (
            <View style={[styles.banner, styles.bannerRose]}>
              <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>Re-upload Required</Text>
                <Text style={styles.bannerText}>
                  Remarks: {task.reviewRemarks || "Some inspection areas did not pass hygiene verification."}
                </Text>
              </View>
            </View>
          )}

          {task.status === "APPROVED" && (
            <View style={[styles.banner, styles.bannerGreen]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>Cleaning Approved &amp; Verified</Text>
                <Text style={styles.bannerText}>
                  All areas passed inspection. Reception is fully unlocked!
                </Text>
              </View>
            </View>
          )}

          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Inspection Progress</Text>
              <Text style={styles.progressCount}>
                {uploadedCount} of {totalCount} Areas Uploaded
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0}%`,
                    backgroundColor: isAllUploaded ? COLORS.success : COLORS.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Fields List */}
          <Text style={styles.sectionHeader}>REQUIRED INSPECTION AREAS</Text>

          {task.fields.map((field, idx) => {
            const isUploading = uploadingFieldId === field.id;
            const isRejected = field.status === "REJECTED";

            return (
              <View
                key={field.id}
                style={[
                  styles.fieldCard,
                  isRejected && styles.fieldCardRejected,
                ]}
              >
                <View style={styles.fieldHeaderRow}>
                  <View style={styles.fieldNumberBadge}>
                    <Text style={styles.fieldNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.fieldNameText}>{field.name}</Text>
                </View>

                {/* Rejection Remark */}
                {isRejected && field.rejectReason && (
                  <View style={styles.rejectNotice}>
                    <Ionicons name="warning" size={14} color={COLORS.danger} />
                    <Text style={styles.rejectNoticeText}>{field.rejectReason}</Text>
                  </View>
                )}

                {/* Uploaded Photos Gallery */}
                {field.photos.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosScroll}
                  >
                    {field.photos.map((p) => (
                      <View key={p.id} style={styles.photoContainer}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setPreviewPhotoUrl(p.url)}
                        >
                          <Image source={{ uri: p.url }} style={styles.photoThumb} />
                        </TouchableOpacity>
                        {task.status !== "UNDER_REVIEW" && task.status !== "APPROVED" && (
                          <TouchableOpacity
                            style={styles.deletePhotoBtn}
                            onPress={() => handleDeletePhoto(field.id, p.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash" size={12} color="#ffffff" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Upload Action Buttons */}
                {task.status !== "UNDER_REVIEW" && task.status !== "APPROVED" && (
                  <View style={styles.uploadActionRow}>
                    <TouchableOpacity
                      style={styles.btnCamera}
                      onPress={() => handleTakePhoto(field)}
                      disabled={isUploading}
                      activeOpacity={0.8}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="camera" size={15} color="#ffffff" />
                          <Text style={styles.btnCameraText}>Take Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnGallery}
                      onPress={() => handleChoosePhoto(field)}
                      disabled={isUploading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="images-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.btnGalleryText}>Choose Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* Submit for Verification Button */}
          {task.status !== "APPROVED" && (
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !isAllUploaded || task.status === "UNDER_REVIEW" ? styles.submitBtnDisabled : null,
              ]}
              disabled={!isAllUploaded || isSubmitting || task.status === "UNDER_REVIEW"}
              onPress={handleSubmitForVerification}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#ffffff" />
                  <Text style={styles.submitBtnText}>
                    {task.status === "UNDER_REVIEW"
                      ? "Submitted — Waiting for Verification"
                      : "Send to Verification & Unlock"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {task.status === "APPROVED" && (
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: COLORS.success }]}
              onPress={() => router.replace("/(reception)" as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>Continue to Reception Dashboard</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Full-Screen Photo Preview Modal */}
      <Modal visible={!!previewPhotoUrl} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setPreviewPhotoUrl(null)}
          >
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          {previewPhotoUrl && (
            <Image
              source={{ uri: previewPhotoUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusApproved: { backgroundColor: COLORS.successLight },
  statusReview: { backgroundColor: COLORS.warningLight },
  statusRejected: { backgroundColor: COLORS.dangerLight },
  statusPending: { backgroundColor: "#f1f5f9" },
  statusText: { fontSize: 11, fontWeight: "800" },
  statusTextApproved: { color: COLORS.success },
  statusTextReview: { color: COLORS.warning },
  statusTextRejected: { color: COLORS.danger },
  statusTextPending: { color: COLORS.textMuted },
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
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 18 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  bannerAmber: { backgroundColor: COLORS.warningLight, borderColor: "#fde68a" },
  bannerSky: { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" },
  bannerRose: { backgroundColor: COLORS.dangerLight, borderColor: "#fecdd3" },
  bannerGreen: { backgroundColor: COLORS.successLight, borderColor: "#bbf7d0" },
  bannerTitle: { fontSize: 13, fontWeight: "800", color: COLORS.textDark },
  bannerText: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  progressCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 12.5, fontWeight: "800", color: COLORS.textDark },
  progressCount: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  fieldCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  fieldCardRejected: {
    borderColor: COLORS.danger,
    backgroundColor: "#fff1f2",
  },
  fieldHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.textDark,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldNumberText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },
  fieldNameText: { fontSize: 14, fontWeight: "800", color: COLORS.textDark, flex: 1 },
  rejectNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  rejectNoticeText: { fontSize: 11, color: COLORS.danger, fontWeight: "700", flex: 1 },
  photosScroll: { flexDirection: "row" },
  photoContainer: { position: "relative", marginRight: 10 },
  photoThumb: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deletePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: COLORS.danger,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadActionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  btnCamera: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnCameraText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  btnGallery: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnGalleryText: { color: COLORS.primary, fontSize: 12, fontWeight: "800" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  closeModalBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalImage: { width: "100%", height: "80%" },
});
