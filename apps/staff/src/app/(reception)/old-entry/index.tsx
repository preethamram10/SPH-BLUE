import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  BackHandler,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, getActiveBranch } from "../../../services/auth";
import { PrescriptionViewerModal } from "../../../components/patient-file/PrescriptionViewerModal";

const COLORS = {
  primary: "#0284c7",
  primaryDark: "#0369a1",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#ef4444",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

const DEFAULT_DOCTORS = [
  { id: "doc-1", name: "Dr. Prashanth K Vaidya" },
  { id: "doc-2", name: "Dr. S. Radhika" },
  { id: "doc-3", name: "Dr. B. K. Sharma" },
  { id: "doc-4", name: "Dr. Ananya Rao" },
];

const SOURCES_LIST = [
  "Old Patient",
  "Walk-in",
  "Referral",
  "Google",
  "Youtube",
  "Instagram",
  "Facebook",
  "Practo",
  "Other",
];

export default function MobileOldPrescriptionEntryScreen() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<any>(null);

  // Form states
  const [regId, setRegId] = useState("");
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idStatus, setIdStatus] = useState<"IDLE" | "EXISTS" | "NEW">("IDLE");
  const [existingPatient, setExistingPatient] = useState<any>(null);
  const [hasGeneratedId, setHasGeneratedId] = useState(false);

  const [phone, setPhone] = useState("");
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([]);
  const [patientName, setPatientName] = useState("");
  const [source, setSource] = useState("Old Patient");
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [subject, setSubject] = useState("");

  // Doctor state
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>(DEFAULT_DOCTORS);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; name: string }>(DEFAULT_DOCTORS[0]);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

  // Visit Date state & Interactive Calendar
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()); // 0-indexed

  // Prescription Scans & AWS S3
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);

  // Image Viewer Modal state
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 1. Initial Load: Active Branch & Doctors List
  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });

    // Fetch doctors from backend
    apiFetch<any>("/admin/employees?category=DOCTOR")
      .then((res) => {
        if (res && (res.employees || Array.isArray(res))) {
          const list = res.employees || res;
          if (Array.isArray(list) && list.length > 0) {
            const docList = list.map((d: any) => ({
              id: d.id || `doc-${d.name}`,
              name: d.name,
            }));
            setDoctors(docList);
            setSelectedDoctor(docList[0]);
          }
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_DOCTORS
      });
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(reception)" as any);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // 2. Patient MRN / Registration ID
  const handleRegIdChange = (text: string) => {
    const upper = text.toUpperCase().replace(/\s+/g, "");
    setRegId(upper);
    setIdStatus("IDLE");
    setExistingPatient(null);
    setHasGeneratedId(false);
  };

  const handleVerifyId = async () => {
    const idToCheck = regId.trim().toUpperCase();
    if (!idToCheck) {
      Alert.alert("Enter ID", "Please type a Patient MRN ID to verify.");
      return;
    }

    try {
      setIsCheckingId(true);
      const res = await apiFetch<any>(`/reception/patients?regId=${encodeURIComponent(idToCheck)}`);
      if (res.success && res.patient) {
        setIdStatus("EXISTS");
        setExistingPatient(res.patient);
      } else {
        setIdStatus("NEW");
        setExistingPatient(null);
      }
    } catch {
      setIdStatus("IDLE");
    } finally {
      setIsCheckingId(false);
    }
  };

  // Guard against re-generating and burning sequence IDs
  const handleGenerateId = async () => {
    if (hasGeneratedId && regId.trim()) {
      Alert.alert(
        "ID Already Generated",
        `You currently have '${regId}' reserved for this patient. Do you want to discard it and generate the next sequential ID?`,
        [
          { text: "Keep Current ID", style: "cancel" },
          { text: "Generate Next", style: "destructive", onPress: () => performGenerateId() },
        ]
      );
      return;
    }
    await performGenerateId();
  };

  const performGenerateId = async () => {
    try {
      setIsCheckingId(true);
      const branchName = activeBranch?.name || activeBranch?.branch || "KPB";
      const res = await apiFetch<any>(`/patients/generate-id?branch=${encodeURIComponent(branchName)}`);
      if (res.success && res.registrationId) {
        const generated = res.registrationId.toUpperCase();
        setRegId(generated);
        setIdStatus("NEW");
        setExistingPatient(null);
        setHasGeneratedId(true);
      } else {
        Alert.alert("Error", "Could not generate ID from sequence.");
      }
    } catch {
      Alert.alert("Error", "Network error generating ID.");
    } finally {
      setIsCheckingId(false);
    }
  };

  const applyExistingPatient = (p: any) => {
    if (!p) return;
    setRegId(p.regId || regId);
    setPatientName(p.name || "");
    if (p.phone) setPhone((p.phone || "").replace(/\D/g, "").slice(-10));
    if (p.source || p.marketingSource) setSource(p.source || p.marketingSource);
    if (p.subject || p.diseases) setSubject(p.subject || p.diseases);
    setIdStatus("EXISTS");
    setExistingPatient(p);
  };

  // 3. Mobile Number & Family Profiles
  const handlePhoneChange = async (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);

    if (digits.length === 10) {
      try {
        const res = await apiFetch<any>(`/reception/patients/by-phone?phone=${digits}`);
        if (res.success && Array.isArray(res.profiles) && res.profiles.length > 0) {
          setFamilyProfiles(res.profiles);
        } else {
          setFamilyProfiles([]);
        }
      } catch {
        setFamilyProfiles([]);
      }
    } else {
      setFamilyProfiles([]);
    }
  };

  // 4. Capture & Upload Prescription Scan (Compressed, NO White Screen)
  const handlePickScan = () => {
    Alert.alert(
      "Attach Prescription Scan",
      "Choose an option to scan or upload:",
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
  };

  const processImagePick = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera permission is needed to capture prescriptions.");
          return;
        }
        // allowsEditing: false PREVENTS Android cropper freeze/white screen!
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.65,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Gallery permission is needed to select prescriptions.");
          return;
        }
        // allowsEditing: false PREVENTS Android cropper freeze/white screen!
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.65,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);

        const uploadRes = await apiFetch<any>("/patient-file/upload", {
          method: "POST",
          body: JSON.stringify({
            base64: asset.base64,
            contentType: "image/jpeg",
            patientId: regId || "SPH-OLD",
          }),
        });

        if (uploadRes.success && uploadRes.url) {
          setUploadedImages((prev) => [...prev, uploadRes.url]);
          setUploadSuccessToast("✓ Prescription scan uploaded successfully!");
          setTimeout(() => {
            setUploadSuccessToast(null);
          }, 4000);
        } else {
          Alert.alert("Upload Failed", "Could not upload image to server.");
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to process photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== index));
    if (isViewerOpen && viewerIndex >= uploadedImages.length - 1) {
      setViewerIndex(Math.max(0, uploadedImages.length - 2));
    }
  };

  // Open Fullscreen Prescription Viewer
  const handleOpenViewer = (index: number) => {
    setViewerIndex(index);
    setIsViewerOpen(true);
  };

  // 5. Interactive Calendar Calculations & Quick Selectors
  const setQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setVisitDate(d.toISOString().slice(0, 10));
  };

  const setQuickDateMonths = (monthsAgo: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    setVisitDate(d.toISOString().slice(0, 10));
  };

  const setQuickDateYears = (yearsAgo: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsAgo);
    setVisitDate(d.toISOString().slice(0, 10));
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 is Sunday
    const days: Array<{ day: number | null; dateStr?: string }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(calMonth + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      days.push({ day: d, dateStr: `${calYear}-${monthStr}-${dayStr}` });
    }
    return days;
  }, [calYear, calMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleSelectCalendarDay = (dateStr?: string) => {
    if (dateStr) {
      setVisitDate(dateStr);
      setIsCalendarOpen(false);
    }
  };

  // 6. Save Old Record to Database
  const handleSave = async () => {
    if (!regId.trim()) {
      Alert.alert("Missing MRN", "Please enter or generate a Patient Registration ID.");
      return;
    }
    if (!patientName.trim()) {
      Alert.alert("Missing Name", "Please enter the patient full name.");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setIsSubmitting(true);
      const branchName = activeBranch?.name || activeBranch?.branch || "Clinic Branch";

      const res = await apiFetch<any>("/reception/old-entry", {
        method: "POST",
        body: JSON.stringify({
          regId: regId.trim().toUpperCase(),
          name: patientName.trim(),
          phone: phone.trim(),
          branch: branchName,
          source,
          marketingSource: source,
          subject: subject.trim(),
          diseases: subject.trim(),
          visitDate,
          doctorName: selectedDoctor.name,
          doctorId: selectedDoctor.id,
          consultationFee: 0,
          prescriptionImages: uploadedImages,
        }),
      });

      if (res.success) {
        const savedId = res.patient?.regId || regId;
        const savedName = res.patient?.name || patientName;
        const savedPhone = phone;

        Alert.alert(
          "Success",
          `Old record for ${savedName} (${savedId}) assigned to ${selectedDoctor.name} saved successfully!`,
          [
            {
              text: "View Patient History",
              onPress: () => {
                router.push(
                  `/(reception)/patient-history?id=${encodeURIComponent(savedId)}&name=${encodeURIComponent(savedName)}&phone=${encodeURIComponent(savedPhone)}&branch=${encodeURIComponent(branchName)}` as any
                );
              },
            },
            {
              text: "Enter Another",
              onPress: () => {
                setRegId("");
                setPatientName("");
                setPhone("");
                setSubject("");
                setSource("Old Patient");
                setUploadedImages([]);
                setIdStatus("IDLE");
                setExistingPatient(null);
                setFamilyProfiles([]);
                setHasGeneratedId(false);
              },
            },
          ]
        );
      } else {
        Alert.alert("Save Failed", res.error || "Could not save old prescription entry.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Network error saving record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const branchTitle = activeBranch?.name || activeBranch?.branch || "Spiritual Homeopathy Clinic";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Old Prescription Entry</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{branchTitle}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* SECTION 1: MRN ID CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.fieldLabel}>PATIENT MRN / ID *</Text>
                <Text style={styles.fieldSub}>Sequential ID reservation prevents collisions</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity
                  style={styles.smallOutlineBtn}
                  onPress={handleVerifyId}
                  disabled={isCheckingId || !regId.trim()}
                >
                  <Text style={styles.smallOutlineBtnText}>{isCheckingId ? "..." : "Verify"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallFillBtn, hasGeneratedId && { backgroundColor: COLORS.success }]}
                  onPress={handleGenerateId}
                  disabled={isCheckingId}
                >
                  <Ionicons name="sparkles" size={11} color="#ffffff" style={{ marginRight: 3 }} />
                  <Text style={styles.smallFillBtnText}>
                    {hasGeneratedId ? "ID Reserved" : "Generate ID"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              style={styles.inputMonospace}
              placeholder="e.g. SPH-KPB-0001"
              placeholderTextColor={COLORS.textMuted}
              value={regId}
              onChangeText={handleRegIdChange}
              onBlur={handleVerifyId}
              autoCapitalize="characters"
            />

            {/* Existing Patient Match Notice - HIGHLIGHTING MRN & PHONE FIRST */}
            {idStatus === "EXISTS" && existingPatient && (
              <View style={styles.existsCard}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="person-circle" size={16} color="#b45309" />
                    <Text style={styles.existsIdText}>[{existingPatient.regId}]</Text>
                    <Text style={styles.existsPhoneText}>📞 {existingPatient.phone || "No phone"}</Text>
                  </View>
                  <Text style={styles.existsNameText}>Name: {existingPatient.name}</Text>
                  {existingPatient.branch && (
                    <Text style={styles.existsBranchText}>Branch: {existingPatient.branch}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.useProfileBtn}
                  onPress={() => applyExistingPatient(existingPatient)}
                >
                  <Text style={styles.useProfileBtnText}>Use Profile</Text>
                </TouchableOpacity>
              </View>
            )}

            {idStatus === "NEW" && (
              <View style={styles.newBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.newBadgeText}>✓ ID available. Will create new patient record.</Text>
              </View>
            )}
          </View>

          {/* SECTION 2: MOBILE & FAMILY PROFILES (DISTINGUISHED BY MRN & PHONE) */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>MOBILE PHONE NUMBER *</Text>
            <Text style={styles.fieldSub}>Distinguishes patients even if they share the same name</Text>
            <View style={[styles.phoneInputRow, { marginTop: 6 }]}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {familyProfiles.length > 0 && (
              <View style={styles.familyBox}>
                <Text style={styles.familyTitle}>Profiles linked with this phone (Matched by ID &amp; Mobile):</Text>
                <View style={styles.familyPillsRow}>
                  {familyProfiles.map((prof) => (
                    <TouchableOpacity
                      key={prof.regId}
                      style={styles.familyPill}
                      onPress={() => applyExistingPatient(prof)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Text style={styles.familyPillId}>[{prof.regId}]</Text>
                        <Text style={styles.familyPillPhone}>📞 {prof.phone || phone}</Text>
                      </View>
                      <Text style={styles.familyPillName} numberOfLines={1}>{prof.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* SECTION 3: PATIENT NAME */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>PATIENT FULL NAME *</Text>
            <TextInput
              style={[styles.input, { marginTop: 6 }]}
              placeholder="e.g. Ramesh Chandra"
              placeholderTextColor={COLORS.textMuted}
              value={patientName}
              onChangeText={setPatientName}
            />
          </View>

          {/* SECTION 4: DOCTOR SELECTION DROPDOWN */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>ATTENDING DOCTOR *</Text>
            <Text style={styles.fieldSub}>Select doctor who prescribed this record</Text>

            <TouchableOpacity
              style={styles.doctorSelectorBtn}
              onPress={() => setIsDoctorModalOpen(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.doctorIconCircle}>
                  <Ionicons name="medkit" size={16} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.selectedDoctorName}>{selectedDoctor.name}</Text>
                  <Text style={styles.selectedDoctorSub}>SPH Clinic Homeopathic Consultant</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* SECTION 5: INTERACTIVE CALENDAR FOR DATE OF VISIT */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.fieldLabel}>DATE OF VISIT (PRESCRIPTION DATE) *</Text>
                <Text style={styles.fieldSub}>Interactive calendar with past date shortcuts</Text>
              </View>
              <TouchableOpacity
                style={styles.openCalBtn}
                onPress={() => setIsCalendarOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar" size={13} color={COLORS.primary} style={{ marginRight: 3 }} />
                <Text style={styles.openCalBtnText}>Open Calendar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.dateDisplayCard}
              onPress={() => setIsCalendarOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dateDisplayMain}>{visitDate}</Text>
                <Text style={styles.dateDisplaySub}>Tap to open visual calendar picker</Text>
              </View>
              <Ionicons name="pencil" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Quick past date pills */}
            <View style={styles.quickDateRow}>
              <TouchableOpacity style={styles.quickDatePill} onPress={() => setQuickDate(0)}>
                <Text style={styles.quickDateText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDatePill} onPress={() => setQuickDate(1)}>
                <Text style={styles.quickDateText}>Yesterday</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDatePill} onPress={() => setQuickDate(7)}>
                <Text style={styles.quickDateText}>1 Wk Ago</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDatePill} onPress={() => setQuickDateMonths(1)}>
                <Text style={styles.quickDateText}>1 Mo Ago</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDatePill} onPress={() => setQuickDateMonths(6)}>
                <Text style={styles.quickDateText}>6 Mo Ago</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDatePill} onPress={() => setQuickDateYears(1)}>
                <Text style={styles.quickDateText}>1 Yr Ago</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDatePill} onPress={() => setQuickDateYears(2)}>
                <Text style={styles.quickDateText}>2 Yr Ago</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 5B: PATIENT SOURCE & SUBJECT */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>PATIENT ACQUISITION SOURCE *</Text>
            <TouchableOpacity
              style={styles.doctorSelectorBtn}
              onPress={() => setIsSourceModalOpen(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.doctorIconCircle}>
                  <Ionicons name="funnel-outline" size={16} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.selectedDoctorName}>{source}</Text>
                  <Text style={styles.selectedDoctorSub}>Tap to change acquisition channel</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>SUBJECT / CHIEF COMPLAINT</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Migraine, Hair Fall, Gastritis, Joint Pains..."
                placeholderTextColor={COLORS.textMuted}
                value={subject}
                onChangeText={setSubject}
              />
            </View>
          </View>

          {/* SECTION 6: UPLOAD PRESCRIPTION SCANS (WITH VIEWER & SUCCESS MESSAGE) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.fieldLabel}>PRESCRIPTION SCANS (AWS S3)</Text>
                <Text style={styles.fieldSub}>Tap thumbnail to view full screen with &lt; &gt; navigation</Text>
              </View>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handlePickScan}
                disabled={isUploading}
                activeOpacity={0.8}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.uploadBtnText}>+ Add Scan</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Success Toast */}
            {uploadSuccessToast && (
              <View style={styles.successToast}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.successToastText}>{uploadSuccessToast}</Text>
              </View>
            )}

            {uploadedImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {uploadedImages.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.scanThumbCard}
                    onPress={() => handleOpenViewer(idx)}
                    activeOpacity={0.8}
                  >
                    <ExpoImage source={{ uri }} style={styles.scanThumbImg} contentFit="cover" />
                    <View style={styles.scanPageBadge}>
                      <Text style={styles.scanPageBadgeText}>Page {idx + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.scanDeleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash" size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyScansBox}>
                <Ionicons name="images-outline" size={28} color="#cbd5e1" />
                <Text style={styles.emptyScansText}>No prescription images attached yet</Text>
                <Text style={styles.emptyScansSub}>Take photo or pick from gallery to upload</Text>
              </View>
            )}
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.saveBtn, (isSubmitting || isUploading) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSubmitting || isUploading}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Save Old Record to Database</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FULL-SCREEN PRESCRIPTION VIEWER MODAL (< and > Navigation) */}
      <PrescriptionViewerModal
        visible={isViewerOpen}
        images={uploadedImages}
        initialIndex={viewerIndex}
        onClose={() => setIsViewerOpen(false)}
        onDeleteImage={handleRemoveImage}
      />

      {/* DOCTOR SELECTION MODAL */}
      <Modal
        visible={isDoctorModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDoctorModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Attending Doctor</Text>
                <Text style={styles.modalSub}>All clinic homeopathic doctors</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDoctorModalOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {doctors.map((doc) => {
                const isSelected = doc.id === selectedDoctor.id || doc.name === selectedDoctor.name;
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.doctorOptionItem, isSelected && styles.doctorOptionItemSelected]}
                    onPress={() => {
                      setSelectedDoctor(doc);
                      setIsDoctorModalOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.doctorOptionName, isSelected && { color: COLORS.primary }]}>
                        {doc.name}
                      </Text>
                      <Text style={styles.doctorOptionSub}>Doctor ID: {doc.id}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SOURCE SELECTION MODAL */}
      <Modal
        visible={isSourceModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSourceModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Patient Source</Text>
                <Text style={styles.modalSub}>Patient acquisition channel</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSourceModalOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {SOURCES_LIST.map((src) => {
                const isSelected = src === source;
                return (
                  <TouchableOpacity
                    key={src}
                    style={[styles.doctorOptionItem, isSelected && styles.doctorOptionItemSelected]}
                    onPress={() => {
                      setSource(src);
                      setIsSourceModalOpen(false);
                    }}
                  >
                    <Text style={[styles.doctorOptionName, isSelected && { color: COLORS.primary, fontWeight: "bold" }]}>
                      {src}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* INTERACTIVE CALENDAR MODAL */}
      <Modal
        visible={isCalendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calModalBox}>
            <View style={styles.calHeaderRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                <Ionicons name="chevron-back" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
              <View style={{ alignItems: "center" }}>
                <Text style={styles.calMonthYearTitle}>
                  {monthNames[calMonth]} {calYear}
                </Text>
                <Text style={styles.calMonthYearSub}>Pick visit date</Text>
              </View>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Quick Year Navigation */}
            <View style={styles.yearRow}>
              {[calYear - 2, calYear - 1, calYear, calYear + 1].map((yr) => (
                <TouchableOpacity
                  key={yr}
                  style={[styles.yearPill, yr === calYear && styles.yearPillActive]}
                  onPress={() => setCalYear(yr)}
                >
                  <Text style={[styles.yearPillText, yr === calYear && styles.yearPillTextActive]}>
                    {yr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day Names */}
            <View style={styles.weekDaysRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => (
                <Text key={idx} style={styles.weekDayText}>{dayName}</Text>
              ))}
            </View>

            {/* Day Grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((item, idx) => {
                if (!item.day) {
                  return <View key={idx} style={styles.emptyDayCell} />;
                }
                const isSelected = item.dateStr === visitDate;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => handleSelectCalendarDay(item.dateStr)}
                  >
                    <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.calCloseBtn}
              onPress={() => setIsCalendarOpen(false)}
            >
              <Text style={styles.calCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  scrollContent: { padding: 14, gap: 12 },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: COLORS.textDark, letterSpacing: 0.5 },
  fieldSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  smallOutlineBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  smallOutlineBtnText: { fontSize: 11, fontWeight: "700", color: COLORS.textDark },

  smallFillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  smallFillBtnText: { fontSize: 11, fontWeight: "700", color: COLORS.white },

  inputMonospace: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    backgroundColor: "#f0f9ff",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },

  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  phonePrefix: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textMuted,
    backgroundColor: "#f8fafc",
    paddingVertical: 11,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },

  existsCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  existsIdText: { fontSize: 12, fontWeight: "900", color: "#92400e", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  existsPhoneText: { fontSize: 11, fontWeight: "800", color: "#b45309" },
  existsNameText: { fontSize: 11, fontWeight: "700", color: "#78350f", marginTop: 2 },
  existsBranchText: { fontSize: 10, color: "#92400e" },
  useProfileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#d97706",
  },
  useProfileBtnText: { fontSize: 11, fontWeight: "800", color: COLORS.white },

  newBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },
  newBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.success },

  familyBox: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  familyTitle: { fontSize: 10, fontWeight: "800", color: COLORS.primary, marginBottom: 5 },
  familyPillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  familyPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
  },
  familyPillId: { fontSize: 11, fontWeight: "900", color: COLORS.primary, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  familyPillPhone: { fontSize: 10, fontWeight: "700", color: COLORS.textDark },
  familyPillName: { fontSize: 10, fontWeight: "600", color: COLORS.textMuted, marginTop: 1 },

  doctorSelectorBtn: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  doctorIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDoctorName: { fontSize: 13, fontWeight: "800", color: COLORS.textDark },
  selectedDoctorSub: { fontSize: 10, color: COLORS.textMuted },

  openCalBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#e0f2fe",
  },
  openCalBtnText: { fontSize: 10.5, fontWeight: "700", color: COLORS.primary },

  dateDisplayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#ffffff",
    marginTop: 4,
  },
  dateDisplayMain: { fontSize: 14, fontWeight: "800", color: COLORS.textDark },
  dateDisplaySub: { fontSize: 10.5, color: COLORS.textMuted },

  quickDateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  quickDatePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  quickDateText: { fontSize: 10.5, fontWeight: "700", color: COLORS.textDark },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  uploadBtnText: { fontSize: 11, fontWeight: "800", color: COLORS.white },

  successToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  successToastText: { fontSize: 11, fontWeight: "700", color: COLORS.success },

  emptyScansBox: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: 10,
    marginTop: 8,
  },
  emptyScansText: { fontSize: 11, fontWeight: "700", color: COLORS.textDark, marginTop: 4 },
  emptyScansSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  scanThumbCard: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
  },
  scanThumbImg: { width: "100%", height: "100%" },
  scanPageBadge: {
    position: "absolute",
    bottom: 3,
    left: 3,
    backgroundColor: "rgba(15,23,42,0.85)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  scanPageBadgeText: { fontSize: 8.5, fontWeight: "800", color: COLORS.white },
  scanDeleteBtn: {
    position: "absolute",
    top: 3,
    right: 3,
    backgroundColor: "rgba(239,68,68,0.9)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: { fontSize: 14, fontWeight: "800", color: COLORS.white },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  modalTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark },
  modalSub: { fontSize: 11, color: COLORS.textMuted },
  doctorOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  doctorOptionItemSelected: { backgroundColor: "#f0f9ff" },
  doctorOptionName: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  doctorOptionSub: { fontSize: 10.5, color: COLORS.textMuted },

  // Calendar Modal Styles
  calModalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    width: "100%",
    maxWidth: 360,
  },
  calHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  calMonthYearTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textDark },
  calMonthYearSub: { fontSize: 10, color: COLORS.textMuted },

  yearRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  yearPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  yearPillActive: { backgroundColor: COLORS.primary },
  yearPillText: { fontSize: 11, fontWeight: "700", color: COLORS.textDark },
  yearPillTextActive: { color: COLORS.white },

  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekDayText: {
    width: 36,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  emptyDayCell: { width: "14.28%", height: 38 },
  dayCell: {
    width: "14.28%",
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 19,
  },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayCellText: { fontSize: 12, fontWeight: "700", color: COLORS.textDark },
  dayCellTextSelected: { color: COLORS.white, fontWeight: "900" },

  calCloseBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  calCloseBtnText: { fontSize: 13, fontWeight: "800", color: COLORS.white },
});
