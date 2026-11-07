"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  Check,
  X,
  ShieldCheck,
  RotateCcw,
  History,
  Camera,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toDDMMYYYY, toYYYYMMDD, getTodayDDMMYYYY } from "@/utils/cleaningDate";

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

interface HistoryLog {
  action: string;
  performedBy: string;
  performedRole: string;
  timestamp: string;
  remarks?: string;
}

interface CleaningTask {
  id: string;
  branchId: string;
  branchName: string;
  assignedDate: string; // DD-MM-YYYY
  status: "PENDING_UPLOAD" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  assignedBy: string;
  assignedRole: "ADMIN" | "HR";
  assignedAt: string;
  fields: CleaningField[];
  reviewedBy?: string;
  reviewedRole?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  historyLogs: HistoryLog[];
  createdAt: string;
}

interface Props {
  currentRole: "ADMIN" | "HR";
  currentUserName: string;
}

const DEFAULT_BRANCHES = [
  "Kphb",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
];

const PRESET_AREAS = [
  "Bathroom / Restroom",
  "Reception Front Desk",
  "Waiting Lounge / Sitting Area",
  "Doctor Consultation Room 1",
  "Doctor Consultation Room 2",
  "Pharmacy / Medicine Storage",
  "Handwash Station",
  "Waste Bin Clearance",
];

