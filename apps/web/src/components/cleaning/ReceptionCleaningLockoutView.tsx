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
} from "lucide-react";
import { toDDMMYYYY, getTodayDDMMYYYY } from "@/utils/cleaningDate";

interface Photo {
  id: string;
  url: string;
  key: string;
  uploadedAt: string;
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
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadField, setActiveUploadField] = useState<CleaningField | null>(null);

  // Poll for status updates (e.g. when HR or Admin approves)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/cleaning/lockout?branchName=${encodeURIComponent(branchName)}`
        );
        const data = await res.json();
        if (data.success) {
          if (!data.lockout) {
            // Unlocked!
            onUnlocked();
          } else if (data.task) {
            setTask(data.task);
          }
        }
      } catch (err) {
        // Silent poll error
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [branchName, onUnlocked]);

  // Upload handler for photos
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeUploadField) return;

    setUploadingFieldId(activeUploadField.id);
    const uploadedPhotos: Photo[] = [...activeUploadField.photos];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("branchName", branchName);
        formData.append("assignedDate", task.assignedDate);
        formData.append("fieldName", activeUploadField.name);

        const res = await fetch("/api/cleaning/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(`Upload failed: ${data.error || "Could not upload to S3"}`);
          continue;
        }

        uploadedPhotos.push({
          id: `p-${Date.now()}-${i}`,
          url: data.url,
          key: data.key,
          uploadedAt: data.uploadedAt,
        });
      }

      // Update local task state
      const updatedFields = task.fields.map((f) => {
        if (f.id === activeUploadField.id) {
          return {
            ...f,
            photos: uploadedPhotos,
            status: "UPLOADED" as const,
            rejectReason: undefined,
          };
        }
        return f;
      });

      setTask({ ...task, fields: updatedFields });
    } catch (err: any) {
      alert("Upload error: " + err.message);
    } finally {
      setUploadingFieldId(null);
      setActiveUploadField(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerUploadForField = (field: CleaningField) => {
    setActiveUploadField(field);
    fileInputRef.current?.click();
  };

  // Remove photo
  const handleRemovePhoto = (fieldId: string, photoId: string) => {
    const updatedFields = task.fields.map((f) => {
      if (f.id === fieldId) {
        const remaining = f.photos.filter((p) => p.id !== photoId);
        return {
          ...f,
          photos: remaining,
          status: remaining.length > 0 ? f.status : ("PENDING" as const),
        };
      }
      return f;
    });
    setTask({ ...task, fields: updatedFields });
  };

  // Check if all fields have photos
  const allFieldsUploaded = task.fields.every((f) => f.photos.length > 0);
  const totalUploaded = task.fields.filter((f) => f.photos.length > 0).length;

  // Submit all photos for verification
  const handleSubmitForVerification = async () => {
    if (!allFieldsUploaded) {
      alert("Please upload photos for all inspection areas before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fieldsData = task.fields.map((f) => ({
        fieldId: f.id,
        photos: f.photos,
      }));

      const res = await fetch(`/api/cleaning/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          fieldsData,
          submittedBy: `${branchName} Reception`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Submission failed.");
        return;
      }

      setTask(data.task);
      setSubmitSuccess(true);
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
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
      {/* Hidden File Input */}
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
                Please capture or upload photos for each required area (Bathroom, Sitting Area, Reception, etc.).
                All photos are uploaded directly to clinic cloud storage (AWS S3).
              </p>
            </div>
          </div>
        )}

        {task.status === "UNDER_REVIEW" && (
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 flex items-start gap-3">
            <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5 animate-spin" />
            <div className="text-xs">
              <p className="font-extrabold text-sm">Photos Submitted for Verification</p>
              <p className="mt-0.5 text-sky-700">
                Your cleaning photos have been submitted. Waiting for Admin or HR review. This screen will
                automatically unlock once accepted.
              </p>
            </div>
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
                Please re-clean the flagged areas below, upload new photos, and re-submit.
              </p>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-black text-slate-700">
            <span>
              Upload Progress: {totalUploaded} of {task.fields.length} areas completed
            </span>
            <span className={allFieldsUploaded ? "text-emerald-600" : "text-blue-600"}>
              {Math.round((totalUploaded / task.fields.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                allFieldsUploaded ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${(totalUploaded / task.fields.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Inspection Areas List */}
        <div className="space-y-4">
          {task.fields.map((field, idx) => {
            const isUploading = uploadingFieldId === field.id;
            const hasPhotos = field.photos.length > 0;
            const isRejected = field.status === "REJECTED";

            return (
              <div
                key={field.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isRejected
                    ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-200"
                    : hasPhotos
                    ? "bg-white border-slate-200/90 shadow-2xs"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900">{field.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {field.status === "APPROVED" && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800">
                        ✓ Approved
                      </span>
                    )}
                    {field.status === "REJECTED" && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-rose-100 text-rose-800">
                        ⚠ Rejected — Re-upload
                      </span>
                    )}
                    {field.status === "UPLOADED" && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-blue-100 text-blue-800">
                        {field.photos.length} Photo(s) Added
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isUploading || task.status === "UNDER_REVIEW"}
                      onClick={() => triggerUploadForField(field)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {isUploading
                        ? "Uploading to S3..."
                        : hasPhotos
                        ? "+ Add More Photos"
                        : "Upload Photo / Camera"}
                    </button>
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

                {/* Uploaded Photos Gallery */}
                {field.photos.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {field.photos.map((photo, pIdx) => (
                      <div
                        key={photo.id}
                        className="group relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs"
                      >
                        <img
                          src={photo.url}
                          alt={`${field.name} ${pIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => setZoomedPhoto(photo.url)}
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white transition-opacity">
                          <button
                            type="button"
                            onClick={() => setZoomedPhoto(photo.url)}
                            className="p-1 rounded-md bg-white/20 hover:bg-white/40"
                            title="Preview"
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Verification Footer */}
        <div className="pt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="text-xs text-slate-500">
            {allFieldsUploaded ? (
              <span className="font-extrabold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> All required inspection areas have photos!
              </span>
            ) : (
              <span className="font-bold text-amber-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Upload photos for all {task.fields.length} areas to enable verification submission.
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!allFieldsUploaded || isSubmitting || task.status === "UNDER_REVIEW"}
            onClick={handleSubmitForVerification}
            className={`px-6 py-3 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all ${
              allFieldsUploaded && task.status !== "UNDER_REVIEW"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
            {isSubmitting
              ? "Submitting..."
              : task.status === "UNDER_REVIEW"
              ? "Submitted — Awaiting Approval"
              : "Send to Verification & Unlock"}
          </button>
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomedPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedPhoto}
              alt="Zoomed preview"
              className="w-full h-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

