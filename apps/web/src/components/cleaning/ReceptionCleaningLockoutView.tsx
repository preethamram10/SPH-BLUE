"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  Upload,
  Trash2,
  Eye,
  X,
  Lock,
  Unlock,
  RefreshCw,
  Send,
  Check,
  CloudUpload,
} from "lucide-react";
import { toDDMMYYYY, getTodayDDMMYYYY } from "@/utils/cleaningDate";

interface Photo {
  id: string;
  url: string;
  key: string;
  uploadedAt: string;
}

interface LocalPhotoItem {
  id: string;
  url: string; // Preview URL (blob: or s3 https:)
  file?: File; // Present if waiting to upload to AWS
  isUploadedToS3: boolean;
  uploadedAt?: string;
  key?: string;
}

interface CleaningField {
  id: string;
  name: string;
  photos: Photo[];
  status: "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED";
  rejectReason?: string;
}

interface CleaningTask {
  id: string;
  branchId: string;
  branchName: string;
  assignedDate: string; // DD-MM-YYYY
  status: "PENDING_UPLOAD" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  assignedBy: string;
  assignedRole: "ADMIN" | "HR";
  fields: CleaningField[];
  reviewedBy?: string;
  reviewedRole?: string;
  reviewRemarks?: string;
}

interface Props {
  initialTask: CleaningTask;
  branchName: string;
  onUnlocked: () => void;
  isFullLockoutScreen?: boolean;
}

