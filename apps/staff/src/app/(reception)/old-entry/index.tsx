import React, { useState, useEffect, useCallback } from "react";
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
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, getActiveBranch } from "../../../services/auth";

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

export default function MobileOldPrescriptionEntryScreen() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<any>(null);

  // Form states
  const [regId, setRegId] = useState("");
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idStatus, setIdStatus] = useState<"IDLE" | "EXISTS" | "NEW">("IDLE");
  const [existingPatient, setExistingPatient] = useState<any>(null);

  const [phone, setPhone] = useState("");
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([]);
  const [patientName, setPatientName] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Prescription Scans
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
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

  // 1. Auto-Capitalize MRN on typing
  const handleRegIdChange = (text: string) => {
    const upper = text.toUpperCase().replace(/\s+/g, "");
    setRegId(upper);
    setIdStatus("IDLE");
    setExistingPatient(null);
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

  const handleGenerateId = async () => {
    try {
      setIsCheckingId(true);
      const branchName = activeBranch?.name || activeBranch?.branch || "KPB";
      const res = await apiFetch<any>(`/patients/generate-id?branch=${encodeURIComponent(branchName)}`);
      if (res.success && res.registrationId) {
        setRegId(res.registrationId.toUpperCase());
        setIdStatus("NEW");
        setExistingPatient(null);
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
  };

  // 2. Mobile Number & Family Profiles
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

  // 3. Capture / Upload Prescription Scan (Compressed)
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
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.65, // Compressed quality
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Gallery permission is needed to select prescriptions.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.65, // Compressed quality
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
  };

  // 4. Save Record to Database
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
          visitDate,
          doctorName: "Dr. Prashanth K Vaidya",
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
          `Old record for ${savedName} (${savedId}) saved into database!`,
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
                setUploadedImages([]);
                setIdStatus("IDLE");
                setExistingPatient(null);
                setFamilyProfiles([]);
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

  const branchTitle = activeBranch?.name || activeBranch?.branch || "Clinic Branch";

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
        {/* MRN ID CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.fieldLabel}>PATIENT MRN / ID *</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                style={styles.smallOutlineBtn}
                onPress={handleVerifyId}
                disabled={isCheckingId || !regId.trim()}
              >
                <Text style={styles.smallOutlineBtnText}>{isCheckingId ? "..." : "Verify"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallFillBtn}
                onPress={handleGenerateId}
                disabled={isCheckingId}
              >
                <Ionicons name="sparkles" size={11} color="#ffffff" style={{ marginRight: 3 }} />
                <Text style={styles.smallFillBtnText}>Generate ID</Text>
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

          {/* Existence Status */}
          {idStatus === "EXISTS" && existingPatient && (
            <View style={styles.existsCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.existsTitle}>Existing Patient Found:</Text>
                <Text style={styles.existsSub}>{existingPatient.name} • {existingPatient.phone}</Text>
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
              <Text style={styles.newBadgeText}>✓ ID available. Will create new patient.</Text>
            </View>
          )}
        </View>

        {/* MOBILE & FAMILY PROFILES CARD */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>MOBILE PHONE NUMBER *</Text>
          <View style={styles.phoneInputRow}>
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
              <Text style={styles.familyTitle}>Profiles with this phone number:</Text>
              <View style={styles.familyPillsRow}>
                {familyProfiles.map((prof) => (
                  <TouchableOpacity
                    key={prof.regId}
                    style={styles.familyPill}
                    onPress={() => applyExistingPatient(prof)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.familyPillText}>{prof.name}</Text>
                    <Text style={styles.familyPillSub}>({prof.regId})</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* PATIENT NAME CARD */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>PATIENT FULL NAME *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh Chandra"
            placeholderTextColor={COLORS.textMuted}
            value={patientName}
            onChangeText={setPatientName}
          />
        </View>

        {/* VISIT DATE CARD */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>DATE OF VISIT (PRESCRIPTION DATE) *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (e.g. 2022-04-15)"
            placeholderTextColor={COLORS.textMuted}
            value={visitDate}
            onChangeText={setVisitDate}
          />
          <View style={styles.quickDateRow}>
            <TouchableOpacity
              style={styles.quickDatePill}
              onPress={() => setVisitDate(new Date().toISOString().slice(0, 10))}
            >
              <Text style={styles.quickDateText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDatePill}
              onPress={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setVisitDate(y.toISOString().slice(0, 10));
              }}
            >
              <Text style={styles.quickDateText}>Yesterday</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* UPLOAD PRESCRIPTION SCANS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.fieldLabel}>PRESCRIPTION SCANS (AWS S3)</Text>
              <Text style={styles.fieldSub}>Compressed photos saved permanently</Text>
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

          {uploadedImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {uploadedImages.map((uri, idx) => (
                <View key={idx} style={styles.scanThumbCard}>
                  <Image source={{ uri }} style={styles.scanThumbImg} resizeMode="cover" />
                  <View style={styles.scanPageBadge}>
                    <Text style={styles.scanPageBadgeText}>Page {idx + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.scanDeleteBtn}
                    onPress={() => handleRemoveImage(idx)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyScansBox}>
              <Ionicons name="images-outline" size={28} color="#cbd5e1" />
              <Text style={styles.emptyScansText}>No prescription images attached yet</Text>
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
    fontFamily: "monospace",
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
  existsTitle: { fontSize: 11, fontWeight: "800", color: "#92400e" },
  existsSub: { fontSize: 10.5, color: "#b45309", marginTop: 1 },
  useProfileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
  },
  familyPillText: { fontSize: 11, fontWeight: "700", color: COLORS.textDark },
  familyPillSub: { fontSize: 9.5, color: COLORS.primary, fontWeight: "800" },

  quickDateRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  quickDatePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  quickDateText: { fontSize: 11, fontWeight: "700", color: COLORS.textDark },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  uploadBtnText: { fontSize: 11, fontWeight: "800", color: COLORS.white },

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
  emptyScansText: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

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
});

