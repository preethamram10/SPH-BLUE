"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FeeCheckoutAndInvoiceModal } from "@/components/payment/FeeCheckoutAndInvoiceModal";
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
  const [followUpInterval, setFollowUpInterval] = useState<"No Follow-up" | "1 Month" | "2 Months" | "3 Months" | "4 Months">("No Follow-up");
  const [followUpDate, setFollowUpDate] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [dietPlan, setDietPlan] = useState("");

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
            visitBadge: pf.visitBadge || (pf.isReback ? "Revisit" : "New"),
            activePackage: pf.activePackage || null,
          });
          if (pf.prescriptionImages) setUploadedImages(pf.prescriptionImages);
          if (pf.followUpInterval) setFollowUpInterval(pf.followUpInterval);
          if (pf.followUpDate || pf.activeFollowUpDate) setFollowUpDate(pf.followUpDate || pf.activeFollowUpDate);
          if (pf.consultationFee) setConsultationFee(String(pf.consultationFee));
          if (pf.dietPlan) setDietPlan(pf.dietPlan);
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
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appointmentId || "temp-id",
          prescriptionImages: uploadedImages,
          followUpInterval,
          followUpDate,
          consultationFee: parseFloat(consultationFee) || 0,
          dietPlan,
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
          prescriptionImages: uploadedImages,
          hasPackage: patientData.hasPackage,
          packageName: patientData.packageName || patientData.activePackage?.packageName,
          packageTotalAmount: patientData.activePackage?.totalAmount,
          packagePaidAmount: patientData.activePackage?.paidAmount,
          packagePendingAmount: patientData.activePackage?.pendingAmount,
          packageDurationMonths: patientData.activePackage?.durationMonths,
          packageEndDate: patientData.activePackage?.endDate,
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

          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-black flex items-center justify-center text-sm border border-sky-200">
            {(patientData.patientName || "P").slice(0, 1).toUpperCase()}
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
                      <span className="px-2.5 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 font-extrabold text-[10px] shadow-xs">
                        IN-DUR
                      </span>
                    ) : patientData.visitBadge === "Revisit" ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-extrabold text-[10px] shadow-xs">
                        REVISIT
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[10px] shadow-xs">
                        NEW
                      </span>
                    )}
                    {patientData.hasPackage && (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] shadow-xs">
                        PKG
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
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
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">Diet & Regimen</h3>
                  <textarea
                    rows={3}
                    placeholder="Enter homeopathic dietary restrictions, foods to avoid, and water intake..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                    value={dietPlan}
                    onChange={(e) => setDietPlan(e.target.value)}
                  />
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 py-1 flex items-center gap-1">
                    <span>ℹ️</span>
                    <span>No prescription attached yet. Click the radio button or &quot;Open Pad&quot; to draw.</span>
                  </div>
                )}
              </div>

              {/* 5. Follow-up Recommendation */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <h3 className="font-extrabold text-slate-900 text-sm">Follow-up Recommendation</h3>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-xs">Follow-up Interval</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["No Follow-up", "1 Month", "2 Months", "3 Months", "4 Months"] as const).map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => handleSelectInterval(interval)}
                        className={`py-1.5 px-3 rounded-lg border font-bold text-xs transition-colors shrink-0 text-center ${followUpInterval === interval
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
                    <Calendar className="w-4 h-4 text-sky-600 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="DD-MM-YYYY"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs font-semibold"
                    />
                    <Calendar className="w-4 h-4 text-sky-600 absolute right-3 top-3 pointer-events-none" />
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
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs font-bold"
                  />
                </div>

                {/* Core CTA Button */}
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
              </div>

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
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors ${historyTab === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                      }`}
                  >
                    All ({patientHistory.length})
                  </button>
                  <button
                    onClick={() => setHistoryTab("prescriptions")}
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors ${historyTab === "prescriptions" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                      }`}
                  >
                    Prescriptions
                  </button>
                  <button
                    onClick={() => setHistoryTab("payments")}
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors ${historyTab === "payments" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                      }`}
                  >
                    Payments
                  </button>
                </div>

                {patientHistory.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs font-medium">No previous visits recorded for this patient.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {patientHistory.map((h, i) => (
                      <div key={h.id || i} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{h.date}</div>
                          <div className="text-[11px] text-slate-500">{h.doctorName}</div>
                          {h.prescriptionImages && h.prescriptionImages.length > 0 && (
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
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
                        </div>
                        <div className="font-black text-emerald-600 text-xs">₹{h.consultationFee}</div>
                      </div>
                    ))}
                  </div>
                )}
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
            loadPatientFile();
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
            loadPatientFile();
            return data;
          }}
        />
      )}
    </div>
  );
}
