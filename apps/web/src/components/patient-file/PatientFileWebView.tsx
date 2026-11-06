"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface PatientFileWebViewProps {
  role: "DOCTOR" | "RECEPTION";
  sidebar: React.ReactNode;
}

export default function PatientFileWebView({ role, sidebar }: PatientFileWebViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const appointmentId = searchParams.get("id") || "";
  const initialName = searchParams.get("name") || "N Harshvardhan";
  const initialPhone = searchParams.get("phone") || "8247374447";
  const initialRegId = searchParams.get("registrationId") || "SPH-KPB-0294";
  const initialBranch = searchParams.get("branch") || "KPHB Branch";

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
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState("#1e3a8a");
  const [penWidth, setPenWidth] = useState(3.5);

  // Interactive Prescription Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);

  // Load from API
  useEffect(() => {
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
      if (data.success) {
        alert(
          `Consultation finished for ${patientData.patientName}!\nPrescription & fee (₹${consultationFee}) moved to COLLECT FEE for Reception.`
        );
        router.push(role === "DOCTOR" ? "/doctor/dashboard" : "/reception/dashboard");
      } else {
        alert(data.error || "Failed to update patient file.");
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
                  <span className="px-2.5 py-0.5 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-800 font-extrabold text-[10px]">
                    IN DURATION
                  </span>
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
                <div className="mt-3.5 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-slate-600 text-[11.5px]">
                    {patientData.hasPackage ? `Active: ${patientData.packageName}` : "No active package."}
                  </span>
                  <button
                    onClick={() => router.push(role === "DOCTOR" ? "/doctor/packages" : "/reception/dashboard")}
                    className="px-2.5 py-1 rounded-md border border-sky-600 text-sky-700 font-bold text-[11px] bg-white hover:bg-sky-50 transition-colors"
                  >
                    + Register Patient in Package
                  </button>
                </div>
              </div>

              {/* 3. Tab Navigation Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab("clinical")}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                    activeTab === "clinical"
                      ? "bg-sky-100 border-sky-300 text-sky-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Clinical Form
                </button>
                <button
                  onClick={() => setActiveTab("diet")}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                    activeTab === "diet"
                      ? "bg-sky-100 border-sky-300 text-sky-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Diet Plan
                </button>
                <button
                  onClick={() => setActiveTab("media")}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                    activeTab === "media"
                      ? "bg-sky-100 border-sky-300 text-sky-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Share Media
                </button>
                <button
                  onClick={() => router.push(role === "DOCTOR" ? "/doctor/packages" : "/reception/dashboard")}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Register Package
                </button>
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

              {/* 4. Digital Prescription Section (Matching Requirements) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <h3 className="font-extrabold text-slate-900 text-sm">Digital Prescription</h3>

                {/* Draw Prescription Full Popup Trigger (No Canvas Pad on the page) */}
                <button
                  type="button"
                  onClick={() => setIsCanvasModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-left shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">Draw Prescription (Full Popup Pad)</div>
                      <div className="text-[10.5px] text-slate-500">Tap to open full drawing sheet • Solid white paper</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-md border border-slate-300 bg-slate-50 text-slate-700 font-bold text-[11px] shadow-2xs">
                    Open Full Pad ↗
                  </span>
                </button>

                {/* Physical Prescription Upload Buttons (Compact & Sleeker) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                    Physical Prescription (Optional if Canvas Drawing is used)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-700 cursor-pointer transition-colors text-[11px] shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-sky-600" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>

                    <label className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 font-bold text-white cursor-pointer transition-colors text-[11px] shadow-2xs">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Upload from device or take photo with camera. Syncs live with AWS S3.</p>
                </div>

                {/* Uploaded Prescriptions & Canvas Gallery */}
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs min-w-0">
                      <span>📤</span>
                      <span className="truncate">Uploaded Prescriptions & Canvas</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                        {uploadedImages.length}
                      </span>
                      {isUploading && (
                        <span className="text-[10px] text-sky-600 font-medium animate-pulse shrink-0">Uploading...</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {uploadedImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewerIndex(0);
                            setIsViewerOpen(true);
                          }}
                          className="px-2 py-1 rounded-md border border-sky-300 bg-sky-50 text-sky-700 font-bold text-[10.5px] hover:bg-sky-100 flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                      )}

                      <label className="px-2 py-1 rounded-md border border-sky-300 bg-sky-50 text-sky-700 font-bold text-[10.5px] cursor-pointer hover:bg-sky-100 flex items-center gap-1 shrink-0 shadow-2xs">
                        <Upload className="w-3 h-3" />
                        <span>+ Upload</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {uploadedImages.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50/50">
                      <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="font-semibold text-slate-600 text-xs">No prescriptions or canvas drawings uploaded yet</p>
                      <p className="text-[10px] text-slate-400">Draw on canvas or upload photos. Syncs live across Web & Mobile via AWS S3.</p>
                    </div>
                  ) : (
                    <div className="flex gap-2.5 overflow-x-auto py-1">
                      {uploadedImages.map((src, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-20 rounded-lg border border-slate-200 shrink-0 overflow-hidden cursor-pointer group hover:border-sky-400 transition-colors"
                          onClick={() => {
                            setViewerIndex(idx);
                            setRotation(0);
                            setZoomScale(1);
                            setIsViewerOpen(true);
                          }}
                        >
                          <img src={src} alt={`Rx ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                        className={`py-1.5 px-3 rounded-lg border font-bold text-xs transition-colors shrink-0 text-center ${
                          followUpInterval === interval
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
                  className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs transition-colors shadow-sm disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Send to Reception & Collect Fee"}
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
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors ${
                      historyTab === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    All ({patientHistory.length})
                  </button>
                  <button
                    onClick={() => setHistoryTab("prescriptions")}
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors ${
                      historyTab === "prescriptions" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    Prescriptions
                  </button>
                  <button
                    onClick={() => setHistoryTab("payments")}
                    className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-colors ${
                      historyTab === "payments" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
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
                            <div className="flex gap-1 mt-1">
                              {h.prescriptionImages.map((rxUrl: string, rIdx: number) => (
                                <img
                                  key={rIdx}
                                  src={rxUrl}
                                  alt="Rx"
                                  className="w-8 h-8 rounded border border-slate-300 object-cover cursor-pointer"
                                  onClick={() => {
                                    setUploadedImages(h.prescriptionImages);
                                    setViewerIndex(rIdx);
                                    setIsViewerOpen(true);
                                  }}
                                />
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
                    className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                      penColor === c.color ? "border-slate-900 scale-125" : "border-transparent"
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
                    className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
                      penWidth === w.width
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

          {/* Main Viewport */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {/* Prev Arrow */}
            {viewerIndex > 0 && (
              <button
                onClick={() => {
                  setViewerIndex(viewerIndex - 1);
                  setRotation(0);
                  setZoomScale(1);
                }}
                className="absolute left-4 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-transform hover:scale-110"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}

            <div className="max-w-3xl max-h-[70vh] flex items-center justify-center">
              <img
                src={uploadedImages[viewerIndex]}
                alt="Prescription"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Next Arrow */}
            {viewerIndex < uploadedImages.length - 1 && (
              <button
                onClick={() => {
                  setViewerIndex(viewerIndex + 1);
                  setRotation(0);
                  setZoomScale(1);
                }}
                className="absolute right-4 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-transform hover:scale-110"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </div>

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
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  idx === viewerIndex ? "border-sky-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={src} alt="Thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
