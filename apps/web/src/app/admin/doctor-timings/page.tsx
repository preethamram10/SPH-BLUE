"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Shield,
  Building2,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  Trash2,
  MapPin,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
} from "lucide-react";

// Types
export interface SlotItem {
  startHour: string;
  startMinute: string;
  startAmPm: "AM" | "PM";
  endHour: string;
  endMinute: string;
  endAmPm: "AM" | "PM";
}

export interface DayScheduleData {
  status: "Available" | "Closed";
  slots: SlotItem[];
}

export interface BranchScheduleItem {
  id: string;
  targetBranch: string;
  selectedDay: string;
  daySchedules: Record<string, DayScheduleData>;
}

export interface DoctorScheduleRecord {
  id: string;
  doctorId: string;
  name: string;
  phone: string;
  branchSchedules: BranchScheduleItem[];
}

export interface DoctorUser {
  id: string;
  name: string;
  phone: string;
  category: string;
  branchName: string;
}

export interface Branch {
  id: string;
  name: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toMinutes = (hour: string, minute: string, ampm: string): number => {
  let h = parseInt(hour, 10) || 12;
  const m = parseInt(minute, 10) || 0;
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

// Overlapping Schedule Conflict Detection
const getOverlappingConflict = (
  doc: DoctorScheduleRecord | null,
  currentBsId: string,
  day: string,
  slot: SlotItem,
  slotIdx: number
): { branch: string; timeStr: string } | null => {
  if (!doc) return null;

  const sStart = toMinutes(slot.startHour, slot.startMinute, slot.startAmPm);
  const sEnd = toMinutes(slot.endHour, slot.endMinute, slot.endAmPm);
  if (sEnd <= sStart) return null;

  for (const bs of doc.branchSchedules || []) {
    const dayData = bs.daySchedules?.[day];
    if (!dayData || dayData.status === "Closed") continue;

    const slots = dayData.slots || [];
    for (let idx = 0; idx < slots.length; idx++) {
      if (bs.id === currentBsId && idx === slotIdx) continue; // skip self
      const other = slots[idx];
      const oStart = toMinutes(other.startHour, other.startMinute, other.startAmPm);
      const oEnd = toMinutes(other.endHour, other.endMinute, other.endAmPm);

      // Overlap condition
      if (Math.max(sStart, oStart) < Math.min(sEnd, oEnd)) {
        const timeStr = `${other.startHour}:${other.startMinute} ${other.startAmPm} - ${other.endHour}:${other.endMinute} ${other.endAmPm}`;
        return {
          branch: bs.targetBranch,
          timeStr,
        };
      }
    }
  }
  return null;
};

const createDefaultDaySchedules = (): Record<string, DayScheduleData> => {
  const result: Record<string, DayScheduleData> = {};
  DAYS.forEach((d) => {
    const isWeekend = d === "Sun";
    result[d] = {
      status: isWeekend ? "Closed" : "Available",
      slots: isWeekend
        ? []
        : [
            {
              startHour: "10",
              startMinute: "00",
              startAmPm: "AM",
              endHour: "02",
              endMinute: "00",
              endAmPm: "PM",
            },
          ],
    };
  });
  return result;
};

export default function DoctorTimingsPage() {
  const router = useRouter();

  // Selected Doctor for View 2 (null = View 1 Doctor Cards list)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [currentDoctor, setCurrentDoctor] = useState<DoctorScheduleRecord | null>(null);
  const [hoveredDoctorId, setHoveredDoctorId] = useState<string | null>(null);

  // Real backend data states
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorScheduleRecord[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<DoctorUser[]>([]);
  const [branchesList, setBranchesList] = useState<string[]>([
    "KPHB Branch",
    "Chandanagar Branch",
    "Nallagandla Branch",
    "Dilshuknagar Branch",
  ]);
  const [loading, setLoading] = useState(true);

  // Success Toast state
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Modal to add a new Doctor Profile
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [selectedDocForNewProfile, setSelectedDocForNewProfile] = useState("");

  // Clean branch name helper
  const cleanBranch = (name: string) => {
    return name.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB Branch";
  };

  // Convert database schedule record to internal component format
  const normalizeScheduleRecord = (raw: any): DoctorScheduleRecord => {
    return {
      id: raw.id || raw.doctorId,
      doctorId: raw.doctorId || raw.id,
      name: raw.doctorName || raw.name || "Doctor",
      phone: raw.phone || "",
      branchSchedules: (raw.branchSchedules || []).map((bs: any) => {
        const dayScheds: Record<string, DayScheduleData> = {};
        DAYS.forEach((d) => {
          const rawDay = bs.daySchedules?.[d] || bs.days?.[d];
          if (rawDay) {
            const isAvail = rawDay.status ? rawDay.status === "Available" : rawDay.isAvailable !== false;
            dayScheds[d] = {
              status: isAvail ? "Available" : "Closed",
              slots: (rawDay.slots || []).map((s: any) => ({
                startHour: s.startHour || "10",
                startMinute: s.startMinute || s.startMin || "00",
                startAmPm: s.startAmPm || "AM",
                endHour: s.endHour || "02",
                endMinute: s.endMinute || s.endMin || "00",
                endAmPm: s.endAmPm || "PM",
              })),
            };
          } else {
            dayScheds[d] = { status: d === "Sun" ? "Closed" : "Available", slots: [] };
          }
        });

        return {
          id: bs.id || `bs-${Date.now()}-${Math.random()}`,
          targetBranch: bs.targetBranch || bs.branchName || "KPHB Branch",
          selectedDay: bs.selectedDay || "Mon",
          daySchedules: dayScheds,
        };
      }),
    };
  };

  // Convert internal component format to backend database record format
  const serializeScheduleRecord = (record: DoctorScheduleRecord) => {
    return {
      id: record.id,
      doctorId: record.doctorId,
      doctorName: record.name,
      phone: record.phone,
      branchSchedules: record.branchSchedules.map((bs) => {
        const days: Record<string, any> = {};
        DAYS.forEach((d) => {
          const ds = bs.daySchedules[d] || { status: "Available", slots: [] };
          days[d] = {
            day: d,
            isAvailable: ds.status === "Available",
            slots: ds.slots.map((s, idx) => ({
              id: `${d}-slot-${idx + 1}`,
              startHour: s.startHour,
              startMin: s.startMinute,
              startAmPm: s.startAmPm,
              endHour: s.endHour,
              endMin: s.endMinute,
              endAmPm: s.endAmPm,
              displayText: `${s.startHour}:${s.startMinute} ${s.startAmPm} - ${s.endHour}:${s.endMinute} ${s.endAmPm}`,
            })),
          };
        });

        return {
          id: bs.id,
          branchName: bs.targetBranch,
          targetBranch: bs.targetBranch,
          selectedDay: bs.selectedDay,
          days,
          daySchedules: bs.daySchedules,
        };
      }),
    };
  };

  // Fetch real data from backend API
  const fetchData = async () => {
    try {
      setLoading(true);
      const [timingsRes, branchesRes] = await Promise.all([
        fetch("/api/admin/doctor-timings"),
        fetch("/api/branches"),
      ]);

      const timingsData = await timingsRes.json();
      const branchesData = await branchesRes.json();

      if (timingsData.success) {
        const normalized = (timingsData.schedules || []).map(normalizeScheduleRecord);
        setDoctorSchedules(normalized);
        setAvailableDoctors(timingsData.doctors || []);
      }

      if (branchesData.data && Array.isArray(branchesData.data) && branchesData.data.length > 0) {
        const bNames = branchesData.data.map((b: any) => cleanBranch(b.name));
        setBranchesList(bNames);
      }
    } catch (err) {
      console.error("Failed to load doctor timings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync current doctor when doctorSchedules or selectedDoctorId changes
  useEffect(() => {
    if (selectedDoctorId) {
      const found = doctorSchedules.find((d) => d.id === selectedDoctorId || d.doctorId === selectedDoctorId);
      if (found) {
        setCurrentDoctor(JSON.parse(JSON.stringify(found)));
      }
    } else {
      setCurrentDoctor(null);
    }
  }, [selectedDoctorId, doctorSchedules]);

  // =========================================================================
  // VIEW 2 HANDLERS (Matching User Reference)
  // =========================================================================

  const handleAddBranchSchedule = () => {
    if (!currentDoctor) return;
    const targetBranch = branchesList[0] || "KPHB Branch";
    const newBs: BranchScheduleItem = {
      id: `bs-${Date.now()}`,
      targetBranch,
      selectedDay: "Mon",
      daySchedules: createDefaultDaySchedules(),
    };

    setCurrentDoctor({
      ...currentDoctor,
      branchSchedules: [...(currentDoctor.branchSchedules || []), newBs],
    });
  };

  const handleUpdateTargetBranch = (bsId: string, val: string) => {
    if (!currentDoctor) return;
    setCurrentDoctor({
      ...currentDoctor,
      branchSchedules: currentDoctor.branchSchedules.map((b) =>
        b.id === bsId ? { ...b, targetBranch: val } : b
      ),
    });
  };

  const handleSelectDay = (bsId: string, day: string) => {
    if (!currentDoctor) return;
    setCurrentDoctor({
      ...currentDoctor,
      branchSchedules: currentDoctor.branchSchedules.map((b) =>
        b.id === bsId ? { ...b, selectedDay: day } : b
      ),
    });
  };

  const handleToggleDayStatus = (bsId: string, day: string, status: "Available" | "Closed") => {
    if (!currentDoctor) return;
    setCurrentDoctor({
      ...currentDoctor,
      branchSchedules: currentDoctor.branchSchedules.map((b) => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day] || { status: "Available", slots: [] };
        return {
          ...b,
          daySchedules: {
            ...b.daySchedules,
            [day]: {
              ...currentDaySched,
              status,
              slots:
                status === "Available" && currentDaySched.slots.length === 0
                  ? [
                      {
                        startHour: "10",
                        startMinute: "00",
                        startAmPm: "AM",
                        endHour: "02",
                        endMinute: "00",
                        endAmPm: "PM",
                      },
                    ]
                  : currentDaySched.slots,
            },
          },
        };
      }),
    });
  };

  const handleAddSlot = (bsId: string, day: string) => {
    if (!currentDoctor) return;
    setCurrentDoctor({
      ...currentDoctor,
      branchSchedules: currentDoctor.branchSchedules.map((b) => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day] || { status: "Available", slots: [] };
        const newSlot: SlotItem = {
          startHour: "05",
          startMinute: "00",
          startAmPm: "PM",
          endHour: "07",
          endMinute: "00",
          endAmPm: "PM",
        };
        return {
          ...b,
          daySchedules: {
            ...b.daySchedules,
            [day]: {
              ...currentDaySched,
              status: "Available",
              slots: [...currentDaySched.slots, newSlot],
            },
          },
        };
      }),
    });
  };

  const handleUpdateSlot = (
    bsId: string,
    day: string,
    slotIdx: number,
    field: keyof SlotItem,
    val: string
  ) => {
    if (!currentDoctor) return;
    setCurrentDoctor({
      ...currentDoctor,
      branchSchedules: currentDoctor.branchSchedules.map((b) => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day];
        if (!currentDaySched) return b;

        const updatedSlots = [...currentDaySched.slots];
        updatedSlots[slotIdx] = {
          ...updatedSlots[slotIdx],
          [field]: val,
        };

        return {
          ...b,
          daySchedules: {
            ...b.daySchedules,
            [day]: {
              ...currentDaySched,
              slots: updatedSlots,
            },
          },
        };
      }),
    });
  };

