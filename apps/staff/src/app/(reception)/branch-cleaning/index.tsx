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

interface LocalMobilePhoto {
  id: string;
  uri: string;
  base64?: string;
  mimeType?: string;
  isUploadedToS3: boolean;
  s3Url?: string;
  key?: string;
  uploadedAt?: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgressText, setSubmitProgressText] = useState("");
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const handleOpenPhotoPreview = (url: string) => {
    setPhotoLoadError(false);
    setIsPhotoLoading(true);
    setPreviewPhotoUrl(url);
  };

  // Local staged photos map: fieldId -> LocalMobilePhoto[]
  const [stagedPhotosMap, setStagedPhotosMap] = useState<Record<string, LocalMobilePhoto[]>>({});

  // Load branch and check task
  const fetchActiveAudit = async (currentBranch: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/cleaning/lockout?branchName=${encodeURIComponent(currentBranch)}`
      );
      const data = await res.json();
      if (data.success && data.task) {
        setTask(data.task);

        // Populate staged photos map with existing S3 photos if empty
        setStagedPhotosMap((prev) => {
          const updated = { ...prev };
          data.task.fields.forEach((f: CleaningField) => {
            if (!updated[f.id] || updated[f.id].length === 0) {
              updated[f.id] = (f.photos || []).map((p: Photo) => ({
                id: p.id,
                uri: p.url,
                isUploadedToS3: true,
                s3Url: p.url,
                key: p.key,
                uploadedAt: p.uploadedAt,
              }));
            }
          });
          return updated;
        });

        // If approved and in lockout mode, unlock!
        if (data.task.status === "APPROVED" && isLockoutMode) {
          router.replace("/(reception)" as any);
        }
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

  // Manual Check Verification Status (replaces continuous background polling)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const handleCheckStatus = async () => {
    if (!branchName) return;
    setIsCheckingStatus(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/cleaning/lockout?branchName=${encodeURIComponent(branchName)}`
      );
      const data = await res.json();
      if (data.success) {
        if (!data.lockout || data.task?.status === "APPROVED") {
          Alert.alert("✓ Audit Approved!", "Reception has been verified and unlocked.", [
            { text: "Continue", onPress: () => router.replace("/(reception)" as any) },
          ]);
        } else if (data.task) {
          setTask(data.task);
          if (data.task.status === "UNDER_REVIEW") {
            Alert.alert("Status: Under Review", "Waiting for Admin or HR approval. Please check back shortly.");
          } else if (data.task.status === "REJECTED") {
            Alert.alert(
              "Status: Re-upload Required",
              `Remarks: ${data.task.reviewRemarks || "Please re-upload photos for flagged areas."}`
            );
          } else {
            Alert.alert("Status Check", `Current status: ${data.task.status}`);
          }
        }
      } else {
        Alert.alert("Status Check", data.error || "Could not check audit status.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to check status.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Handle Hardware Back Button if in mandatory lockout
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (task && task.status !== "APPROVED" && isLockoutMode) {
          Alert.alert(
            "Lockout Active",
            "Daily cleaning audit is mandatory. Please add photos for all areas and wait for Admin/HR approval to unlock reception."
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

  // Launch Camera: adds photo locally with instant green tick mark
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
      const asset = result.assets[0];
      const newPhoto: LocalMobilePhoto = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        uri: asset.uri,
        base64: asset.base64 || undefined,
        mimeType: asset.mimeType || "image/jpeg",
        isUploadedToS3: false,
      };

      setStagedPhotosMap((prev) => ({
        ...prev,
        [field.id]: [...(prev[field.id] || []), newPhoto],
      }));
    }
  };

  // Choose from Gallery: adds photo locally with instant green tick mark
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
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newPhotos: LocalMobilePhoto[] = result.assets.map((asset, i) => ({
        id: `local-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        uri: asset.uri,
        base64: asset.base64 || undefined,
        mimeType: asset.mimeType || "image/jpeg",
        isUploadedToS3: false,
      }));

      setStagedPhotosMap((prev) => ({
        ...prev,
        [field.id]: [...(prev[field.id] || []), ...newPhotos],
      }));
    }
  };

  // Delete photo locally
  const handleDeletePhoto = (fieldId: string, photoId: string) => {
    setStagedPhotosMap((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter((p) => p.id !== photoId),
    }));
  };

  // Calculate completion
  const totalCount = task ? task.fields.length : 0;
  const completedCount = task
    ? task.fields.filter((f) => (stagedPhotosMap[f.id] || []).length > 0).length
    : 0;
  const isAllUploaded = totalCount > 0 && completedCount === totalCount;

  // Submit all photos: Uploads staged photos to AWS S3, then submits task for verification
  const handleSubmitForVerification = async () => {
    if (!task) return;
    if (!isAllUploaded) {
      Alert.alert(
        "Photos Incomplete",
        "Please add photos for all required inspection areas before sending for verification."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitProgressText("Preparing photos for AWS S3 upload...");

    try {
      // Count total photos to upload
      let totalToUpload = 0;
      Object.values(stagedPhotosMap).forEach((photos) => {
        photos.forEach((p) => {
          if (!p.isUploadedToS3 && p.base64) totalToUpload++;
        });
      });

      let uploadedSoFar = 0;
      const finalFieldsData: { fieldId: string; photos: Photo[] }[] = [];

      for (const field of task.fields) {
        const localPhotos = stagedPhotosMap[field.id] || [];
        const uploadedPhotosForField: Photo[] = [];

        for (const photoItem of localPhotos) {
          if (photoItem.isUploadedToS3 && photoItem.s3Url) {
            // Already uploaded to AWS S3
            uploadedPhotosForField.push({
              id: photoItem.id,
              url: photoItem.s3Url,
              key: photoItem.key || "",
              uploadedAt: photoItem.uploadedAt || new Date().toISOString(),
            });
          } else if (photoItem.base64) {
            // Upload to AWS S3 now
            uploadedSoFar++;
            setSubmitProgressText(
              `Uploading Area "${field.name}" (${uploadedSoFar}/${totalToUpload})...`
            );

            const res = await fetch(`${API_BASE_URL}/cleaning/upload`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                base64: photoItem.base64,
                branchName,
                assignedDate: task.assignedDate,
                fieldName: field.name,
                contentType: photoItem.mimeType || "image/jpeg",
              }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.error || `Could not upload photo for ${field.name}`);
            }

            uploadedPhotosForField.push({
              id: `p-${Date.now()}-${uploadedSoFar}`,
              url: data.url,
              key: data.key,
              uploadedAt: data.uploadedAt,
            });
          }
        }

        finalFieldsData.push({
          fieldId: field.id,
          photos: uploadedPhotosForField,
        });
      }

      // Submit to database
      setSubmitProgressText("Submitting to Admin / HR for review...");
      const res = await fetch(`${API_BASE_URL}/cleaning/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          fieldsData: finalFieldsData,
          submittedBy: `${branchName} Reception Staff`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not submit photos.");
      }

      setTask(data.task);
      Alert.alert(
        "Submitted for Verification",
        "All inspection photos have been uploaded and submitted for review. This screen will unlock once Admin or HR approves."
      );
    } catch (err: any) {
      Alert.alert("Submission Failed", err.message || "Failed to submit.");
    } finally {
      setIsSubmitting(false);
      setSubmitProgressText("");
    }
  };

  const handleBack = () => {
    if (task && task.status !== "APPROVED" && isLockoutMode) {
      Alert.alert(
        "Lockout Active",
        "Mandatory branch hygiene audit is in progress. Please complete upload to unlock."
      );
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!isLockoutMode && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
            </TouchableOpacity>
          )}
          <View>
            <View style={styles.branchRow}>
              <Text style={styles.headerTitle}>{branchName} Clinic</Text>
              <View style={styles.lockoutBadge}>
                <Ionicons name="lock-closed" size={11} color="#ffffff" />
                <Text style={styles.lockoutBadgeText}>MANDATORY AUDIT</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>Daily Cleaning &amp; Hygiene Inspection</Text>
          </View>
        </View>

        {task && (
          <View
            style={[
              styles.statusBadge,
              task.status === "APPROVED" && styles.statusApproved,
              task.status === "UNDER_REVIEW" && styles.statusReview,
              task.status === "REJECTED" && styles.statusRejected,
              task.status === "PENDING_UPLOAD" && styles.statusPending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                task.status === "APPROVED" && styles.statusTextApproved,
                task.status === "UNDER_REVIEW" && styles.statusTextReview,
                task.status === "REJECTED" && styles.statusTextRejected,
                task.status === "PENDING_UPLOAD" && styles.statusTextPending,
              ]}
            >
              {task.status === "APPROVED"
                ? "✓ APPROVED"
                : task.status === "UNDER_REVIEW"
                ? "UNDER REVIEW"
                : task.status === "REJECTED"
                ? "RE-UPLOAD"
                : "PENDING"}
            </Text>
          </View>
        )}
      </View>

      {/* Main Body */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Checking Cleaning Audit Status...</Text>
        </View>
      ) : !task ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="checkmark-done" size={40} color={COLORS.success} />
          </View>
          <Text style={styles.emptyTitle}>No Cleaning Audit Today</Text>
          <Text style={styles.emptySubtitle}>
            Your branch has no pending cleaning audits assigned for today. You have full access to Reception.
          </Text>
          <TouchableOpacity
            style={styles.btnContinue}
            onPress={() => router.replace("/(reception)" as any)}
          >
            <Text style={styles.btnContinueText}>Go to Reception Dashboard</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Status Banners */}
          {task.status === "PENDING_UPLOAD" && (
            <View style={[styles.banner, styles.bannerAmber]}>
              <Ionicons name="alert-circle" size={20} color={COLORS.warning} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>Photos Required for Reception Unlock</Text>
                <Text style={styles.bannerText}>
                  Take photos for each required area (Restroom, Reception, Sitting Area, etc.). Each completed area gets a green tick mark (✓). All photos are saved to AWS S3 when submitting!
                </Text>
              </View>
            </View>
          )}

          {task.status === "UNDER_REVIEW" && (
            <View style={[styles.banner, styles.bannerSky, { flexDirection: "column", gap: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.bannerTitle}>Photos Saved &amp; Submitted for Verification</Text>
                  <Text style={styles.bannerText}>
                    Your inspection photos have been uploaded to AWS S3. Waiting for Admin or HR approval.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.btnCheckStatus}
                onPress={handleCheckStatus}
                disabled={isCheckingStatus}
                activeOpacity={0.8}
              >
                {isCheckingStatus ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={15} color="#ffffff" />
                    <Text style={styles.btnCheckStatusText}>Check Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {task.status === "REJECTED" && (
            <View style={[styles.banner, styles.bannerRose]}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>Re-upload Required by {task.reviewedRole || "Admin/HR"}</Text>
                <Text style={[styles.bannerText, { fontWeight: "700", color: COLORS.danger }]}>
                  Remarks: {task.reviewRemarks || "Some inspection areas did not pass hygiene verification."}
                </Text>
                <Text style={styles.bannerText}>
                  Please re-clean flagged areas, take new photos, and re-submit.
                </Text>
              </View>
            </View>
          )}

          {task.status === "APPROVED" && (
            <View style={[styles.banner, styles.bannerGreen]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>Audit Approved!</Text>
                <Text style={styles.bannerText}>
                  Verified by {task.reviewedBy || "Admin/HR"}. Reception is completely unlocked.
                </Text>
              </View>
            </View>
          )}

          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Inspection Progress</Text>
              <Text
                style={[
                  styles.progressCount,
                  isAllUploaded && { color: COLORS.success, fontWeight: "900" },
                ]}
              >
                {completedCount} of {totalCount} Areas Done
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                    backgroundColor: isAllUploaded ? COLORS.success : COLORS.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Fields List */}
          <Text style={styles.sectionHeader}>REQUIRED INSPECTION AREAS</Text>

          {task.fields.map((field, idx) => {
            const localPhotos = stagedPhotosMap[field.id] || [];
            const hasPhotos = localPhotos.length > 0;
            const isRejected = field.status === "REJECTED";

            return (
              <View
                key={field.id}
                style={[
                  styles.fieldCard,
                  hasPhotos && styles.fieldCardCompleted,
                  isRejected && styles.fieldCardRejected,
                ]}
              >
                {/* Header Row with Checkmark */}
                <View style={styles.fieldHeaderRow}>
                  {hasPhotos ? (
                    <View style={styles.fieldDoneBadge}>
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                  ) : (
                    <View style={styles.fieldNumberBadge}>
                      <Text style={styles.fieldNumberText}>{idx + 1}</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldNameText}>{field.name}</Text>
                  </View>

                  {/* Status Pill Badge */}
                  {hasPhotos && (
                    <View style={styles.donePill}>
                      <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                      <Text style={styles.donePillText}>
                        {localPhotos.length} Photo{localPhotos.length > 1 ? "s" : ""} Added
                      </Text>
                    </View>
                  )}
                  {!hasPhotos && !isRejected && (
                    <View style={styles.neededPill}>
                      <Ionicons name="camera" size={11} color={COLORS.warning} />
                      <Text style={styles.neededPillText}>Photo Needed</Text>
                    </View>
                  )}
                </View>

                {/* Rejection Remark */}
                {isRejected && field.rejectReason && (
                  <View style={styles.rejectNotice}>
                    <Ionicons name="warning" size={14} color={COLORS.danger} />
                    <Text style={styles.rejectNoticeText}>
                      Rejection Reason: {field.rejectReason}
                    </Text>
                  </View>
                )}

                {/* Uploaded Photos Gallery */}
                {localPhotos.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosScroll}
                  >
                    {localPhotos.map((p) => {
                      const displayUri = p.isUploadedToS3
                        ? `${API_BASE_URL}/cleaning/image?key=${encodeURIComponent(p.key || p.s3Url || p.uri)}`
                        : p.uri;

                      return (
                        <View key={p.id} style={styles.photoContainer}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleOpenPhotoPreview(displayUri)}
                          >
                            <Image source={{ uri: displayUri }} style={styles.photoThumb} />
                          </TouchableOpacity>

                          {/* Staged Tag */}
                          <View style={styles.photoTag}>
                            <Text style={styles.photoTagText}>
                              {p.isUploadedToS3 ? "S3" : "Ready"}
                            </Text>
                          </View>

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
                      );
                    })}
                  </ScrollView>
                )}

                {/* Upload Action Buttons */}
                {task.status !== "UNDER_REVIEW" && task.status !== "APPROVED" && (
                  <View style={styles.uploadActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.btnCamera,
                        hasPhotos && { backgroundColor: COLORS.textDark },
                      ]}
                      onPress={() => handleTakePhoto(field)}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera" size={15} color="#ffffff" />
                      <Text style={styles.btnCameraText}>
                        {hasPhotos ? "+ Add More" : "Take Photo"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnGallery}
                      onPress={() => handleChoosePhoto(field)}
                      disabled={isSubmitting}
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

          {/* Under Review State: Manual Check Status Button */}
          {task.status === "UNDER_REVIEW" && (
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: COLORS.primary }]}
              disabled={isCheckingStatus}
              onPress={handleCheckStatus}
              activeOpacity={0.8}
            >
              {isCheckingStatus ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.submitBtnText}>Checking Status...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Check Verification Status</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Pending Upload State: Submit to Verification Button */}
          {task.status !== "APPROVED" && task.status !== "UNDER_REVIEW" && (
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !isAllUploaded || isSubmitting ? styles.submitBtnDisabled : null,
              ]}
              disabled={!isAllUploaded || isSubmitting}
              onPress={handleSubmitForVerification}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.submitBtnText}>
                    {submitProgressText || "Uploading & Submitting..."}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Send to Verification</Text>
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
      <Modal visible={!!previewPhotoUrl} transparent animationType="fade" onRequestClose={() => setPreviewPhotoUrl(null)}>
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setPreviewPhotoUrl(null)}
          >
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>

          {isPhotoLoading && (
            <ActivityIndicator size="large" color="#ffffff" style={{ position: "absolute" }} />
          )}

          {previewPhotoUrl && !photoLoadError && (
            <Image
              source={{ uri: previewPhotoUrl }}
              style={styles.modalImage}
              resizeMode="contain"
              onLoadStart={() => setIsPhotoLoading(true)}
              onLoadEnd={() => setIsPhotoLoading(false)}
              onError={() => {
                setIsPhotoLoading(false);
                setPhotoLoadError(true);
              }}
            />
          )}

          {photoLoadError && (
            <View style={{ alignItems: "center", gap: 10, padding: 20 }}>
              <Ionicons name="alert-circle" size={40} color={COLORS.danger} />
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 14 }}>Could not load photo</Text>
              <Text style={{ color: "#94a3b8", fontSize: 12, textAlign: "center" }}>
                Tap close button to return.
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  branchRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: "600" },
  lockoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockoutBadgeText: { fontSize: 9, fontWeight: "900", color: "#ffffff", letterSpacing: 0.5 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusApproved: { backgroundColor: COLORS.successLight },
  statusReview: { backgroundColor: "#e0f2fe" },
  statusRejected: { backgroundColor: COLORS.dangerLight },
  statusPending: { backgroundColor: "#f1f5f9" },
  statusText: { fontSize: 11, fontWeight: "800" },
  statusTextApproved: { color: COLORS.success },
  statusTextReview: { color: COLORS.primary },
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
  btnContinue: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnContinueText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
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
  btnCheckStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  btnCheckStatusText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
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
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 12,
  },
  fieldCardCompleted: {
    borderColor: COLORS.success,
    backgroundColor: "#f0fdf4",
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
    backgroundColor: COLORS.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldDoneBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldNumberText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },
  fieldNameText: { fontSize: 14, fontWeight: "800", color: COLORS.textDark },
  donePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  donePillText: { fontSize: 11, fontWeight: "800", color: COLORS.success },
  neededPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  neededPillText: { fontSize: 11, fontWeight: "700", color: COLORS.warning },
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
  photoTag: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  photoTagText: { color: "#ffffff", fontSize: 9, fontWeight: "800" },
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
