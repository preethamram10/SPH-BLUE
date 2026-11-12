import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { apiFetch } from "../../services/auth";
import { resolvePrescriptionImageUrl } from "../patient-file/PatientFileView";
import { PrescriptionViewerModal } from "../patient-file/PrescriptionViewerModal";
import { AppointmentPaymentModal } from "../payment/AppointmentPaymentModal";

interface PatientHistoryViewProps {
  role: "DOCTOR" | "RECEPTION";
  bottomNav?: React.ReactNode;
}

type TabType = "history" | "prescriptions" | "payments";

export const PatientHistoryView: React.FC<PatientHistoryViewProps> = ({ role, bottomNav }) => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const patientId = (params.id as string) || (params.regId as string) || "";
  const paramName = (params.name as string) || (params.patientName as string) || "Patient";
  const paramPhone = (params.phone as string) || "";
  const paramBranch = (params.branch as string) || "Clinic Branch";

  const [currentPatientId, setCurrentPatientId] = useState(patientId);
  const [siblingProfiles, setSiblingProfiles] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [isSortNewest, setIsSortNewest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Data states
  const [patient, setPatient] = useState<any>({
    regId: patientId || "SPH-GEN",
    name: paramName,
    phone: paramPhone,
    branch: paramBranch,
    diseases: "",
    subject: "",
    source: "Old Patient",
  });

  const [stats, setStats] = useState({
    totalPaid: 0,
    totalVisits: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalImages: 0,
  });

  const [appointments, setAppointments] = useState<any[]>([]);
  const [latestAppointment, setLatestAppointment] = useState<any>(null);
  const [allImages, setAllImages] = useState<any[]>([]);

  // Invoice Receipt Modal State
  const [selectedInvoiceAppt, setSelectedInvoiceAppt] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Viewer state
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Load Patient History Data
  const loadData = useCallback(async (isPullRefresh = false, targetId?: string) => {
    if (isPullRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    const lookupId = targetId || currentPatientId || patientId;

    try {
      const q = new URLSearchParams();
      if (lookupId) q.set("id", lookupId);
      if (paramPhone) q.set("phone", paramPhone);

      const res = await apiFetch<any>(`/patient-history?${q.toString()}`);
      if (res.success) {
        if (res.patient) {
          setPatient({
            regId: res.patient.regId || lookupId,
            name: res.patient.name || paramName,
            phone: res.patient.phone || paramPhone,
            branch: res.patient.branch || paramBranch,
            diseases: res.patient.diseases || res.patient.subject || "",
            subject: res.patient.subject || res.patient.diseases || "",
            source: res.patient.source || res.patient.marketingSource || "Old Patient",
          });
          setCurrentPatientId(res.patient.regId || lookupId);
        }
        if (Array.isArray(res.siblingProfiles)) {
          setSiblingProfiles(res.siblingProfiles);
        }
        if (res.stats) setStats(res.stats);
        if (Array.isArray(res.appointments)) setAppointments(res.appointments);
        if (res.latestAppointment) setLatestAppointment(res.latestAppointment);
        if (Array.isArray(res.allPrescriptionImages)) setAllImages(res.allPrescriptionImages);
      }
    } catch (err: any) {
      console.error("Failed to load patient history:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPatientId, patientId, paramPhone, paramName, paramBranch]);

  useEffect(() => {
    loadData(false, currentPatientId);
  }, [currentPatientId]);

  const handleSwitchProfile = (newRegId: string) => {
    if ((newRegId || "").trim().toUpperCase() === (currentPatientId || "").trim().toUpperCase()) return;
    setCurrentPatientId(newRegId);
    loadData(false, newRegId);
  };

  // Back Navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(role === "DOCTOR" ? ("/(doctor)/patient-list" as any) : ("/(reception)/all-patients" as any));
    }
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // Call & WhatsApp Handlers
  const cleanPhone = (patient.phone || paramPhone || "").replace(/\D/g, "").slice(-10);

  const handleCall = () => {
    if (!cleanPhone) {
      Alert.alert("No Phone Number", "No valid contact number registered for this patient.");
      return;
    }
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = () => {
    if (!cleanPhone) {
      Alert.alert("No Phone Number", "No valid contact number registered for this patient.");
      return;
    }
    const msg = `Hello ${patient.name}, greetings from Spiritual Homeopathy Clinic! This is regarding your consultation and health follow-up.`;
    Linking.openURL(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  // Navigate to Patient File (Doctor / Reception Clinical Screen)
  const handleEditRx = (appointmentId?: string) => {
    const targetId = appointmentId || latestAppointment?.id || patient.regId;
    const nameEnc = encodeURIComponent(patient.name || "");
    const phoneEnc = encodeURIComponent(cleanPhone);
    const regIdEnc = encodeURIComponent(patient.regId || "");
    const branchEnc = encodeURIComponent(patient.branch || "");

    const targetRoute = role === "DOCTOR" ? "/(doctor)/patient-file" : "/(reception)/patient-file";
    router.push(`${targetRoute}?id=${targetId}&name=${nameEnc}&phone=${phoneEnc}&registrationId=${regIdEnc}&branch=${branchEnc}` as any);
  };

  // Upload Prescription Scan (Camera / Gallery)
  const handlePickAndUpload = async () => {
    try {
      Alert.alert(
        "Upload Prescription",
        "Choose an option to upload the prescription image:",
        [
          {
            text: "Camera",
            onPress: () => processImagePick(true),
          },
          {
            text: "Gallery Photo",
            onPress: () => processImagePick(false),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } catch (err) {
      console.error(err);
    }
  };

  const processImagePick = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed to capture prescriptions.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Gallery access is needed to upload prescriptions.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);

        // Upload to S3 / local upload endpoint
        const uploadRes = await apiFetch<any>("/patient-file/upload", {
          method: "POST",
          body: JSON.stringify({
            base64: asset.base64,
            contentType: "image/jpeg",
            patientId: patient.regId || "SPH-PATIENT",
          }),
        });

        if (uploadRes.success && uploadRes.url) {
          // Attach to patient history
          await apiFetch<any>("/patient-history", {
            method: "POST",
            body: JSON.stringify({
              action: "ADD_IMAGE",
              regId: patient.regId,
              appointmentId: latestAppointment?.id,
              imageUrl: uploadRes.url,
              patientName: patient.name,
              phone: cleanPhone,
              branch: patient.branch,
            }),
          });

          // Reload fresh history
          await loadData();
          Alert.alert("Success", "Prescription scan uploaded and saved!");
        } else {
          Alert.alert("Upload Failed", "Could not upload image to server.");
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Prescription Image
  const handleDeleteImage = async (appointmentId?: string, imageIndex?: number, imageUrl?: string) => {
    Alert.alert(
      "Delete Prescription Image",
      "Are you sure you want to remove this prescription scan from this patient's records?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              const res = await apiFetch<any>("/patient-history", {
                method: "POST",
                body: JSON.stringify({
                  action: "DELETE_IMAGE",
                  regId: patient.regId,
                  appointmentId,
                  imageIndex,
                  imageUrl,
                }),
              });
              if (res.success) {
                await loadData();
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete image.");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open Full-Screen Image Viewer
  const handleOpenViewer = (imagesList: string[], index = 0) => {
    setViewerImages(imagesList);
    setViewerInitialIndex(index);
    setIsViewerOpen(true);
  };

  // Sorting
  const sortedAppointments = useMemo(() => {
    const list = [...appointments];
    list.sort((a, b) => {
      const dtA = a.appointmentDate || "";
      const dtB = b.appointmentDate || "";
      return isSortNewest ? dtB.localeCompare(dtA) : dtA.localeCompare(dtB);
    });
    return list;
  }, [appointments, isSortNewest]);

  const latestDateFormatted = latestAppointment?.appointmentDate || "N/A";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerPatientName} numberOfLines={1}>
            {patient.name}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            ID: {patient.regId} • {cleanPhone || "No Mobile"}
          </Text>
        </View>

        <View style={styles.headerActionGroup}>
          {/* Call button */}
          <TouchableOpacity style={styles.callIconBtn} onPress={handleCall} activeOpacity={0.7}>
            <Ionicons name="call" size={17} color="#0284c7" />
          </TouchableOpacity>

          {/* WhatsApp button */}
          <TouchableOpacity style={styles.whatsappIconBtn} onPress={handleWhatsApp} activeOpacity={0.7}>
            <Ionicons name="logo-whatsapp" size={17} color="#16a34a" />
          </TouchableOpacity>

          {/* Close (X) button */}
          <TouchableOpacity style={styles.closeIconBtn} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} colors={["#0284c7"]} />}
      >
        {/* Profile Switcher for Same Mobile Number */}
        {siblingProfiles.length > 1 && (
          <View style={styles.profileSectionBox}>
            <View style={styles.profileSectionHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="people-circle" size={17} color="#0284c7" />
                <Text style={styles.profileSectionTitle}>
                  PROFILES ({siblingProfiles.length})
                </Text>
              </View>
              <Text style={styles.profileSectionSub}>Tap profile to load its history</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileChipsRow}>
              {siblingProfiles.map((pItem) => {
                const isSelected =
                  (pItem.regId || "").trim().toUpperCase() === (currentPatientId || "").trim().toUpperCase();

                return (
                  <TouchableOpacity
                    key={pItem.regId}
                    style={[styles.profileChip, isSelected && styles.profileChipActive]}
                    onPress={() => handleSwitchProfile(pItem.regId)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "person-circle-outline"}
                      size={15}
                      color={isSelected ? "#ffffff" : "#0284c7"}
                    />
                    <View>
                      <Text style={[styles.profileChipName, isSelected && styles.profileChipNameActive]} numberOfLines={1}>
                        {pItem.name}
                      </Text>
                      <Text style={[styles.profileChipId, isSelected && styles.profileChipIdActive]}>
                        {pItem.regId} • {pItem.appointmentCount || 0} Visits
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 2. TOP HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>TOTAL PAID AMOUNT</Text>
              <Text style={styles.heroPaidAmount}>₹{stats.totalPaid}</Text>
            </View>

            <View style={styles.heroRightCol}>
              <View style={styles.visitsPill}>
                <Text style={styles.visitsPillText}>
                  {stats.totalVisits} {stats.totalVisits === 1 ? "Visit" : "Visits"}
                </Text>
              </View>
              <Text style={styles.branchSubText} numberOfLines={1}>
                {patient.branch || "Branch"}
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.heroButtonsRow}>
            {/* Edit Latest Rx (Only for Doctor clinical consultation) */}
            {role === "DOCTOR" && (
              <TouchableOpacity style={styles.heroBlueBtn} onPress={() => handleEditRx()} activeOpacity={0.8}>
                <View style={styles.heroBtnContent}>
                  <Ionicons name="document-text-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={styles.heroBtnTitle}>Edit Latest Rx</Text>
                    <Text style={styles.heroBtnSub}>Latest: {latestDateFormatted}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* + Upload Rx */}
            <TouchableOpacity
              style={styles.heroBlueBtn}
              onPress={handlePickAndUpload}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              <View style={styles.heroBtnContent}>
                {isUploading ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                )}
                <View>
                  <Text style={styles.heroBtnTitle}>+ Upload Rx</Text>
                  <Text style={styles.heroBtnSub}>Any Date Scan</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Patient Details Info Block: Branch, Subject, Mobile Number, Source */}
        <View style={styles.patientInfoBlock}>
          <View style={styles.infoBlockGrid}>
            <View style={styles.infoBlockItem}>
              <Text style={styles.infoBlockLabel}>BRANCH</Text>
              <View style={styles.infoBlockValRow}>
                <Ionicons name="location-outline" size={13} color="#0284c7" />
                <Text style={styles.infoBlockValText} numberOfLines={1}>
                  {patient.branch || "Clinic Branch"}
                </Text>
              </View>
            </View>

            <View style={styles.infoBlockItem}>
              <Text style={styles.infoBlockLabel}>SUBJECT / COMPLAINT</Text>
              <View style={styles.infoBlockValRow}>
                <Ionicons name="pulse-outline" size={13} color="#16a34a" />
                <Text style={styles.infoBlockValText} numberOfLines={1}>
                  {patient.subject || patient.diseases || "General Care"}
                </Text>
              </View>
            </View>

            <View style={styles.infoBlockItem}>
              <Text style={styles.infoBlockLabel}>MOBILE NUMBER</Text>
              <View style={styles.infoBlockValRow}>
                <Ionicons name="call-outline" size={13} color="#0284c7" />
                <Text style={styles.infoBlockValText} numberOfLines={1}>
                  {cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "No Mobile"}
                </Text>
              </View>
            </View>

            <View style={styles.infoBlockItem}>
              <Text style={styles.infoBlockLabel}>PATIENT SOURCE</Text>
              <View style={styles.infoBlockValRow}>
                <Ionicons name="people-outline" size={13} color="#7c3aed" />
                <Text style={[styles.infoBlockValText, { color: "#7c3aed", fontWeight: "800" }]} numberOfLines={1}>
                  {patient.source || "Old Patient"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. THREE TABS ROW */}
        <View style={styles.tabsRow}>
          {/* Tab 1: All History */}
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "history" && styles.tabButtonActive]}
            onPress={() => setActiveTab("history")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === "history" && styles.tabButtonTextActive]}>
              All History ({stats.totalVisits})
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Prescriptions */}
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "prescriptions" && styles.tabButtonActive]}
            onPress={() => setActiveTab("prescriptions")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === "prescriptions" && styles.tabButtonTextActive]}>
              Prescriptions ({allImages.length} Imgs)
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Payments & Billing */}
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "payments" && styles.tabButtonActive]}
            onPress={() => setActiveTab("payments")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === "payments" && styles.tabButtonTextActive]}>
              Payments & Billing
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Loading patient history...</Text>
          </View>
        ) : (
          <>
            {/* ============================================================== */}
            {/* TAB 1: ALL HISTORY */}
            {/* ============================================================== */}
            {activeTab === "history" && (
              <View style={styles.tabSection}>
                <View style={styles.subHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="filter-outline" size={15} color="#0f172a" />
                    <Text style={styles.subHeaderCountText}>{appointments.length} Recorded Visits</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.sortToggleBtn}
                    onPress={() => setIsSortNewest((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#0284c7" />
                    <Text style={styles.sortToggleText}>
                      {isSortNewest ? "Last to First (Newest)" : "First to Last (Oldest)"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {sortedAppointments.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="calendar" size={36} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No Recorded Visits</Text>
                    <Text style={styles.emptySubtitle}>No previous appointment records found for this patient.</Text>
                  </View>
                ) : (
                  sortedAppointments.map((item, idx) => {
                    const isPaid = item.isFeeCollected;
                    const actualPaid = typeof item.totalPaid === "number" && item.totalPaid > 0
                      ? item.totalPaid
                      : (isPaid ? (item.totalAmountDue || item.consultationFee || 0) : 0);
                    const billAmount = item.totalAmountDue || item.consultationFee || actualPaid;
                    const pendingDue = Number(item.payLaterAmount || item.pendingBalance || 0);
                    const rxImages = item.prescriptionImages || [];

                    return (
                      <View key={item.id || idx} style={styles.visitCard}>
                        {/* Visit Card Header */}
                        <View style={styles.visitCardHeader}>
                          <View style={styles.visitNumBadge}>
                            <Text style={styles.visitNumText}>
                              VISIT #{item.visitNumber || sortedAppointments.length - idx} • {item.appointmentDate} •{" "}
                              {item.timeSlot}
                            </Text>
                          </View>

                          <View style={[styles.statusPill, isPaid ? styles.statusPillPaid : styles.statusPillPending]}>
                            <Text style={[styles.statusPillText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
                              {isPaid ? "Completed" : "Pending"}
                            </Text>
                          </View>
                        </View>

                        {/* Doctor & Branch Row */}
                        <View style={styles.docBranchRow}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                            <Ionicons name="fitness-outline" size={14} color="#0284c7" />
                            <Text style={styles.docNameText} numberOfLines={1}>
                              {item.doctorName || "Dr. Prashanth K Vaidya"}
                            </Text>
                          </View>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="location-outline" size={13} color="#64748b" />
                            <Text style={styles.branchNameText} numberOfLines={1}>
                              {item.branch || patient.branch}
                            </Text>
                          </View>
                        </View>

                        {/* Visit Meta Row: Mobile & Source */}
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginTop: 2, marginBottom: 4 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="call-outline" size={12} color="#0284c7" />
                            <Text style={{ fontSize: 11, color: "#475569", fontWeight: "600" }}>{cleanPhone || "N/A"}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3e8ff", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#e9d5ff" }}>
                            <Ionicons name="funnel-outline" size={10} color="#7c3aed" />
                            <Text style={{ fontSize: 10, color: "#7c3aed", fontWeight: "800" }}>
                              {item.marketingSource || item.source || patient.source || "Old Patient"}
                            </Text>
                          </View>
                        </View>

                        {/* Payment Inner Box */}
                        <View style={styles.paymentInnerBox}>
                          <View style={styles.paymentBoxTopRow}>
                            <View>
                              <Text style={styles.innerBoxLabel}>AMOUNT PAID</Text>
                              <Text style={styles.innerBoxAmount}>₹{actualPaid}</Text>
                              {pendingDue > 0 && (
                                <Text style={{ fontSize: 9.5, color: "#dc2626", fontWeight: "700", marginTop: 2 }}>
                                  Pending: ₹{pendingDue} (Total: ₹{billAmount})
                                </Text>
                              )}
                            </View>

                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={styles.innerBoxLabel}>PAYMENT METHOD</Text>
                              <View style={styles.paymentMethodPill}>
                                <Ionicons name="cash-outline" size={13} color="#16a34a" />
                                <Text style={styles.paymentMethodText}>{item.paymentMethod || "Cash"}</Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.paymentDatesRow}>
                            <Text style={styles.dateMetaItem}>
                              💳 Payment Date:{" "}
                              <Text style={{ color: isPaid ? "#16a34a" : "#dc2626", fontWeight: "700" }}>
                                {isPaid ? (item.paidAt ? `${item.paidAt.slice(0, 10)} (Completed)` : "Completed") : "Pending / Unpaid"}
                              </Text>
                            </Text>
                            <Text style={styles.dateMetaItem}>
                              📅 Appt Date: {item.appointmentDate} • {item.timeSlot}
                            </Text>
                          </View>
                        </View>

                        {/* Prescriptions & Remedies Section */}
                        <View style={styles.rxSection}>
                          <View style={styles.rxHeaderRow}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                              <Ionicons name="medical-outline" size={14} color="#0284c7" />
                              <Text style={styles.rxTitleText}>Updated Prescriptions & Remedies</Text>
                            </View>

                            {/* Edit Rx button (Doctor only) */}
                            {role === "DOCTOR" && (
                              <TouchableOpacity
                                style={styles.editRxSmallBtn}
                                onPress={() => handleEditRx(item.id)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="pencil" size={12} color="#0284c7" />
                                <Text style={styles.editRxSmallBtnText}>Edit Rx</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Diagnosis Box */}
                          <View style={styles.diagnosisBox}>
                            <Text style={styles.diagnosisText}>
                              Subject / Diagnosis: {item.subject || item.diagnosisNotes || patient.subject || patient.diseases || "General Consultation"}
                            </Text>
                          </View>

                          <Text style={styles.remediesSubtext}>Remedies recorded in clinical file</Text>

                          {/* Attached Prescription Images */}
                          {rxImages.length > 0 && (
                            <View style={styles.attachedImagesSection}>
                              <Text style={styles.attachedImagesLabel}>
                                Attached Prescription Images ({rxImages.length}) • Tap to zoom:
                              </Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                                {rxImages.map((imgUri: string, imgIdx: number) => (
                                    <TouchableOpacity
                                    key={imgIdx}
                                    style={styles.attachedImgCard}
                                    onPress={() => handleOpenViewer(rxImages.map(resolvePrescriptionImageUrl), imgIdx)}
                                    activeOpacity={0.8}
                                  >
                                    <View style={styles.imgTagBadge}>
                                      <Text style={styles.imgTagBadgeText}>Image {imgIdx + 1}</Text>
                                    </View>
                                    <TouchableOpacity
                                      style={styles.imgDeleteBtn}
                                      onPress={() => handleDeleteImage(item.id, imgIdx)}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                      <Ionicons name="trash" size={12} color="#dc2626" />
                                    </TouchableOpacity>
                                    <ExpoImage
                                      source={resolvePrescriptionImageUrl(imgUri)}
                                      style={styles.attachedImgThumb}
                                      contentFit="cover"
                                      transition={200}
                                    />
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 2: PRESCRIPTIONS */}
            {/* ============================================================== */}
            {activeTab === "prescriptions" && (
              <View style={styles.tabSection}>
                <View style={styles.subHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="filter-outline" size={15} color="#0f172a" />
                    <Text style={styles.subHeaderCountText}>{allImages.length} Prescription Images</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.sortToggleBtn}
                    onPress={() => setIsSortNewest((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#0284c7" />
                    <Text style={styles.sortToggleText}>
                      {isSortNewest ? "Last to First (Newest)" : "First to Last (Oldest)"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Upload Prescription Scan Box */}
                <View style={styles.uploadScanCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
                    <View style={styles.cameraIconCircle}>
                      <Ionicons name="camera" size={20} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadCardTitle}>Upload Prescription Scan</Text>
                      <Text style={styles.uploadCardSubtitle}>Camera photo or gallery image for any date</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.addRxBlueBtn}
                    onPress={handlePickAndUpload}
                    disabled={isUploading}
                    activeOpacity={0.8}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="add" size={15} color="#ffffff" />
                        <Text style={styles.addRxBlueBtnText}>Add Rx</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Prescriptions Gallery Grid */}
                {allImages.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="images-outline" size={40} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No Prescription Images</Text>
                    <Text style={styles.emptySubtitle}>Upload scanned prescriptions or camera photos above.</Text>
                  </View>
                ) : (
                  <View style={styles.galleryGrid}>
                    {allImages.map((imgItem, idx) => (
                      <View key={idx} style={styles.galleryCard}>
                        {/* Header bar */}
                        <View style={styles.galleryCardHeader}>
                          <View style={styles.galleryTagBadge}>
                            <Ionicons name="document-text" size={11} color="#0284c7" />
                            <Text style={styles.galleryTagText}>Img {idx + 1}</Text>
                          </View>

                          <TouchableOpacity
                            style={styles.galleryDeleteBtn}
                            onPress={() => handleDeleteImage(imgItem.appointmentId, imgItem.index)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={13} color="#dc2626" />
                          </TouchableOpacity>

                          <Text style={styles.galleryDateText}>{imgItem.date?.slice(5) || "Rx"}</Text>
                        </View>

                        {/* Image Preview */}
                        <TouchableOpacity
                          style={styles.galleryImgWrapper}
                          onPress={() => handleOpenViewer(allImages.map((i) => resolvePrescriptionImageUrl(i.url)), idx)}
                          activeOpacity={0.85}
                        >
                          <ExpoImage
                            source={resolvePrescriptionImageUrl(imgItem.url)}
                            style={styles.galleryImg}
                            contentFit="cover"
                            transition={200}
                          />
                          <View style={styles.expandIconPill}>
                            <Ionicons name="scan-outline" size={13} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 3: PAYMENTS & BILLING */}
            {/* ============================================================== */}
            {activeTab === "payments" && (
              <View style={styles.tabSection}>
                <View style={styles.subHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="filter-outline" size={15} color="#0f172a" />
                    <Text style={styles.subHeaderCountText}>{appointments.length} Payment Records</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.sortToggleBtn}
                    onPress={() => setIsSortNewest((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#0284c7" />
                    <Text style={styles.sortToggleText}>
                      {isSortNewest ? "Last to First (Newest)" : "First to Last (Oldest)"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Total Collected Payment Summary Box */}
                <View style={styles.paymentSummaryCard}>
                  <View style={styles.summaryTopRow}>
                    <View>
                      <Text style={styles.summaryLabel}>TOTAL COLLECTED PAYMENT</Text>
                      <Text style={styles.summaryTotalGreen}>₹{stats.totalPaid}</Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.summaryLabel}>COLLECTED VISITS</Text>
                      <Text style={styles.summaryVisitsBlue}>
                        {stats.paidCount} of {stats.totalVisits} Paid
                      </Text>
                    </View>
                  </View>

                  {/* Quick Pills Row */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPillsScroll}>
                    {sortedAppointments.map((appt, i) => {
                      const isP = appt.isFeeCollected;
                      const paidVal = typeof appt.totalPaid === "number" && appt.totalPaid > 0
                        ? appt.totalPaid
                        : (isP ? (appt.totalAmountDue || appt.consultationFee || 0) : 0);
                      const method = appt.paymentMethod || "Cash";
                      return (
                        <View key={i} style={styles.quickVisitPill}>
                          <Text style={styles.quickVisitPillText}>
                            Visit #{appt.visitNumber || sortedAppointments.length - i}:{" "}
                            <Text style={{ fontWeight: "800", color: "#16a34a" }}>₹{paidVal}</Text> ({method})
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Individual Payment Cards */}
                {sortedAppointments.map((item, idx) => {
                  const isPaid = item.isFeeCollected;
                  const actualPaid = typeof item.totalPaid === "number" && item.totalPaid > 0
                    ? item.totalPaid
                    : (isPaid ? (item.totalAmountDue || item.consultationFee || 0) : 0);
                  const billAmount = item.totalAmountDue || item.consultationFee || actualPaid;
                  const pendingDue = Number(item.payLaterAmount || item.pendingBalance || 0);

                  return (
                    <View key={item.id || idx} style={styles.paymentRecordCard}>
                      <View style={styles.visitCardHeader}>
                        <View style={styles.visitNumBadge}>
                          <Text style={styles.visitNumText}>
                            VISIT #{item.visitNumber || sortedAppointments.length - idx} • PAYMENT {item.appointmentDate} •{" "}
                            {item.timeSlot}
                          </Text>
                        </View>

                        <View style={[styles.statusPill, isPaid ? styles.statusPillPaid : styles.statusPillPending]}>
                          <Text style={[styles.statusPillText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
                            {isPaid ? "Completed" : "Pending"}
                          </Text>
                        </View>
                      </View>

                      {/* Doctor & Branch */}
                      <View style={styles.docBranchRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                          <Ionicons name="fitness-outline" size={14} color="#0284c7" />
                          <Text style={styles.docNameText} numberOfLines={1}>
                            {item.doctorName || "Dr. Prashanth K Vaidya"}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="location-outline" size={13} color="#64748b" />
                          <Text style={styles.branchNameText} numberOfLines={1}>
                            {item.branch || patient.branch}
                          </Text>
                        </View>
                      </View>

                      {/* Inner Box */}
                      <View style={styles.paymentInnerBox}>
                        <View style={styles.paymentBoxTopRow}>
                          <View>
                            <Text style={styles.innerBoxLabel}>
                              VISIT #{item.visitNumber || sortedAppointments.length - idx} AMOUNT PAID
                            </Text>
                            <Text style={styles.innerBoxAmount}>₹{actualPaid}</Text>
                            {pendingDue > 0 && (
                              <Text style={{ fontSize: 9.5, color: "#dc2626", fontWeight: "700", marginTop: 2 }}>
                                Pending: ₹{pendingDue} (Total: ₹{billAmount})
                              </Text>
                            )}
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.innerBoxLabel}>PAYMENT METHOD</Text>
                            <View style={styles.paymentMethodPill}>
                              <Ionicons name="cash-outline" size={13} color="#16a34a" />
                              <Text style={styles.paymentMethodText}>{item.paymentMethod || "Cash"}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.paymentDatesRow}>
                          <Text style={styles.dateMetaItem}>
                            💳 Payment Date:{" "}
                            <Text style={{ color: isPaid ? "#16a34a" : "#dc2626", fontWeight: "700" }}>
                              {isPaid ? (item.paidAt ? `${item.paidAt.slice(0, 10)} (Completed)` : "Completed") : "Pending / Unpaid"}
                            </Text>
                          </Text>
                          <Text style={styles.dateMetaItem}>
                            📅 Appt Date: {item.appointmentDate} • {item.timeSlot}
                          </Text>
                        </View>

                        {/* View Receipt Button */}
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            backgroundColor: "#f0fdf4",
                            borderWidth: 1,
                            borderColor: "#86efac",
                            paddingVertical: 7,
                            borderRadius: 8,
                            marginTop: 10,
                          }}
                          onPress={() => {
                            setSelectedInvoiceAppt({
                              ...item,
                              patientName: patient?.name || item.patientName,
                              phoneNumber: patient?.phone || item.phoneNumber,
                              registrationId: patient?.regId || item.registrationId,
                            });
                            setIsInvoiceModalOpen(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="receipt-outline" size={13} color="#15803d" />
                          <Text style={{ fontSize: 11, fontWeight: "800", color: "#15803d" }}>
                            View Official Receipt &amp; Tax Invoice
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
      {/* FULL-SCREEN INTERACTIVE PRESCRIPTION VIEWER */}
      <PrescriptionViewerModal
        visible={isViewerOpen}
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        onClose={() => setIsViewerOpen(false)}
        onDeleteImage={(idx) => {
          const currentUrl = viewerImages[idx];
          if (currentUrl) {
            const found = allImages.find((m) => m.url === currentUrl);
            handleDeleteImage(found?.appointmentId, found?.index ?? idx, currentUrl);
          }
        }}
      />
      {/* OFFICIAL INVOICE & RECEIPT MODAL */}
      <AppointmentPaymentModal
        visible={isInvoiceModalOpen}
        appointment={selectedInvoiceAppt}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoiceAppt(null);
        }}
        onPaymentSuccess={() => {}}
      />
      {/* Optional Bottom Navigation */}
      {bottomNav}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    marginRight: 10,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerPatientName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 1,
  },
  headerActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 36,
  },
  profileSectionBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  profileSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  profileSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  profileSectionSub: {
    fontSize: 10,
    color: "#64748b",
  },
  profileChipsRow: {
    flexDirection: "row",
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginRight: 8,
  },
  profileChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  profileChipName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  profileChipNameActive: {
    color: "#ffffff",
  },
  profileChipId: {
    fontSize: 9.5,
    color: "#64748b",
    marginTop: 1,
  },
  profileChipIdActive: {
    color: "#e0f2fe",
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroPaidAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
  },
  heroRightCol: {
    alignItems: "flex-end",
  },
  visitsPill: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
    marginBottom: 4,
  },
  visitsPillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  branchSubText: {
    fontSize: 11.5,
    color: "#64748b",
  },
  heroButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroBlueBtn: {
    flex: 1,
    backgroundColor: "#0284c7",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroBtnContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroBtnTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroBtnSub: {
    fontSize: 10.5,
    color: "#e0f2fe",
    marginTop: 1,
  },
  patientInfoBlock: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  infoBlockGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoBlockItem: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoBlockLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  infoBlockValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoBlockValText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    flexShrink: 1,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#0284c7",
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748b",
  },
  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  tabSection: {
    marginTop: 2,
  },
  subHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  subHeaderCountText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  sortToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortToggleText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0284c7",
  },
  visitCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  visitCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  visitNumBadge: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  visitNumText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillPaid: {
    backgroundColor: "#dcfce7",
  },
  statusPillPending: {
    backgroundColor: "#fee2e2",
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  statusTextPaid: {
    color: "#16a34a",
  },
  statusTextPending: {
    color: "#dc2626",
  },
  docBranchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  docNameText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  branchNameText: {
    fontSize: 11.5,
    color: "#64748b",
  },
  paymentInnerBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  paymentBoxTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  innerBoxLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  innerBoxAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#16a34a",
  },
  paymentMethodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },
  paymentDatesRow: {
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
  dateMetaItem: {
    fontSize: 10.5,
    color: "#64748b",
  },
  rxSection: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  rxHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rxTitleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  editRxSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  editRxSmallBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0284c7",
  },
  diagnosisBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
  },
  diagnosisText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  remediesSubtext: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#64748b",
    marginBottom: 8,
  },
  attachedImagesSection: {
    marginTop: 4,
  },
  attachedImagesLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  attachedImgCard: {
    width: 90,
    height: 110,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    overflow: "hidden",
    marginRight: 8,
    position: "relative",
    backgroundColor: "#f1f5f9",
  },
  attachedImgThumb: {
    width: "100%",
    height: "100%",
  },
  imgTagBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    zIndex: 2,
    backgroundColor: "#0284c7",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imgTagBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  imgDeleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 2,
    backgroundColor: "#fee2e2",
    borderRadius: 4,
    padding: 3,
  },
  uploadScanCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cameraIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  uploadCardSubtitle: {
    fontSize: 10.5,
    color: "#0284c7",
    marginTop: 1,
  },
  addRxBlueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addRxBlueBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  galleryCard: {
    width: (Dimensions.get("window").width - 34) / 2,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    padding: 6,
  },
  galleryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  galleryTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  galleryTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  galleryDeleteBtn: {
    padding: 2,
    backgroundColor: "#fee2e2",
    borderRadius: 4,
  },
  galleryDateText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  galleryImgWrapper: {
    height: 180,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f1f5f9",
  },
  galleryImg: {
    width: "100%",
    height: "100%",
  },
  expandIconPill: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderRadius: 12,
    padding: 4,
  },
  paymentSummaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryTotalGreen: {
    fontSize: 22,
    fontWeight: "900",
    color: "#16a34a",
  },
  summaryVisitsBlue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0284c7",
  },
  quickPillsScroll: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  quickVisitPill: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  quickVisitPillText: {
    fontSize: 11,
    color: "#334155",
  },
  paymentRecordCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "center",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748b",
  },
});

