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
  Modal,
  Linking,
  Share,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch } from "../../services/auth";
import { Image as ExpoImage } from "expo-image";
import { DrawingCanvasModal } from "./DrawingCanvasModal";
import { PrescriptionViewerModal } from "./PrescriptionViewerModal";
import { AppointmentPaymentModal } from "../payment/AppointmentPaymentModal";
import { MobileDietPlanView } from "./MobileDietPlanView";
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

export const POPULAR_HOMEOPATHY_REMEDIES = [
  "Aconite Napellus",
  "Allium Cepa",
  "Antimonium Tart",
  "Apis Mellifica",
  "Arnica Montana",
  "Arsenicum Album",
  "Belladonna",
  "Bryonia Alba",
  "Calcarea Carbonica",
  "Calcarea Fluorica",
  "Calcarea Phosphorica",
  "Carbo Vegetabilis",
  "Causticum",
  "Chamomilla",
  "China Officinalis",
  "Drosera",
  "Dulcamara",
  "Ferrum Phosphoricum",
  "Gelsemium",
  "Hepar Sulphuris",
  "Hypericum Perforatum",
  "Ignatia Amara",
  "Ipecacuanha",
  "Kali Bichromicum",
  "Lachesis Mutus",
  "Ledum Palustre",
  "Lycopodium Clavatum",
  "Magnesia Phosphorica",
  "Mercurius Solubilis",
  "Natrum Muriaticum",
  "Natrum Sulphuricum",
  "Nux Vomica",
  "Phosphorus",
  "Plumbum Metallicum",
  "Pulsatilla Nigricans",
  "Rhus Toxicodendron",
  "Ruta Graveolens",
  "Sepia Officinalis",
  "Silicea",
  "Spongia Tosta",
  "Staphysagria",
  "Sulphur",
  "Symphytum",
  "Thuja Occidentalis",
];

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
    visitBadge: "New",
  });

  // Active Tab: clinical | diet | media | package
  const [activeTab, setActiveTab] = useState<"clinical" | "diet" | "media" | "package">("clinical");

  // Form Fields & Prescriptions
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [prescriptionText, setPrescriptionText] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Package Registration Modal State
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageDurationMonths, setPackageDurationMonths] = useState<number>(0);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const [packageTotalAmount, setPackageTotalAmount] = useState<string>("");
  const [isRegisteringPackage, setIsRegisteringPackage] = useState(false);

  // Fee Collection Modal State (Immediate payment for Reception)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentAppt, setSelectedPaymentAppt] = useState<any>(null);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  // Shared Media Integration
  const [attachedSharedLinks, setAttachedSharedLinks] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [isSharedMediaPickerOpen, setIsSharedMediaPickerOpen] = useState(false);
  const [sharedFolders, setSharedFolders] = useState<any[]>([]);
  const [loadingSharedFolders, setLoadingSharedFolders] = useState(false);
  const [selectedSharedLinksMap, setSelectedSharedLinksMap] = useState<Record<string, { id: string; name: string; url: string }>>({});

  const [followUpInterval, setFollowUpInterval] = useState<"No Follow-up" | "1 Month" | "2 Months" | "3 Months" | "4 Months" | "Custom Date" | string>("No Follow-up");
  const [followUpDate, setFollowUpDate] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [dietPlan, setDietPlan] = useState("");
  const [dietPlanFee, setDietPlanFee] = useState<number>(0);

  // Calendar Modal State
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

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
  const loadPatientFile = () => {
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
            visitBadge: pf.visitBadge || (pf.hasPackage ? "In-Dur" : pf.isReback ? "Revisit" : "New"),
            activePackage: pf.activePackage || null,
            pendingBalance: pf.pendingBalance || pf.payLaterBalance || 0,
            status: pf.status || "WAITING",
          });

          // Also check live pending balance by phone
          const cleanPhone = (pf.phone || initialPhone || "").replace(/\D/g, "").slice(-10);
          if (cleanPhone) {
            apiFetch<any>(`/pay-later?phone=${cleanPhone}`)
              .then((plData) => {
                if (plData && plData.success && typeof plData.pendingTotal === "number" && plData.pendingTotal > 0) {
                  setPatientData((prev: any) => ({ ...prev, pendingBalance: plData.pendingTotal }));
                }
              })
              .catch(() => {});
          }

          if (pf.prescriptionImages) setUploadedImages(pf.prescriptionImages);
          if (pf.sharedMediaLinks && Array.isArray(pf.sharedMediaLinks)) setAttachedSharedLinks(pf.sharedMediaLinks);
          if (pf.prescriptionText) setPrescriptionText(pf.prescriptionText);
          if (pf.followUpInterval) setFollowUpInterval(pf.followUpInterval);
          if (pf.followUpDate || pf.activeFollowUpDate) setFollowUpDate(pf.followUpDate || pf.activeFollowUpDate);
          if (pf.consultationFee) setConsultationFee(String(pf.consultationFee));
          if (pf.dietPlan) setDietPlan(pf.dietPlan);
          const hasLoadedDiet = Boolean(pf.dietPlan && String(pf.dietPlan).trim().length > 0);
          if (hasLoadedDiet) {
            if (pf.dietPlanFee) setDietPlanFee(Number(pf.dietPlanFee));
            else if (pf.dietFee) setDietPlanFee(Number(pf.dietFee));
            else setDietPlanFee(500);
          } else {
            setDietPlanFee(0);
          }
          if (pf.history) setPatientHistory(pf.history);
          if (pf.totalPaid) setTotalPaid(pf.totalPaid);
        }
      })
      .catch((err) => console.error("Error loading patient file:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadPatientFile();
  }, [appointmentId]);

  const isPackageActive = Boolean(
    patientData.hasPackage &&
    patientData.activePackage &&
    patientData.activePackage.status === "ACTIVE" &&
    (!patientData.activePackage.endDate || new Date(patientData.activePackage.endDate).getTime() >= new Date().setHours(0, 0, 0, 0))
  );

  const isCompleted = (patientData.status || "").toUpperCase() === "COMPLETED";

  // Register Package Handler
  const handleRegisterPackage = async () => {
    if (isPackageActive) {
      Alert.alert(
        "Active Package",
        `Patient already has an active package (${patientData.activePackage.packageName}) valid till ${patientData.activePackage.endDate}. A new package cannot be added until the current package expires.`
      );
      return;
    }
    if (!patientData.patientName || !patientData.phone) return;
    if (!packageDurationMonths || packageDurationMonths <= 0) {
      Alert.alert("Required", "Please select a package duration (1 to 6 Months).");
      return;
    }
    const total = parseFloat(packageTotalAmount) || 0;
    if (total <= 0) {
      Alert.alert("Required", "Please enter a valid total package amount.");
      return;
    }
    setIsRegisteringPackage(true);
    try {
      const res = await apiFetch<any>("/package-members", {
        method: "POST",
        body: JSON.stringify({
          action: "register",
          registrationId: patientData.registrationId,
          patientName: patientData.patientName,
          phone: patientData.phone,
          branch: patientData.branch,
          durationMonths: packageDurationMonths,
          totalAmount: total,
          initialPaidAmount: 0,
          appointmentId,
        }),
      });
      if (res.success && res.member) {
        setPatientData((prev: any) => ({
          ...prev,
          hasPackage: true,
          packageName: res.member.packageName,
          activePackage: res.member,
        }));
        setIsPackageModalOpen(false);
        setPackageTotalAmount("");
        setPackageDurationMonths(0);
        loadPatientFile();
        Alert.alert("Success", res.message || "Package registered successfully!");
      } else {
        Alert.alert("Error", res.error || "Failed to register package");
      }
    } catch (err: any) {
      Alert.alert("Error", "Error registering package: " + err.message);
    } finally {
      setIsRegisteringPackage(false);
    }
  };

  // Follow-up Interval calculation (1 Month, 2 Months, 3 Months, 4 Months, Custom Date)
  const handleSelectInterval = (
    interval: "No Follow-up" | "1 Month" | "2 Months" | "3 Months" | "4 Months" | "Custom Date"
  ) => {
    setFollowUpInterval(interval);
    if (interval === "No Follow-up") {
      setFollowUpDate("");
      return;
    }
    if (interval === "Custom Date") {
      setIsCalendarModalOpen(true);
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

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
  };

  const renderCalendarDays = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const [fDay, fMonth, fYear] = (followUpDate || "").split("-").map(Number);

    for (let d = 1; d <= totalDays; d++) {
      const isToday = isCurrentMonth && today.getDate() === d;
      const isSelected = fYear === year && fMonth === month + 1 && fDay === d;

      days.push(
        <TouchableOpacity
          key={`day-${d}`}
          style={[
            styles.calendarDayCell,
            isToday && !isSelected && styles.calendarDayCellToday,
            isSelected && styles.calendarDayCellActive,
          ]}
          onPress={() => {
            const dayStr = String(d).padStart(2, "0");
            const monthStr = String(month + 1).padStart(2, "0");
            const pickedDate = `${dayStr}-${monthStr}-${year}`;
            setFollowUpDate(pickedDate);
            setFollowUpInterval(pickedDate);
            setIsCalendarModalOpen(false);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.calendarDayText,
              isToday && !isSelected && styles.calendarDayTextToday,
              isSelected && styles.calendarDayTextActive,
            ]}
          >
            {d}
          </Text>
        </TouchableOpacity>
      );
    }
    return days;
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
        allowsEditing: false,
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
        allowsEditing: false,
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

  // Shared Media Picker & Link Handlers
  const openSharedMediaPicker = async () => {
    setIsSharedMediaPickerOpen(true);
    setLoadingSharedFolders(true);
    try {
      const res = await apiFetch<any>("/shared-media");
      if (res && res.success && Array.isArray(res.folders)) {
        setSharedFolders(res.folders);
      }
    } catch (err) {
      console.error("Failed to fetch shared media folders:", err);
    } finally {
      setLoadingSharedFolders(false);
    }
  };

  const toggleSelectSharedLink = (link: { id: string; name: string; url: string }) => {
    setSelectedSharedLinksMap((prev) => {
      const copy = { ...prev };
      if (copy[link.id]) {
        delete copy[link.id];
      } else {
        copy[link.id] = link;
      }
      return copy;
    });
  };

  const handleAttachSelectedSharedMedia = () => {
    const selectedList = Object.values(selectedSharedLinksMap);
    if (selectedList.length === 0) {
      setIsSharedMediaPickerOpen(false);
      return;
    }

    setAttachedSharedLinks((prev) => {
      const existingIds = new Set(prev.map((l) => l.id || l.url));
      const newItems = selectedList.filter((s) => !existingIds.has(s.id) && !existingIds.has(s.url));
      return [...prev, ...newItems];
    });

    setSelectedSharedLinksMap({});
    setIsSharedMediaPickerOpen(false);
  };

  const handleRemoveAttachedLink = (index: number) => {
    setAttachedSharedLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // Send to Reception & Collect Fee (Core CTA)
  const handleSendToReception = async () => {
    setIsSubmitting(true);
    try {
      const targetId = appointmentId || "temp-appt-id";
      const hasDiet = Boolean(dietPlan && dietPlan.trim().length > 0);
      const effectiveDietFee = hasDiet ? (Number(dietPlanFee) || 0) : 0;
      const effectiveInterval =
        (!followUpInterval || followUpInterval === "Custom Date" || (followUpInterval === "No Follow-up" && followUpDate))
          ? (followUpDate || "1 Month")
          : followUpInterval;
      const payload = {
        id: targetId,
        prescriptionImages: uploadedImages,
        sharedMediaLinks: attachedSharedLinks,
        prescriptionText,
        followUpInterval: effectiveInterval,
        followUpDate,
        consultationFee: parseFloat(consultationFee) || 0,
        dietPlan: hasDiet ? dietPlan : "",
        dietPlanFee: effectiveDietFee,
        sendToReception: true,
      };

      const res = await apiFetch<any>("/patient-file", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        if (role === "RECEPTION") {
          // Reception clicked Send to Reception / Save & Collect Fee:
          // Immediately open the fee payment modal right in Patient File
          setSelectedPaymentAppt({
            id: targetId,
            patientName: patientData.patientName,
            phoneNumber: patientData.phone,
            phone: patientData.phone,
            registrationId: patientData.registrationId,
            patientId: patientData.registrationId,
            doctorName: patientData.doctorName || "Dr. Prashanth K Vaidya",
            branch: patientData.branch,
            appointmentDate: patientData.appointmentDate || new Date().toISOString().split("T")[0],
            timeSlot: patientData.timeSlot || "02:30 PM",
            consultationFee: parseFloat(consultationFee) || 0,
            dietPlan: hasDiet ? dietPlan : "",
            dietPlanFee: effectiveDietFee,
            dietFee: effectiveDietFee,
            prescriptionImages: uploadedImages,
            hasPackage: patientData.hasPackage,
            packageName: patientData.packageName || patientData.activePackage?.packageName,
            packageTotalAmount: patientData.activePackage?.totalAmount,
            packagePaidAmount: patientData.activePackage?.paidAmount,
            packagePendingAmount: patientData.activePackage?.pendingAmount,
            packageDurationMonths: patientData.activePackage?.durationMonths,
            packageEndDate: patientData.activePackage?.endDate,
            activePackage: patientData.activePackage,
            status: "COLLECT_FEE",
          });
          setIsPaymentModalOpen(true);
        } else {
          // Doctor clicked Send to Reception:
          // Prescription and notes auto-sent to Reception, doctor work is completely over
          Alert.alert(
            "Sent to Reception",
            `Consultation finished for ${patientData.patientName}!\nPrescription & notes sent to Reception.`,
            [
              {
                text: "OK",
                onPress: () => handleBack(),
              },
            ]
          );
        }
      } else {
        Alert.alert("Error", res.error || "Failed to update patient file.");
      }
    } catch (err: any) {
      Alert.alert("Error", "Error saving patient file.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDietPlan = async (
    updatedPlan: string,
    updatedFee: number,
    sendToReception = false
  ) => {
    setDietPlan(updatedPlan);
    setDietPlanFee(updatedFee);
    setIsSubmitting(true);
    try {
      const targetId = appointmentId || "temp-appt-id";
      const effectiveInterval =
        (!followUpInterval || followUpInterval === "Custom Date" || (followUpInterval === "No Follow-up" && followUpDate))
          ? (followUpDate || "1 Month")
          : followUpInterval;
      const payload = {
        id: targetId,
        prescriptionImages: uploadedImages,
        sharedMediaLinks: attachedSharedLinks,
        prescriptionText,
        followUpInterval: effectiveInterval,
        followUpDate,
        consultationFee: parseFloat(consultationFee) || 0,
        dietPlan: updatedPlan,
        dietPlanFee: updatedFee,
        sendToReception,
      };

      const res = await apiFetch<any>("/patient-file", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        if (sendToReception) {
          if (role === "RECEPTION") {
            setSelectedPaymentAppt({
              id: targetId,
              patientName: patientData.patientName,
              phoneNumber: patientData.phone,
              phone: patientData.phone,
              registrationId: patientData.registrationId,
              patientId: patientData.registrationId,
              doctorName: patientData.doctorName || "Dr. Prashanth K Vaidya",
              branch: patientData.branch,
              appointmentDate: patientData.appointmentDate || new Date().toISOString().split("T")[0],
              timeSlot: patientData.timeSlot || "02:30 PM",
              consultationFee: parseFloat(consultationFee) || 0,
              dietPlanFee: updatedFee,
              dietFee: updatedFee,
              prescriptionImages: uploadedImages,
              hasPackage: patientData.hasPackage,
              packageName: patientData.packageName || patientData.activePackage?.packageName,
              packageTotalAmount: patientData.activePackage?.totalAmount,
              packagePaidAmount: patientData.activePackage?.paidAmount,
              packagePendingAmount: patientData.activePackage?.pendingAmount,
              packageDurationMonths: patientData.activePackage?.durationMonths,
              packageEndDate: patientData.activePackage?.endDate,
              activePackage: patientData.activePackage,
              status: "COLLECT_FEE",
            });
            setIsPaymentModalOpen(true);
          } else {
            Alert.alert(
              "Dispatched to Reception",
              `Diet Plan & Fee (₹${updatedFee}) saved and dispatched to Reception for ${patientData.patientName}!`,
              [{ text: "OK", onPress: () => handleBack() }]
            );
          }
        } else {
          Alert.alert("Success", "Diet Plan and Fee saved successfully!");
        }
      } else {
        Alert.alert("Error", res.error || "Failed to save Diet Plan.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save diet plan.");
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

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {role === "RECEPTION" ? (
            <TouchableOpacity
              style={{
                backgroundColor: "#f59e0b",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
              onPress={handleSendToReception}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Ionicons name="card" size={13} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 11 }}>
                {isSubmitting ? "..." : "Collect Fee"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: "#0284c7",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
              onPress={handleSendToReception}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Ionicons name="paper-plane" size={13} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 11 }}>
                {isSubmitting ? "..." : "Send"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {(patientData.patientName || "P").slice(0, 1).toUpperCase()}
            </Text>
          </View>
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {patientData.visitBadge === "In-Dur" ? (
                    <View style={[styles.durationPill, { backgroundColor: "#e0f2fe", borderColor: "#7dd3fc" }]}>
                      <Ionicons name="time" size={10} color="#0284c7" />
                      <Text style={[styles.durationPillText, { color: "#0284c7" }]}>IN-DUR</Text>
                    </View>
                  ) : patientData.visitBadge === "Revisit" ? (
                    <View style={[styles.durationPill, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
                      <Ionicons name="repeat" size={10} color="#d97706" />
                      <Text style={[styles.durationPillText, { color: "#d97706" }]}>REVISIT</Text>
                    </View>
                  ) : (
                    <View style={[styles.durationPill, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
                      <Ionicons name="sparkles" size={10} color="#16a34a" />
                      <Text style={[styles.durationPillText, { color: "#16a34a" }]}>NEW</Text>
                    </View>
                  )}
                  {patientData.hasPackage && (
                    <View style={[styles.durationPill, { backgroundColor: "#f59e0b", borderColor: "#d97706" }]}>
                      <Ionicons name="cube" size={10} color="#ffffff" />
                      <Text style={[styles.durationPillText, { color: "#ffffff", fontWeight: "900" }]}>PKG</Text>
                    </View>
                  )}
                  {Number(patientData.pendingBalance) > 0 && (
                    <View style={[styles.durationPill, { backgroundColor: "#ea580c", borderColor: "#c2410c" }]}>
                      <Text style={[styles.durationPillText, { color: "#ffffff", fontWeight: "900" }]}>
                        DUE: ₹{Number(patientData.pendingBalance).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.metaInfoList}>
                {Number(patientData.pendingBalance) > 0 && (
                  <View style={[styles.metaRow, { backgroundColor: "#fff7ed", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#fed7aa", marginBottom: 4 }]}>
                    <Text style={styles.metaIcon}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.metaText, { color: "#c2410c", fontWeight: "800" }]}>
                        Pending Due: ₹{Number(patientData.pendingBalance).toLocaleString()} (Pay Later)
                      </Text>
                      <Text style={{ fontSize: 9.5, color: "#ea580c" }}>
                        Can be settled or added in Collect Fee
                      </Text>
                    </View>
                  </View>
                )}
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
              {patientData.hasPackage && patientData.activePackage ? (
                <View style={styles.packageActiveCard}>
                  <View style={styles.packageActiveHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={styles.packageActiveBadge}>
                        <Text style={styles.packageActiveBadgeText}>PKG ACTIVE</Text>
                      </View>
                      <Text style={styles.packageActiveTitle}>
                        {patientData.activePackage.packageName || `${patientData.activePackage.durationMonths || 3} Mos Package`}
                      </Text>
                    </View>
                    <Text style={styles.packageActiveExpiry}>
                      Till: {patientData.activePackage.endDate || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.packageStatsRow}>
                    <View style={styles.packageStatBox}>
                      <Text style={styles.packageStatLabel}>TOTAL</Text>
                      <Text style={styles.packageStatVal}>₹{(patientData.activePackage.totalAmount || 0).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.packageStatBox, { borderColor: "#bbf7d0" }]}>
                      <Text style={[styles.packageStatLabel, { color: "#16a34a" }]}>PAID</Text>
                      <Text style={[styles.packageStatVal, { color: "#16a34a" }]}>₹{(patientData.activePackage.paidAmount || 0).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.packageStatBox, { borderColor: "#fde68a" }]}>
                      <Text style={[styles.packageStatLabel, { color: "#d97706" }]}>PENDING</Text>
                      <Text style={[styles.packageStatVal, { color: "#d97706" }]}>₹{(patientData.activePackage.pendingAmount || 0).toLocaleString()}</Text>
                    </View>
                  </View>

                  {patientData.activePackage.payments && patientData.activePackage.payments.length > 0 && (
                    <View style={styles.packageHistoryBox}>
                      <Text style={styles.packageHistoryTitle}>Payment Installments History:</Text>
                      {patientData.activePackage.payments.map((p: any, idx: number) => {
                        const d = new Date(p.paidAt);
                        const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN") : p.paidAt;
                        const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                        return (
                          <View key={idx} style={styles.packageHistoryRow}>
                            <Text style={styles.packageHistoryText}>
                              {dateStr} {timeStr} • {p.paymentMethod || "CASH"}
                            </Text>
                            <Text style={styles.packageHistoryAmount}>+₹{(p.amount || 0).toLocaleString()}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.packageSubBox}>
                  <Text style={styles.packageSubText}>No active package.</Text>
                  <TouchableOpacity
                    style={styles.registerPkgBtn}
                    onPress={() => setIsPackageModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.registerPkgBtnText}>+ Register Patient in Package</Text>
                  </TouchableOpacity>
                </View>
              )}
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

              {isPackageActive ? (
                <View style={[styles.tabChip, { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" }]}>
                  <Text style={[styles.tabChipText, { color: "#94a3b8" }]}>
                    Package Active (Till {patientData.activePackage?.endDate || ""})
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.tabChip, activeTab === "package" && styles.tabChipActive]}
                  onPress={() => setIsPackageModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabChipText, activeTab === "package" && styles.tabChipTextActive]}>
                    {patientData.hasPackage ? "Renew Expired Package" : "Register Package"}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* TAB CONTENT: DIET PLAN */}
            {activeTab === "diet" && (
              <MobileDietPlanView
                patientData={patientData}
                initialDietPlan={dietPlan}
                initialDietFee={dietPlanFee}
                onSavePlan={handleSaveDietPlan}
                isSaving={isSubmitting}
              />
            )}

            {/* TAB CONTENT: SHARE MEDIA */}
            {activeTab === "media" && (
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.sectionCardTitle}>Share Media / Patient Reports</Text>
                  <Text style={[styles.fieldLabel, { marginTop: 0 }]}>
                    {uploadedImages.length} files • {attachedSharedLinks.length} links
                  </Text>
                </View>
                <Text style={styles.fieldLabel}>Lab reports, x-rays, diet guidelines, or case photographs</Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <TouchableOpacity style={styles.uploadWhiteBtn} onPress={handlePickImage} activeOpacity={0.7}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#0284c7" />
                    <Text style={styles.uploadWhiteBtnText}>Upload File</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.uploadWhiteBtn} onPress={handleCameraCapture} activeOpacity={0.7}>
                    <Ionicons name="camera-outline" size={16} color="#0284c7" />
                    <Text style={styles.uploadWhiteBtnText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadWhiteBtn, { backgroundColor: "#e0f2fe", borderColor: "#bae6fd" }]}
                    onPress={openSharedMediaPicker}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="folder-open-outline" size={16} color="#0369a1" />
                    <Text style={[styles.uploadWhiteBtnText, { color: "#0369a1" }]}>+ From Shared Media</Text>
                  </TouchableOpacity>
                </View>

                {/* Uploaded Images Gallery */}
                {uploadedImages.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#334155", marginBottom: 6 }}>
                      Attached Photos &amp; Documents ({uploadedImages.length})
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close-circle" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Attached Shared Links */}
                {attachedSharedLinks.length > 0 && (
                  <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#334155" }}>
                        Attached Shared Links ({attachedSharedLinks.length})
                      </Text>
                      <TouchableOpacity onPress={openSharedMediaPicker}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#0284c7" }}>+ Add More</Text>
                      </TouchableOpacity>
                    </View>

                    {attachedSharedLinks.map((item, idx) => (
                      <View
                        key={item.id || idx}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: 10,
                          backgroundColor: "#f8fafc",
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                          marginBottom: 6,
                        }}
                      >
                        <TouchableOpacity
                          style={{ flex: 1, marginRight: 8 }}
                          onPress={async () => {
                            if (item.url) {
                              try {
                                await Linking.openURL(item.url);
                              } catch {}
                            }
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#0f172a" }} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#0284c7", marginTop: 2 }} numberOfLines={1}>
                            {item.url}
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <TouchableOpacity
                            style={{ padding: 6, borderRadius: 6, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0" }}
                            onPress={() => {
                              Share.share({ title: item.name, message: `${item.name}\n${item.url}` });
                            }}
                          >
                            <Ionicons name="share-outline" size={14} color="#64748b" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{ padding: 6, borderRadius: 6, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0" }}
                            onPress={() => handleRemoveAttachedLink(idx)}
                          >
                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* TAB CONTENT: CLINICAL FORM */}
            {activeTab === "clinical" && (
              <>
                {isCompleted && (
                  <View style={styles.completedNoticeBanner}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      <Ionicons name="lock-closed" size={18} color="#15803d" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.completedNoticeTitle}>Consultation Completed &amp; Locked</Text>
                        <Text style={styles.completedNoticeSub}>
                          Payment has been finalized. Clinical prescription and billing are locked for this visit.
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.completedViewHistoryBtn}
                      onPress={() => {
                        const regId = patientData.registrationId || "SPH-GEN";
                        const name = encodeURIComponent(patientData.patientName || "");
                        const phone = encodeURIComponent((patientData.phone || "").replace(/\D/g, "").slice(-10));
                        const branch = encodeURIComponent(patientData.branch || "Clinic");
                        const route = role === "DOCTOR" ? "/(doctor)/patient-history" : "/(reception)/patient-history";
                        router.push(`${route}?id=${regId}&name=${name}&phone=${phone}&branch=${branch}` as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.completedViewHistoryBtnText}>View History</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {dietPlan ? (
                  <View style={[styles.sectionCard, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 20 }}>🥗</Text>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: "800", color: "#14532d" }}>
                            Diet Plan Attached (₹{dietPlanFee})
                          </Text>
                          <Text style={{ fontSize: 11, color: "#166534" }}>
                            30-day regimen configured for Reception
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={{ backgroundColor: "#16a34a", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                        onPress={() => setActiveTab("diet")}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>View / Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* 4. Digital Prescription Section Card */}
                <View style={styles.sectionCard}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={styles.sectionCardTitle}>Digital Prescription</Text>
                {uploadedImages.length > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: "#e0f2fe", marginLeft: "auto" }]}>
                    <Text style={[styles.countBadgeText, { color: "#0284c7" }]}>{uploadedImages.length} attached</Text>
                  </View>
                )}
              </View>

              {/* Radio selection & Open Pad Button (Disabled when completed) */}
              {!isCompleted && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: 10, backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {/* Radio 1: Digital Pad - ON means open pad */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                    onPress={() => setIsDrawingModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#0284c7", alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0284c7" }} />
                    </View>
                    <Ionicons name="pencil" size={13} color="#0284c7" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#0f172a" }}>Digital Pad</Text>
                  </TouchableOpacity>

                  {/* Radio 2: Upload Photo */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#94a3b8" }} />
                    <Ionicons name="cloud-upload-outline" size={13} color="#64748b" />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569" }}>Upload</Text>
                  </TouchableOpacity>

                  {/* Radio 3: Camera */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                    onPress={handleCameraCapture}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#94a3b8" }} />
                    <Ionicons name="camera-outline" size={13} color="#64748b" />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569" }}>Camera</Text>
                  </TouchableOpacity>
                </View>

                {/* Open Pad Button */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0284c7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                  onPress={() => setIsDrawingModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil" size={12} color="#ffffff" />
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#ffffff" }}>Open Pad</Text>
                </TouchableOpacity>
              </View>
              )}

              {/* Uploaded / Drawn Prescriptions Thumbnails */}
              {uploadedImages.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.previewGallery, { marginTop: 8 }]}>
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
                      {!isCompleted && (
                        <TouchableOpacity
                          style={styles.removeImgBtn}
                          onPress={() => handleRemoveImage(idx)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="close" size={11} color="#ffffff" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  No prescription attached yet. Tap &quot;Digital Pad&quot; or &quot;Open Pad&quot; to draw.
                </Text>
              )}

              {/* Prescription Remedies & Text Instructions */}
              <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
                <View style={{ marginBottom: 6 }}>
                  <Text style={styles.fieldLabel}>Prescription Remedies & Notes</Text>
                </View>
                <TextInput
                  style={[styles.textInputArea, { minHeight: 140, height: 140, textAlignVertical: "top", fontSize: 12.5, lineHeight: 18 }]}
                  multiline
                  placeholder="Type remedies, dosage, and instructions here..."
                  placeholderTextColor="#94a3b8"
                  value={prescriptionText}
                  onChangeText={setPrescriptionText}
                />
              </View>
            </View>

            {/* 5. Follow-up Recommendation Section (Matching Screenshot) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Follow-up Recommendation</Text>
              <Text style={styles.fieldLabel}>Follow-up Interval</Text>

              {/* Interval Chips Row (1 Month, 2 Months, 3 Months, 4 Months, Custom Date) */}
              <View style={styles.intervalsRow}>
                {(["No Follow-up", "1 Month", "2 Months", "3 Months", "4 Months", "Custom Date"] as const).map((interval) => (
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
              <TouchableOpacity
                style={styles.dateInputWrapper}
                onPress={() => setIsCalendarModalOpen(true)}
                activeOpacity={0.8}
              >
                <TouchableOpacity onPress={() => setIsCalendarModalOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="calendar" size={16} color="#0284c7" />
                </TouchableOpacity>
                <TextInput
                  style={styles.dateInputText}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#94a3b8"
                  value={followUpDate}
                  onChangeText={(val) => {
                    setFollowUpDate(val);
                    if (followUpInterval !== "Custom Date") {
                      setFollowUpInterval("Custom Date");
                    }
                  }}
                />
                <TouchableOpacity onPress={() => setIsCalendarModalOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="calendar-outline" size={16} color="#0284c7" />
                </TouchableOpacity>
              </TouchableOpacity>
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
                editable={!isCompleted}
              />

              {/* CORE CTA: Send to Reception & Collect Fee */}
              {isCompleted ? (
                <View style={[styles.sendToReceptionCta, { backgroundColor: "#15803d", opacity: 0.95, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }]}>
                  <Ionicons name="checkmark-done-circle" size={17} color="#ffffff" />
                  <Text style={styles.sendToReceptionText}>Consultation Completed &amp; Locked</Text>
                </View>
              ) : (
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
                        ? "Save & Collect Fee"
                        : "Send to Reception"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

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
                    Prescriptions ({patientHistory.filter((h) => h.prescriptionImages && h.prescriptionImages.length > 0).length})
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
                    Payments ({patientHistory.filter((h) => h.isFeeCollected || (typeof h.totalPaid === "number" && h.totalPaid > 0) || (typeof h.totalAmountDue === "number" && h.totalAmountDue > 0)).length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* History Content */}
              {(() => {
                const items = historyTab === "prescriptions"
                  ? patientHistory.filter((h) => h.prescriptionImages && h.prescriptionImages.length > 0)
                  : historyTab === "payments"
                  ? patientHistory.filter((h) => h.isFeeCollected || (typeof h.totalPaid === "number" && h.totalPaid > 0) || (typeof h.totalAmountDue === "number" && h.totalAmountDue > 0))
                  : patientHistory;

                if (items.length === 0) {
                  return (
                    <View style={styles.historyEmptyBox}>
                      <Ionicons name="document-text-outline" size={30} color="#94a3b8" />
                      <Text style={styles.historyEmptyText}>
                        {historyTab === "prescriptions"
                          ? "No prescription records found for this patient."
                          : historyTab === "payments"
                          ? "No payment records found for this patient."
                          : "No previous visits recorded for this patient."}
                      </Text>
                    </View>
                  );
                }

                if (historyTab === "prescriptions") {
                  return items.map((h, i) => (
                    <View key={h.id || i} style={styles.historyItemCard}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={styles.historyItemDate}>{h.date} {h.timeSlot ? `• ${h.timeSlot}` : ""}</Text>
                        <View style={styles.badgePrescriptionCount}>
                          <Text style={styles.badgePrescriptionText}>{h.prescriptionImages?.length || 0} Images</Text>
                        </View>
                      </View>
                      <Text style={styles.historyItemDoc}>{h.doctorName} • {h.branch}</Text>
                      {h.diagnosisNotes ? (
                        <Text style={styles.historyItemNotes} numberOfLines={2}>
                          Notes: {h.diagnosisNotes}
                        </Text>
                      ) : null}

                      {/* Prescriptions Gallery */}
                      {h.prescriptionImages && h.prescriptionImages.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row" }}>
                            {h.prescriptionImages.map((rxUrl: string, rIdx: number) => (
                              <TouchableOpacity
                                key={rIdx}
                                style={styles.rxThumbCard}
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
                                <View style={styles.rxThumbBadge}>
                                  <Text style={styles.rxThumbBadgeText}>Rx {rIdx + 1}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  ));
                }

                if (historyTab === "payments") {
                  return items.map((h, i) => (
                    <View key={h.id || i} style={[styles.historyItemCard, { borderColor: "#a7f3d0", backgroundColor: "#f0fdf4" }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <Text style={styles.historyItemDate}>{h.date}</Text>
                            {h.invoiceId ? (
                              <View style={styles.invoicePill}>
                                <Text style={styles.invoicePillText}>{h.invoiceId}</Text>
                              </View>
                            ) : null}
                            {h.isCurrent ? (
                              <View style={styles.currentVisitPill}>
                                <Text style={styles.currentVisitPillText}>Current Visit</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={[styles.historyItemDoc, { marginTop: 2 }]}>{h.doctorName} • {h.branch}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 9, color: "#64748b", fontWeight: "600" }}>Total Paid</Text>
                          <Text style={{ fontSize: 15, fontWeight: "900", color: "#16a34a" }}>
                            ₹{h.totalPaid ?? (h.totalAmountDue || h.consultationFee || 0)}
                          </Text>
                        </View>
                      </View>

                      {/* Payment Card Body */}
                      <View style={styles.paymentReceiptBox}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <Text style={{ fontSize: 11, color: "#475569", fontWeight: "600" }}>Payment Mode</Text>
                          <View style={styles.paymentModePill}>
                            <Text style={styles.paymentModeText}>{h.paymentMethod || "CASH"}</Text>
                          </View>
                        </View>

                        <View style={styles.paymentGrid}>
                          <View style={styles.paymentGridCol}>
                            <Text style={styles.paymentGridLabel}>Consultation</Text>
                            <Text style={styles.paymentGridVal}>₹{h.consultationFee || 0}</Text>
                          </View>
                          <View style={styles.paymentGridCol}>
                            <Text style={styles.paymentGridLabel}>Medicine</Text>
                            <Text style={styles.paymentGridVal}>₹{h.medicineFee || 0}</Text>
                          </View>
                          <View style={styles.paymentGridCol}>
                            <Text style={styles.paymentGridLabel}>Discount</Text>
                            <Text style={[styles.paymentGridVal, { color: "#e11d48" }]}>₹{h.discount || 0}</Text>
                          </View>
                          <View style={styles.paymentGridCol}>
                            <Text style={styles.paymentGridLabel}>Total Due</Text>
                            <Text style={styles.paymentGridVal}>₹{h.totalAmountDue || 0}</Text>
                          </View>
                        </View>

                        {h.payLaterAmount > 0 && (
                          <View style={styles.payLaterWarningBox}>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#b45309" }}>Pay Later (Pending):</Text>
                            <Text style={{ fontSize: 11, fontWeight: "900", color: "#b45309" }}>₹{h.payLaterAmount}</Text>
                          </View>
                        )}

                        {h.paidAt ? (
                          <Text style={{ fontSize: 9, color: "#94a3b8", textAlign: "right", marginTop: 4 }}>
                            Paid: {h.paidAt.replace("T", " ").slice(0, 16)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ));
                }

                // Default "all" tab
                return items.map((h, i) => (
                  <View key={h.id || i} style={styles.historyItemCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Text style={styles.historyItemDate}>{h.date}</Text>
                        {h.isCurrent ? (
                          <View style={styles.currentVisitPill}>
                            <Text style={styles.currentVisitPillText}>Current</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.historyItemFee}>₹{h.totalPaid ?? (h.totalAmountDue || h.consultationFee || 0)}</Text>
                        <Text style={[styles.historyStatusPill, h.isFeeCollected ? styles.historyStatusPaid : styles.historyStatusPending]}>
                          {h.isFeeCollected ? "Paid" : h.status || "Pending"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyItemDoc}>{h.doctorName} • {h.branch}</Text>
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
                              style={styles.rxThumbCard}
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
                              <View style={styles.rxThumbBadge}>
                                <Text style={styles.rxThumbBadgeText}>Rx {rIdx + 1}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Financial Summary */}
                    <View style={styles.historyFeeSummaryRow}>
                      <Text style={styles.historyFeeSummaryText}>Consultation: ₹{h.consultationFee || 0}</Text>
                      {h.medicineFee > 0 && (
                        <Text style={styles.historyFeeSummaryText}>Medicine: ₹{h.medicineFee}{h.medicineDuration ? ` (${h.medicineDuration})` : ""}</Text>
                      )}
                      {h.discount > 0 && (
                        <Text style={[styles.historyFeeSummaryText, { color: "#e11d48" }]}>Disc: -₹{h.discount}</Text>
                      )}
                      {h.paymentMethod && (
                        <Text style={styles.historyFeeSummaryText}>Mode: {h.paymentMethod}</Text>
                      )}
                    </View>
                  </View>
                ));
              })()}
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

      {/* CALENDAR PICKER MODAL (FOLLOW-UP DATE) */}
      <Modal
        visible={isCalendarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarModalOpen(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            {/* Header: Month & Year with Navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={handlePrevMonth}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color="#0f172a" />
              </TouchableOpacity>

              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
              </Text>

              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={handleNextMonth}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Days of week header */}
            <View style={styles.calendarDaysOfWeekRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => (
                <Text key={idx} style={styles.calendarDayOfWeekText}>
                  {dayName}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>

            {/* Footer Actions */}
            <View style={styles.calendarActionsRow}>
              <TouchableOpacity
                style={styles.calendarActionBtn}
                onPress={() => {
                  const today = new Date();
                  const d = String(today.getDate()).padStart(2, "0");
                  const m = String(today.getMonth() + 1).padStart(2, "0");
                  const y = today.getFullYear();
                  setFollowUpDate(`${d}-${m}-${y}`);
                  setFollowUpInterval("Custom Date");
                  setIsCalendarModalOpen(false);
                }}
              >
                <Text style={styles.calendarActionText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.calendarActionBtn, styles.calendarActionBtnPrimary]}
                onPress={() => setIsCalendarModalOpen(false)}
              >
                <Text style={[styles.calendarActionText, styles.calendarActionTextPrimary]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL-SCREEN INTERACTIVE PRESCRIPTION VIEWER (SLIDER, ROTATE, ZOOM) */}
      <PrescriptionViewerModal
        visible={isViewerOpen}
        images={uploadedImages.map(resolvePrescriptionImageUrl)}
        initialIndex={viewerInitialIndex}
        onClose={() => setIsViewerOpen(false)}
        onDeleteImage={handleRemoveImage}
      />

      {/* PACKAGE REGISTRATION MODAL */}
      <Modal
        visible={isPackageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPackageModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}
        >
          <View style={{ backgroundColor: "#ffffff", borderRadius: 20, width: "100%", maxWidth: 440, padding: 20, maxHeight: "90%" }}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ backgroundColor: "#e0f2fe", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#0284c7" }}>PKG</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>Register Treatment Package</Text>
                  <Text style={{ fontSize: 11, color: "#64748b" }}>Recurring constitutional care package</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsPackageModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Pre-filled Read-only details */}
              <View style={{ backgroundColor: "#f8fafc", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 14 }}>
                <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 }}>
                  Patient Identity (Read-Only)
                </Text>

                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#475569", marginBottom: 2 }}>Patient Name</Text>
                  <TextInput
                    value={patientData.patientName}
                    editable={false}
                    style={{ backgroundColor: "#e2e8f0", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: "700", color: "#334155" }}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#475569", marginBottom: 2 }}>Mobile Number</Text>
                    <TextInput
                      value={patientData.phone}
                      editable={false}
                      style={{ backgroundColor: "#e2e8f0", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: "700", color: "#334155" }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#475569", marginBottom: 2 }}>Reg ID</Text>
                    <TextInput
                      value={patientData.registrationId}
                      editable={false}
                      style={{ backgroundColor: "#e2e8f0", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: "700", color: "#334155" }}
                    />
                  </View>
                </View>
              </View>

              {/* Package Duration Dropdown Selector */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#0f172a", marginBottom: 6 }}>
                  Package Duration *
                </Text>

                <TouchableOpacity
                  onPress={() => setIsDurationDropdownOpen(!isDurationDropdownOpen)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 1,
                    borderColor: packageDurationMonths > 0 ? "#0284c7" : "#cbd5e1",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: packageDurationMonths > 0 ? "#0f172a" : "#94a3b8" }}>
                    {packageDurationMonths > 0 ? `${packageDurationMonths} Month${packageDurationMonths > 1 ? "s" : ""} Course` : "-- Select Package Duration --"}
                  </Text>
                  <Ionicons name={isDurationDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                </TouchableOpacity>

                {isDurationDropdownOpen && (
                  <View style={{ marginTop: 4, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, backgroundColor: "#ffffff", overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 }}>
                    {[1, 2, 3, 4, 5, 6].map((m) => {
                      const isSelected = packageDurationMonths === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => {
                            setPackageDurationMonths(m);
                            setIsDurationDropdownOpen(false);
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            backgroundColor: isSelected ? "#e0f2fe" : "#ffffff",
                            borderBottomWidth: m === 6 ? 0 : 1,
                            borderBottomColor: "#f1f5f9",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: isSelected ? "800" : "600", color: isSelected ? "#0284c7" : "#334155" }}>
                            {m} Month{m > 1 ? "s" : ""} Course
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#0284c7" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Total Package Amount */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#0f172a", marginBottom: 6 }}>
                  Total Package Amount (₹) *
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 10, backgroundColor: "#ffffff" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#94a3b8", marginRight: 4 }}>₹</Text>
                  <TextInput
                    value={packageTotalAmount}
                    onChangeText={setPackageTotalAmount}
                    keyboardType="numeric"
                    placeholder="Enter total package fee"
                    placeholderTextColor="#94a3b8"
                    style={{ flex: 1, paddingVertical: 8, fontSize: 13, fontWeight: "700", color: "#0f172a" }}
                  />
                </View>
              </View>

              {/* Note about fee collection */}
              <View style={{ backgroundColor: "#f0f9ff", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#bae6fd", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 11, color: "#0369a1" }}>Total Package Amount:</Text>
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#0284c7" }}>
                  ₹{(parseFloat(packageTotalAmount) || 0).toLocaleString()}
                </Text>
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsPackageModalOpen(false)}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#cbd5e1" }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#475569" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRegisterPackage}
                  disabled={isRegisteringPackage}
                  style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: "#0284c7", opacity: isRegisteringPackage ? 0.6 : 1 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#ffffff" }}>
                    {isRegisteringPackage ? "Registering..." : "Confirm & Register"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Appointment Payment Modal (Collect Fee) for Reception */}
      {isPaymentModalOpen && selectedPaymentAppt && (
        <AppointmentPaymentModal
          visible={isPaymentModalOpen}
          appointment={selectedPaymentAppt}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedPaymentAppt(null);
            if (isCompleted || isPaymentCompleted) {
              handleBack();
            } else {
              loadPatientFile();
            }
          }}
          onPaymentSuccess={() => {
            setIsPaymentModalOpen(false);
            setSelectedPaymentAppt(null);
            setIsPaymentCompleted(true);
            handleBack();
          }}
        />
      )}

      {/* SELECT FROM SHARED MEDIA MODAL (MOBILE) */}
      <Modal
        visible={isSharedMediaPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsSharedMediaPickerOpen(false);
          setSelectedSharedLinksMap({});
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}
        >
          <View style={{ backgroundColor: "#ffffff", borderRadius: 20, width: "100%", maxWidth: 440, padding: 18, maxHeight: "85%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 12, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ backgroundColor: "#e0f2fe", width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="folder-open" size={18} color="#0284c7" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>Shared Media Library</Text>
                  <Text style={{ fontSize: 11, color: "#64748b" }}>Attach links to patient file</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsSharedMediaPickerOpen(false);
                  setSelectedSharedLinksMap({});
                }}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {loadingSharedFolders ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#0284c7" />
                  <Text style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>Loading shared folders...</Text>
                </View>
              ) : sharedFolders.length === 0 ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: "#94a3b8" }}>No shared folders found</Text>
                </View>
              ) : (
                sharedFolders.map((folder: any) => {
                  const links = folder.links || [];
                  return (
                    <View key={folder.id} style={{ backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 10, marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="folder" size={16} color="#0284c7" />
                          <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>{folder.name}</Text>
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#64748b" }}>{links.length} links</Text>
                      </View>

                      {links.length === 0 ? (
                        <Text style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginLeft: 22 }}>Empty folder</Text>
                      ) : (
                        links.map((link: any) => {
                          const isSelected = Boolean(selectedSharedLinksMap[link.id]);
                          return (
                            <TouchableOpacity
                              key={link.id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                backgroundColor: isSelected ? "#e0f2fe" : "#ffffff",
                                borderWidth: 1,
                                borderColor: isSelected ? "#38bdf8" : "#cbd5e1",
                                borderRadius: 8,
                                padding: 8,
                                marginTop: 6,
                              }}
                              onPress={() => toggleSelectSharedLink(link)}
                              activeOpacity={0.7}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                                <Ionicons
                                  name={isSelected ? "checkbox" : "square-outline"}
                                  size={18}
                                  color={isSelected ? "#0284c7" : "#94a3b8"}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#0f172a" }} numberOfLines={1}>
                                    {link.name}
                                  </Text>
                                  <Text style={{ fontSize: 10.5, color: "#64748b" }} numberOfLines={1}>
                                    {link.url}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b" }}>
                {Object.keys(selectedSharedLinksMap).length} selected
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#cbd5e1" }}
                  onPress={() => {
                    setIsSharedMediaPickerOpen(false);
                    setSelectedSharedLinksMap({});
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b" }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: "#0284c7",
                    opacity: Object.keys(selectedSharedLinksMap).length === 0 ? 0.5 : 1,
                  }}
                  disabled={Object.keys(selectedSharedLinksMap).length === 0}
                  onPress={handleAttachSelectedSharedMedia}
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#ffffff" }}>Attach</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  completedNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  completedNoticeTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#166534",
  },
  completedNoticeSub: {
    fontSize: 10.5,
    color: "#15803d",
    marginTop: 1,
  },
  completedViewHistoryBtn: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    alignSelf: "center",
  },
  completedViewHistoryBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
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
  packageActiveCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  packageActiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  packageActiveBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  packageActiveBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  packageActiveTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#78350f",
  },
  packageActiveExpiry: {
    fontSize: 10,
    color: "#92400e",
    fontWeight: "600",
  },
  packageStatsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  packageStatBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
  },
  packageStatLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 2,
  },
  packageStatVal: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0f172a",
  },
  packageHistoryBox: {
    borderTopWidth: 1,
    borderTopColor: "rgba(253, 230, 138, 0.7)",
    paddingTop: 6,
  },
  packageHistoryTitle: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#92400e",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  packageHistoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  packageHistoryText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "500",
  },
  packageHistoryAmount: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#16a34a",
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
  rxThumbCard: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    overflow: "hidden",
    marginRight: 6,
    backgroundColor: "#f8fafc",
  },
  rxThumbBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 3,
    borderTopLeftRadius: 4,
  },
  rxThumbBadgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
  },
  badgePrescriptionCount: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  badgePrescriptionText: {
    color: "#0369a1",
    fontSize: 9,
    fontWeight: "700",
  },
  invoicePill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  invoicePillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },
  currentVisitPill: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  currentVisitPillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#0369a1",
  },
  paymentReceiptBox: {
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 8,
    marginTop: 6,
  },
  paymentModePill: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  paymentModeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  paymentGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 6,
  },
  paymentGridCol: {
    flex: 1,
  },
  paymentGridLabel: {
    fontSize: 8.5,
    color: "#94a3b8",
  },
  paymentGridVal: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
    marginTop: 1,
  },
  payLaterWarningBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  historyStatusPill: {
    fontSize: 8.5,
    fontWeight: "700",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 2,
  },
  historyStatusPaid: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    color: "#059669",
  },
  historyStatusPending: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    color: "#d97706",
  },
  historyFeeSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 4,
  },
  historyFeeSummaryText: {
    fontSize: 9.5,
    color: "#64748b",
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calendarModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 340,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarMonthTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaysOfWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 4,
  },
  calendarDayOfWeekText: {
    width: 36,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  calendarDayCellActive: {
    backgroundColor: "#0284c7",
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: "#0284c7",
  },
  calendarDayText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1e293b",
  },
  calendarDayTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  calendarDayTextToday: {
    color: "#0284c7",
    fontWeight: "700",
  },
  calendarActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  calendarActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  calendarActionBtnPrimary: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  calendarActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  calendarActionTextPrimary: {
    color: "#ffffff",
  },
});

