"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FeeCheckoutAndInvoiceModal } from "@/components/payment/FeeCheckoutAndInvoiceModal";
import { DietPlanManager } from "./DietPlanManager";
import {
  ArrowLeft,
  Calendar,
  Upload,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  FileText,
  Clock,
  MapPin,
  Phone,
  Maximize2,
  X,
  CreditCard,
  History,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Trash2,
  PenTool,
  RotateCcw,
  Eraser,
  Plus,
  Send,
  Sparkles,
  Package,
  FolderOpen,
  Link2,
  ExternalLink,
  Copy,
  Check,
  Share2,
} from "lucide-react";

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
    return relativePath;
  }
  if (url.includes(".amazonaws.com/")) {
    return `/api/patient-file/image?url=${encodeURIComponent(url)}`;
  }
  if (url.startsWith("prescriptions/") || url.startsWith("/prescriptions/")) {
    return `/api/patient-file/image?key=${encodeURIComponent(url)}`;
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

interface PatientFileWebViewProps {
  role: "DOCTOR" | "RECEPTION";
  sidebar: React.ReactNode;
}

export default function PatientFileWebView({ role, sidebar }: PatientFileWebViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const appointmentId = searchParams.get("id") || "";
  const initialName = searchParams.get("name") || searchParams.get("patientName") || "Patient";
  const initialPhone = searchParams.get("phone") || searchParams.get("phoneNumber") || "";
  const initialRegId = searchParams.get("registrationId") || searchParams.get("regId") || searchParams.get("patientId") || "SPH-GEN";
  const initialBranch = searchParams.get("branch") || "Spiritual Homeopathy";

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  // Active Tab
  const [activeTab, setActiveTab] = useState<"clinical" | "diet" | "media" | "package">("clinical");

  // Prescriptions & Media
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [prescriptionText, setPrescriptionText] = useState("");
  const [followUpInterval, setFollowUpInterval] = useState<"No Follow-up" | "1 Month" | "2 Months" | "3 Months" | "4 Months" | "Custom Date" | string>("No Follow-up");
  const [followUpDate, setFollowUpDate] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [dietPlan, setDietPlan] = useState("");
  const [dietPlanFee, setDietPlanFee] = useState<number>(0);

  // Shared Media Integration
  const [attachedSharedLinks, setAttachedSharedLinks] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [isSharedMediaPickerOpen, setIsSharedMediaPickerOpen] = useState(false);
  const [sharedFolders, setSharedFolders] = useState<any[]>([]);
  const [loadingSharedFolders, setLoadingSharedFolders] = useState(false);
  const [selectedSharedLinksMap, setSelectedSharedLinksMap] = useState<Record<string, { id: string; name: string; url: string }>>({});
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Save to Shared Media state
  const [isSaveToSharedOpen, setIsSaveToSharedOpen] = useState(false);
  const [imageToSave, setImageToSave] = useState<string | null>(null);
  const [saveToFolderId, setSaveToFolderId] = useState<string>("");
  const [saveLinkName, setSaveLinkName] = useState<string>("");
  const [isSavingToShared, setIsSavingToShared] = useState(false);

  // History
  const [historyTab, setHistoryTab] = useState<"all" | "prescriptions" | "payments">("all");
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);

  // Drawing Canvas State (Web Full Popup)
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState("#1e3a8a");
  const [penWidth, setPenWidth] = useState(3.5);

  // Interactive Prescription Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const touchStartX = useRef<number>(0);

  // Package Registration Modal State
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageDurationMonths, setPackageDurationMonths] = useState<number>(0);
  const [packageTotalAmount, setPackageTotalAmount] = useState<string>("");
  const [isRegisteringPackage, setIsRegisteringPackage] = useState(false);

  // Fee Collection Modal State (Immediate payment for Reception)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentAppt, setSelectedPaymentAppt] = useState<any>(null);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  // Keyboard navigation (< Left Arrow, > Right Arrow, Escape)
  useEffect(() => {
    if (!isViewerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setViewerIndex((idx) => Math.max(0, idx - 1));
        setRotation(0);
        setZoomScale(1);
      } else if (e.key === "ArrowRight") {
        setViewerIndex((idx) => Math.min(uploadedImages.length - 1, idx + 1));
        setRotation(0);
        setZoomScale(1);
      } else if (e.key === "Escape") {
        setIsViewerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isViewerOpen, uploadedImages.length]);

  // Load from API
  const loadPatientFile = () => {
    if (!appointmentId) return;
    setIsLoading(true);
    fetch(`/api/patient-file?id=${encodeURIComponent(appointmentId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.patientFile) {
          const pf = data.patientFile;
          setPatientData({
            patientName: pf.patientName || initialName,
            phone: pf.phone || initialPhone,
            registrationId: pf.registrationId || initialRegId,
            branch: pf.branch || initialBranch,
            marketingSource: pf.marketingSource || "Old Patient",
            diseases: pf.diseases || pf.notes || "General Consultation",
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
            fetch(`/api/pay-later?phone=${cleanPhone}`)
              .then((r) => r.json())
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

  const handleRegisterPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPackageActive) {
      alert(`Patient already has an active package (${patientData.activePackage.packageName}) valid until ${patientData.activePackage.endDate}. A new package cannot be registered until this package expires.`);
      return;
    }
    if (!patientData.patientName || !patientData.phone) return;
    if (!packageDurationMonths || packageDurationMonths <= 0) {
      alert("Please select a package duration (1 to 6 Months).");
      return;
    }
    const total = parseFloat(packageTotalAmount) || 0;
    if (total <= 0) {
      alert("Please enter a valid total package amount.");
      return;
    }
    setIsRegisteringPackage(true);
    try {
      const res = await fetch("/api/package-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const data = await res.json();
      if (data.success && data.member) {
        setPatientData((prev: any) => ({
          ...prev,
          hasPackage: true,
          packageName: data.member.packageName,
          activePackage: data.member,
        }));
        setIsPackageModalOpen(false);
        setPackageTotalAmount("");
        setPackageDurationMonths(0);
        loadPatientFile();
        alert(data.message || "Package registered successfully!");
      } else {
        alert(data.error || "Failed to register package");
      }
    } catch (err: any) {
      alert("Error registering package: " + err.message);
    } finally {
      setIsRegisteringPackage(false);
    }
  };

  const datePickerInputRef = useRef<HTMLInputElement | null>(null);

  const getIsoDate = (dmyStr: string) => {
    if (!dmyStr) return "";
    const parts = dmyStr.split("-");
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return "";
  };

  const handleCalendarDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (!val) return;
    const parts = val.split("-");
    if (parts.length === 3) {
      const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
      setFollowUpDate(formatted);
      setFollowUpInterval(formatted);
    }
  };

  const openDatePicker = () => {
    if (datePickerInputRef.current) {
      if (typeof (datePickerInputRef.current as any).showPicker === "function") {
        (datePickerInputRef.current as any).showPicker();
      } else {
        datePickerInputRef.current.focus();
        datePickerInputRef.current.click();
      }
    }
  };

  const handleSelectInterval = (
    interval: "No Follow-up" | "1 Month" | "2 Months" | "3 Months" | "4 Months" | "Custom Date"
  ) => {
    setFollowUpInterval(interval);
    if (interval === "No Follow-up") {
      setFollowUpDate("");
      return;
    }
    if (interval === "Custom Date") {
      openDatePicker();
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

  // Upload helper to AWS S3
  const uploadToS3 = async (base64OrDataUri: string, contentType: string = "image/jpeg"): Promise<string | null> => {
    try {
      setIsUploading(true);
      const res = await fetch("/api/patient-file/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: base64OrDataUri,
          contentType,
          patientId: patientData.registrationId || "SPH-PATIENT",
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
      return null;
    } catch (err) {
      console.error("S3 upload error:", err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // File Upload (From PC / Camera)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === "string") {
        const localData = reader.result;
        setUploadedImages((prev) => [...prev, localData]);
        const s3Url = await uploadToS3(localData, file.type || "image/jpeg");
        if (s3Url) {
          setUploadedImages((prev) => prev.map((img) => (img === localData ? s3Url : img)));
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    if (viewerIndex >= uploadedImages.length - 1 && viewerIndex > 0) {
      setViewerIndex(viewerIndex - 1);
    }
  };

  // Shared Media Picker & Link Handlers
  const openSharedMediaPicker = async () => {
    setIsSharedMediaPickerOpen(true);
    setLoadingSharedFolders(true);
    try {
      const res = await fetch("/api/shared-media", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.folders)) {
        setSharedFolders(data.folders);
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

  const handleCopyAttachedLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const openSaveToSharedModal = async (imgSrc: string) => {
    setImageToSave(imgSrc);
    setSaveLinkName(`Prescription - ${patientData.patientName} (${new Date().toLocaleDateString("en-IN")})`);
    setIsSaveToSharedOpen(true);
    if (sharedFolders.length === 0) {
      try {
        const res = await fetch("/api/shared-media", { cache: "no-store" });
        const data = await res.json();
        if (data.success && Array.isArray(data.folders) && data.folders.length > 0) {
          setSharedFolders(data.folders);
          setSaveToFolderId(data.folders[0].id);
        }
      } catch (err) {
        console.error("Failed to load shared folders for save:", err);
      }
    } else {
      setSaveToFolderId(sharedFolders[0]?.id || "");
    }
  };

  const handleConfirmSaveToShared = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageToSave || !saveToFolderId || !saveLinkName.trim()) return;

    setIsSavingToShared(true);
    try {
      const res = await fetch("/api/shared-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_link",
          folderId: saveToFolderId,
          name: saveLinkName.trim(),
          url: imageToSave,
          createdBy: role === "DOCTOR" ? "Doctor" : "Reception",
          createdBranch: patientData.branch || "Clinic",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Image saved to Shared Media folder successfully! Accessible by all branches.");
        setIsSaveToSharedOpen(false);
        setImageToSave(null);
      } else {
        alert(data.error || "Failed to save to Shared Media");
      }
    } catch (err: any) {
      alert("Error saving: " + (err.message || ""));
    } finally {
      setIsSavingToShared(false);
    }
  };

  // Canvas Drawing Handlers (Web)
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Pure clean solid white background: NO blue background, NO banner, NO lines
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (isCanvasModalOpen && canvasRef.current) {
      clearCanvas();
    }
  }, [isCanvasModalOpen]);

  const saveCanvasDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Offscreen canvas ensures 100% solid, non-transparent opaque white background
    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    // 1. Fill solid pure white
    offCtx.fillStyle = "#ffffff";
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    // 2. Draw user strokes
    offCtx.drawImage(canvas, 0, 0);

    // 3. Export as opaque JPEG (never transparent)
    const dataUrl = offscreen.toDataURL("image/jpeg", 0.92);
    setUploadedImages((prev) => [...prev, dataUrl]);
    setIsCanvasModalOpen(false);

    // Upload to AWS S3 in background
    const s3Url = await uploadToS3(dataUrl, "image/jpeg");
    if (s3Url) {
      setUploadedImages((prev) => prev.map((img) => (img === dataUrl ? s3Url : img)));
    }
  };

  const handleSendToReception = async () => {
    // 1. Mandatory Prescription check for OPD appointments (Doctor view only)
    const hasRxImages = uploadedImages.length > 0;
    const hasRxText = Boolean(prescriptionText && prescriptionText.trim().length > 0);
    const isOpd = patientData.consultationMode !== "ONLINE";

    if (role === "DOCTOR" && isOpd && !hasRxImages && !hasRxText) {
      alert(
        "⚠️ Prescription is mandatory for OPD patients!\n\nPlease draw on the Digital Pad, upload a prescription file, or enter prescription remedies before sending to reception."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const hasDiet = Boolean(dietPlan && dietPlan.trim().length > 0);
      const effectiveDietFee = hasDiet ? (Number(dietPlanFee) || 0) : 0;
      const effectiveInterval =
        !followUpInterval || followUpInterval === "Custom Date" || (followUpInterval === "No Follow-up" && followUpDate)
          ? followUpDate || "1 Month"
          : followUpInterval;
      const res = await fetch("/api/patient-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appointmentId || "temp-id",
          prescriptionImages: uploadedImages,
          sharedMediaLinks: attachedSharedLinks,
          prescriptionText,
          followUpInterval: effectiveInterval,
          followUpDate,
          consultationFee: parseFloat(consultationFee) || 0,
          dietPlan: hasDiet ? dietPlan : "",
          dietPlanFee: effectiveDietFee,
          sendToReception: true,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to update patient file.");
        return;
      }

      if (role === "RECEPTION") {
        // Reception clicked Send to Reception / Save & Collect Fee:
        // Immediately open the Fee Collection modal right here
        setSelectedPaymentAppt({
          id: appointmentId || "temp-id",
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
          dietPlanFee: effectiveDietFee,
          dietFee: effectiveDietFee,
          dietPlan: hasDiet ? dietPlan : "",
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
        // Prescription & notes auto-sent to Reception, doctor work is completely over
        alert(
          `Consultation finished for ${patientData.patientName}!\nPrescription & notes sent to Reception.`
        );
        router.push("/doctor/dashboard");
      }
    } catch (err: any) {
      alert("Error saving patient file.");
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
      const effectiveInterval =
        !followUpInterval || followUpInterval === "Custom Date" || (followUpInterval === "No Follow-up" && followUpDate)
          ? followUpDate || "1 Month"
          : followUpInterval;
      const res = await fetch("/api/patient-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appointmentId || "temp-id",
          prescriptionImages: uploadedImages,
          sharedMediaLinks: attachedSharedLinks,
          prescriptionText,
          followUpInterval: effectiveInterval,
          followUpDate,
          consultationFee: parseFloat(consultationFee) || 0,
          dietPlan: updatedPlan,
          dietPlanFee: updatedFee,
          sendToReception,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to save Diet Plan.");
        return;
      }

      if (sendToReception) {
        if (role === "RECEPTION") {
          setSelectedPaymentAppt({
            id: appointmentId || "temp-id",
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
            dietPlan: updatedPlan,
            prescriptionImages: uploadedImages,
            hasPackage: patientData.hasPackage,
            packageName: patientData.packageName || patientData.activePackage?.packageName,
            status: "COLLECT_FEE",
          });
          setIsPaymentModalOpen(true);
        } else {
          alert(
            `Diet Plan & Fee (₹${updatedFee}) saved and dispatched to Reception for ${patientData.patientName}!`
          );
          router.push("/doctor/dashboard");
        }
      } else {
        alert("Diet Plan and Fee saved successfully!");
      }
    } catch (err: any) {
      alert("Error saving diet plan: " + (err.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(role === "DOCTOR" ? "/doctor/dashboard" : "/reception/dashboard");
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-xs">
      {sidebar}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors font-bold text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">{patientData.patientName}</h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {patientData.branch} • Reg: {patientData.registrationId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role === "RECEPTION" ? (
              <button
                type="button"
                onClick={handleSendToReception}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                title="Save notes and immediately collect fee"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Saving..." : "Save & Collect Fee"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendToReception}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                title="Save prescription and send to Reception"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Send to Reception"}</span>
              </button>
            )}

            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-black flex items-center justify-center text-sm border border-sky-200">
              {(patientData.patientName || "P").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-5 max-w-4xl w-full mx-auto space-y-3.5 pb-20">
          {isLoading ? (
            <div className="p-16 text-center text-slate-400">Loading Patient File...</div>
          ) : (
            <>
              {/* 2. Patient Profile Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-extrabold text-slate-900">{patientData.patientName}</h2>
                  <div className="flex items-center gap-1.5">
                    {patientData.visitBadge === "In-Dur" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 font-extrabold text-[10px] shadow-xs">
                        <Clock className="w-3 h-3 text-sky-600" />
                        IN-DUR
                      </span>
                    ) : patientData.visitBadge === "Revisit" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-extrabold text-[10px] shadow-xs">
                        <RotateCcw className="w-3 h-3 text-amber-600" />
                        REVISIT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[10px] shadow-xs">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        NEW
                      </span>
                    )}
                    {patientData.hasPackage && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] shadow-xs">
                        <Package className="w-3 h-3 text-white" />
                        PKG
                      </span>
                    )}
                    {Number(patientData.pendingBalance) > 0 && (
                      <span className="px-2.5 py-0.5 rounded-md bg-orange-600 text-white font-black text-[10px] shadow-xs">
                        DUE: ₹{Number(patientData.pendingBalance).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  {Number(patientData.pendingBalance) > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-900 font-bold mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">⚠️</span>
                        <span>Pending Due: ₹{Number(patientData.pendingBalance).toLocaleString()} (Pay Later)</span>
                      </div>
                      <span className="text-[10px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        Can be settled in Collect Fee
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span className="text-sky-700 font-bold">Reg ID: {patientData.registrationId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <span>{patientData.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{patientData.branch}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📢</span>
                    <span>Source: {patientData.marketingSource || "Old Patient"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>
                      <strong className="text-slate-800">Subject:</strong> {patientData.diseases || "General Consultation"}
                    </span>
                  </div>
                </div>

                {/* Package Sub-Card */}
                {patientData.hasPackage && patientData.activePackage ? (
                  <div className="mt-3.5 p-3.5 rounded-xl border border-amber-200 bg-linear-to-r from-amber-50/70 to-yellow-50/50 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                          PKG ACTIVE
                        </span>
                        <span className="font-extrabold text-xs text-amber-950">
                          {patientData.activePackage.packageName || `${patientData.activePackage.durationMonths || 3} Months Treatment Package`}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        Valid till: {patientData.activePackage.endDate || "N/A"}
                      </span>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-amber-200/60 text-center">
                      <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Total Package</div>
                        <div className="text-xs font-black text-slate-800">₹{(patientData.activePackage.totalAmount || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Paid So Far</div>
                        <div className="text-xs font-black text-emerald-700">₹{(patientData.activePackage.paidAmount || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                        <div className="text-[10px] font-bold text-amber-600 uppercase">Remaining Pending</div>
                        <div className="text-xs font-black text-amber-700">₹{(patientData.activePackage.pendingAmount || 0).toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Installments History */}
                    {patientData.activePackage.payments && patientData.activePackage.payments.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/50">
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Payment Installments History:
                        </div>
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {patientData.activePackage.payments.map((pay: any, idx: number) => {
                            const d = new Date(pay.paidAt);
                            const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN") : pay.paidAt;
                            const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                            return (
                              <div key={idx} className="flex items-center justify-between text-[11px] bg-white/80 px-2 py-1 rounded border border-amber-100">
                                <span className="text-slate-600 font-medium">
                                  {dateStr} {timeStr} • {pay.paymentMethod || "CASH"} {pay.notes ? `(${pay.notes})` : ""}
                                </span>
                                <span className="font-bold text-emerald-700">+₹{(pay.amount || 0).toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3.5 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-slate-600 text-[11.5px]">No active package.</span>
                    <button
                      type="button"
                      onClick={() => setIsPackageModalOpen(true)}
                      className="px-2.5 py-1 rounded-md border border-sky-600 text-sky-700 font-bold text-[11px] bg-white hover:bg-sky-50 transition-colors"
                    >
                      + Register Patient in Package
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Tab Navigation Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab("clinical")}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${activeTab === "clinical"
                    ? "bg-sky-100 border-sky-300 text-sky-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  Clinical Form
                </button>
                <button
                  onClick={() => setActiveTab("diet")}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${activeTab === "diet"
                    ? "bg-sky-100 border-sky-300 text-sky-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  Diet Plan
                </button>
                <button
                  onClick={() => setActiveTab("media")}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${activeTab === "media"
                    ? "bg-sky-100 border-sky-300 text-sky-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  Share Media
                </button>
                {isPackageActive ? (
                  <button
                    type="button"
                    disabled
                    title={`Active package (${patientData.activePackage?.packageName}) valid till ${patientData.activePackage?.endDate}. A new package cannot be registered until it expires.`}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed whitespace-nowrap select-none opacity-80"
                  >
                    Package Active (Till {patientData.activePackage?.endDate || ""})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPackageModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    {patientData.hasPackage ? "Renew Expired Package" : "Register Package"}
                  </button>
                )}
              </div>

              {activeTab === "diet" && (
                <DietPlanManager
                  appointmentId={appointmentId}
                  patientData={patientData}
                  initialDietPlan={dietPlan}
                  initialDietFee={dietPlanFee}
                  onSavePlan={handleSaveDietPlan}
                  isSaving={isSubmitting}
                />
              )}

              {activeTab === "media" && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-sky-600" />
                      <span>Shared Medical Documents & Reports</span>
                    </h3>
                    <span className="text-xs text-slate-500 font-semibold">
                      {uploadedImages.length} Attached
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Upload lab reports, scans, patient diet charts, or past medical records.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Document / Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-600" />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={openSharedMediaPicker}
                      className="px-3.5 py-2 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
                      <span>Select from Shared Media</span>
                    </button>
                  </div>
                  {uploadedImages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                      {uploadedImages.map((src, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden cursor-pointer group shadow-2xs"
                          onClick={() => {
                            setViewerIndex(idx);
                            setRotation(0);
                            setZoomScale(1);
                            setIsViewerOpen(true);
                          }}
                        >
                          <img
                            src={resolvePrescriptionImageUrl(src)}
                            alt={`Document ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-xs"
                          >
                            ✕
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSaveToSharedModal(src);
                            }}
                            title="Save this file to Shared Media for all branches"
                            className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-opacity"
                          >
                            <Share2 className="w-3 h-3 text-sky-300" />
                            <span>Share</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      No documents or files uploaded yet.
                    </div>
                  )}

                  {/* Attached Shared Media Links Section */}
                  {attachedSharedLinks.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-sky-600" />
                          <span>Attached Shared Media Links ({attachedSharedLinks.length})</span>
                        </h4>
                        <button
                          type="button"
                          onClick={openSharedMediaPicker}
                          className="text-[11px] font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                        >
                          + Add More
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {attachedSharedLinks.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white flex items-center justify-between gap-3 shadow-2xs transition-all"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                <Link2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-sky-600 hover:underline truncate block"
                                >
                                  {item.url}
                                </a>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyAttachedLink(item.url, item.id || String(idx))}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                                title="Copy URL"
                              >
                                {copiedLinkId === (item.id || String(idx)) ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-sky-600"
                                title="Open URL"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleRemoveAttachedLink(idx)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-600"
                                title="Remove link"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "clinical" && (
                <>
                  {isCompleted && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-900">Consultation Completed &amp; Locked</p>
                          <p className="text-[11px] text-emerald-700">Payment has been settled for this visit. Prescription records and billing are locked.</p>
                        </div>
                      </div>
                      <Link
                        href={role === "DOCTOR"
                          ? `/doctor/patient-history?id=${encodeURIComponent(patientData.registrationId)}&phone=${encodeURIComponent(patientData.phone)}&name=${encodeURIComponent(patientData.patientName)}`
                          : `/reception/patient-history?id=${encodeURIComponent(patientData.registrationId)}&phone=${encodeURIComponent(patientData.phone)}&name=${encodeURIComponent(patientData.patientName)}`
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs text-center shrink-0"
                      >
                        View Patient History
                      </Link>
                    </div>
                  )}
                  {dietPlan ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🥗</span>
                        <div>
                          <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                            <span>Personalized Diet Plan Active</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-black">
                              ₹{dietPlanFee} Fee Attached
                            </span>
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            30-Day regimen configured. Will be auto-included in reception fee collection.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("diet")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs"
                      >
                        View / Edit Diet Plan
                      </button>
                    </div>
                  ) : (
                    <div className="bg-sky-50/60 border border-sky-200 border-dashed rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-sky-900">
                        <span>🥗</span>
                        <span>Need a clinical 30-day diet plan for this patient?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("diet")}
                        className="px-2.5 py-1 rounded-lg border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs transition-colors"
                      >
                        + Create Diet Plan
                      </button>
                    </div>
                  )}

                  {/* 4. Digital Prescription Section */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-sm">Digital Prescription</h3>
                  {uploadedImages.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200">
                      {uploadedImages.length} attached
                    </span>
                  )}
                </div>

                {/* Hidden File and Camera Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Radio selection & Open Pad Button */}
                {!isCompleted && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-4">
                    {/* Radio: Digital Pad - ON means open pad */}
                    <div
                      onClick={() => setIsCanvasModalOpen(true)}
                      className="flex items-center gap-2 cursor-pointer select-none group"
                    >
                      <input
                        type="radio"
                        name="rxMode"
                        checked={isCanvasModalOpen || uploadedImages.length > 0}
                        onChange={() => setIsCanvasModalOpen(true)}
                        className="w-4 h-4 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                      />
                      <span className="text-xs font-bold text-slate-800 group-hover:text-sky-600 flex items-center gap-1.5 transition-colors">
                        <PenTool className="w-3.5 h-3.5 text-sky-600" />
                        Digital Prescription Pad
                      </span>
                    </div>

                    {/* Radio: Upload File */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 cursor-pointer select-none group"
                    >
                      <input
                        type="radio"
                        name="rxMode"
                        checked={false}
                        onChange={() => fileInputRef.current?.click()}
                        className="w-4 h-4 text-slate-400 focus:ring-sky-500 cursor-pointer accent-sky-600"
                      />
                      <span className="text-xs font-semibold text-slate-600 group-hover:text-sky-600 flex items-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-600" />
                        Upload File
                      </span>
                    </div>

                    {/* Radio: Camera */}
                    <div
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 cursor-pointer select-none group"
                    >
                      <input
                        type="radio"
                        name="rxMode"
                        checked={false}
                        onChange={() => cameraInputRef.current?.click()}
                        className="w-4 h-4 text-slate-400 focus:ring-sky-500 cursor-pointer accent-sky-600"
                      />
                      <span className="text-xs font-semibold text-slate-600 group-hover:text-sky-600 flex items-center gap-1.5 transition-colors">
                        <Camera className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-600" />
                        Camera
                      </span>
                    </div>
                  </div>

                  {/* Open Pad Button */}
                  <button
                    type="button"
                    onClick={() => setIsCanvasModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Open Pad</span>
                  </button>
                </div>
                )}

                {/* Uploaded / Drawn Prescriptions Thumbnails */}
                {uploadedImages.length > 0 ? (
                  <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                    {uploadedImages.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-lg border border-slate-200 shrink-0 overflow-hidden cursor-pointer group hover:border-sky-400 transition-colors shadow-2xs"
                        onClick={() => {
                          setViewerIndex(idx);
                          setRotation(0);
                          setZoomScale(1);
                          setIsViewerOpen(true);
                        }}
                      >
                        <img src={resolvePrescriptionImageUrl(src)} alt={`Rx ${idx + 1}`} className="w-full h-full object-cover" />
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-xs cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 py-1 flex items-center gap-1">
                    <span>ℹ️</span>
                    <span>No prescription attached yet. Click the radio button or &quot;Open Pad&quot; to draw.</span>
                  </div>
                )}

                {/* Prescription Remedies & Text Instructions */}
                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <div>
                    <label className="block font-bold text-slate-700 text-xs">
                      Prescription Remedies & Instructions
                    </label>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Type prescription remedies, dosage, and instructions here..."
                    value={prescriptionText}
                    onChange={(e) => setPrescriptionText(e.target.value)}
                    className="w-full min-h-[140px] p-3 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs font-medium bg-slate-50/50 leading-relaxed"
                  />
                </div>
              </div>

              {/* 5. Follow-up Recommendation */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <h3 className="font-extrabold text-slate-900 text-sm">Follow-up Recommendation</h3>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-xs">Follow-up Interval</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["No Follow-up", "1 Month", "2 Months", "3 Months", "4 Months", "Custom Date"] as const).map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => handleSelectInterval(interval)}
                        className={`py-1.5 px-3 rounded-lg border font-bold text-xs transition-colors shrink-0 text-center cursor-pointer ${followUpInterval === interval
                          ? "bg-sky-600 border-sky-600 text-white shadow-2xs"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Preferred Follow-up Date (DD-MM-YYYY)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={openDatePicker}
                      className="absolute left-2.5 top-2.5 text-sky-600 hover:text-sky-700 cursor-pointer p-0.5 rounded"
                      title="Open Calendar Picker"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      placeholder="DD-MM-YYYY"
                      value={followUpDate}
                      onClick={openDatePicker}
                      onChange={(e) => {
                        setFollowUpDate(e.target.value);
                        setFollowUpInterval(e.target.value);
                      }}
                      className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs font-semibold cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={openDatePicker}
                      className="absolute right-2.5 top-2.5 text-sky-600 hover:text-sky-700 cursor-pointer p-0.5 rounded"
                      title="Open Calendar Picker"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <input
                      ref={datePickerInputRef}
                      type="date"
                      value={getIsoDate(followUpDate)}
                      onChange={handleCalendarDateChange}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              {/* 6. Enter Amount Section */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <h3 className="font-extrabold text-slate-900 text-sm">Enter Amount</h3>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Amount (₹) (Optional - Can also be entered at Reception)</label>
                  <input
                    type="number"
                    placeholder="Enter amount (optional)..."
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    disabled={isCompleted}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                {/* Core CTA Button */}
                {isCompleted ? (
                  <div className="w-full py-3 rounded-lg bg-emerald-600 text-white font-extrabold text-xs text-center flex items-center justify-center gap-2 shadow-2xs select-none">
                    <CheckCircle className="w-4 h-4" />
                    <span>Consultation Completed &amp; Locked</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSendToReception}
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : role === "RECEPTION"
                        ? "Save & Collect Fee"
                        : "Send to Reception"}
                  </button>
                )}
              </div>
            </>
          )}

          {/* 7. Patient History & Records Section */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-extrabold text-sky-700 text-sm">
                    <span>📋</span>
                    <span>Patient History & Records</span>
                  </div>
                  <span className="text-slate-500 text-xs font-semibold">
                    Total Paid: <strong className="text-emerald-600 font-extrabold">₹{totalPaid}</strong> ({patientHistory.length} Visits)
                  </span>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                  <button
                    onClick={() => setHistoryTab("all")}
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${historyTab === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    All ({patientHistory.length})
                  </button>
                  <button
                    onClick={() => setHistoryTab("prescriptions")}
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${historyTab === "prescriptions" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Prescriptions ({patientHistory.filter((h) => h.prescriptionImages && h.prescriptionImages.length > 0).length})
                  </button>
                  <button
                    onClick={() => setHistoryTab("payments")}
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${historyTab === "payments" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Payments ({patientHistory.filter((h) => h.isFeeCollected || (typeof h.totalPaid === "number" && h.totalPaid > 0) || (typeof h.totalAmountDue === "number" && h.totalAmountDue > 0)).length})
                  </button>
                </div>

                {(() => {
                  const items = historyTab === "prescriptions"
                    ? patientHistory.filter((h) => h.prescriptionImages && h.prescriptionImages.length > 0)
                    : historyTab === "payments"
                    ? patientHistory.filter((h) => h.isFeeCollected || (typeof h.totalPaid === "number" && h.totalPaid > 0) || (typeof h.totalAmountDue === "number" && h.totalAmountDue > 0))
                    : patientHistory;

                  if (items.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                        <p className="text-xs font-medium">
                          {historyTab === "prescriptions"
                            ? "No prescription records found for this patient."
                            : historyTab === "payments"
                            ? "No payment records found for this patient."
                            : "No previous visits recorded for this patient."}
                        </p>
                      </div>
                    );
                  }

                  if (historyTab === "prescriptions") {
                    return (
                      <div className="space-y-3">
                        {items.map((h, i) => (
                          <div key={h.id || i} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-extrabold text-slate-800 text-xs">
                                  {h.date} {h.timeSlot ? `• ${h.timeSlot}` : ""}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {h.doctorName || "Doctor"} • {h.branch}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
                                {h.prescriptionImages?.length || 0} Images
                              </span>
                            </div>

                            {h.diagnosisNotes && (
                              <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80">
                                <span className="font-bold text-slate-700">Diagnosis/Notes:</span> {h.diagnosisNotes}
                              </div>
                            )}

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                              {h.prescriptionImages?.map((rxUrl: string, rIdx: number) => (
                                <div
                                  key={rIdx}
                                  onClick={() => {
                                    setUploadedImages(h.prescriptionImages);
                                    setViewerIndex(rIdx);
                                    setRotation(0);
                                    setZoomScale(1);
                                    setIsViewerOpen(true);
                                  }}
                                  className="group relative cursor-pointer border border-slate-200 hover:border-sky-500 rounded-lg overflow-hidden bg-white shadow-2xs transition-all"
                                  title="Click to preview prescription"
                                >
                                  <img
                                    src={resolvePrescriptionImageUrl(rxUrl)}
                                    alt={`Rx ${rIdx + 1}`}
                                    className="w-full h-20 object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-white text-[9px] font-bold text-center py-0.5">
                                    Rx {rIdx + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (historyTab === "payments") {
                    return (
                      <div className="space-y-3">
                        {items.map((h, i) => (
                          <div key={h.id || i} className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                                  <span>🧾</span>
                                  <span>{h.date}</span>
                                  {h.timeSlot && <span className="text-[10px] text-slate-400 font-semibold">• {h.timeSlot}</span>}
                                  {h.invoiceId && (
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                      {h.invoiceId}
                                    </span>
                                  )}
                                  {h.isCurrent && (
                                    <span className="text-[9px] font-extrabold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200">
                                      Current Visit
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{h.doctorName} • {h.branch}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-slate-400 font-semibold">Total Paid</div>
                                <div className="font-black text-emerald-600 text-sm">₹{h.totalPaid ?? (h.totalAmountDue || h.consultationFee || 0)}</div>
                              </div>
                            </div>

                            <div className="bg-white rounded-lg border border-slate-200/80 p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">Payment Mode</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                                  {h.paymentMethod || "CASH"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Consultation</span>
                                  <span className="font-bold text-slate-700">₹{h.consultationFee}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Medicine Fee</span>
                                  <span className="font-bold text-slate-700">₹{h.medicineFee}</span>
                                  {h.medicineDuration && <span className="text-[9px] text-slate-400 ml-1">({h.medicineDuration})</span>}
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Discount</span>
                                  <span className="font-bold text-rose-600">₹{h.discount}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Total Due</span>
                                  <span className="font-bold text-slate-800">₹{h.totalAmountDue}</span>
                                </div>
                              </div>

                              {h.payLaterAmount > 0 && (
                                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 text-amber-700 bg-amber-50/50 p-1.5 rounded">
                                  <span className="font-semibold">Pay Later (Pending Balance):</span>
                                  <span className="font-black">₹{h.payLaterAmount}</span>
                                </div>
                              )}

                              {h.paidAt && (
                                <div className="text-[10px] text-slate-400 pt-1 text-right">
                                  Paid At: {h.paidAt.replace("T", " ").slice(0, 16)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Default "all" tab
                  return (
                    <div className="space-y-2">
                      {items.map((h, i) => (
                        <div key={h.id || i} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                <span>{h.date}</span>
                                {h.timeSlot && <span className="text-[10px] text-slate-400 font-semibold">• {h.timeSlot}</span>}
                                {h.isCurrent && (
                                  <span className="text-[9px] font-extrabold bg-sky-100 text-sky-700 px-1 py-0.2 rounded border border-sky-200">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">{h.doctorName} • {h.branch}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-emerald-600 text-xs block">
                                ₹{h.totalPaid ?? (h.totalAmountDue || h.consultationFee || 0)}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                h.isFeeCollected
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                {h.isFeeCollected ? "Paid" : h.status || "Pending"}
                              </span>
                            </div>
                          </div>

                          {h.diagnosisNotes && (
                            <div className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200/80">
                              <span className="font-bold text-slate-700">Diagnosis/Notes:</span> {h.diagnosisNotes}
                            </div>
                          )}

                          {h.prescriptionImages && h.prescriptionImages.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap pt-0.5">
                              {h.prescriptionImages.map((rxUrl: string, rIdx: number) => (
                                <div
                                  key={rIdx}
                                  onClick={() => {
                                    setUploadedImages(h.prescriptionImages);
                                    setViewerIndex(rIdx);
                                    setRotation(0);
                                    setZoomScale(1);
                                    setIsViewerOpen(true);
                                  }}
                                  className="group relative cursor-pointer"
                                  title="Click to preview prescription"
                                >
                                  <img
                                    src={resolvePrescriptionImageUrl(rxUrl)}
                                    alt="Rx"
                                    className="w-10 h-10 rounded-md border border-slate-300 object-cover shadow-2xs group-hover:border-sky-500 transition-all"
                                  />
                                  <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-bold px-1 rounded-tl">
                                    Rx {rIdx + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Fee summary line */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 pt-1 border-t border-slate-200/70">
                            <span>Consultation: <strong className="text-slate-700">₹{h.consultationFee}</strong></span>
                            {h.medicineFee > 0 && (
                              <span>Medicine: <strong className="text-slate-700">₹{h.medicineFee}</strong>{h.medicineDuration ? ` (${h.medicineDuration})` : ""}</span>
                            )}
                            {h.discount > 0 && (
                              <span className="text-rose-600">Discount: -₹{h.discount}</span>
                            )}
                            {h.paymentMethod && (
                              <span>Mode: <strong className="text-slate-700">{h.paymentMethod}</strong></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </main>
      </div>

      {/* WEB FULL POPUP PRESCRIPTION CANVAS MODAL */}
      {isCanvasModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 space-y-3 shadow-2xl flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Prescription Canvas Pad (Full Sheet)</h3>
                <p className="text-[11px] text-slate-500">{patientData.patientName} • {patientData.registrationId}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCanvasModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Toolbar: Color & Stroke */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-2 bg-slate-50 rounded-lg border border-slate-200">
              {/* Colors */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 mr-1">Ink:</span>
                {[
                  { color: "#1e3a8a", label: "Navy" },
                  { color: "#0f172a", label: "Black" },
                  { color: "#dc2626", label: "Red" },
                  { color: "#059669", label: "Green" },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setPenColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${penColor === c.color ? "border-slate-900 scale-125" : "border-transparent"
                      }`}
                    title={c.label}
                  />
                ))}
              </div>

              {/* Stroke Width */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-600 mr-1">Stroke:</span>
                {[
                  { width: 2.5, label: "Fine" },
                  { width: 4.0, label: "Medium" },
                  { width: 6.0, label: "Bold" },
                ].map((w) => (
                  <button
                    key={w.label}
                    type="button"
                    onClick={() => setPenWidth(w.width)}
                    className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors cursor-pointer ${penWidth === w.width
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pure Solid White Canvas Sheet (NO Blue BG, NO Lines) */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner flex justify-center flex-1 min-h-[400px]">
              <canvas
                ref={canvasRef}
                width={850}
                height={480}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair w-full h-full bg-white touch-none"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCanvasModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCanvasDrawing}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 cursor-pointer text-xs shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save Prescription & Add to File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEB INTERACTIVE PRESCRIPTION VIEWER MODAL (ROTATE, ZOOM, < >, DELETE) */}
      {isViewerOpen && uploadedImages.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col justify-between p-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 px-2">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-white font-bold text-xs">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{viewerIndex + 1} / {uploadedImages.length}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Rotate 90 deg */}
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>90°</span>
              </button>

              {/* Zoom Out */}
              <button
                onClick={() => setZoomScale((z) => Math.max(0.75, Math.round((z - 0.25) * 100) / 100))}
                disabled={zoomScale <= 0.75}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Zoom In */}
              <button
                onClick={() => setZoomScale((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                disabled={zoomScale >= 3}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {(rotation !== 0 || zoomScale !== 1) && (
                <button
                  onClick={() => {
                    setRotation(0);
                    setZoomScale(1);
                  }}
                  className="px-2 py-1 text-sky-400 font-bold text-xs hover:underline"
                >
                  Reset
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to remove this prescription image?")) {
                    handleRemoveImage(viewerIndex);
                    if (uploadedImages.length <= 1) setIsViewerOpen(false);
                  }
                }}
                className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={() => setIsViewerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Viewport with touch swiping */}
          <div
            className="flex-1 relative flex items-center justify-center overflow-hidden touch-pan-y"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (diff > 40 && viewerIndex < uploadedImages.length - 1) {
                setViewerIndex((idx) => idx + 1);
                setRotation(0);
                setZoomScale(1);
              } else if (diff < -40 && viewerIndex > 0) {
                setViewerIndex((idx) => idx - 1);
                setRotation(0);
                setZoomScale(1);
              }
            }}
          >
            {/* Prev Arrow (<) */}
            {uploadedImages.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (viewerIndex > 0) {
                    setViewerIndex(viewerIndex - 1);
                    setRotation(0);
                    setZoomScale(1);
                  }
                }}
                disabled={viewerIndex === 0}
                className="absolute left-4 z-10 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-105 shadow-2xl cursor-pointer"
                title="Previous image (<)"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            <div className="max-w-3xl max-h-[70vh] flex items-center justify-center select-none">
              <img
                src={resolvePrescriptionImageUrl(uploadedImages[viewerIndex])}
                alt="Prescription"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl pointer-events-none"
              />
            </div>

            {/* Next Arrow (>) */}
            {uploadedImages.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (viewerIndex < uploadedImages.length - 1) {
                    setViewerIndex(viewerIndex + 1);
                    setRotation(0);
                    setZoomScale(1);
                  }
                }}
                disabled={viewerIndex === uploadedImages.length - 1}
                className="absolute right-4 z-10 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-105 shadow-2xl cursor-pointer"
                title="Next image (>)"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* Swipe Hint */}
          {uploadedImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 py-1 text-white/60 text-[11px] font-semibold select-none">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Tap &lt; and &gt; arrows or swipe to flip images ({viewerIndex + 1} of {uploadedImages.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Bottom Thumbnails Strip */}
          <div className="border-t border-white/10 pt-3 flex justify-center gap-2 overflow-x-auto pb-2">
            {uploadedImages.map((src, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setViewerIndex(idx);
                  setRotation(0);
                  setZoomScale(1);
                }}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${idx === viewerIndex ? "border-sky-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
              >
                <img src={resolvePrescriptionImageUrl(src)} alt="Thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Package Registration Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                  PKG
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Register Treatment Package</h3>
                  <p className="text-[11px] text-slate-500">Assign a recurring long-term care package to this patient</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterPackage} className="p-5 space-y-4">
              {/* 3 Read-only prefilled fields */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Patient Identity (Pre-filled &amp; Read-Only)
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={patientData.patientName}
                    readOnly
                    disabled
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-xs font-semibold cursor-not-allowed select-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={patientData.phone}
                      readOnly
                      disabled
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-xs font-semibold cursor-not-allowed select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Patient ID / Reg ID</label>
                    <input
                      type="text"
                      value={patientData.registrationId}
                      readOnly
                      disabled
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-xs font-semibold cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              </div>

              {/* Package Duration Dropdown Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Package Duration <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={packageDurationMonths || ""}
                    onChange={(e) => setPackageDurationMonths(Number(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                  >
                    <option value="" disabled>-- Select Package Duration --</option>
                    <option value="1">1 Month Course</option>
                    <option value="2">2 Months Course</option>
                    <option value="3">3 Months Course</option>
                    <option value="4">4 Months Course</option>
                    <option value="5">5 Months Course</option>
                    <option value="6">6 Months Course</option>
                  </select>
                </div>
                {packageDurationMonths > 0 && (
                  <p className="text-[11px] text-blue-700 font-semibold mt-1">
                    Selected: {packageDurationMonths} Month{packageDurationMonths > 1 ? "s" : ""} treatment course
                  </p>
                )}
              </div>

              {/* Total Package Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Total Package Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={packageTotalAmount}
                    onChange={(e) => setPackageTotalAmount(e.target.value)}
                    placeholder="Enter total package fee"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Note about fee collection */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-600">Total Package Amount: </span>
                  <span className="font-extrabold text-blue-900">
                    ₹{(parseFloat(packageTotalAmount) || 0).toLocaleString()}
                  </span>
                </div>
                <span className="text-[11px] text-blue-700 font-medium">
                  Payment will be collected during visit checkout
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringPackage}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isRegisteringPackage ? "Registering..." : "Confirm & Register Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Payment & Invoice Modal (Collect Fee or View Receipt for Reception) */}
      {isPaymentModalOpen && selectedPaymentAppt && (
        <FeeCheckoutAndInvoiceModal
          isOpen={isPaymentModalOpen}
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
          onSubmitPayment={async (invoiceData) => {
            const res = await fetch("/api/reception/payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(invoiceData),
            });
            const data = await res.json();
            if (!data.success) {
              throw new Error(data.error || "Payment failed");
            }
            setIsPaymentCompleted(true);
            return data;
          }}
        />
      )}

      {/* SELECT FROM SHARED MEDIA MODAL */}
      {isSharedMediaPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Select from Shared Media Library
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pick resource links, diet charts, or documents to attach to {patientData.patientName}&apos;s file
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSharedMediaPickerOpen(false);
                  setSelectedSharedLinksMap({});
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Folder List with Links */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loadingSharedFolders ? (
                <div className="p-8 text-center text-slate-500 font-bold text-xs flex flex-col items-center gap-2">
                  <RotateCw className="w-5 h-5 animate-spin text-sky-600" />
                  <span>Loading Shared Folders...</span>
                </div>
              ) : sharedFolders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  No folders or links in the Shared Media Library yet.
                </div>
              ) : (
                sharedFolders.map((folder: any) => {
                  const links = folder.links || [];
                  return (
                    <div
                      key={folder.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-sky-600" />
                          <span className="text-xs font-black text-slate-900">{folder.name}</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                            {links.length} {links.length === 1 ? "Link" : "Links"}
                          </span>
                        </div>
                        {folder.description && (
                          <span className="text-[11px] text-slate-400 truncate max-w-xs">
                            {folder.description}
                          </span>
                        )}
                      </div>

                      {links.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic pl-6">No links in this folder</p>
                      ) : (
                        <div className="space-y-1.5 pl-2">
                          {links.map((link: any) => {
                            const isSelected = Boolean(selectedSharedLinksMap[link.id]);
                            return (
                              <div
                                key={link.id}
                                onClick={() => toggleSelectSharedLink(link)}
                                className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? "bg-sky-50 border-sky-400 text-sky-900 shadow-2xs"
                                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "bg-sky-600 border-sky-600 text-white"
                                        : "border-slate-300 bg-white"
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{link.name}</p>
                                    <p className="text-[10.5px] text-slate-400 truncate">{link.url}</p>
                                  </div>
                                </div>

                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sky-600 hover:text-sky-800 p-1 shrink-0"
                                  title="Open Link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500">
                {Object.keys(selectedSharedLinksMap).length} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSharedMediaPickerOpen(false);
                    setSelectedSharedLinksMap({});
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAttachSelectedSharedMedia}
                  disabled={Object.keys(selectedSharedLinksMap).length === 0}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  Attach Selected ({Object.keys(selectedSharedLinksMap).length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVE IMAGE TO SHARED MEDIA MODAL */}
      {isSaveToSharedOpen && imageToSave && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Save to Shared Media
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Make this file accessible across all branches
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSaveToSharedOpen(false);
                  setImageToSave(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSaveToShared} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Shared Folder <span className="text-red-500">*</span>
                </label>
                <select
                  value={saveToFolderId}
                  onChange={(e) => setSaveToFolderId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  {sharedFolders.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  File / Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spine MRI Report, Diet Chart"
                  value={saveLinkName}
                  onChange={(e) => setSaveLinkName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSaveToSharedOpen(false);
                    setImageToSave(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingToShared || !saveLinkName.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSavingToShared ? "Saving..." : "Save to Shared Media"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