export default function ReceptionCleaningLockoutView({
  initialTask,
  branchName,
  onUnlocked,
  isFullLockoutScreen = false,
}: Props) {
  const [task, setTask] = useState<CleaningTask>(initialTask);

  // Local staged photos map: fieldId -> LocalPhotoItem[]
  const [stagedPhotosMap, setStagedPhotosMap] = useState<Record<string, LocalPhotoItem[]>>(() => {
    const initialMap: Record<string, LocalPhotoItem[]> = {};
    initialTask.fields.forEach((f) => {
      initialMap[f.id] = (f.photos || []).map((p) => ({
        id: p.id,
        url: p.url,
        isUploadedToS3: true,
        uploadedAt: p.uploadedAt,
        key: p.key,
      }));
    });
    return initialMap;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadFieldId, setActiveUploadFieldId] = useState<string | null>(null);

  // Manual Check Verification Status state (no background autofetching)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [checkStatusFeedback, setCheckStatusFeedback] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    setCheckStatusFeedback(null);
    try {
      const res = await fetch(
        `/api/cleaning/lockout?branchName=${encodeURIComponent(branchName)}`
      );
      const data = await res.json();
      if (data.success) {
        if (!data.lockout || data.task?.status === "APPROVED") {
          setCheckStatusFeedback("✓ Audit Approved! Unlocking Reception...");
          setTimeout(() => onUnlocked(), 700);
        } else if (data.task) {
          setTask(data.task);
          if (data.task.status === "UNDER_REVIEW") {
            setCheckStatusFeedback("⏳ Status: Under Review by Admin / HR. Please check back shortly.");
          } else if (data.task.status === "REJECTED") {
            setCheckStatusFeedback("⚠ Status: Re-upload required. Please check rejection remarks below.");
          } else {
            setCheckStatusFeedback(`Status: ${data.task.status}`);
          }
        }
      } else {
        setCheckStatusFeedback(data.error || "Could not retrieve status.");
      }
    } catch (err: any) {
      setCheckStatusFeedback("Network error checking status: " + err.message);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Handle local file selection (instant preview with checkmark, upload to AWS happens upon clicking "Send to Verification")
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeUploadFieldId) return;

    const newLocalItems: LocalPhotoItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      newLocalItems.push({
        id: `staged-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        url: previewUrl,
        file,
        isUploadedToS3: false,
      });
    }

    setStagedPhotosMap((prev) => ({
      ...prev,
      [activeUploadFieldId]: [...(prev[activeUploadFieldId] || []), ...newLocalItems],
    }));

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
    setActiveUploadFieldId(null);
  };

  const triggerUploadForField = (fieldId: string) => {
    setActiveUploadFieldId(fieldId);
    fileInputRef.current?.click();
  };

  // Remove photo locally
  const handleRemovePhoto = (fieldId: string, photoId: string) => {
    setStagedPhotosMap((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter((p) => p.id !== photoId),
    }));
  };

  // Check completion across all areas
  const totalAreas = task.fields.length;
  const completedAreasCount = task.fields.filter(
    (f) => (stagedPhotosMap[f.id] || []).length > 0
  ).length;
  const isAllAreasCompleted = totalAreas > 0 && completedAreasCount === totalAreas;

  // Submit all photos: Uploads any staged photos to AWS S3, then submits task for verification
  const handleSubmitForVerification = async () => {
    if (!isAllAreasCompleted) {
      alert("Please add photos for all required inspection areas before submitting.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgressText("Preparing photos for AWS S3 upload...");

    try {
      // 1. Count total pending photos to upload to AWS S3
      let totalPhotosToUpload = 0;
      Object.values(stagedPhotosMap).forEach((photos) => {
        photos.forEach((p) => {
          if (!p.isUploadedToS3 && p.file) totalPhotosToUpload++;
        });
      });

      let uploadedSoFar = 0;
      const finalFieldsData: { fieldId: string; photos: Photo[] }[] = [];

      for (const field of task.fields) {
        const localPhotos = stagedPhotosMap[field.id] || [];
        const uploadedPhotosForField: Photo[] = [];

        for (const photoItem of localPhotos) {
          if (photoItem.isUploadedToS3 && photoItem.url.startsWith("http")) {
            // Already in AWS S3
            uploadedPhotosForField.push({
              id: photoItem.id,
              url: photoItem.url,
              key: photoItem.key || "",
              uploadedAt: photoItem.uploadedAt || new Date().toISOString(),
            });
          } else if (photoItem.file) {
            // Upload to AWS S3 now
            uploadedSoFar++;
            setUploadProgressText(
              `Saving to AWS S3: Area "${field.name}" (${uploadedSoFar}/${totalPhotosToUpload})...`
            );

            const formData = new FormData();
            formData.append("file", photoItem.file);
            formData.append("branchName", branchName);
            formData.append("assignedDate", task.assignedDate);
            formData.append("fieldName", field.name);

            const res = await fetch("/api/cleaning/upload", {
              method: "POST",
              body: formData,
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.error || `Failed uploading photo for ${field.name}`);
            }

            uploadedPhotosForField.push({
              id: `p-${Date.now()}-${uploadedSoFar}`,
              url: data.url,
              key: data.key,
              uploadedAt: data.uploadedAt,
            });
          }
        }

        finalFieldsData.push({
          fieldId: field.id,
          photos: uploadedPhotosForField,
        });
      }

      // 2. Submit to database with action SUBMIT
      setUploadProgressText("Submitting inspection for Admin / HR review...");
      const res = await fetch(`/api/cleaning/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          fieldsData: finalFieldsData,
          submittedBy: `${branchName} Reception`,
        }),
      });

      const submitData = await res.json();
      if (!res.ok || !submitData.success) {
        throw new Error(submitData.error || "Submission failed.");
      }

      setTask(submitData.task);
    } catch (err: any) {
      alert("Verification Submission Failed: " + err.message);
    } finally {
      setIsSubmitting(false);
      setUploadProgressText("");
    }
  };

  return (
    <div
      className={
        isFullLockoutScreen
          ? "fixed inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-md flex flex-col justify-start items-center overflow-y-auto p-4 sm:p-6"
          : "w-full max-w-5xl mx-auto p-6 space-y-6"
      }
    >
      {/* Hidden File Input for Image Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 my-auto">
        {/* Header Banner */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700">
                  <Lock className="w-3.5 h-3.5" />
                  MANDATORY CLEANING AUDIT
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Assigned by {task.assignedBy} ({task.assignedRole})
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                {branchName} — Daily Hygiene Verification
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Inspection Date: {task.assignedDate}</span>
          </div>
        </div>

        {/* Status Callout Banner */}
        {task.status === "PENDING_UPLOAD" && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-extrabold text-sm">Photos Required for Reception Unlock</p>
              <p className="mt-0.5 text-amber-700">
                Please take or choose photos for each required area (Restroom, Reception, Sitting Area, etc.).
                Added areas will display a green checkmark (<strong>✓</strong>). All photos will be saved directly to AWS S3 when you click <strong>Send to Verification</strong>.
              </p>
            </div>
          </div>
        )}

        {task.status === "UNDER_REVIEW" && (
          <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5 animate-spin" />
                <div className="text-xs">
                  <p className="font-extrabold text-sm">Photos Saved &amp; Submitted for Verification</p>
                  <p className="mt-0.5 text-sky-700">
                    All photos are securely uploaded to AWS S3. Waiting for Admin or HR approval.
                  </p>
                </div>
              </div>

              {/* Manual Check Status Button */}
              <button
                type="button"
                disabled={isCheckingStatus}
                onClick={handleCheckStatus}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? "animate-spin" : ""}`} />
                <span>{isCheckingStatus ? "Checking Status..." : "Check Status"}</span>
              </button>
            </div>

            {checkStatusFeedback && (
              <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-sky-200 text-xs font-bold text-sky-800">
                {checkStatusFeedback}
              </div>
            )}
          </div>
        )}

        {task.status === "REJECTED" && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-extrabold text-sm">Re-upload Required by {task.reviewedRole || "Admin/HR"}</p>
              <p className="mt-0.5 text-rose-700 font-bold">
                Remarks: {task.reviewRemarks || "Some inspection areas did not pass hygiene verification."}
              </p>
              <p className="text-[11px] text-rose-600 mt-0.5">
                Please re-clean the flagged areas below, add new photos, and re-submit.
              </p>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-black text-slate-700">
            <span>
              Inspection Areas Completed: {completedAreasCount} of {totalAreas}
            </span>
            <span className={isAllAreasCompleted ? "text-emerald-600 font-extrabold" : "text-blue-600"}>
              {Math.round((completedAreasCount / (totalAreas || 1)) * 100)}% Ready
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isAllAreasCompleted ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${(completedAreasCount / (totalAreas || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Inspection Areas List */}
        <div className="space-y-4">
          {task.fields.map((field, idx) => {
            const localPhotos = stagedPhotosMap[field.id] || [];
            const hasPhotos = localPhotos.length > 0;
            const isRejected = field.status === "REJECTED";

            return (
              <div
                key={field.id}
                className={`p-5 rounded-2xl border-2 transition-all ${
                  isRejected
                    ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-200"
                    : hasPhotos
                    ? "bg-emerald-50/20 border-emerald-400 shadow-xs"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  {/* Area Title & Prominent Tick Mark */}
                  <div className="flex items-center gap-2.5">
                    {hasPhotos ? (
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                        {idx + 1}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">{field.name}</h3>
                        {hasPhotos && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            ✓ Done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2">
                    {field.status === "APPROVED" && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-rose-100 text-rose-800">
                        ⚠ Rejected — Re-upload
                      </span>
                    )}
                    {hasPhotos && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                        ✓ {localPhotos.length} Photo{localPhotos.length > 1 ? "s" : ""} Added
                      </span>
                    )}
                    {!hasPhotos && !isRejected && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" /> Photo Needed
                      </span>
                    )}

                    {task.status !== "UNDER_REVIEW" && (
                      <button
                        type="button"
                        onClick={() => triggerUploadForField(field.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-colors ${
                          hasPhotos
                            ? "bg-slate-800 hover:bg-slate-900 text-white"
                            : "bg-[#0284c7] hover:bg-[#0369a1] text-white"
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {hasPhotos ? "+ Add More" : "Add Photos / Camera"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Rejection Remark */}
                {isRejected && field.rejectReason && (
                  <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-700 mb-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black">Rejection Reason:</span> {field.rejectReason}
                    </div>
                  </div>
                )}

                {/* Staged & Uploaded Photos Gallery */}
                {localPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {localPhotos.map((photo, pIdx) => {
                      const displayImgSrc = photo.isUploadedToS3
                        ? `/api/cleaning/image?key=${encodeURIComponent(photo.key || photo.url)}`
                        : photo.url;

                      return (
                        <div
                          key={photo.id}
                          className="group relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-xs"
                        >
                          <img
                            src={displayImgSrc}
                            alt={`${field.name} ${pIdx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => setZoomedPhoto(displayImgSrc)}
                          />

                          {/* Staged indicator badge */}
                          <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            {photo.isUploadedToS3 ? "S3" : "Ready"}
                          </div>

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white transition-opacity">
                            <button
                              type="button"
                              onClick={() => setZoomedPhoto(displayImgSrc)}
                              className="p-1 rounded-md bg-white/20 hover:bg-white/40"
                              title="Preview Photo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {task.status !== "UNDER_REVIEW" && (
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(field.id, photo.id)}
                                className="p-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white"
                                title="Delete Photo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Verification Footer */}
        <div className="pt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="text-xs text-slate-500">
            {isAllAreasCompleted ? (
              <span className="font-extrabold text-emerald-600 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All {totalAreas} inspection areas have photos ready!
              </span>
            ) : (
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Please take photos for remaining {totalAreas - completedAreasCount} area(s).
              </span>
            )}
          </div>

          {task.status === "UNDER_REVIEW" && (
            <button
              type="button"
              disabled={isCheckingStatus}
              onClick={handleCheckStatus}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-sky-600 hover:bg-sky-700 text-white shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? "animate-spin" : ""}`} />
              <span>{isCheckingStatus ? "Checking Status..." : "Check Status & Unlock"}</span>
            </button>
          )}

          {task.status !== "APPROVED" && task.status !== "UNDER_REVIEW" && (
            <button
              type="button"
              disabled={!isAllAreasCompleted || isSubmitting}
              onClick={handleSubmitForVerification}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black shadow-md transition-all ${
                isAllAreasCompleted
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{uploadProgressText || "Saving to AWS S3 & Submitting..."}</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Save to AWS S3 &amp; Send to Verification</span>
                </>
              )}
            </button>
          )}

          {task.status === "APPROVED" && (
            <button
              type="button"
              onClick={onUnlocked}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
            >
              <Unlock className="w-4 h-4" />
              <span>Continue to Reception Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={zoomedPhoto}
              alt="Zoomed Area"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
