"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  FolderPlus,
  Search,
  Plus,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Users,
  RefreshCw,
  FileText,
  Clock,
  Building2,
  DollarSign,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Maximize2,
  UserCheck,
} from "lucide-react";

// Client-side image compression
async function compressImageFile(file: File, maxWidth = 1600, quality = 0.75): Promise<File> {
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
}

function OldPrescriptionEntryContent() {
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");

  // Form States
  const [regId, setRegId] = useState("");
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idStatus, setIdStatus] = useState<"IDLE" | "EXISTS" | "NEW">("IDLE");
  const [existingPatientData, setExistingPatientData] = useState<any>(null);

  const [phone, setPhone] = useState("");
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([]);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [visitDate, setVisitDate] = useState("");

  // Prescription Scans (S3)
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  // Session Recent Entries
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) setBranchName(saved);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    setVisitDate(today);
  }, []);

  // 1. Auto-Capitalize MRN on Change & Check
  const handleRegIdChange = (val: string) => {
    const upper = val.toUpperCase().replace(/\s+/g, "");
    setRegId(upper);
    setIdStatus("IDLE");
    setExistingPatientData(null);
  };

  const checkPatientId = useCallback(async (targetId?: string) => {
    const idToCheck = (targetId || regId).trim().toUpperCase();
    if (!idToCheck) return;

    try {
      setIsCheckingId(true);
      const res = await fetch(`/api/reception/patients?regId=${encodeURIComponent(idToCheck)}`);
      const data = await res.json();

      if (data.success && data.patient) {
        setIdStatus("EXISTS");
        setExistingPatientData(data.patient);
      } else {
        setIdStatus("NEW");
        setExistingPatientData(null);
      }
    } catch {
      setIdStatus("IDLE");
    } finally {
      setIsCheckingId(false);
    }
  }, [regId]);

  // Auto-Generate New Monotonic ID (no collision with regular booking)
  const handleGenerateId = async () => {
    try {
      setIsCheckingId(true);
      const res = await fetch(`/api/patients/generate-id?branch=${encodeURIComponent(branchName)}`);
      const data = await res.json();
      if (data.success && data.registrationId) {
        setRegId(data.registrationId.toUpperCase());
        setIdStatus("NEW");
        setExistingPatientData(null);
      } else {
        alert("Failed to generate new ID from sequence.");
      }
    } catch {
      alert("Network error generating ID.");
    } finally {
      setIsCheckingId(false);
    }
  };

  // Populate from Existing Patient
  const applyExistingPatient = (p: any) => {
    if (!p) return;
    setRegId(p.regId || regId);
    setPatientName(p.name || "");
    if (p.phone) setPhone((p.phone || "").replace(/\D/g, "").slice(-10));
    if (p.branch) setBranchName(p.branch);
  };

  // 2. Phone Number & Family Profiles Detection
  const handlePhoneChange = async (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);

    if (digits.length === 10) {
      try {
        setIsSearchingPhone(true);
        const res = await fetch(`/api/reception/patients/by-phone?phone=${digits}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.profiles) && data.profiles.length > 0) {
          setFamilyProfiles(data.profiles);
        } else {
          setFamilyProfiles([]);
        }
      } catch {
        setFamilyProfiles([]);
      } finally {
        setIsSearchingPhone(false);
      }
    } else {
      setFamilyProfiles([]);
    }
  };

  // 3. Upload & Compress Prescription Scans to AWS S3
  const handleImageFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingImages(true);
      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const rawFile = files[i];
        // Client-side compression
        const compressed = await compressImageFile(rawFile, 1600, 0.75);

        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("patientId", regId || "SPH-OLD");

        const res = await fetch("/api/patient-file/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          newUrls.push(data.url);
        }
      }

      setUploadedImages((prev) => [...prev, ...newUrls]);
    } catch {
      alert("Failed to upload prescription scans.");
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 4. Submit & Save Old Entry into Database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regId.trim()) {
      alert("Please provide or generate a Patient MRN ID.");
      return;
    }
    if (!patientName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);

      const res = await fetch("/api/reception/old-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: "success",
          message: `Old record successfully saved! Patient ${data.patient?.name} (${data.patient?.regId}) is now active in database.`,
        });

        const entrySummary = {
          regId: data.patient?.regId || regId,
          name: data.patient?.name || patientName,
          phone,
          visitDate,
          imagesCount: uploadedImages.length,
          doctorName: "Dr. Prashanth K Vaidya",
          createdAt: new Date().toLocaleTimeString(),
        };

        setSubmittedResult(entrySummary);
        setRecentEntries((prev) => [entrySummary, ...prev]);

        // Reset form for next entry
        setRegId("");
        setPatientName("");
        setPhone("");
        setUploadedImages([]);
        setIdStatus("IDLE");
        setExistingPatientData(null);
        setFamilyProfiles([]);
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to save old prescription record.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error saving old prescription entry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      <ReceptionSidebar activePage="old-entry" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284c7]">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-slate-900">Old Prescription Data Entry</h1>
                  <span className="bg-sky-50 text-[#0284c7] font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-sky-200">
                    Digitization
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {branchName} • Backlog prescription sheets digitization &amp; patient profile entry
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/reception/all-patients"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
              >
                <Users className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>All Patients List</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Feedback Alert */}
        {feedback && (
          <div className="px-6 pt-4">
            <div
              className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs underline hover:opacity-75 cursor-pointer ml-3"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 px-6 py-5 max-w-6xl w-full mx-auto space-y-6">
          {/* Main Entry Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0284c7]" />
                <h2 className="text-sm font-extrabold text-slate-900">Enter Historical Patient Record &amp; Prescription</h2>
              </div>
              <span className="text-xs text-slate-400 font-semibold">* All fields auto-save to regular database</span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* SECTION 1: Patient MRN ID Auto-Capitalize & Verification */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Patient Registration ID / MRN *
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Letters capitalize automatically. System checks for existing records to prevent duplicates.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => checkPatientId()}
                      disabled={!regId.trim() || isCheckingId}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isCheckingId ? "Checking..." : "Verify ID"}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateId}
                      disabled={isCheckingId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-[#0284c7] font-bold text-xs hover:bg-sky-100 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate New ID</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regId}
                    onChange={(e) => handleRegIdChange(e.target.value)}
                    onBlur={() => checkPatientId()}
                    placeholder="e.g. SPH-KPB-0001 (auto-capitalized)"
                    className="w-full font-mono font-bold uppercase px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] tracking-wider text-slate-900 shadow-2xs"
                  />
                </div>

                {/* Status Badges */}
                {idStatus === "EXISTS" && existingPatientData && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-black text-amber-900">
                          Existing Patient Found: {existingPatientData.name} ({existingPatientData.regId})
                        </span>
                        <p className="text-[11px] text-amber-700">
                          Mobile: {existingPatientData.phone} • {existingPatientData.branch}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyExistingPatient(existingPatientData)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-2xs cursor-pointer transition-colors"
                    >
                      Use Profile
                    </button>
                  </div>
                )}

                {idStatus === "NEW" && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>✓ ID is available. New patient record will be generated.</span>
                  </div>
                )}
              </div>

              {/* SECTION 2: Mobile Number, Patient Name & Visit Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] font-semibold shadow-2xs"
                    />
                  </div>

                  {/* Sibling / Family Profiles sharing this phone */}
                  {familyProfiles.length > 0 && (
                    <div className="mt-2 p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-sky-800 block">
                        Existing Family Profiles for this Phone:
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {familyProfiles.map((prof) => (
                          <button
                            key={prof.regId}
                            type="button"
                            onClick={() => applyExistingPatient(prof)}
                            className="px-2.5 py-1 bg-white border border-sky-200 hover:bg-sky-100 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <span>{prof.name}</span>
                            <span className="text-[10px] text-sky-600 font-mono">({prof.regId})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] font-bold shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Date of Visit (Prescription Date) *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] font-semibold shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Upload Prescription Scans to AWS S3 (Compressed) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Upload Prescription Scan Images (AWS S3)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Multiple pages supported. Photos are auto-compressed and saved permanently into AWS S3 bucket.
                    </p>
                  </div>

                  <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs cursor-pointer shadow-xs transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingImages ? "Compressing & Uploading..." : "+ Select Prescription Scans"}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFilesSelected}
                      disabled={isUploadingImages}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Uploaded Images List */}
                {uploadedImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                    {uploadedImages.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-square rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shadow-2xs flex flex-col justify-between"
                      >
                        <img src={url} alt={`Scan ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                          Page {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                          title="Remove this scan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-1.5 bg-slate-50/50">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No prescription scans attached yet</p>
                    <p className="text-[11px] text-slate-400">
                      Click the button above to upload camera photos or document scans.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setRegId("");
                    setPatientName("");
                    setPhone("");
                    setUploadedImages([]);
                    setIdStatus("IDLE");
                    setExistingPatientData(null);
                    setFamilyProfiles([]);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  Reset Form
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImages}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Old Record to Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Actions after Submission */}
          {submittedResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700">RECORD SAVED CONFIRMATION</span>
                  <h3 className="text-base font-black text-emerald-950 mt-0.5">
                    {submittedResult.name} • {submittedResult.regId}
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    Historical visit for {submittedResult.visitDate} with {submittedResult.imagesCount} prescription scan(s) is now part of the active clinic database!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/reception/patient-history?id=${encodeURIComponent(submittedResult.regId)}&phone=${encodeURIComponent(submittedResult.phone)}&name=${encodeURIComponent(submittedResult.name)}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-xs transition-colors"
                  >
                    <span>View Patient History</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSubmittedResult(null)}
                    className="px-3 py-2 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    Enter Another
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recently Digitized Old Records in this Session */}
          {recentEntries.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0284c7]" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Digitized in this Session ({recentEntries.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">Available immediately in patient list search</span>
              </div>

              <div className="divide-y divide-slate-100">
                {recentEntries.map((rec, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-[#0284c7]">{rec.regId}</span>
                      <span className="font-black text-xs text-slate-900">{rec.name}</span>
                      <span className="text-xs text-slate-500 font-medium">📞 {rec.phone}</span>
                      <span className="text-xs text-slate-400">• Visit: {rec.visitDate}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        {rec.imagesCount} Rx Scans
                      </span>
                    </div>

                    <Link
                      href={`/reception/patient-history?id=${encodeURIComponent(rec.regId)}&phone=${encodeURIComponent(rec.phone)}&name=${encodeURIComponent(rec.name)}`}
                      className="text-xs font-bold text-[#0284c7] hover:underline flex items-center gap-1"
                    >
                      <span>View History</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function OldPrescriptionEntryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400 font-semibold">Loading Old Prescription Entry...</div>}>
      <OldPrescriptionEntryContent />
    </Suspense>
  );
}