  const handleRemoveSlot = (bsId: string, day: string, slotIdx: number) => {
    if (!currentDoctor) return;
    setCurrentDoctor({
      ...currentDoctor,
      branchSchedules: currentDoctor.branchSchedules.map((b) => {
        if (b.id !== bsId) return b;
        const currentDaySched = b.daySchedules[day];
        if (!currentDaySched) return b;

        return {
          ...b,
          daySchedules: {
            ...b.daySchedules,
            [day]: {
              ...currentDaySched,
              slots: currentDaySched.slots.filter((_, idx) => idx !== slotIdx),
            },
          },
        };
      }),
    });
  };

  const handleRemoveBranchSchedule = (bsId: string) => {
    if (!currentDoctor) return;
    setCurrentDoctor({
      ...currentDoctor,
      branchSchedules: currentDoctor.branchSchedules.filter((b) => b.id !== bsId),
    });
  };

  const handleSaveAll = async () => {
    if (!currentDoctor) return;

    try {
      const payload = serializeScheduleRecord(currentDoctor);
      const res = await fetch("/api/admin/doctor-timings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveToast("Profile & branch schedules saved successfully!");
        setTimeout(() => setSaveToast(null), 3500);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save schedule");
      }
    } catch (err: any) {
      alert("Error saving schedule: " + err.message);
    }
  };