export default function CleaningAdminHrView({ currentRole, currentUserName }: Props) {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Schedule Modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [newBranch, setNewBranch] = useState("Kphb");
  const [newDateInput, setNewDateInput] = useState(""); // Hydrated in useEffect to prevent Next.js prerender date warning
  const [newFields, setNewFields] = useState<string[]>([
    "Bathroom / Restroom",
    "Reception Front Desk",
    "Waiting Lounge / Sitting Area",
  ]);
  const [customFieldInput, setCustomFieldInput] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    setNewDateInput(toYYYYMMDD(getTodayDDMMYYYY()));
  }, []);

  // Review Modal
  const [reviewTask, setReviewTask] = useState<CleaningTask | null>(null);
  const [selectedRejectedFields, setSelectedRejectedFields] = useState<string[]>([]);
  const [fieldRemarks, setFieldRemarks] = useState<Record<string, string>>({});
  const [overallRemarks, setOverallRemarks] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Photo Zoom Modal
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  // Logs Modal
  const [logsTask, setLogsTask] = useState<CleaningTask | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = "/api/cleaning/tasks?";
      if (selectedBranch !== "ALL") url += `branchName=${encodeURIComponent(selectedBranch)}&`;
      if (filterDate) url += `date=${encodeURIComponent(toDDMMYYYY(filterDate))}&`;
      if (statusFilter !== "ALL") url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to load cleaning tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedBranch, filterDate, statusFilter]);

  // Handle Add Area in Schedule Modal
  const handleAddPresetArea = (area: string) => {
    if (!newFields.includes(area)) {
      setNewFields([...newFields, area]);
    }
  };

  const handleAddCustomArea = () => {
    const trimmed = customFieldInput.trim();
    if (trimmed && !newFields.includes(trimmed)) {
      setNewFields([...newFields, trimmed]);
      setCustomFieldInput("");
    }
  };

  const handleRemoveField = (idx: number) => {
    setNewFields(newFields.filter((_, i) => i !== idx));
  };

  // Submit Schedule
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFields.length === 0) {
      alert("Please add at least one inspection area.");
      return;
    }

    setIsScheduling(true);
    try {
      const assignedDateDDMMYYYY = toDDMMYYYY(newDateInput);
      const res = await fetch("/api/cleaning/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: newBranch,
          assignedDate: assignedDateDDMMYYYY,
          assignedBy: currentUserName,
          assignedRole: currentRole,
          fieldNames: newFields,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to schedule cleaning.");
        return;
      }

      setIsScheduleOpen(false);
      fetchTasks();
      alert(`Cleaning audit assigned for ${assignedDateDDMMYYYY}!`);
    } catch (err: any) {
      alert("Network error: " + err.message);
    } finally {
      setIsScheduling(false);
    }
  };

  // Open Review Modal
  const openReviewModal = async (task: CleaningTask) => {
    setReviewTask(task);
    setSelectedRejectedFields([]);
    setFieldRemarks({});
    setOverallRemarks("");

    // Fetch fresh task details from backend to ensure all latest photos are loaded
    try {
      const res = await fetch(`/api/cleaning/tasks/${task.id}`);
      const data = await res.json();
      if (data.success && data.task) {
        setReviewTask(data.task);
      }
    } catch (err) {
      console.error("Failed to load fresh task details:", err);
    }
  };

  // Toggle field rejection checkbox
  const toggleRejectField = (fieldId: string) => {
    if (selectedRejectedFields.includes(fieldId)) {
      setSelectedRejectedFields(selectedRejectedFields.filter((id) => id !== fieldId));
    } else {
      setSelectedRejectedFields([...selectedRejectedFields, fieldId]);
    }
  };

  // Handle Review Action (Approve / Reject)
  const handleReviewAction = async (action: "APPROVE" | "REJECT") => {
    if (!reviewTask) return;

    if (action === "REJECT" && selectedRejectedFields.length === 0 && !overallRemarks.trim()) {
      alert("Please either select at least one field to reject or provide a general remark.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/cleaning/tasks/${reviewTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVIEW",
          reviewAction: action,
          reviewedBy: currentUserName,
          reviewedRole: currentRole,
          remarks: overallRemarks.trim(),
          rejectedFieldIds: selectedRejectedFields,
          fieldRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to submit review.");
        return;
      }

      setReviewTask(null);
      fetchTasks();
      alert(data.message || (action === "APPROVE" ? "Approved!" : "Rejected."));
    } catch (err: any) {
      alert("Review error: " + err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cleaning audit?")) return;
    try {
      await fetch(`/api/cleaning/tasks/${id}`, { method: "DELETE" });
      fetchTasks();
    } catch (err) {
      alert("Failed to delete task.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5" /> Pending Upload
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
      {/* Top Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  Branch Cleaning &amp; Sanitation Audits
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 uppercase">
                    {currentRole} Portal
                  </span>
                </h1>
                <p className="text-[11.5px] text-slate-500">
                  Assign branch inspection dates (DD-MM-YYYY), review photos, verify hygiene, or reject with feedback.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Schedule Cleaning Task</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* Filters bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-3">
            {/* Branch Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white"
              >
                <option value="ALL">All Branches</option>
                {DEFAULT_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter (DD-MM-YYYY) */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white"
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate("")}
                  className="text-xs text-rose-500 font-bold hover:underline"
                >
                  Clear Date
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_UPLOAD">Pending Upload</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-bold">
            Showing <span className="text-slate-900">{tasks.length}</span> audits
          </div>
        </div>

        {/* Task Cards List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-bold">
            Loading cleaning tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-800">No Cleaning Tasks Found</h3>
            <p className="text-xs text-slate-500">
              Schedule a new cleaning task for any branch to start hygiene inspections.
            </p>
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] text-white text-xs font-bold rounded-xl"
            >
              <Plus className="w-4 h-4" /> Schedule Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tasks.map((task) => {
              const uploadedCount = task.fields.filter((f) => f.photos.length > 0).length;
              const totalFields = task.fields.length;
              const isComplete = uploadedCount === totalFields;

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        {task.branchName}
                      </span>
                      {getStatusBadge(task.status)}
                    </div>

                    <div>
                      <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        Date: <span className="text-emerald-700 font-black">{task.assignedDate}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Assigned by {task.assignedBy} ({task.assignedRole})
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-extrabold text-slate-600">
                        <span>Photos Uploaded</span>
                        <span>
                          {uploadedCount} of {totalFields} areas
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isComplete ? "bg-emerald-500" : "bg-blue-500"
                          }`}
                          style={{
                            width: `${totalFields > 0 ? (uploadedCount / totalFields) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Areas Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {task.fields.map((f) => (
                        <span
                          key={f.id}
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold ${
                            f.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : f.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : f.photos.length > 0
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-50 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {f.name} {f.photos.length > 0 && `(${f.photos.length})`}
                        </span>
                      ))}
                    </div>

                    {task.reviewRemarks && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                        <span className="font-extrabold text-slate-700">Remarks: </span>
                        <span className="text-slate-600">{task.reviewRemarks}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setLogsTask(task)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      <History className="w-3.5 h-3.5" /> Logs
                    </button>

                    <div className="flex items-center gap-2">
                      {task.status !== "APPROVED" && (
                        <button
                          onClick={() => openReviewModal(task)}
                          className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
                      )}

                      {task.status === "APPROVED" && (
                        <button
                          onClick={() => openReviewModal(task)}
                          className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Photos
                        </button>
                      )}

                      {currentRole === "ADMIN" && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. SCHEDULE CLEANING TASK MODAL                      */}
      {/* ---------------------------------------------------- */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Assign Branch Cleaning Task
                </h2>
              </div>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              {/* Branch */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Clinic Branch
                </label>
                <select
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                >
                  {DEFAULT_BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Inspection Date (DD-MM-YYYY)
                </label>
                <input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Selected date will be saved as:{" "}
                  <strong className="text-emerald-600">{toDDMMYYYY(newDateInput)}</strong>
                </p>
              </div>

              {/* Selected Inspection Areas */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Configured Inspection Areas ({newFields.length})
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 min-h-[60px]">
                  {newFields.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => handleRemoveField(i)}
                        className="text-slate-400 hover:text-rose-600 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick Add Preset Areas */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  + Add Preset Areas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_AREAS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPresetArea(preset)}
                      disabled={newFields.includes(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        newFields.includes(preset)
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200/60"
                      }`}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Area Input */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  + Add Custom Area
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Doctor Cabin, Staircase, Roof..."
                    value={customFieldInput}
                    onChange={(e) => setCustomFieldInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomArea();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomArea}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm disabled:opacity-50"
                >
                  {isScheduling ? "Assigning..." : "Assign Cleaning Audit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. REVIEW & VERIFICATION MODAL                       */}
      {/* ---------------------------------------------------- */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                    {reviewTask.branchName}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700">
                    Date: {reviewTask.assignedDate}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-slate-900 mt-1">
                  Hygiene &amp; Cleaning Review
                </h2>
              </div>
              <button
                onClick={() => setReviewTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Areas & Photos */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Submitted Photos per Area ({reviewTask.fields.length} areas)
              </h3>

              <div className="space-y-4">
                {reviewTask.fields.map((field) => {
                  const isMarkedForRejection = selectedRejectedFields.includes(field.id);

                  return (
                    <div
                      key={field.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isMarkedForRejection
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-slate-50/70 border-slate-200/80"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isMarkedForRejection}
                              onChange={() => toggleRejectField(field.id)}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span className="text-sm font-extrabold text-slate-900">
                              {field.name}
                            </span>
                          </label>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold ${
                              field.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : field.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : field.photos.length > 0
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {field.status}
                          </span>
                        </div>

                        {isMarkedForRejection && (
                          <span className="text-xs font-black text-rose-600">
                            Marked for Rejection (Re-upload will be required)
                          </span>
                        )}
                      </div>

                      {/* Photo Thumbnails */}
                      {field.photos.length === 0 ? (
                        <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400 font-bold">
                          No photo uploaded yet for this area.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {field.photos.map((p, pIdx) => {
                            const imgSrc = `/api/cleaning/image?key=${encodeURIComponent(p.key || p.url)}`;
                            return (
                              <div
                                key={p.id}
                                onClick={() => setZoomedPhoto(imgSrc)}
                                className="group relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-xs hover:shadow-md transition-shadow"
                              >
                                <img
                                  src={imgSrc}
                                  alt={`${field.name} photo ${pIdx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="w-5 h-5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Individual field remarks if marked for rejection */}
                      {isMarkedForRejection && (
                        <div className="mt-3">
                          <input
                            type="text"
                            placeholder="Reason for rejecting this area (e.g. Floor not dry, toilet seat stained)..."
                            value={fieldRemarks[field.id] || ""}
                            onChange={(e) =>
                              setFieldRemarks({ ...fieldRemarks, [field.id]: e.target.value })
                            }
                            className="w-full px-3.5 py-2 rounded-xl border border-rose-300 bg-white text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Remarks */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                General Review Remarks / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Overall verification comment for Reception..."
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Review Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setReviewTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>

              <div className="flex items-center gap-3">
                {/* Reject Button */}
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleReviewAction("REJECT")}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {selectedRejectedFields.length > 0
                    ? `Reject ${selectedRejectedFields.length} Area(s)`
                    : "Reject All"}
                </button>

                {/* Approve Button */}
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleReviewAction("APPROVE")}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve All &amp; Unlock Reception
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. PHOTO ZOOM MODAL (High z-index to overlay modals)  */}
      {/* ---------------------------------------------------- */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-all"
          onClick={() => setZoomedPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92vh] bg-slate-900/90 rounded-3xl overflow-hidden border border-slate-700/60 shadow-2xl flex flex-col items-center justify-center p-2 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <a
                href={zoomedPhoto}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-600 flex items-center gap-1.5"
                title="Open original"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Open Full</span>
              </a>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-600 text-white transition-colors border border-slate-600"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center min-h-[300px]">
              <img
                src={zoomedPhoto}
                alt="Inspection Preview"
                className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-lg border border-slate-800"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                style={{ display: "none" }}
                className="flex-col items-center justify-center gap-2 text-slate-400 p-8 text-center"
              >
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <p className="text-sm font-bold text-white">Could not preview image</p>
                <p className="text-xs text-slate-400">The image may still be uploading or the link has expired.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. AUDIT LOGS MODAL                                  */}
      {/* ---------------------------------------------------- */}
      {logsTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Audit History Logs
                </h3>
              </div>
              <button
                onClick={() => setLogsTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {logsTask.historyLogs.map((log, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between items-center font-extrabold text-slate-800">
                    <span>{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    By: <strong className="text-slate-700">{log.performedBy}</strong> ({log.performedRole})
                  </p>
                  {log.remarks && (
                    <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                      &quot;{log.remarks}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

