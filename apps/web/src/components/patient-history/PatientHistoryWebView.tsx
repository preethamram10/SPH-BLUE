"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  Clock,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  FileText,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Users,
  DollarSign,
  Receipt,
  Download,
  AlertCircle,
  Activity,
  ArrowUpDown,
  Maximize2,
  Trash2,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import FeeCheckoutAndInvoiceModal from "@/components/payment/FeeCheckoutAndInvoiceModal";

const resolvePrescriptionImageUrl = (url: string) => {
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

interface PatientHistoryWebViewProps {
  role: "RECEPTION" | "DOCTOR" | "ADMIN";
  sidebar: React.ReactNode;
}

type TabType = "history" | "prescriptions" | "payments";

export default function PatientHistoryWebView({ role, sidebar }: PatientHistoryWebViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = searchParams.get("id") || searchParams.get("regId") || "";
  const paramName = searchParams.get("name") || searchParams.get("patientName") || "Patient";
  const paramPhone = searchParams.get("phone") || searchParams.get("phoneNumber") || "";
  const paramBranch = searchParams.get("branch") || "Spiritual Homeopathy Clinic";

  const [currentPatientId, setCurrentPatientId] = useState(patientId);
  const [siblingProfiles, setSiblingProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [isSortNewest, setIsSortNewest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
  const [viewerIndex, setViewerIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const touchStartX = useRef<number>(0);

  // Load Data
  const loadData = useCallback(
    async (targetId?: string) => {
      setIsLoading(true);
      const lookupId = targetId || currentPatientId || patientId;
      try {
        const q = new URLSearchParams();
        if (lookupId) q.set("id", lookupId);
        if (paramPhone) q.set("phone", paramPhone);

        const res = await fetch(`/api/patient-history?${q.toString()}`);
        const data = await res.json();

        if (data.success) {
          if (data.patient) {
            setPatient({
              regId: data.patient.regId || lookupId,
              name: data.patient.name || paramName,
              phone: data.patient.phone || paramPhone,
              branch: data.patient.branch || paramBranch,
              diseases: data.patient.diseases || data.patient.subject || "",
              subject: data.patient.subject || data.patient.diseases || "",
              source: data.patient.source || data.patient.marketingSource || "Old Patient",
            });
            setCurrentPatientId(data.patient.regId || lookupId);
          }
          if (Array.isArray(data.siblingProfiles)) {
            setSiblingProfiles(data.siblingProfiles);
          }
          if (data.stats) {
            setStats(data.stats);
          }
          if (data.latestAppointment) {
            setLatestAppointment(data.latestAppointment);
          }
          if (Array.isArray(data.appointments)) {
            setAppointments(data.appointments);

            // Collect all prescription images
            const imgs: any[] = [];
            data.appointments.forEach((a: any) => {
              if (Array.isArray(a.prescriptionImages)) {
                a.prescriptionImages.forEach((url: string, imgIdx: number) => {
                  if (url) {
                    imgs.push({
                      url,
                      date: a.appointmentDate || a.createdAt?.slice(0, 10) || "Recent Visit",
                      appointmentId: a.id,
                      index: imgIdx,
                      doctorName: a.doctorName,
                    });
                  }
                });
              }
            });
            setAllImages(imgs);
          }
        }
      } catch (err: any) {
        console.error("Failed to load patient history:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPatientId, patientId, paramPhone, paramName, paramBranch]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard navigation for viewer
  useEffect(() => {
    if (!isViewerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setViewerIndex((idx) => Math.max(0, idx - 1));
        setRotation(0);
        setZoomScale(1);
      } else if (e.key === "ArrowRight") {
        setViewerIndex((idx) => Math.min(viewerImages.length - 1, idx + 1));
        setRotation(0);
        setZoomScale(1);
      } else if (e.key === "Escape") {
        setIsViewerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isViewerOpen, viewerImages.length]);

  const cleanPhone = (patient.phone || "").replace(/\D/g, "").slice(-10);

  const handleSwitchProfile = (newId: string) => {
    setCurrentPatientId(newId);
    loadData(newId);
  };

  const handleCall = () => {
    if (!cleanPhone) {
      alert("No valid phone number for this patient.");
      return;
    }
    window.open(`tel:${cleanPhone}`, "_self");
  };

  const handleWhatsApp = () => {
    if (!cleanPhone) {
      alert("No valid phone number for this patient.");
      return;
    }
    const msg = `Hello ${patient.name}, greetings from Spiritual Homeopathy Clinic! This is regarding your consultation and medical records.`;
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleOpenViewer = (imagesList: string[], index = 0) => {
    setViewerImages(imagesList);
    setViewerIndex(index);
    setRotation(0);
    setZoomScale(1);
    setIsViewerOpen(true);
  };

  // Compress image before upload (max 1600px width/height, quality 0.75)
  const compressImageFile = async (file: File, maxWidth = 1600, quality = 0.75): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadRx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    try {
      setIsUploading(true);
      // Compress image client-side before sending to S3 / server
      const file = await compressImageFile(rawFile, 1600, 0.75);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patient.regId || "SPH-GEN");

      const res = await fetch("/api/patient-file/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        // Attach to patient history
        await fetch("/api/patient-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ADD_IMAGE",
            regId: patient.regId,
            appointmentId: latestAppointment?.id,
            imageUrl: data.url,
            patientName: patient.name,
            phone: cleanPhone,
            branch: patient.branch,
          }),
        });

        setFeedback({ type: "success", message: "Prescription compressed & uploaded to patient record successfully!" });
        loadData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to upload prescription." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error uploading image." });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Delete Prescription Image from DB & UI
  const handleDeleteImage = async (appointmentId?: string, imageIndex?: number, imageUrl?: string) => {
    if (!window.confirm("Are you sure you want to delete this prescription scan from this patient's record?")) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/patient-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_IMAGE",
          regId: patient.regId,
          appointmentId,
          imageIndex,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: "Prescription scan deleted successfully." });
        await loadData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to delete prescription scan." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error deleting prescription scan." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCurrentViewerImage = async () => {
    const currentUrl = viewerImages[viewerIndex];
    if (!currentUrl) return;

    const found = allImages.find((img) => img.url === currentUrl);
    await handleDeleteImage(found?.appointmentId, found?.index, currentUrl);

    const nextImages = viewerImages.filter((_, idx) => idx !== viewerIndex);
    if (nextImages.length === 0) {
      setIsViewerOpen(false);
      setViewerImages([]);
    } else {
      setViewerImages(nextImages);
      setViewerIndex((prev) => Math.min(prev, nextImages.length - 1));
    }
  };

  const sortedAppointments = useMemo(() => {
    const list = [...appointments];
    list.sort((a, b) => {
      const dtA = a.appointmentDate || a.createdAt || "";
      const dtB = b.appointmentDate || b.createdAt || "";
      return isSortNewest ? dtB.localeCompare(dtA) : dtA.localeCompare(dtB);
    });
    return list;
  }, [appointments, isSortNewest]);

  const latestDateFormatted = latestAppointment?.appointmentDate || "N/A";

  const patientFileUrl =
    role === "DOCTOR"
      ? `/doctor/patient-file?id=${latestAppointment?.id || patient.regId}&name=${encodeURIComponent(patient.name)}&phone=${encodeURIComponent(cleanPhone)}&branch=${encodeURIComponent(patient.branch)}&registrationId=${encodeURIComponent(patient.regId)}`
      : `/reception/patient-file?id=${latestAppointment?.id || patient.regId}&name=${encodeURIComponent(patient.name)}&phone=${encodeURIComponent(cleanPhone)}&branch=${encodeURIComponent(patient.branch)}&registrationId=${encodeURIComponent(patient.regId)}`;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      {sidebar}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors shadow-2xs"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-slate-900 truncate">{patient.name}</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                    {patient.regId}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  📞 {cleanPhone || "No Mobile"} • {patient.branch || "Spiritual Homeopathy"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {cleanPhone && (
                <>
                  <button
                    type="button"
                    onClick={handleCall}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-[#0284c7] font-bold text-xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 2C6.495 2 2 6.494 2 12.029c0 1.83.493 3.555 1.348 5.048L2 22l5.06-1.328a9.98 9.98 0 0 0 4.971 1.323h.004c5.534 0 10.029-4.494 10.029-10.028A9.99 9.99 0 0 0 12.031 2zM12.03 20.31h-.003a8.31 8.31 0 0 1-4.237-1.156l-.304-.18-3.146.825.84-3.067-.198-.315a8.297 8.297 0 0 1-1.272-4.388c0-4.587 3.732-8.319 8.32-8.319 2.222 0 4.312.866 5.883 2.438a8.28 8.28 0 0 1 2.435 5.88c0 4.588-3.732 8.32-8.318 8.32zm4.557-6.223c-.25-.125-1.477-.728-1.706-.81-.228-.083-.395-.125-.562.125-.166.25-.644.81-.79 1-.145.187-.291.208-.541.083-.25-.125-1.054-.388-2.008-1.238-.742-.662-1.243-1.48-1.389-1.73-.146-.25-.016-.385.109-.51.113-.112.25-.291.375-.437.125-.145.166-.25.25-.416.083-.167.041-.312-.021-.437-.063-.125-.563-1.354-.77-1.854-.203-.487-.41-.42-.563-.428l-.48-.009c-.166 0-.437.062-.666.312-.229.25-.875.854-.875 2.083 0 1.229.896 2.416 1.021 2.583.125.166 1.761 2.688 4.266 3.769.596.257 1.061.41 1.424.526.6.19 1.144.163 1.576.1.481-.072 1.477-.604 1.685-1.187.208-.583.208-1.083.146-1.187-.063-.105-.23-.167-.479-.292z" />
                    </svg>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                </>
              )}

              {role === "DOCTOR" && (
                <Link
                  href={patientFileUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Patient File</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Feedback Alert */}
        {feedback && (
          <div className="px-4 sm:px-6 pt-3">
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs underline hover:opacity-75 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 px-4 sm:px-6 py-4 max-w-7xl w-full mx-auto space-y-4">
          {/* Sibling Profile Switcher (Multiple family members sharing phone) */}
          {siblingProfiles.length > 1 && (
            <div className="bg-white rounded-xl border border-sky-100 p-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <Users className="w-4 h-4 text-[#0284c7]" />
                  <span>FAMILY PROFILES ({siblingProfiles.length})</span>
                </div>
                <span className="text-[11px] text-slate-400">Click profile to switch records</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {siblingProfiles.map((pItem) => {
                  const isSelected =
                    (pItem.regId || "").trim().toUpperCase() === (currentPatientId || "").trim().toUpperCase();

                  return (
                    <button
                      key={pItem.regId}
                      type="button"
                      onClick={() => handleSwitchProfile(pItem.regId)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-[#0284c7] border-[#0284c7] text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{pItem.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {pItem.regId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hero Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs bg-gradient-to-r from-sky-50/40 via-white to-emerald-50/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  TOTAL PAID LIFETIME
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                  ₹{stats.totalPaid.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Across {stats.totalVisits} recorded consultations • {patient.diseases || "General Homeopathy Care"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-extrabold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>{stats.totalVisits} Total Visits</span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{stats.paidCount} Paid Invoices</span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>{allImages.length} Prescriptions</span>
                </div>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>{isUploading ? "Uploading..." : "+ Upload Rx Scan"}</span>
                  <input type="file" accept="image/*" onChange={handleUploadRx} disabled={isUploading} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Patient Details Info Block: Branch, Subject, Mobile Number, Source */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  BRANCH
                </span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <MapPin className="w-4 h-4 text-[#0284c7] shrink-0" />
                  <span className="truncate">{patient.branch || "Spiritual Homeopathy"}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  SUBJECT / COMPLAINT
                </span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate" title={patient.subject || patient.diseases || "General Care"}>
                    {patient.subject || patient.diseases || "General Care"}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  MOBILE NUMBER
                </span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 font-mono">
                  <Phone className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>{cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "No Mobile"}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  PATIENT SOURCE
                </span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Users className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                    {patient.source || "Old Patient"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Three Interactive Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === "history"
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All History ({stats.totalVisits})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("prescriptions")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === "prescriptions"
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Prescriptions ({allImages.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === "payments"
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payments &amp; Billing ({appointments.length})</span>
            </button>

            <div className="ml-auto shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSortNewest((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-2xs"
              >
                <ArrowUpDown className="w-3 h-3 text-[#0284c7]" />
                <span>{isSortNewest ? "Newest First" : "Oldest First"}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: ALL HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 font-semibold text-xs">
                  Loading patient consultation history...
                </div>
              ) : sortedAppointments.length === 0 ? (
                <div className="p-10 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-800 text-sm">No Recorded Consultations</p>
                  <p className="text-xs text-slate-500">There are no previous visit records found for this patient.</p>
                </div>
              ) : (
                sortedAppointments.map((item, idx) => {
                  const isPaid = item.isFeeCollected || item.status === "COMPLETED";
                  const actualPaid = typeof item.totalPaid === "number" && item.totalPaid > 0
                    ? item.totalPaid
                    : (isPaid ? (item.totalAmountDue || item.consultationFee || 0) : 0);
                  const rxImages = item.prescriptionImages || [];

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                    >
                      {/* Visit Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-extrabold text-[10px]">
                            VISIT #{item.visitNumber || sortedAppointments.length - idx}
                          </span>
                          <span className="font-black text-slate-900 text-xs">
                            {item.appointmentDate || "Date N/A"}
                          </span>
                          {item.timeSlot && (
                            <span className="text-xs text-slate-500 font-semibold">• {item.timeSlot}</span>
                          )}
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isPaid ? "✓ Fee Paid" : "⏳ Payment Pending"}
                        </span>
                      </div>

                      {/* Doctor, Branch, Mobile & Consultation Mode Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <Activity className="w-3.5 h-3.5 text-[#0284c7]" />
                          <span>Doctor: {item.doctorName || "Dr. Prashanth K Vaidya"}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>Branch: {item.branch || patient.branch}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>Mobile: {cleanPhone || "N/A"}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Mode:{" "}
                            {(item.consultationMode || item.mode || "").toLowerCase().includes("online")
                              ? "Online"
                              : "In-Clinic"}
                          </span>
                        </div>
                      </div>

                      {/* Clinical Notes / Subject / Diagnosis */}
                      {(item.subject || item.diagnosisNotes || patient.diseases) && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                          <span className="font-black text-slate-800 block mb-1">Subject / Notes &amp; Diagnosis:</span>
                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{item.subject || item.diagnosisNotes || patient.diseases}</p>
                        </div>
                      )}

                      {/* Follow-up recommendation */}
                      {(item.followUpInterval || item.followUpDate) && (
                        <div className="flex items-center gap-2 text-xs font-bold text-sky-700 bg-sky-50/70 p-2 rounded-lg border border-sky-100">
                          <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
                          <span>
                            Recommended Follow-up:{" "}
                            {item.followUpDate
                              ? item.followUpInterval &&
                                item.followUpInterval !== "Custom Date" &&
                                item.followUpInterval !== "No Follow-up" &&
                                item.followUpInterval !== item.followUpDate
                                ? `${item.followUpInterval} (${item.followUpDate})`
                                : item.followUpDate
                              : item.followUpInterval &&
                                item.followUpInterval !== "Custom Date" &&
                                item.followUpInterval !== "No Follow-up"
                              ? item.followUpInterval
                              : "Scheduled"}
                          </span>
                        </div>
                      )}

                      {/* Prescription Images in this Visit */}
                      {rxImages.length > 0 && (
                        <div className="border-t border-slate-100 pt-2.5">
                          <span className="text-[11px] font-black text-slate-700 block mb-1.5">
                            Prescriptions for this Visit ({rxImages.length}):
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            {rxImages.map((imgUrl: string, imgIdx: number) => (
                                <div
                                  key={imgIdx}
                                  onClick={() => handleOpenViewer(rxImages, imgIdx)}
                                  className="group relative w-16 h-16 rounded-xl border border-slate-300 overflow-hidden cursor-pointer shadow-2xs hover:border-[#0284c7] transition-all"
                                  title="Click to open prescription viewer"
                                >
                                  <img
                                    src={resolvePrescriptionImageUrl(imgUrl)}
                                    alt="Prescription Scan"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Maximize2 className="w-4 h-4" />
                                  </div>
                                  <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-bold px-1 rounded-tl">
                                    Rx {imgIdx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteImage(item.id, imgIdx, imgUrl);
                                    }}
                                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xs cursor-pointer"
                                    title="Delete scan"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: PRESCRIPTIONS GALLERY */}
          {activeTab === "prescriptions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Digital &amp; Uploaded Prescriptions</h3>
                  <p className="text-xs text-slate-500">
                    Total {allImages.length} prescription scans and drawings across all visits
                  </p>
                </div>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Upload New Scan</span>
                  <input type="file" accept="image/*" onChange={handleUploadRx} disabled={isUploading} className="hidden" />
                </label>
              </div>

              {allImages.length === 0 ? (
                <div className="p-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-800 text-sm">No Prescriptions Uploaded</p>
                  <p className="text-xs text-slate-500">Prescription scans drawn or uploaded during visits will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {allImages.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => handleOpenViewer(allImages.map((m) => m.url), i)}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:border-[#0284c7] transition-all cursor-pointer group flex flex-col"
                    >
                      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                        <img
                          src={resolvePrescriptionImageUrl(img.url)}
                          alt="Rx"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5">
                          <Maximize2 className="w-5 h-5" />
                          <span className="text-xs font-bold">View</span>
                        </div>
                        <span className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                          Page {img.index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(img.appointmentId, img.index, img.url);
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center opacity-85 hover:opacity-100 transition-opacity z-10 shadow-xs cursor-pointer"
                          title="Delete this scan from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-2 border-t border-slate-100">
                        <div className="font-bold text-slate-800 text-[11px] truncate">{img.date}</div>
                        <div className="text-[10px] text-slate-400 truncate">{img.doctorName || "Doctor Prescription"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS & BILLING */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              {/* Financial Metrics Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Revenue Collected</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">₹{stats.totalPaid.toLocaleString("en-IN")}</div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{stats.paidCount} Completed Transactions</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Paid Consultations</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{stats.paidCount}</div>
                  <span className="text-[11px] text-emerald-600 font-bold mt-0.5 block">100% Cleared</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Dues</span>
                  <div className="text-2xl font-black text-amber-500 mt-1">{stats.unpaidCount}</div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Payment Due at Reception</span>
                </div>
              </div>

              {/* Invoices List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#0284c7]" />
                    <h3 className="font-extrabold text-slate-900 text-sm">Consultation Billing &amp; Invoices</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">{appointments.length} Total Visits</span>
                </div>

                {appointments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No billing records found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Visit Date</th>
                          <th className="py-3 px-4">Doctor</th>
                          <th className="py-3 px-4">Branch</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4 text-right">Amount (₹)</th>
                          <th className="py-3 px-4 text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {appointments.map((a, i) => {
                          const isPaid = a.isFeeCollected || a.status === "COMPLETED";
                          const actualPaid = typeof a.totalPaid === "number" && a.totalPaid > 0
                            ? a.totalPaid
                            : (isPaid ? (a.totalAmountDue || a.consultationFee || 0) : 0);
                          const pendingDue = Number(a.payLaterAmount || a.pendingBalance || 0);

                          return (
                            <tr key={a.id || i} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {a.appointmentDate || "Date N/A"}
                              </td>
                              <td className="py-3 px-4 text-slate-700">{a.doctorName || "Dr. Prashanth"}</td>
                              <td className="py-3 px-4 text-slate-500">{a.branch || patient.branch}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isPaid
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {isPaid ? "Paid & Cleared" : "Pending Collection"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-medium">
                                {a.paymentMethod || "Cash / Counter"}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-slate-900">
                                <div>₹{actualPaid.toLocaleString("en-IN")}</div>
                                {pendingDue > 0 && (
                                  <div className="text-[10px] text-rose-600 font-bold">Due: ₹{pendingDue}</div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoiceAppt({
                                      ...a,
                                      patientName: patient.name || a.patientName,
                                      phoneNumber: patient.phone || a.phoneNumber,
                                      registrationId: patient.regId || a.registrationId,
                                    });
                                    setIsInvoiceModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                                  title="View Official Receipt & Tax Invoice"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Invoice</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FULL-SCREEN INTERACTIVE PRESCRIPTION VIEWER (WITH < AND > ARROWS & SWIPING) */}
      {isViewerOpen && viewerImages.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col justify-between p-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 px-2">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-white font-bold text-xs">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{viewerIndex + 1} / {viewerImages.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>90°</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.75, Math.round((z - 0.25) * 100) / 100))}
                disabled={zoomScale <= 0.75}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                disabled={zoomScale >= 3}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {(rotation !== 0 || zoomScale !== 1) && (
                <button
                  type="button"
                  onClick={() => {
                    setRotation(0);
                    setZoomScale(1);
                  }}
                  className="px-2 py-1 text-sky-400 font-bold text-xs hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteCurrentViewerImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer ml-1 shadow-sm transition-colors"
                title="Delete this prescription scan from database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={() => setIsViewerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center ml-2 cursor-pointer"
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
              if (diff > 40 && viewerIndex < viewerImages.length - 1) {
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
            {viewerImages.length > 1 && (
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
                src={resolvePrescriptionImageUrl(viewerImages[viewerIndex])}
                alt="Prescription"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl pointer-events-none"
              />
            </div>

            {/* Next Arrow (>) */}
            {viewerImages.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (viewerIndex < viewerImages.length - 1) {
                    setViewerIndex(viewerIndex + 1);
                    setRotation(0);
                    setZoomScale(1);
                  }
                }}
                disabled={viewerIndex === viewerImages.length - 1}
                className="absolute right-4 z-10 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-105 shadow-2xl cursor-pointer"
                title="Next image (>)"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* Swipe Hint */}
          {viewerImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 py-1 text-white/60 text-[11px] font-semibold select-none">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Tap &lt; and &gt; arrows or swipe to flip images ({viewerIndex + 1} of {viewerImages.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Bottom Thumbnails Strip */}
          <div className="border-t border-white/10 pt-3 flex justify-center gap-2 overflow-x-auto pb-2">
            {viewerImages.map((src, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setViewerIndex(idx);
                  setRotation(0);
                  setZoomScale(1);
                }}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  idx === viewerIndex ? "border-sky-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={resolvePrescriptionImageUrl(src)} alt="Thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Official Payment Receipt & Tax Invoice Modal */}
      {isInvoiceModalOpen && selectedInvoiceAppt && (
        <FeeCheckoutAndInvoiceModal
          isOpen={isInvoiceModalOpen}
          appointment={selectedInvoiceAppt}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoiceAppt(null);
          }}
        />
      )}
    </div>
  );
}