  const handleDeleteSchedule = async (doctorId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the schedule for ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/doctor-timings?doctorId=${doctorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchData();
      } else {
        alert("Failed to delete schedule");
      }
    } catch {
      alert("Network error while deleting");
    }
  };

  const handleCreateProfileFromDoctor = () => {
    if (!selectedDocForNewProfile) {
      alert("Please select a registered doctor");
      return;
    }
    const doc = availableDoctors.find((d) => d.id === selectedDocForNewProfile);
    if (!doc) return;

    const defaultBranch = branchesList[0] || "KPHB Branch";

    const newProfile: DoctorScheduleRecord = {
      id: doc.id,
      doctorId: doc.id,
      name: doc.name,
      phone: doc.phone,
      branchSchedules: [
        {
          id: `bs-${Date.now()}`,
          targetBranch: defaultBranch,
          selectedDay: "Mon",
          daySchedules: createDefaultDaySchedules(),
        },
      ],
    };

    setIsAddProfileOpen(false);
    setCurrentDoctor(newProfile);
    setSelectedDoctorId(doc.id);
  };

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    router.replace("/login");
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* UNIFIED ADMIN SIDEBAR */}
      <AdminSidebar currentPath="/admin/doctor-timings" />

      {/* =================================================================== */}
      {/* RIGHT MAIN VIEWPORT                                                */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* ================================================================= */}
        {/* VIEW 1: DOCTORS CARDS LIST (Matching Screenshot 1)                */}
        {/* ================================================================= */}
        {!selectedDoctorId && (
          <main className="flex-1 p-8 max-w-[1400px] w-full mx-auto space-y-6">
            {/* Header: Title + Subtitle + Action Button */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold border border-sky-100 shadow-sm mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Doctor Timings &amp; Master Schedules
                  </h2>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 font-medium">
                    Real-time clinic doctors list. Add, update, delete, or configure branch schedules live.
                  </p>
                </div>
              </div>

              {/* + Add Doctor Profile Button */}
              <button
                onClick={() => {
                  if (availableDoctors.length === 0) {
                    alert("No registered doctors found. Please add a doctor in Staff Management first.");
                    return;
                  }
                  setSelectedDocForNewProfile(availableDoctors[0].id);
                  setIsAddProfileOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11.5px] font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Doctor Profile</span>
              </button>
            </div>

            {/* Doctors Cards Grid */}
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Loading doctor timings and schedules...
              </div>
            ) : doctorSchedules.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-xl mx-auto shadow-sm my-8">
                <Clock className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5] mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">No Doctor Schedules Configured Yet</h3>
                <p className="text-[11px] text-slate-500 mt-1 mb-4">
                  Configure branch schedules and daily 15-minute consultation slots for your doctors.
                </p>
                <button
                  onClick={() => {
                    if (availableDoctors.length === 0) {
                      alert("Please register doctors in Staff Management first.");
                      return;
                    }
                    setSelectedDocForNewProfile(availableDoctors[0].id);
                    setIsAddProfileOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11.5px] font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Doctor Profile</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {doctorSchedules.map((doc, idx) => {
                  const isHighlighted =
                    hoveredDoctorId === doc.id || (hoveredDoctorId === null && idx === 0);

                  return (
                    <div
                      key={doc.id}
                      onMouseEnter={() => setHoveredDoctorId(doc.id)}
                      onMouseLeave={() => setHoveredDoctorId(null)}
                      style={{
                        background: "#ffffff",
                        borderRadius: "18px",
                        border: isHighlighted ? "1.5px solid #38bdf8" : "1px solid #cbd5e1",
                        boxShadow: isHighlighted
                          ? "0 4px 18px rgba(56, 189, 248, 0.12)"
                          : "0 2px 8px rgba(0, 0, 0, 0.02)",
                        padding: "18px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div>
                        {/* Doctor Name & Cyan Badge */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                          <h3
                            style={{
                              fontSize: "14px",
                              fontWeight: 800,
                              color: "#0f172a",
                              margin: 0,
                              letterSpacing: "-0.2px",
                            }}
                          >
                            {doc.name}
                          </h3>
                          <span
                            style={{
                              background: "#e0f2fe",
                              color: "#0284c7",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "10.5px",
                              fontWeight: 800,
                              letterSpacing: "0.2px",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            Doctor
                          </span>
                        </div>

                        {/* Phone */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            color: "#0284c7",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            marginTop: "4px",
                          }}
                        >
                          <Phone size={12} color="#0284c7" strokeWidth={2.5} />
                          <span>Phone: {doc.phone || "+91 Not Provided"}</span>
                        </div>

                        {/* Section Heading */}
                        <div
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 800,
                            color: "#8da2b5",
                            letterSpacing: "0.6px",
                            textTransform: "uppercase",
                            marginTop: "14px",
                            marginBottom: "10px",
                          }}
                        >
                          BRANCH SCHEDULE BREAKDOWN
                        </div>

                        {/* Branch Breakdown Sub-cards */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {doc.branchSchedules.length === 0 ? (
                            <p style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
                              No branch schedules configured.
                            </p>
                          ) : (
                            doc.branchSchedules.map((bs) => {
                              const activeDays = DAYS.filter((d) => bs.daySchedules[d]?.status === "Available");
                              const daysSummary =
                                activeDays.length === 0
                                  ? "Closed"
                                  : activeDays.length === 7
                                  ? "Mon - Sun"
                                  : activeDays.join(", ");

                              const distinctSlots: string[] = [];
                              DAYS.forEach((d) => {
                                const ds = bs.daySchedules[d];
                                if (ds && ds.status === "Available") {
                                  ds.slots.forEach((s) => {
                                    const str = `${s.startHour}:${s.startMinute} ${s.startAmPm} - ${s.endHour}:${s.endMinute} ${s.endAmPm}`;
                                    if (!distinctSlots.includes(str)) distinctSlots.push(str);
                                  });
                                }
                              });

                              return (
                                <div
                                  key={bs.id}
                                  style={{
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    padding: "10px 12px",
                                  }}
                                >
                                  {/* Top row: Branch name + Active days */}
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "6px",
                                      gap: "6px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        fontSize: "11.5px",
                                        fontWeight: 800,
                                        color: "#0284c7",
                                      }}
                                    >
                                      <MapPin size={13} color="#0284c7" strokeWidth={2.2} />
                                      <span>{bs.targetBranch}</span>
                                    </div>
                                    <span
                                      style={{
                                        background: "#dcfce7",
                                        color: "#16a34a",
                                        borderRadius: "5px",
                                        padding: "2px 7px",
                                        fontSize: "9.5px",
                                        fontWeight: 800,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {daysSummary}
                                    </span>
                                  </div>

                                  {/* Time slots row */}
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                    {distinctSlots.length === 0 ? (
                                      <span style={{ fontSize: "10px", color: "#94a3b8", fontStyle: "italic" }}>
                                        No timings set
                                      </span>
                                    ) : (
                                      distinctSlots.map((st, i) => (
                                        <span
                                          key={i}
                                          style={{
                                            background: "#ffffff",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            padding: "4px 9px",
                                            fontSize: "10.5px",
                                            fontWeight: 800,
                                            color: "#0f172a",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                                          }}
                                        >
                                          {st}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Actions: Delete & Configure Schedule > */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "16px",
                          paddingTop: "4px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(doc.doctorId, doc.name)}
                          style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#ef4444",
                            borderRadius: "7px",
                            padding: "5px 12px",
                            fontSize: "11px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Trash2 size={12} color="#ef4444" strokeWidth={2.2} />
                          <span>Delete</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDoctorId(doc.id)}
                          style={{
                            background: "#0284c7",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "7px",
                            padding: "6px 14px",
                            fontSize: "11.5px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span>Configure Schedule &gt;</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: FULL SCHEDULE CONFIGURATION SCREEN FOR SELECTED DOCTOR    */}
        {/* EXACT CSS & JSX MATCHING USER REFERENCE                           */}
        {/* ================================================================= */}
        {selectedDoctorId && currentDoctor && (
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "18px 20px", width: "100%" }}>
            {/* Save Success Banner */}
            {saveToast ? (
              <div
                style={{
                  background: "#dcfce7",
                  border: "1px solid #86efac",
                  color: "#15803d",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 2px 8px rgba(22, 163, 74, 0.15)",
                }}
              >
                <CheckCircle2 size={16} color="#15803d" />
                <span>{saveToast}</span>
              </div>
            ) : null}

            {/* BACK TO ALL DOCTORS BUTTON */}
            <button
              onClick={() => setSelectedDoctorId(null)}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "11.5px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                transition: "all 0.2s ease",
              }}
            >
              <ArrowLeft size={14} color="#0f172a" /> ← Back to All Doctors
            </button>

            {/* TOP HEADER & SCHEDULE CONFIGURATION TITLE */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "16px",
                padding: "16px 20px",
                marginBottom: "18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <div>
                <h1 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 3px 0" }}>
                  Schedule Configuration
                </h1>
                <p style={{ fontSize: "12px", color: "#258ec8", fontWeight: 800, margin: 0 }}>
                  Managing timings for{" "}
                  <span style={{ color: "#0f172a", fontWeight: 800 }}>{currentDoctor.name}</span>
                </p>
              </div>

              {/* ADD BRANCH SCHEDULE BUTTON */}
              <button
                onClick={handleAddBranchSchedule}
                style={{
                  background: "#258ec8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: "0 2px 8px rgba(37, 142, 200, 0.25)",
                  transition: "all 0.2s ease",
                }}
              >
                <Plus size={14} /> Add Branch Schedule
              </button>
            </div>

            {/* BRANCH SCHEDULE CARDS LIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
              {(currentDoctor.branchSchedules || []).length === 0 ? (
                <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
                  <p style={{ fontSize: "13px", fontWeight: 800, color: "#475569" }}>No branch schedules added yet</p>
                  <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Click &quot;Add Branch Schedule&quot; above to set up clinic timings.</p>
                </div>
              ) : (
                (currentDoctor.branchSchedules || []).map((bs) => {
                  const activeDay = bs.selectedDay || "Mon";
                  const daySched = bs.daySchedules?.[activeDay] || { status: "Available", slots: [] };

                  return (
                    <div
                      key={bs.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "16px",
                        padding: "18px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                      }}
                    >
                      {/* 1. TARGET BRANCH DROPDOWN */}
                      <div style={{ marginBottom: "14px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "10px",
                            color: "#64748b",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "5px",
                          }}
                        >
                          Target Branch
                        </label>
                        <select
                          value={bs.targetBranch}
                          onChange={(e) => handleUpdateTargetBranch(bs.id, e.target.value)}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "12.5px",
                            fontWeight: 800,
                            color: "#0f172a",
                            width: "100%",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          {branchesList.map((br) => (
                            <option key={br} value={br}>
                              {br}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. WEEKLY DAY-WISE SCHEDULE SELECTOR */}
                      <div style={{ marginBottom: "14px" }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#475569",
                            marginBottom: "8px",
                          }}
                        >
                          Weekly Day-wise Schedule (Select Day to Configure)
                        </span>

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {DAYS.map((d) => {
                            const isDaySelected = activeDay === d;
                            const dayStatus = bs.daySchedules?.[d] ? bs.daySchedules[d].status : "Available";
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleSelectDay(bs.id, d)}
                                style={{
                                  padding: "6px 13px",
                                  borderRadius: "8px",
                                  border: isDaySelected ? "2px solid #258ec8" : "1px solid #e2e8f0",
                                  background: isDaySelected ? "#258ec8" : "#ffffff",
                                  color: isDaySelected ? "#ffffff" : "#334155",
                                  fontWeight: isDaySelected ? 800 : 700,
                                  fontSize: "11.5px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  boxShadow: isDaySelected ? "0 2px 8px rgba(37, 142, 200, 0.25)" : "none",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <span>{d}</span>
                                {dayStatus === "Closed" && (
                                  <span
                                    style={{
                                      fontSize: "8.5px",
                                      background: isDaySelected ? "rgba(255,255,255,0.25)" : "#fef2f2",
                                      color: isDaySelected ? "#ffffff" : "#ef4444",
                                      padding: "1px 4px",
                                      borderRadius: "3px",
                                      fontWeight: 800,
                                    }}
                                  >
                                    Off
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. ACTIVE DAY HEADER & SLOTS EDITOR */}
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "14px",
                          marginBottom: "14px",
                        }}
                      >
                        {/* DAY NAME + STATUS TOGGLE + ADD SLOT */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a" }}>
                              {activeDay}
                            </span>

                            <div
                              style={{
                                display: "flex",
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "7px",
                                padding: "2px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleDayStatus(bs.id, activeDay, "Available")}
                                style={{
                                  padding: "4px 11px",
                                  borderRadius: "5px",
                                  border: "none",
                                  background: daySched.status === "Available" ? "#dcfce7" : "transparent",
                                  color: daySched.status === "Available" ? "#15803d" : "#64748b",
                                  fontWeight: 800,
                                  fontSize: "11px",
                                  cursor: "pointer",
                                }}
                              >
                                Available
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleDayStatus(bs.id, activeDay, "Closed")}
                                style={{
                                  padding: "4px 11px",
                                  borderRadius: "5px",
                                  border: "none",
                                  background: daySched.status === "Closed" ? "#fef2f2" : "transparent",
                                  color: daySched.status === "Closed" ? "#ef4444" : "#64748b",
                                  fontWeight: 800,
                                  fontSize: "11px",
                                  cursor: "pointer",
                                }}
                              >
                                Unavailable / Closed
                              </button>
                            </div>
                          </div>

                          {daySched.status === "Available" && (
                            <button
                              type="button"
                              onClick={() => handleAddSlot(bs.id, activeDay)}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #258ec8",
                                color: "#258ec8",
                                padding: "5px 12px",
                                borderRadius: "7px",
                                fontSize: "11px",
                                fontWeight: 800,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Plus size={13} /> Add Slot
                            </button>
                          )}
                        </div>

                        {/* TIME SLOTS */}
                        {daySched.status === "Available" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {daySched.slots.map((slot, slotIdx) => {
                              const conflict = getOverlappingConflict(
                                currentDoctor,
                                bs.id,
                                activeDay,
                                slot,
                                slotIdx
                              );

                              return (
                                <div
                                  key={slotIdx}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "5px",
                                    background: conflict ? "#fef2f2" : "#ffffff",
                                    border: conflict ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    boxShadow: conflict ? "0 2px 8px rgba(239, 68, 68, 0.15)" : "none",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: conflict ? "#ef4444" : "#64748b",
                                      }}
                                    >
                                      Start Time
                                    </span>
                                    <select
                                      value={slot.startHour}
                                      onChange={(e) =>
                                        handleUpdateSlot(bs.id, activeDay, slotIdx, "startHour", e.target.value)
                                      }
                                      style={{
                                        padding: "4px 6px",
                                        borderRadius: "5px",
                                        border: conflict ? "1px solid #fecaca" : "1px solid #cbd5e1",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: "#0f172a",
                                      }}
                                    >
                                      {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(
                                        (h) => (
                                          <option key={h} value={h}>
                                            {h}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <span style={{ fontWeight: 800, color: "#64748b" }}>:</span>
                                    <select
                                      value={slot.startMinute}
                                      onChange={(e) =>
                                        handleUpdateSlot(bs.id, activeDay, slotIdx, "startMinute", e.target.value)
                                      }
                                      style={{
                                        padding: "4px 6px",
                                        borderRadius: "5px",
                                        border: conflict ? "1px solid #fecaca" : "1px solid #cbd5e1",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: "#0f172a",
                                      }}
                                    >
                                      {["00", "15", "30", "45"].map((m) => (
                                        <option key={m} value={m}>
                                          {m}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={slot.startAmPm}
                                      onChange={(e) =>
                                        handleUpdateSlot(
                                          bs.id,
                                          activeDay,
                                          slotIdx,
                                          "startAmPm",
                                          e.target.value as any
                                        )
                                      }
                                      style={{
                                        padding: "4px 6px",
                                        borderRadius: "5px",
                                        border: "1px solid #258ec8",
                                        background: "rgba(37, 142, 200, 0.1)",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: "#258ec8",
                                      }}
                                    >
                                      <option value="AM">AM</option>
                                      <option value="PM">PM</option>
                                    </select>

                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: "#94a3b8",
                                        margin: "0 2px",
                                      }}
                                    >
                                      to
                                    </span>

                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: conflict ? "#ef4444" : "#64748b",
                                      }}
                                    >
                                      End Time
                                    </span>
                                    <select
                                      value={slot.endHour}
                                      onChange={(e) =>
                                        handleUpdateSlot(bs.id, activeDay, slotIdx, "endHour", e.target.value)
                                      }
                                      style={{
                                        padding: "4px 6px",
                                        borderRadius: "5px",
                                        border: conflict ? "1px solid #fecaca" : "1px solid #cbd5e1",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: "#0f172a",
                                      }}
                                    >
                                      {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(
                                        (h) => (
                                          <option key={h} value={h}>
                                            {h}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <span style={{ fontWeight: 800, color: "#64748b" }}>:</span>
                                    <select
                                      value={slot.endMinute}
                                      onChange={(e) =>
                                        handleUpdateSlot(bs.id, activeDay, slotIdx, "endMinute", e.target.value)
                                      }
                                      style={{
                                        padding: "4px 6px",
                                        borderRadius: "5px",
                                        border: conflict ? "1px solid #fecaca" : "1px solid #cbd5e1",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: "#0f172a",
                                      }}
                                    >
                                      {["00", "15", "30", "45"].map((m) => (
                                        <option key={m} value={m}>
                                          {m}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={slot.endAmPm}
                                      onChange={(e) =>
                                        handleUpdateSlot(
                                          bs.id,
                                          activeDay,
                                          slotIdx,
                                          "endAmPm",
                                          e.target.value as any
                                        )
                                      }
                                      style={{
                                        padding: "4px 6px",
                                        borderRadius: "5px",
                                        border: "1px solid #258ec8",
                                        background: "rgba(37, 142, 200, 0.1)",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        color: "#258ec8",
                                      }}
                                    >
                                      <option value="AM">AM</option>
                                      <option value="PM">PM</option>
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSlot(bs.id, activeDay, slotIdx)}
                                      title="Remove Slot"
                                      style={{
                                        marginLeft: "auto",
                                        background: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        color: "#ef4444",
                                        padding: "5px 8px",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <Trash2 size={12} color="#ef4444" />
                                    </button>
                                  </div>

                                  {/* OVERLAP CONFLICT ALERT BADGE */}
                                  {conflict && (
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#dc2626",
                                        fontWeight: 800,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        background: "#ffffff",
                                        border: "1px solid #fca5a5",
                                        padding: "3px 8px",
                                        borderRadius: "5px",
                                        width: "fit-content",
                                        marginTop: "2px",
                                      }}
                                    >
                                      <span>
                                        ⚠️ Overlapping Schedule Conflict: Doctor is already scheduled at{" "}
                                        {conflict.branch} ({conflict.timeStr})
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              background: "#ffffff",
                              borderRadius: "8px",
                              border: "1px dashed #cbd5e1",
                            }}
                          >
                            <span style={{ fontSize: "11.5px", color: "#ef4444", fontWeight: 800 }}>
                              Unavailable / Closed on {activeDay}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 4. REMOVE SCHEDULE BUTTON */}
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveBranchSchedule(bs.id)}
                          style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#ef4444",
                            padding: "6px 12px",
                            borderRadius: "7px",
                            fontSize: "11px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <Trash2 size={13} color="#ef4444" /> Remove Schedule
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* BOTTOM SAVE BUTTON */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px" }}>
              <button
                type="button"
                onClick={handleSaveAll}
                style={{
                  background: "#258ec8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 24px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(37, 142, 200, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
              >
                <CheckCircle2 size={16} /> Save Profile &amp; Schedules
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL: ADD DOCTOR PROFILE                                           */}
      {/* =================================================================== */}
      {isAddProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5">
            <h3 className="font-extrabold text-slate-900 text-base">Select Doctor to Configure</h3>
            <p className="text-xs text-slate-500">
              Choose a registered practitioner from Staff Management to set up multi-branch weekly schedules.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Registered Doctor
              </label>
              <select
                value={selectedDocForNewProfile}
                onChange={(e) => setSelectedDocForNewProfile(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
              >
                {availableDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddProfileOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProfileFromDoctor}
                className="px-5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-sm"
              >
                Continue to Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
