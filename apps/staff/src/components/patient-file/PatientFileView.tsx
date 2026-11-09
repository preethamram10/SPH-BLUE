import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  BackHandler,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch } from "../../services/auth";
import { Image as ExpoImage } from "expo-image";
import { DrawingCanvasModal } from "./DrawingCanvasModal";
import { PrescriptionViewerModal } from "./PrescriptionViewerModal";
import { API_BASE_URL } from "../../config/api";

export const resolvePrescriptionImageUrl = (url: string) => {
  if (!url) return "";
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("file:") ||
    url.startsWith("content:") ||
    url.includes("/api/patient-file/image") ||
    url.includes("/api/cleaning/image")
  ) {
    return url;
  }
  if (url.includes("/uploads/")) {
    const relativePath = url.substring(url.indexOf("/uploads/"));
    const hostUrl = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${hostUrl}${relativePath}`;
  }
  if (url.includes(".amazonaws.com/")) {
    return `${API_BASE_URL}/patient-file/image?url=${encodeURIComponent(url)}`;
  }
  if (url.startsWith("prescriptions/") || url.startsWith("/prescriptions/")) {
    return `${API_BASE_URL}/patient-file/image?key=${encodeURIComponent(url)}`;
  }
  return url;
};

interface PatientFileViewProps {
  role: "DOCTOR" | "RECEPTION";
  bottomNav?: React.ReactNode;
}

export const PatientFileView: React.FC<PatientFileViewProps> = ({ role, bottomNav }) => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const appointmentId = (params.id as string) || "";
  const initialName = (params.name as string) || (params.patientName as string) || "Patient";
  const initialPhone = (params.phone as string) || (params.phoneNumber as string) || "";
  const initialRegId = (params.registrationId as string) || (params.regId as string) || (params.patientId as string) || "SPH-GEN";
  const initialBranch = (params.branch as string) || "Spiritual Homeopathy";

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Patient Info
  const [patientData, setPatientData] = useState<any>({
    patientName: initialName,
    phone: initialPhone,
    registrationId: initialRegId,
    branch: initialBranch,
    marketingSource: "Old Patient",
    diseases: "Chronic Migraine & Acidity",
    hasPackage: false,
    packageName: "",
  });

  // Active Tab: clinical | diet | media | package
  const [activeTab, setActiveTab] = useState<"clinical" | "diet" | "media" | "package">("clinical");

  // Form Fields & Prescriptions
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const [followUpInterval, setFollowUpInterval] = useState<"No Follow-up" | "1 Month" | "2 Months" | "3 Months" | "4 Months">("No Follow-up");
  const [followUpDate, setFollowUpDate] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [dietPlan, setDietPlan] = useState("");

  // History Tab: all | prescriptions | payments
  const [historyTab, setHistoryTab] = useState<"all" | "prescriptions" | "payments">("all");
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);

  // Stack Back Navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(role === "DOCTOR" ? "/(doctor)" : ("/(reception)" as any));
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

  // Load Patient File data from API if ID is available
  useEffect(() => {
    if (!appointmentId) return;
    setIsLoading(true);
    apiFetch<any>(`/patient-file?id=${encodeURIComponent(appointmentId)}`)
      .then((res) => {
        if (res.success && res.patientFile) {
          const pf = res.patientFile;
          setPatientData({
            patientName: pf.patientName || initialName,
            phone: pf.phone || initialPhone,
            registrationId: pf.registrationId || initialRegId,
            branch: pf.branch || initialBranch,
            marketingSource: pf.marketingSource || "Old Patient",
            diseases: pf.diseases || pf.notes || "Consultation",
            hasPackage: !!pf.hasPackage,
            packageName: pf.packageName || "",
          });
          if (pf.prescriptionImages) setUploadedImages(pf.prescriptionImages);
          if (pf.followUpInterval) setFollowUpInterval(pf.followUpInterval);
          if (pf.followUpDate) setFollowUpDate(pf.followUpDate);
          if (pf.consultationFee) setConsultationFee(String(pf.consultationFee));
          if (pf.dietPlan) setDietPlan(pf.dietPlan);
          if (pf.history) setPatientHistory(pf.history);
          if (pf.totalPaid) setTotalPaid(pf.totalPaid);
        }
      })
      .catch((err) => console.error("Error loading patient file:", err))
      .finally(() => setIsLoading(false));
  }, [appointmentId]);

  // Follow-up Interval calculation (1 Month, 2 Months, 3 Months, 4 Months)
  const handleSelectInterval = (
    interval: "No Follow-up" | "1 Month" | "2 Months" | "3 Months" | "4 Months"
  ) => {
    setFollowUpInterval(interval);
    if (interval === "No Follow-up") {
      setFollowUpDate("");
      return;
    }
    const daysToAdd =
      interval === "1 Month"
        ? 30
        : interval === "2 Months"
        ? 60
        : interval === "3 Months"
        ? 90
        : 120;
    const targetDate = new Date(Date.now() + daysToAdd * 86400000);
    const d = String(targetDate.getDate()).padStart(2, "0");
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const y = targetDate.getFullYear();
    setFollowUpDate(`${d}-${m}-${y}`);
  };

  // Helper: Upload to AWS S3 (Bucket: sph-prescription, Region: ap-south-1)
  const uploadToS3 = async (
    base64Data: string,
    isSvg: boolean = false
  ): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      const res = await apiFetch<any>("/patient-file/upload", {
        method: "POST",
        body: JSON.stringify({
          base64: base64Data,
          contentType: isSvg ? "image/svg+xml" : "image/jpeg",
          patientId: patientData.registrationId || "SPH-PATIENT",
        }),
      });

      if (res.success && res.url) {
        return res.url;
      } else {
        console.warn("Upload response did not return url:", res);
        return null;
      }
    } catch (err: any) {
      console.error("AWS S3 Upload failed:", err);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Upload Photo from Gallery with Smart Compression & S3 Sync
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera roll access is needed to upload prescriptions.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7, // Smart compression: keeps handwriting razor sharp while keeping file size small
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const localUri = asset.uri;

        // Optimistically add to gallery
        setUploadedImages((prev) => [...prev, localUri]);

        // Background upload to AWS S3
        if (asset.base64) {
          const s3Url = await uploadToS3(asset.base64, false);
          if (s3Url) {
            setUploadedImages((prev) => prev.map((img) => (img === localUri ? s3Url : img)));
          }
        }
      }
    } catch (err) {
      console.error("Gallery picker error:", err);
    }
  };

  // Capture Photo with Camera with Smart Compression & S3 Sync
  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to take prescription photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7, // Smart compression
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const localUri = asset.uri;

        // Optimistically add to gallery
        setUploadedImages((prev) => [...prev, localUri]);

        // Background upload to AWS S3
        if (asset.base64) {
          const s3Url = await uploadToS3(asset.base64, false);
          if (s3Url) {
            setUploadedImages((prev) => prev.map((img) => (img === localUri ? s3Url : img)));
          }
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // Save Canvas Drawing & Upload to AWS S3
  const handleSaveCanvasDrawing = async (svgDataUri: string) => {
    // Optimistically add to gallery
    setUploadedImages((prev) => [...prev, svgDataUri]);

    // Background upload to AWS S3
    const s3Url = await uploadToS3(svgDataUri, true);
    if (s3Url) {
      setUploadedImages((prev) => prev.map((img) => (img === svgDataUri ? s3Url : img)));
    }
  };

  // Remove uploaded image
  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Send to Reception & Collect Fee (Core CTA)
  const handleSendToReception = async () => {
    setIsSubmitting(true);
    try {
      const targetId = appointmentId || "temp-appt-id";
      const payload = {
        id: targetId,
        prescriptionImages: uploadedImages,
        followUpInterval,
        followUpDate,
        consultationFee: parseFloat(consultationFee) || 0,
        dietPlan,
        sendToReception: true,
      };

      const res = await apiFetch<any>("/patient-file", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        Alert.alert(
          "Sent to Reception",
          `Consultation finished for ${patientData.patientName}!\nPrescription & fee (₹${consultationFee}) moved to COLLECT FEE for Reception.`,
          [
            {
              text: "OK",
              onPress: () => handleBack(),
            },
          ]
        );
      } else {
        Alert.alert("Error", res.error || "Failed to submit patient file.");
      }
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 1. Header (Matching Screenshot) */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtnPill} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={16} color="#0284c7" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerInfoCol}>
          <Text style={styles.headerName} numberOfLines={1}>
            {patientData.patientName}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {patientData.branch} • Reg: {patientData.registrationId}
          </Text>
        </View>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {(patientData.patientName || "P").slice(0, 1).toUpperCase()}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        {isLoading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Loading Patient File...</Text>
          </View>
        ) : (
          <>
            {/* 2. Patient Profile Card (Matching Screenshot) */}
            <View style={styles.profileCard}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileNameText}>{patientData.patientName}</Text>
                <View style={styles.durationPill}>
                  <Text style={styles.durationPillText}>IN DURATION</Text>
                </View>
              </View>

              <View style={styles.metaInfoList}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📋</Text>
                  <Text style={styles.regIdHighlight}>Reg ID: {patientData.registrationId}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📞</Text>
                  <Text style={styles.metaText}>{patientData.phone}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📍</Text>
                  <Text style={styles.metaText}>{patientData.branch}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📢</Text>
                  <Text style={styles.metaText}>Source: {patientData.marketingSource || "Old Patient"}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📋</Text>
                  <Text style={styles.metaText}>
                    <Text style={{ fontWeight: "700" }}>Subject: </Text>
                    {patientData.diseases || "General Consultation"}
                  </Text>
                </View>
              </View>

              {/* Package Sub-Card */}
              <View style={styles.packageSubBox}>
                <Text style={styles.packageSubText}>
                  {patientData.hasPackage ? `Active: ${patientData.packageName}` : "No active package."}
                </Text>
                <TouchableOpacity
                  style={styles.registerPkgBtn}
                  onPress={() => router.push(role === "DOCTOR" ? "/(doctor)/packages" : ("/(reception)/appointments" as any))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.registerPkgBtnText}>+ Register Patient in Package</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Tab Navigation Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabChip, activeTab === "clinical" && styles.tabChipActive]}
                onPress={() => setActiveTab("clinical")}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, activeTab === "clinical" && styles.tabChipTextActive]}>
                  Clinical Form
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabChip, activeTab === "diet" && styles.tabChipActive]}
                onPress={() => setActiveTab("diet")}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, activeTab === "diet" && styles.tabChipTextActive]}>
                  Diet Plan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabChip, activeTab === "media" && styles.tabChipActive]}
                onPress={() => setActiveTab("media")}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, activeTab === "media" && styles.tabChipTextActive]}>
                  Share Media
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabChip, activeTab === "package" && styles.tabChipActive]}
                onPress={() => router.push(role === "DOCTOR" ? "/(doctor)/packages" : ("/(reception)/appointments" as any))}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, activeTab === "package" && styles.tabChipTextActive]}>
                  Register Package
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* TAB CONTENT: DIET PLAN */}
            {activeTab === "diet" && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>Homeopathic Diet & Regimen</Text>
                <Text style={styles.fieldLabel}>Dietary Instructions & Restrictions</Text>
                <TextInput
                  style={[styles.textInputArea, { minHeight: 90 }]}
                  multiline
                  placeholder="e.g. Avoid strong coffee, raw onion, garlic, menthol while taking medicines. Drink 3L water daily."
                  placeholderTextColor="#94a3b8"
                  value={dietPlan}
                  onChangeText={setDietPlan}
                />
              </View>
            )}

            {/* TAB CONTENT: SHARE MEDIA */}
            {activeTab === "media" && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>Share Media / Patient Reports</Text>
                <Text style={styles.fieldLabel}>Lab reports, x-rays, or case photographs</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <TouchableOpacity style={styles.uploadWhiteBtn} onPress={handlePickImage} activeOpacity={0.7}>
                    <Ionicons name="cloud-upload-outline" size={17} color="#0284c7" />
                    <Text style={styles.uploadWhiteBtnText}>Select File</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 4. Digital Prescription Section Card (Matching User Specification) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Digital Prescription</Text>

              {/* Draw Prescription Full Popup Trigger (No Canvas Pad on the page) */}
              <TouchableOpacity
                style={styles.drawCanvasTriggerBtn}
                onPress={() => setIsDrawingModalOpen(true)}
                activeOpacity={0.8}
              >
                <View style={styles.drawIconBadge}>
                  <Ionicons name="pencil" size={17} color="#ffffff" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.drawBtnTitle}>Draw Prescription (Full Popup Pad)</Text>
                  <Text style={styles.drawBtnSubtitle}>Tap to open full drawing sheet • Solid white paper</Text>
                </View>
                <View style={styles.openPadPill}>
                  <Text style={styles.openPadPillText}>Open Pad</Text>
                  <Ionicons name="expand-outline" size={13} color="#0f172a" />
                </View>
              </TouchableOpacity>

              {/* Physical Prescription Upload / Camera Buttons (Slightly Smaller & Compact) */}
              <Text style={styles.fieldLabel}>Physical Prescription (Optional if Canvas Drawing is used)</Text>
              <View style={styles.uploadButtonsRow}>
                <TouchableOpacity style={styles.uploadWhiteBtn} onPress={handlePickImage} activeOpacity={0.7}>
                  <Ionicons name="cloud-upload-outline" size={16} color="#0284c7" />
                  <Text style={styles.uploadWhiteBtnText}>Upload</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cameraBlueBtn} onPress={handleCameraCapture} activeOpacity={0.7}>
                  <Ionicons name="camera" size={16} color="#ffffff" />
                  <Text style={styles.cameraBlueBtnText}>Camera</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHelperText}>
                Upload from device or take a photo with camera. Syncs live with AWS S3.
              </Text>

              {/* Uploaded Prescriptions & Canvas Sub-box */}
              <View style={styles.uploadedBoxContainer}>
                <View style={styles.uploadedBoxHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13 }}>📤</Text>
                    <Text style={styles.uploadedBoxTitle} numberOfLines={1}>Uploaded Prescriptions</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{uploadedImages.length}</Text>
                    </View>
                    {isUploadingImage && (
                      <ActivityIndicator size="small" color="#0284c7" style={{ marginLeft: 3 }} />
                    )}
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    {uploadedImages.length > 0 && (
                      <TouchableOpacity
                        style={styles.enlargeSlideBtn}
                        onPress={() => {
                          setViewerInitialIndex(0);
                          setIsViewerOpen(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="expand-outline" size={11} color="#0284c7" />
                        <Text style={styles.enlargeSlideBtnText}>Preview</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.smallUploadBtn} onPress={handlePickImage} activeOpacity={0.7}>
                      <Text style={styles.smallUploadBtnText}>+ Upload</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {uploadedImages.length === 0 ? (
                  <View style={styles.dashedEmptyBox}>
                    <Ionicons name="image-outline" size={30} color="#94a3b8" />
                    <Text style={styles.dashedEmptyText}>No prescriptions or canvas drawings uploaded yet</Text>
                    <Text style={styles.dashedEmptySub}>Draw on canvas or upload photos. Syncs live across Web & Mobile via AWS S3.</Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewGallery}>
                    {uploadedImages.map((uri, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.thumbnailWrapper}
                        onPress={() => {
                          setViewerInitialIndex(idx);
                          setIsViewerOpen(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <ExpoImage source={resolvePrescriptionImageUrl(uri)} style={styles.thumbnailImg} contentFit="cover" />
                        <TouchableOpacity
                          style={styles.removeImgBtn}
                          onPress={() => handleRemoveImage(idx)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="close" size={11} color="#ffffff" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            {/* 5. Follow-up Recommendation Section (Matching Screenshot) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Follow-up Recommendation</Text>
              <Text style={styles.fieldLabel}>Follow-up Interval</Text>

              {/* Interval Chips Row (1 Month, 2 Months, 3 Months, 4 Months) */}
              <View style={styles.intervalsRow}>
                {(["No Follow-up", "1 Month", "2 Months", "3 Months", "4 Months"] as const).map((interval) => (
                  <TouchableOpacity
                    key={interval}
                    style={[styles.intervalChip, followUpInterval === interval && styles.intervalChipActive]}
                    onPress={() => handleSelectInterval(interval)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.intervalChipText,
                        followUpInterval === interval && styles.intervalChipTextActive,
                      ]}
                    >
                      {interval}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preferred Follow-up Date */}
              <Text style={styles.fieldLabel}>Preferred Follow-up Date (DD-MM-YYYY)</Text>
              <View style={styles.dateInputWrapper}>
                <Ionicons name="calendar" size={16} color="#0284c7" />
                <TextInput
                  style={styles.dateInputText}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#94a3b8"
                  value={followUpDate}
                  onChangeText={setFollowUpDate}
                />
                <Ionicons name="calendar-outline" size={16} color="#0284c7" />
              </View>
            </View>

            {/* 6. Enter Amount Section (Optional for Doctor, Reception can Collect) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Enter Amount</Text>
              <Text style={styles.fieldLabel}>Amount (₹) (Optional - Can also be entered at Reception)</Text>
              <TextInput
                style={styles.feeTextInput}
                placeholder="Enter amount (optional)..."
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={consultationFee}
                onChangeText={setConsultationFee}
              />

              {/* CORE CTA: Send to Reception & Collect Fee */}
              <TouchableOpacity
                style={[styles.sendToReceptionCta, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSendToReception}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.sendToReceptionText}>
                    {role === "RECEPTION"
                      ? "Complete Consultation & Move to Collect Fee"
                      : "Send to Reception & Collect Fee"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 7. Patient History & Records Section (Matching Screenshot) */}
            <View style={styles.historyCard}>
              <View style={styles.historyCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={{ fontSize: 14 }}>📋</Text>
                  <Text style={styles.historyTitleText}>Patient History & Records</Text>
                </View>
                <Text style={styles.historySubText}>
                  Total Paid: <Text style={{ color: "#16a34a", fontWeight: "700" }}>₹{totalPaid}</Text> (
                  {patientHistory.length} Visits)
                </Text>
              </View>

              {/* Sub-Tabs: All | Prescriptions | Payments */}
              <View style={styles.historyTabsRow}>
                <TouchableOpacity
                  style={[styles.historyTabPill, historyTab === "all" && styles.historyTabPillActive]}
                  onPress={() => setHistoryTab("all")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.historyTabPillText,
                      historyTab === "all" && styles.historyTabPillTextActive,
                    ]}
                  >
                    All ({patientHistory.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.historyTabPill, historyTab === "prescriptions" && styles.historyTabPillActive]}
                  onPress={() => setHistoryTab("prescriptions")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.historyTabPillText,
                      historyTab === "prescriptions" && styles.historyTabPillTextActive,
                    ]}
                  >
                    Prescriptions
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.historyTabPill, historyTab === "payments" && styles.historyTabPillActive]}
                  onPress={() => setHistoryTab("payments")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.historyTabPillText,
                      historyTab === "payments" && styles.historyTabPillTextActive,
                    ]}
                  >
                    Payments
                  </Text>
                </TouchableOpacity>
              </View>

              {/* History Content */}
              {patientHistory.length === 0 ? (
                <View style={styles.historyEmptyBox}>
                  <Ionicons name="document-text-outline" size={30} color="#94a3b8" />
                  <Text style={styles.historyEmptyText}>No previous visits recorded for this patient.</Text>
                </View>
              ) : (
                patientHistory.map((h, i) => (
                  <View key={h.id || i} style={styles.historyItemCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.historyItemDate}>{h.date}</Text>
                      <Text style={styles.historyItemFee}>₹{h.consultationFee}</Text>
                    </View>
                    <Text style={styles.historyItemDoc}>{h.doctorName}</Text>
                    {h.diagnosisNotes ? (
                      <Text style={styles.historyItemNotes} numberOfLines={2}>
                        Notes: {h.diagnosisNotes}
                      </Text>
                    ) : null}

                    {/* Prescriptions Gallery for this History Visit */}
                    {h.prescriptionImages && h.prescriptionImages.length > 0 && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#64748b", marginBottom: 3 }}>
                          Prescriptions ({h.prescriptionImages.length}):
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row" }}>
                          {h.prescriptionImages.map((rxUrl: string, rIdx: number) => (
                            <TouchableOpacity
                              key={rIdx}
                              style={{
                                width: 50,
                                height: 50,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: "#cbd5e1",
                                overflow: "hidden",
                                marginRight: 6,
                                backgroundColor: "#f8fafc",
                              }}
                              onPress={() => {
                                setUploadedImages(h.prescriptionImages);
                                setViewerInitialIndex(rIdx);
                                setIsViewerOpen(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <ExpoImage
                                source={resolvePrescriptionImageUrl(rxUrl)}
                                style={{ width: "100%", height: "100%" }}
                                contentFit="cover"
                              />
                              <View
                                style={{
                                  position: "absolute",
                                  bottom: 0,
                                  right: 0,
                                  backgroundColor: "rgba(15, 23, 42, 0.8)",
                                  paddingHorizontal: 3,
                                  borderTopLeftRadius: 4,
                                }}
                              >
                                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "bold" }}>Rx {rIdx + 1}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* DRAWING CANVAS FULL POPUP MODAL */}
      <DrawingCanvasModal
        visible={isDrawingModalOpen}
        patientName={patientData.patientName}
        registrationId={patientData.registrationId}
        onClose={() => setIsDrawingModalOpen(false)}
        onSaveDrawing={handleSaveCanvasDrawing}
      />

      {/* FULL-SCREEN INTERACTIVE PRESCRIPTION VIEWER (SLIDER, ROTATE, ZOOM) */}
      <PrescriptionViewerModal
        visible={isViewerOpen}
        images={uploadedImages.map(resolvePrescriptionImageUrl)}
        initialIndex={viewerInitialIndex}
        onClose={() => setIsViewerOpen(false)}
        onDeleteImage={handleRemoveImage}
      />

      </KeyboardAvoidingView>

      {/* Bottom Bar */}
      {bottomNav}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0284c7",
  },
  headerInfoCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0284c7",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 36,
    width: "100%",
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
    width: "100%",
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  profileNameText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  durationPill: {
    backgroundColor: "#fef9c3",
    borderWidth: 1,
    borderColor: "#fde047",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  durationPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#ca8a04",
  },
  metaInfoList: {
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaIcon: {
    fontSize: 12,
  },
  regIdHighlight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7",
  },
  metaText: {
    fontSize: 12,
    color: "#475569",
  },
  packageSubBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packageSubText: {
    fontSize: 11.5,
    color: "#64748b",
  },
  registerPkgBtn: {
    borderWidth: 1,
    borderColor: "#0284c7",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  registerPkgBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0284c7",
  },
  tabsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 8,
  },
  tabChipActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#bae6fd",
  },
  tabChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748b",
  },
  tabChipTextActive: {
    color: "#0284c7",
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
    width: "100%",
  },
  sectionCardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  fieldLabelInline: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  textInputArea: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    color: "#0f172a",
    minHeight: 80,
    textAlignVertical: "top",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  radioOptionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  radioLabel: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  enlargeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  enlargeBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  drawCanvasTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  drawIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  drawBtnTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  drawBtnSubtitle: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
  },
  openPadPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  openPadPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  enlargeSlideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  enlargeSlideBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284c7",
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  uploadWhiteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 6.5,
    borderRadius: 6,
  },
  uploadWhiteBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  cameraBlueBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#0284c7",
    paddingVertical: 6.5,
    borderRadius: 6,
  },
  cameraBlueBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  fieldHelperText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 6,
    marginBottom: 10,
  },
  uploadedBoxContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
  },
  uploadedBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  uploadedBoxTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  countBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  smallUploadBtn: {
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  smallUploadBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284c7",
  },
  dashedEmptyBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  dashedEmptyText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 6,
  },
  dashedEmptySub: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  previewGallery: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  thumbnailWrapper: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 8,
    position: "relative",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
    borderRadius: 7,
    backgroundColor: "#ffffff",
  },
  removeImgBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  intervalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 8,
  },
  intervalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  intervalChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  intervalChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#334155",
  },
  intervalChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  dateInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  dateInputText: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  feeTextInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 14,
  },
  sendToReceptionCta: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sendToReceptionText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: "100%",
  },
  historyCardHeader: {
    marginBottom: 10,
  },
  historyTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0284c7",
  },
  historySubText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  historyTabsRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 3,
    borderRadius: 8,
    marginBottom: 10,
    gap: 4,
  },
  historyTabPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  historyTabPillActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyTabPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  historyTabPillTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },
  historyEmptyBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  historyEmptyText: {
    fontSize: 11.5,
    color: "#94a3b8",
    marginTop: 6,
    textAlign: "center",
  },
  historyItemCard: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  historyItemDate: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  historyItemFee: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#16a34a",
  },
  historyItemDoc: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
  },
  historyItemNotes: {
    fontSize: 10,
    color: "#475569",
    marginTop: 2,
  },
});

