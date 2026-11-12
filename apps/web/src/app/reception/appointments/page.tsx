"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Building2,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Stethoscope,
  X,
  Printer,
  CalendarCheck,
  Plus,
  Users,
  Edit2,
  GitMerge,
  Trash2,
  History,
} from "lucide-react";
import { generateRegistrationId } from "@/utils/idGenerator";
import AnalogClockPicker from "@/components/AnalogClockPicker";

export interface DoctorOption {
  id: string;
  doctorId?: string;
  name: string;
  specialty?: string;
  phone?: string;
  color?: string;
  slots?: any[];
}
export interface PatientSuggestion {
  id: string;
  name: string;
  phone: string;
  regId: string;
  branch?: string;
  diseases?: string;
}
export interface GeneratedSlot {
  time: string;
  bookedCount: number;
  maxCapacity: number;
  isFull: boolean;
  isNoShow?: boolean;
  isPast?: boolean;
  isTemporary?: boolean;
}
export interface SlotSession {
  id: string;
  title: string;
  rawRangeText?: string;
  slots: GeneratedSlot[];
  suggestedBeforeTime: string;
  suggestedAfterTime: string;
}
const DOCTOR_COLORS = ["#0284c7", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2"];
const DEFAULT_CLINIC_DOCTORS: DoctorOption[] = [];
const MARKETING_SOURCES = [
  "Old Patient",
  "Referral",
  "Google",
  "Youtube",
  "Walk-in",
  "Practo",
  "Facebook",
  "Instagram",
];
const CONSULTATION_MODES = [
  { id: "In-Clinic", label: "In-Clinic" },
  { id: "Online", label: "Online" },
];
export default function ReceptionAppointmentsPage() {
  const [branchName, setBranchName] = useState("");
  const [branchesList, setBranchesList] = useState<string[]>([]);
  const [userRole, setUserRole] = useState("RECEPTION");
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  // Reback Mode & Search States
  const [isRebackMode, setIsRebackMode] = useState(false);
  const [manualRegId, setManualRegId] = useState("");
  const [isCheckingRegId, setIsCheckingRegId] = useState(false);
  const [foundProfile, setFoundProfile] = useState<PatientSuggestion | null>(null);
  // Form Fields
  const [patientName, setPatientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [diseases, setDiseases] = useState("");
  const [marketingSource, setMarketingSource] = useState("");
  const [consultationMode, setConsultationMode] = useState("");
  // Autocomplete Suggestions
  const [patientSuggestions, setPatientSuggestions] = useState<PatientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  // Appointment Details
  const [appointmentDate, setAppointmentDate] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [activeNoShows, setActiveNoShows] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [temporarySlots, setTemporarySlots] = useState<{ time: string; sessionIndex?: number }[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<any[]>([]);
  // Dropdown States
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  // Interactive Web Calendar State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarModalRef = useRef<HTMLDivElement>(null);
  const [calMonth, setCalMonth] = useState(0);
  const [calYear, setCalYear] = useState(2026);

  // Profiles Modal States (Check Profiles, 10-Digit Auto-Popup, Edit, Merge, Delete)
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);
  const [phoneProfiles, setPhoneProfiles] = useState<any[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [editingProfileRegId, setEditingProfileRegId] = useState<string | null>(null);
  const [editingNameVal, setEditingNameVal] = useState("");
  const [mergingSourceProfile, setMergingSourceProfile] = useState<any | null>(null);
  const [mergingTargetRegId, setMergingTargetRegId] = useState("");
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalSearchInput, setModalSearchInput] = useState("");

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Sync calendar month/year with appointmentDate
  useEffect(() => {
    if (appointmentDate) {
      const parts = appointmentDate.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          setCalYear(parseInt(parts[0], 10));
          setCalMonth(parseInt(parts[1], 10) - 1);
        } else {
          setCalYear(parseInt(parts[2], 10));
          setCalMonth(parseInt(parts[1], 10) - 1);
        }
      }
    }
  }, [appointmentDate]);

  const daysInMonth = useMemo(() => new Date(calYear, calMonth + 1, 0).getDate(), [calYear, calMonth]);
  const firstDayOffset = useMemo(() => new Date(calYear, calMonth, 1).getDay(), [calYear, calMonth]);

  // Success Confirmation State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<any>(null);
  // Helper: Get Day Abbreviation (Mon, Tue, Wed...)
  const getDayOfWeekAbbr = (dateStr: string): string => {
    if (!dateStr) return "Mon";
    let d: Date;
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else {
      d = new Date(dateStr);
    }
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[d.getDay()] || "Mon";
  };
  const toDDMMYYYY = (dt: string): string => {
    if (!dt) return "";
    const parts = dt.trim().split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dt;
  };
  const toISODate = (dt: string): string => {
    if (!dt) return "";
    const parts = dt.trim().split("-");
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dt;
  };

  // Helper: Robust Time String Parser (matches "10:30 AM", "10:30AM", "10:30", "02:00 PM", "10 AM")
  const parseTimeToMinutes = (t: string): number => {
    if (!t) return 0;
    const clean = t.trim().toUpperCase();
    const match = clean.match(/(\d{1,2})(?::(\d{1,2}))?\s*([APap][Mm])?/);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const ap = (match[3] || "").toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    // Heuristic for clinic consultation hours if AM/PM is omitted: 1..7 are PM
    if (!ap && h >= 1 && h <= 7) h += 12;
    return h * 60 + m;
  };

  const formatMinutesToTime = (min: number): string => {
    let h = Math.floor(min / 60) % 24;
    const m = min % 60;
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
  };

  const isDateInPast = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split("-");
    let y: number, m: number, d: number;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        y = parseInt(parts[2], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[0], 10);
      }
      const target = new Date(y, m, d);
      target.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return target.getTime() < today.getTime();
    }
    return false;
  };

  const isDateToday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split("-");
    let y: number, m: number, d: number;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        y = parseInt(parts[2], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[0], 10);
      }
      const today = new Date();
      return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
    }
    return false;
  };

  const isSlotTimePassed = (timeStr: string, dateStr: string): boolean => {
    if (isDateInPast(dateStr)) return true;
    if (!isDateToday(dateStr)) return false;
    const slotMinutes = parseTimeToMinutes(timeStr);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes < currentMinutes;
  };

  // Fetch doctors and active no-shows for this branch and date
  const fetchDoctorsAndNoShows = async (bName: string, dt: string, modeOverride?: string) => {
    try {
      setLoadingDoctors(true);
      const isOnline = (modeOverride !== undefined ? modeOverride : consultationMode) === "Online";

      if (isOnline) {
        // Online Mode: Fetch ALL doctors across the clinic system
        const res = await fetch("/api/admin/employees?category=DOCTOR");
        if (res.ok) {
          const data = await res.json();
          const docList = Array.isArray(data.employees) ? data.employees : [];
          const mapped: DoctorOption[] = docList.map((d: any, idx: number) => ({
            id: d.id,
            doctorId: d.id,
            name: d.name,
            specialty: d.designation || d.specialty || "Homeopathic Consultant",
            phone: d.phone,
            color: DOCTOR_COLORS[idx % DOCTOR_COLORS.length],
            slots: [],
          }));
          setAvailableDoctors(mapped);
          setActiveNoShows([]);
          return;
        }
      }

      const day = getDayOfWeekAbbr(dt);
      const cleanBranch = bName.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

      const [timingsRes, noShowRes] = await Promise.all([
        fetch(`/api/admin/doctor-timings?branch=${encodeURIComponent(cleanBranch)}&day=${day}`),
        fetch(`/api/reception/doctor-no-show?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dt)}`),
      ]);

      if (noShowRes.ok) {
        const noShowData = await noShowRes.json();
        if (noShowData.success && Array.isArray(noShowData.noShows)) {
          setActiveNoShows(noShowData.noShows);
        } else {
          setActiveNoShows([]);
        }
      }

      if (timingsRes.ok) {
        const data = await timingsRes.json();
        if (data.success && Array.isArray(data.doctors)) {
          const mapped: DoctorOption[] = data.doctors.map((d: any, idx: number) => ({
            id: d.doctorId || d.id,
            doctorId: d.doctorId || d.id,
            name: d.doctorName || d.name,
            specialty: d.specialty || "Homeopathic Consultant",
            phone: d.phone,
            color: DOCTOR_COLORS[idx % DOCTOR_COLORS.length],
            slots: d.slots || [],
          }));
          setAvailableDoctors(mapped);
          return;
        }
      }
      // Strictly empty if no doctors scheduled for this branch on this day in Admin
      setAvailableDoctors([]);
    } catch {
      setAvailableDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Initialize receptionist's own branch & available branches
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const initialDate = `${d}-${m}-${y}`;
    setAppointmentDate(initialDate);
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());

    const role = typeof window !== "undefined" ? localStorage.getItem("user_role") || "RECEPTION" : "RECEPTION";
    setUserRole(role);

    const assigned = typeof window !== "undefined"
      ? localStorage.getItem("user_assigned_branch") ||
        localStorage.getItem("user_branch") ||
        localStorage.getItem("branch_name") ||
        ""
      : "";

    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const allBranchNames: string[] = data.data.map((b: any) => b.name);
          const cleanAssigned = (assigned || "")
            .toLowerCase()
            .replace(/spiritual|homeopathy|branch/gi, "")
            .replace(/[^a-z0-9]/g, "")
            .trim();
          const matchedBranch = allBranchNames.find((b) => {
            const cb = b.toLowerCase().replace(/spiritual|homeopathy|branch/gi, "").replace(/[^a-z0-9]/g, "").trim();
            const isKpbMatch = (cleanAssigned === "kpb" || cleanAssigned === "kphb") && (cb === "kpb" || cb === "kphb");
            return cb === cleanAssigned || isKpbMatch;
          });
          const validBranch = matchedBranch || allBranchNames[0] || assigned || "Kphb Branch";

          if (typeof window !== "undefined" && matchedBranch && matchedBranch !== assigned) {
            try {
              localStorage.setItem("user_assigned_branch", matchedBranch);
              localStorage.setItem("user_branch", matchedBranch);
              localStorage.setItem("branch_name", matchedBranch);
            } catch {}
          }

          setBranchName(validBranch);

          // For Reception staff: strictly locked to their own clinic branch!
          // For Admin: can select between all branches.
          if (role === "ADMIN") {
            setBranchesList(allBranchNames);
          } else {
            setBranchesList([validBranch]);
          }

          fetchDoctorsAndNoShows(validBranch, appointmentDate);
        } else if (assigned) {
          setBranchName(assigned);
          setBranchesList([assigned]);
          fetchDoctorsAndNoShows(assigned, appointmentDate);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch branches:", err);
        const fallback = assigned || "KPHB Branch";
        setBranchName(fallback);
        setBranchesList([fallback]);
        fetchDoctorsAndNoShows(fallback, appointmentDate);
      });
  }, []);

  const handleSelectBranch = (b: string) => {
    setBranchName(b);
    setSelectedDoctor(null);
    setSelectedSlot("");
    setIsBranchDropdownOpen(false);
  };

  useEffect(() => {
    if (branchName) {
      fetchDoctorsAndNoShows(branchName, appointmentDate, consultationMode);
    }
  }, [appointmentDate, branchName, consultationMode]);

  // Fetch temporary slots and existing booked appointments for this branch, doctor, and date
  useEffect(() => {
    if (branchName && selectedDoctor && appointmentDate) {
      const docId = selectedDoctor.id || selectedDoctor.doctorId || "";
      fetch(
        `/api/reception/temporary-slots?branch=${encodeURIComponent(branchName)}&doctorId=${encodeURIComponent(docId)}&date=${encodeURIComponent(appointmentDate)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.slots)) {
            setTemporarySlots(data.slots);
          } else {
            setTemporarySlots([]);
          }
        })
        .catch(() => setTemporarySlots([]));

      fetch(
        `/api/reception/appointments?branch=${encodeURIComponent(branchName)}&date=${encodeURIComponent(appointmentDate)}&doctorId=${encodeURIComponent(docId)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.appointments)) {
            setBookedAppointments(data.appointments);
          } else {
            setBookedAppointments([]);
          }
        })
        .catch(() => setBookedAppointments([]));
    } else {
      setTemporarySlots([]);
      setBookedAppointments([]);
    }
  }, [branchName, selectedDoctor, appointmentDate]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(event.target as Node)) {
        setIsDoctorDropdownOpen(false);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeOpen(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setIsSourceOpen(false);
      }
      if (calendarModalRef.current && !calendarModalRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter for AVAILABLE ONLY doctors (Exclude doctors with FULL_DAY no-show on this date)
  const availableOnlyDoctors = useMemo(() => {
    if (consultationMode === "Online") {
      return availableDoctors;
    }
    return availableDoctors.filter((doc) => {
      const isFullDayOff = activeNoShows.some(
        (ns) =>
          (ns.doctorId === doc.id || ns.doctorId === doc.doctorId || ns.doctorName === doc.name) &&
          ns.type === "FULL_DAY"
      );
      return !isFullDayOff;
    });
  }, [availableDoctors, activeNoShows, consultationMode]);

  // Keep selected doctor in sync with available-only doctors list (refresh slots if date changed)
  useEffect(() => {
    if (selectedDoctor) {
      const match = availableOnlyDoctors.find(
        (d) => d.id === selectedDoctor.id || d.doctorId === selectedDoctor.doctorId
      );
      if (match) {
        if (JSON.stringify(match.slots) !== JSON.stringify(selectedDoctor.slots)) {
          setSelectedDoctor(match);
        }
      } else {
        setSelectedDoctor(null);
      }
    }
  }, [availableOnlyDoctors]);

  // Group slots into Doctor Sessions (e.g. Session 1: 12:00 PM - 02:00 PM, Session 2: 05:00 PM - 10:00 PM)
  const slotSessions = useMemo((): SlotSession[] => {
    if (!selectedDoctor) return [];
    let ranges = selectedDoctor.slots || [];

    // Fallback if doctor is selected but slots array is empty
    if (ranges.length === 0 && temporarySlots.length === 0) {
      if ((selectedDoctor as any).shift1Start && (selectedDoctor as any).shift1End) {
        ranges = [{ displayText: `${(selectedDoctor as any).shift1Start} - ${(selectedDoctor as any).shift1End}` } as any];
      } else if ((selectedDoctor as any).shiftHours && (selectedDoctor as any).shiftHours.includes("-")) {
        ranges = [{ displayText: (selectedDoctor as any).shiftHours } as any];
      } else {
        ranges = [
          { displayText: "10:00 AM - 01:00 PM" } as any,
          { displayText: "05:00 PM - 09:00 PM" } as any,
        ];
      }
    }

    const doctorNoShow = activeNoShows.find(
      (ns) =>
        ns.doctorId === selectedDoctor.doctorId ||
        ns.doctorId === selectedDoctor.id ||
        ns.doctorName === selectedDoctor.name
    );

    const checkIsSlotNoShow = (curMin: number): boolean => {
      if (!doctorNoShow) return false;
      if (doctorNoShow.type === "FULL_DAY") return true;
      if (doctorNoShow.type === "HALF_DAY") {
        if (doctorNoShow.halfDayType === "FIRST_HALF") {
          return curMin < 840; // Before 2:00 PM
        } else {
          return curMin >= 840; // 2:00 PM onwards
        }
      }
      if (doctorNoShow.type === "SPECIFIC_TIME" && doctorNoShow.startTime && doctorNoShow.endTime) {
        const startNoShow = parseTimeToMinutes(doctorNoShow.startTime);
        const endNoShow = parseTimeToMinutes(doctorNoShow.endTime);
        return curMin >= startNoShow && curMin < endNoShow;
      }
      return false;
    };

    const effectiveRanges = ranges.length > 0 ? ranges : [{ displayText: "10:00 AM - 01:00 PM" }];

    return effectiveRanges.map((r: any, sIdx: number) => {
      let startMin = 0;
      let endMin = 0;
      const rText = typeof r === "string" ? r : (r?.displayText || "");

      if (typeof r === "object" && r?.startHour && r?.endHour) {
        const sHour = r.startHour;
        const sMin = r.startMin ?? r.startMinute ?? "00";
        const sAmPm = r.startAmPm || "AM";

        const eHour = r.endHour;
        const eMin = r.endMin ?? r.endMinute ?? "00";
        const eAmPm = r.endAmPm || "PM";

        startMin = parseTimeToMinutes(`${sHour}:${sMin} ${sAmPm}`);
        endMin = parseTimeToMinutes(`${eHour}:${eMin} ${eAmPm}`);
      } else if (rText) {
        const parts = rText.split(/[-–—]|to/i);
        if (parts.length === 2) {
          startMin = parseTimeToMinutes(parts[0]);
          endMin = parseTimeToMinutes(parts[1]);
        }
      }

      // Handle AM/PM inversion mistakes (e.g. 10:00 PM - 08:00 PM -> 10:00 AM - 08:00 PM)
      if (endMin <= startMin) {
        if (startMin >= 480) {
          const testStart = startMin - 720;
          if (testStart > 0 && endMin > testStart) {
            startMin = testStart;
          }
        }
        if (endMin <= startMin && endMin < 720) {
          const testEnd = endMin + 720;
          if (testEnd > startMin) {
            endMin = testEnd;
          }
        }
        if (endMin <= startMin) {
          endMin += 1440; // night shift spanning midnight
        }
      }

      if (endMin <= startMin) {
        endMin = startMin + 120;
      }

      const sessionSlots: GeneratedSlot[] = [];

      const getSlotBookedCount = (timeStr: string) => {
        const normTime = timeStr.trim().toUpperCase();
        return bookedAppointments.filter(
          (a) => (a.timeSlot || "").trim().toUpperCase() === normTime && a.status !== "CANCELLED"
        ).length;
      };

      for (let cur = startMin; cur < endMin; cur += 15) {
        const timeStr = formatMinutesToTime(cur);
        const isNoShow = checkIsSlotNoShow(cur);
        const bookedCount = getSlotBookedCount(timeStr);
        const isPast = isSlotTimePassed(timeStr, appointmentDate);
        const isFull = isNoShow || bookedCount >= 3 || isPast;
        sessionSlots.push({
          time: timeStr,
          bookedCount,
          maxCapacity: 3,
          isFull,
          isNoShow,
          isPast,
          isTemporary: false,
        });
      }

      // Merge temporary slots belonging to this session
      temporarySlots.forEach((t) => {
        const tTime = typeof t === "string" ? (t as string).trim() : (t.time || "").trim();
        const tSessionIdx = typeof t === "object" ? t.sessionIndex : undefined;

        const isForThisSession =
          typeof tSessionIdx === "number"
            ? tSessionIdx === sIdx
            : effectiveRanges.length === 1
            ? true
            : Math.abs(parseTimeToMinutes(tTime) - startMin) < Math.abs(parseTimeToMinutes(tTime) - (startMin + 360));

        if (isForThisSession && !sessionSlots.some((s) => s.time === tTime)) {
          const curMin = parseTimeToMinutes(tTime);
          const isNoShow = checkIsSlotNoShow(curMin);
          const bookedCount = getSlotBookedCount(tTime);
          const isPast = isSlotTimePassed(tTime, appointmentDate);
          const isFull = isNoShow || bookedCount >= 3 || isPast;
          sessionSlots.push({
            time: tTime,
            bookedCount,
            maxCapacity: 3,
            isFull,
            isNoShow,
            isPast,
            isTemporary: true,
          });
        }
      });

      // Sort session slots chronologically
      sessionSlots.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

      // Calculate suggested before and after times for THIS session
      let suggestedBeforeTime = "09:45 AM";
      let suggestedAfterTime = "01:00 PM";

      if (sessionSlots.length > 0) {
        const mins = sessionSlots.map((s) => parseTimeToMinutes(s.time));
        const minMin = Math.min(...mins);
        const maxMin = Math.max(...mins);
        suggestedBeforeTime = formatMinutesToTime(Math.max(0, minMin - 15));
        suggestedAfterTime = formatMinutesToTime(maxMin + 15);
      }

      const displayRange = r.displayText || `${formatMinutesToTime(startMin)} - ${formatMinutesToTime(endMin)}`;
      const title = effectiveRanges.length > 1 ? `Session ${sIdx + 1} (${displayRange})` : `Consultation Session (${displayRange})`;

      return {
        id: `session-${sIdx + 1}`,
        title,
        rawRangeText: displayRange,
        slots: sessionSlots,
        suggestedBeforeTime,
        suggestedAfterTime,
      };
    });
  }, [selectedDoctor, activeNoShows, temporarySlots, bookedAppointments, appointmentDate]);

  // Flat list of all available slots across all sessions for validation
  const generatedSlots = useMemo((): GeneratedSlot[] => {
    return slotSessions.flatMap((s) => s.slots);
  }, [slotSessions]);

  const handleAddSessionSlot = async (sessionIdx: number, slotTime: string) => {
    if (!selectedDoctor || !branchName || !appointmentDate || !slotTime) return;
    const docId = selectedDoctor.id || selectedDoctor.doctorId || "";
    try {
      const res = await fetch("/api/reception/temporary-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: branchName,
          doctorId: docId,
          date: appointmentDate,
          time: slotTime,
          sessionIndex: sessionIdx,
          action: "ADD",
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.slots)) {
        setTemporarySlots(data.slots);
      }
    } catch (err) {
      console.error("Failed to add session slot:", err);
    }
  };

  const handleRemoveTemporarySlot = async (slotTime: string) => {
    if (!selectedDoctor || !branchName || !appointmentDate) return;
    const docId = selectedDoctor.id || selectedDoctor.doctorId || "";
    try {
      const res = await fetch("/api/reception/temporary-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: branchName,
          doctorId: docId,
          date: appointmentDate,
          time: slotTime,
          action: "REMOVE",
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.slots)) {
        setTemporarySlots(data.slots);
      }
      if (selectedSlot === slotTime) {
        setSelectedSlot("");
      }
    } catch (err) {
      console.error("Failed to remove temporary slot:", err);
    }
  };

  // Do not auto-select slot; user selects slot intentionally
  useEffect(() => {
    if (selectedSlot && !generatedSlots.some((s) => s.time === selectedSlot && !s.isFull && !s.isNoShow)) {
      setSelectedSlot("");
    }
  }, [generatedSlots]);

  // Autocomplete patient search
  const handlePatientNameChange = async (text: string) => {
    setPatientName(text);
    if (text.trim().length >= 2) {
      try {
        const cleanB = branchName.replace(/Spiritual Homeopathy/gi, "").trim();
        const res = await fetch(`/api/reception/patients?query=${encodeURIComponent(text.trim())}&branch=${encodeURIComponent(cleanB)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.suggestions)) {
            setPatientSuggestions(data.suggestions);
            setShowSuggestions(data.suggestions.length > 0);
            return;
          }
        }
        setShowSuggestions(false);
      } catch {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (p: PatientSuggestion) => {
    setPatientName(p.name);
    setPhoneNumber(p.phone);
    if (p.regId) setManualRegId(p.regId);
    if (p.diseases) setDiseases(p.diseases);
    setFoundProfile(p);
    setIsRebackMode(true);
    setMarketingSource("Old Patient");
    setShowSuggestions(false);
  };

  // Profiles Multi-Account Helpers (Check Profiles, 10-Digit Auto-Popup, Edit Name, Merge, Delete)
  const fetchAndOpenProfiles = async (phoneOrQuery: string, autoOpen = true) => {
    const raw = phoneOrQuery.trim();
    if (!raw) return;
    setIsLoadingProfiles(true);
    setModalFeedback(null);
    try {
      const res = await fetch(`/api/reception/patients/by-phone?query=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.profiles)) {
        setPhoneProfiles(data.profiles);
        if (autoOpen && data.profiles.length > 0) {
          setIsProfilesModalOpen(true);
        } else if (!autoOpen) {
          setIsProfilesModalOpen(true);
        }
      } else {
        setPhoneProfiles([]);
        if (!autoOpen) setIsProfilesModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch phone profiles:", err);
      setPhoneProfiles([]);
      if (!autoOpen) setIsProfilesModalOpen(true);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(clean);
    if (clean.length === 10) {
      setModalSearchInput(clean);
      fetchAndOpenProfiles(clean, true);
    }
  };

  const handleCheckProfiles = () => {
    const query = phoneNumber || modalSearchInput || "";
    setModalSearchInput(query);
    setIsProfilesModalOpen(true);
    if (query.replace(/\D/g, "").length === 10 || /[a-zA-Z]/.test(query)) {
      fetchAndOpenProfiles(query, false);
    } else {
      setPhoneProfiles([]);
    }
  };

  const handleSelectProfile = (profile: any) => {
    setPatientName(profile.name);
    if (profile.phone) {
      const cleanPhone = profile.phone.replace(/\D/g, "").slice(-10);
      setPhoneNumber(cleanPhone);
      setModalSearchInput(cleanPhone);
    }
    setFoundProfile(profile);
    setIsRebackMode(true);
    setManualRegId(profile.regId);
    if (profile.diseases) setDiseases(profile.diseases);
    // User requirement: IF PATIENT ALREADY CREATED, SOURCE TO DEFAULT "Old Patient"
    setMarketingSource("Old Patient");
    setIsProfilesModalOpen(false);
  };

  const handleCreateNewProfileForNumber = () => {
    if (modalSearchInput) {
      const cleanDigits = modalSearchInput.replace(/\D/g, "").slice(-10);
      if (cleanDigits.length === 10) {
        setPhoneNumber(cleanDigits);
      }
    }
    setPatientName("");
    setFoundProfile(null);
    setIsRebackMode(false);
    setManualRegId("");
    // User requirement: IF NEW PATIENT / NEW PROFILE CREATED, RECEPTIONIST MUST CHOOSE FROM DROPDOWN
    setMarketingSource("");
    setIsProfilesModalOpen(false);
  };

  const handleSaveEditedName = async (regId: string) => {
    if (!editingNameVal.trim()) return;
    try {
      const res = await fetch("/api/reception/patients/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_NAME", regId, newName: editingNameVal.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setModalFeedback({ type: "success", text: "Profile name updated successfully!" });
        setEditingProfileRegId(null);
        if (foundProfile && foundProfile.regId === regId) {
          setPatientName(editingNameVal.trim());
        }
        fetchAndOpenProfiles(phoneNumber, false);
      } else {
        setModalFeedback({ type: "error", text: data.error || "Failed to update name." });
      }
    } catch {
      setModalFeedback({ type: "error", text: "Network error updating name." });
    }
  };

  const handleDeleteProfile = async (regId: string, name: string) => {
    if (!confirm(`Delete profile for "${name}" (${regId})? It will be archived in Admin trash for 30 days and can be restored. Its ID sequence remains reserved.`)) {
      return;
    }
    try {
      const res = await fetch("/api/reception/patients/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE", regId }),
      });
      const data = await res.json();
      if (data.success) {
        setModalFeedback({ type: "success", text: `Profile "${name}" deleted and moved to 30-day trash.` });
        if (foundProfile && foundProfile.regId === regId) {
          handleCreateNewProfileForNumber();
        }
        fetchAndOpenProfiles(phoneNumber, false);
      } else {
        setModalFeedback({ type: "error", text: data.error || "Failed to delete profile." });
      }
    } catch {
      setModalFeedback({ type: "error", text: "Network error deleting profile." });
    }
  };

  const handleExecuteMerge = async () => {
    if (!mergingSourceProfile || !mergingTargetRegId) return;
    if (!confirm(`Merge "${mergingSourceProfile.name}" (${mergingSourceProfile.regId}) into (${mergingTargetRegId})? All clinical history and appointments will transfer to (${mergingTargetRegId}), and (${mergingSourceProfile.regId}) will be disabled.`)) {
      return;
    }
    try {
      const res = await fetch("/api/reception/patients/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MERGE",
          targetRegId: mergingTargetRegId,
          sourceRegId: mergingSourceProfile.regId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalFeedback({ type: "success", text: `Merged successfully! ${data.mergedCount} appointments transferred to ${mergingTargetRegId}.` });
        setMergingSourceProfile(null);
        setMergingTargetRegId("");
        fetchAndOpenProfiles(phoneNumber, false);
      } else {
        setModalFeedback({ type: "error", text: data.error || "Failed to merge profiles." });
      }
    } catch {
      setModalFeedback({ type: "error", text: "Network error merging profiles." });
    }
  };

  // Reback Registration ID Lookup
  const handleManualProfileLookup = async (idToTest: string) => {
    const cleanId = idToTest.trim().toUpperCase();
    if (!cleanId || cleanId.length < 3) return;

    setIsCheckingRegId(true);
    try {
      const res = await fetch(`/api/reception/patients?regId=${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.patient) {
          const prof: PatientSuggestion = {
            id: data.patient.id,
            name: data.patient.name,
            phone: data.patient.phone,
            regId: data.patient.regId,
            diseases: data.patient.diseases,
            branch: data.patient.branch,
          };
          setFoundProfile(prof);
          setPatientName(prof.name);
          setPhoneNumber(prof.phone);
          if (prof.diseases) setDiseases(prof.diseases);
          setIsRebackMode(true);
          setMarketingSource("Old Patient");
        } else {
          setFoundProfile(null);
        }
      }
    } catch {
      setFoundProfile(null);
    } finally {
      setIsCheckingRegId(false);
    }
  };

  const handleClearForm = () => {
    setPatientName("");
    setPhoneNumber("");
    setDiseases("");
    setManualRegId("");
    setFoundProfile(null);
    setPatientSuggestions([]);
    setShowSuggestions(false);
    setMarketingSource("");
    setConsultationMode("");
    setSelectedSlot("");
    setSelectedDoctor(null);
    setIsRebackMode(false);
  };

  // Submit Booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert("Please enter patient full name.");
      return;
    }
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!consultationMode) {
      alert("Please select consultation mode.");
      return;
    }
    if (!marketingSource) {
      alert("Please select patient source.");
      return;
    }
    if (!selectedDoctor) {
      alert("Please select an available doctor for consultation.");
      return;
    }
    if (!selectedSlot) {
      alert(consultationMode === "Online" ? "Please select a consultation time on the analog clock." : "Please select a 15-minute consultation time slot.");
      return;
    }

    if (isDateInPast(appointmentDate)) {
      alert("Cannot book appointments for past dates. For historical records, please use Old Patient RX.");
      return;
    }

    if (isSlotTimePassed(selectedSlot, appointmentDate)) {
      alert(`Time slot ${selectedSlot} has already passed for today. Please select an upcoming consultation time slot.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const existingId = (foundProfile?.regId || manualRegId || "").trim().toUpperCase();
      const isExisting = isRebackMode || Boolean(existingId);
      const registrationId = isExisting && existingId
        ? existingId
        : await generateRegistrationId(branchName);

      const payload = {
        registrationId,
        patientName: patientName.trim(),
        phoneNumber: cleanPhone,
        diseases: diseases.trim() || undefined,
        marketingSource: isExisting ? (marketingSource || "Old Patient") : marketingSource,
        consultationMode,
        selectedDoctor: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        appointmentDate,
        selectedTimeSlot: selectedSlot,
        branch: branchName,
        isReback: isExisting,
      };

      const res = await fetch("/api/reception/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBookedDetails({
          token: data.token || `#A-${Math.floor(1000 + Math.random() * 9000)}`,
          regId: data.registrationId || registrationId,
          name: patientName,
          doctor: selectedDoctor.name,
          date: appointmentDate,
          time: selectedSlot,
        });
        setShowSuccessModal(true);
        handleClearForm();

        // Refresh booked appointments list to update slot capacities immediately
        const docId = selectedDoctor.id || selectedDoctor.doctorId || "";
        fetch(
          `/api/reception/appointments?branch=${encodeURIComponent(branchName)}&date=${encodeURIComponent(appointmentDate)}&doctorId=${encodeURIComponent(docId)}`
        )
          .then((r) => r.json())
          .then((d) => {
            if (d.success && Array.isArray(d.appointments)) {
              setBookedAppointments(d.appointments);
            }
          })
          .catch(() => {});
      } else {
        alert(data.error || "Failed to schedule appointment. Please try again.");
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Network error: Could not reach server. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <ReceptionSidebar activePage="appointments" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-8 py-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-5xl mx-auto w-full">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0284c7]">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Book Appointment</h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instant patient registration, token generation &amp; available doctor slot booking
              </p>
            </div>
          </div>
        </header>

        {/* MAIN FORM CONTAINER */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-5xl w-full mx-auto space-y-6">
          <form onSubmit={handleBookingSubmit} className="space-y-6">

            {/* CARD 1: PATIENT DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0284c7] text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                    1
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900">Patient Details</h2>
                </div>
                {(patientName || phoneNumber || diseases) && (
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Clear Form
                  </button>
                )}
              </div>

              {/* PATIENT FULL NAME (WITH AUTOCOMPLETE SUGGESTIONS) */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Patient Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Type patient full name (auto-searches existing roster)"
                    value={patientName}
                    onChange={(e) => handlePatientNameChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  />
                </div>

                {/* SEARCH SUGGESTIONS DROPDOWN (PATIENT AUTOCOMPLETE) */}
                {showSuggestions && patientSuggestions.length > 0 && (
                  <div className="suggestions-dropdown-container">
                    <div className="suggestions-dropdown-header">
                      <div className="flex items-center gap-2">
                        <span>Matching Patients</span>
                        <span className="suggestions-count-badge">
                          {patientSuggestions.length} Found
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="suggestions-close-btn"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {patientSuggestions.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectSuggestion(p)}
                        className="suggestion-item-row"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="suggestion-avatar">
                            {p.name.trim().charAt(0).toUpperCase() || "P"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900 truncate">
                              {p.name}
                            </div>
                            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                              <span>📞 {p.phone}</span>
                              {p.diseases && (
                                <span className="truncate max-w-[180px] text-slate-400">
                                  • {p.diseases}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="suggestion-badge-regid">{p.regId}</span>
                          {p.branch && (
                            <span className="suggestion-badge-branch">{p.branch}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PHONE (+91) & DISEASES (SIDE BY SIDE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PHONE */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Phone (+91) *
                    </label>
                    <button
                      type="button"
                      onClick={handleCheckProfiles}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Users className="w-3 h-3" />
                      <span>Check Profiles</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="Enter 10-digit mobile number"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>
                </div>

                {/* DISEASES / SYMPTOMS */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Diseases / Symptoms
                  </label>
                  <div className="relative">
                    <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Enter diseases / symptoms / chief complaints (e.g. Migraine, Allergy)"
                      value={diseases}
                      onChange={(e) => setDiseases(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>
                </div>
              </div>

              {/* CONSULTATION MODE & PATIENT SOURCE (SIDE BY SIDE - PROFESSIONAL DROPDOWNS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CONSULTATION MODE */}
                <div className="relative" ref={modeDropdownRef}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Consultation Mode *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModeOpen(!isModeOpen);
                      setIsBranchDropdownOpen(false);
                      setIsSourceOpen(false);
                      setIsDoctorDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                      isModeOpen
                        ? "bg-white border-slate-300 ring-2 ring-slate-100 shadow-sm"
                        : "bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-sm truncate ${consultationMode ? "font-bold text-slate-900" : "font-medium text-slate-400"}`}>
                      {consultationMode
                        ? CONSULTATION_MODES.find((m) => m.id === consultationMode)?.label || consultationMode
                        : "Select consultation mode"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isModeOpen ? "rotate-180 text-slate-700" : ""
                      }`}
                    />
                  </button>

                  {/* FLOATING DROPDOWN MENU */}
                  {isModeOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-1.5 animate-in fade-in zoom-in-95 space-y-1">
                      {CONSULTATION_MODES.map((mode) => {
                        const isSelected = consultationMode === mode.id;
                        return (
                          <div
                            key={mode.id}
                            onClick={() => {
                              setConsultationMode(mode.id);
                              setSelectedDoctor(null);
                              setSelectedSlot("");
                              setIsModeOpen(false);
                              fetchDoctorsAndNoShows(branchName, appointmentDate, mode.id);
                            }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? "bg-sky-50 text-[#0284c7] font-bold"
                                : "hover:bg-slate-50 text-slate-700 font-medium"
                            }`}
                          >
                            <span className="text-xs font-semibold">{mode.label}</span>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isSelected ? "border-[#0284c7] bg-white" : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#0284c7]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PATIENT SOURCE */}
                <div className="relative" ref={sourceDropdownRef}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient Source *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSourceOpen(!isSourceOpen);
                      setIsBranchDropdownOpen(false);
                      setIsModeOpen(false);
                      setIsDoctorDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                      isSourceOpen
                        ? "bg-white border-slate-300 ring-2 ring-slate-100 shadow-sm"
                        : "bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-sm truncate ${marketingSource ? "font-bold text-slate-900" : "font-medium text-slate-400"}`}>
                      {marketingSource || "Select patient source"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isSourceOpen ? "rotate-180 text-slate-700" : ""
                      }`}
                    />
                  </button>

                  {/* FLOATING DROPDOWN MENU */}
                  {isSourceOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 space-y-1">
                      {MARKETING_SOURCES.map((source) => {
                        const isSelected = marketingSource === source;
                        return (
                          <div
                            key={source}
                            onClick={() => {
                              setMarketingSource(source);
                              setIsSourceOpen(false);
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? "bg-sky-50 text-[#0284c7] font-bold"
                                : "hover:bg-slate-50 text-slate-700 font-medium"
                            }`}
                          >
                            <span className="text-xs truncate">{source}</span>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isSelected ? "border-[#0284c7] bg-white" : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#0284c7]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 2: APPOINTMENT DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-[#0284c7] text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                  2
                </div>
                <h2 className="text-base font-extrabold text-slate-900">Appointment Details</h2>
              </div>

              {/* BRANCH, DATE PICKER & DOCTOR DROPDOWN (3 COLUMNS ON DESKTOP) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CLINIC BRANCH (DEFAULT / LOCKED TO CLINIC) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Clinic Branch *
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 flex items-center gap-2 select-none shadow-sm">
                    <Building2 className="w-4 h-4 text-[#0284c7] shrink-0" />
                    <span className="truncate" suppressHydrationWarning>{branchName || "Clinic Branch"}</span>
                  </div>
                </div>

                {/* APPOINTMENT DATE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Appointment Date *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCalendarOpen(true);
                      setIsDoctorDropdownOpen(false);
                      setIsModeOpen(false);
                      setIsSourceOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 flex items-center justify-between cursor-pointer transition-all shadow-sm group text-left"
                  >
                    <span>{toDDMMYYYY(appointmentDate)}</span>
                    <Calendar className="w-4 h-4 text-[#0284c7] shrink-0 group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                {/* CONSULTING DOCTOR DROPDOWN (AVAILABLE ONLY - DR NAME ONLY) */}
                <div className="relative" ref={doctorDropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Consulting Doctor {consultationMode === "Online" ? "(All Clinic Doctors)" : `(${getDayOfWeekAbbr(appointmentDate)})`} *
                    </label>
                    {availableOnlyDoctors.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {availableOnlyDoctors.length} {consultationMode === "Online" ? "Doctors" : "Available"}
                      </span>
                    )}
                  </div>

                  {loadingDoctors ? (
                    <div className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
                      <span>Checking doctor availability...</span>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDoctorDropdownOpen(!isDoctorDropdownOpen);
                          setIsBranchDropdownOpen(false);
                          setIsModeOpen(false);
                          setIsSourceOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          isDoctorDropdownOpen
                            ? "bg-white border-slate-300 ring-2 ring-slate-100 shadow-sm"
                            : "bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        {selectedDoctor ? (
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {selectedDoctor.name}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>
                              {availableOnlyDoctors.length === 0
                                ? "No doctors available today"
                                : "Select Doctor"}
                            </span>
                          </div>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                            isDoctorDropdownOpen ? "rotate-180 text-slate-700" : ""
                          }`}
                        />
                      </button>

                      {/* DROPDOWN MENU (AVAILABLE ONLY - DR NAME ONLY) */}
                      {isDoctorDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 max-h-64 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 space-y-1">

                          {availableOnlyDoctors.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">
                              No doctors available at {branchName} on this date.
                            </div>
                          ) : (
                            availableOnlyDoctors.map((doc) => {
                              const isSelected = selectedDoctor?.id === doc.id;
                              return (
                                <div
                                  key={doc.id}
                                  onClick={() => {
                                    setSelectedDoctor(doc);
                                    setSelectedSlot("");
                                    setIsDoctorDropdownOpen(false);
                                  }}
                                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-sky-50 text-[#0284c7]"
                                      : "hover:bg-slate-50 text-slate-900"
                                  }`}
                                >
                                  <div className="text-sm font-bold truncate">
                                    {doc.name}
                                  </div>
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ml-2 ${
                                      isSelected ? "border-[#0284c7] bg-white" : "border-slate-300 bg-white"
                                    }`}
                                  >
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-[#0284c7]" />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* TIME SELECTION: ANALOG CLOCK FOR ONLINE, 15-MIN GRID FOR IN-CLINIC */}
              {consultationMode === "Online" ? (
                <div>
                  <AnalogClockPicker
                    value={selectedSlot}
                    onChange={setSelectedSlot}
                    doctorName={selectedDoctor?.name}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Select Time Slot (15-min intervals) *
                  </label>

                {generatedSlots.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                    {availableOnlyDoctors.length === 0 ? (
                      <div>
                        <p className="font-bold text-slate-700 mb-1">
                          No doctors scheduled at {branchName} on {getDayOfWeekAbbr(appointmentDate)} ({appointmentDate}).
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Please select another date/branch, or configure weekly schedules in <span className="font-semibold text-[#0284c7]">Admin &gt; Doctor Timings</span>.
                        </p>
                      </div>
                    ) : !selectedDoctor ? (
                      <p>Please select an available practitioner from the <strong>Consulting Doctor</strong> dropdown above to view their consultation slots.</p>
                    ) : (
                      <p>No consultation slots configured for <strong>{selectedDoctor.name}</strong> on this day in Doctor Timings.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {slotSessions.map((session, sIdx) => {
                      return (
                        <div
                          key={session.id}
                          className="space-y-3 pb-3"
                        >
                          {/* Session Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                              <h4 className="text-xs font-extrabold text-slate-800 tracking-tight">
                                {session.title}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-[10px] font-bold text-slate-600">
                                {session.slots.length} {session.slots.length === 1 ? "slot" : "slots"}
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                              15-min consultation slots
                            </span>
                          </div>

                          {/* Session Slots Grid */}
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {session.slots.map((slot) => {
                              const isSelected = selectedSlot === slot.time;
                              const isPast = Boolean(slot.isPast);
                              const disabled = slot.isFull || slot.isNoShow || isPast;

                              return (
                                <div key={slot.time} className="relative group">
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      if (isPast) {
                                        alert(`Time slot ${slot.time} has already completed. Please select an upcoming slot.`);
                                        return;
                                      }
                                      if (!disabled) setSelectedSlot(slot.time);
                                    }}
                                    className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all border ${
                                      isPast
                                        ? "bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                                        : disabled
                                        ? "bg-red-50 border-red-200 text-red-600 opacity-60 cursor-not-allowed"
                                        : isSelected
                                        ? "bg-[#0284c7] border-[#0284c7] text-white shadow-md shadow-sky-500/20"
                                        : slot.isTemporary
                                        ? "bg-amber-50/70 border-amber-300 text-slate-800 hover:bg-amber-100/70"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
                                    }`}
                                  >
                                    <span className={`text-xs font-bold ${isSelected ? "text-white" : isPast ? "text-slate-400 line-through" : ""}`}>
                                      {slot.time}
                                    </span>
                                    {slot.isNoShow ? (
                                      <span className="text-[9px] font-extrabold uppercase px-1 py-0.5 rounded bg-red-600 text-white mt-1">
                                        NO-SHOW
                                      </span>
                                    ) : isPast ? (
                                      <span className="text-[9px] font-extrabold uppercase px-1 py-0.5 rounded bg-slate-400 text-white mt-1">
                                        PASSED
                                      </span>
                                    ) : slot.isFull ? (
                                      <span className="text-[9px] font-extrabold uppercase px-1 py-0.5 rounded bg-red-500 text-white mt-1">
                                        FULL
                                      </span>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1 mt-0.5">
                                        {slot.isTemporary && (
                                          <span
                                            className={`text-[8px] font-black uppercase px-1 rounded ${
                                              isSelected ? "bg-white/25 text-white" : "bg-amber-200 text-amber-900"
                                            }`}
                                          >
                                            EXTRA
                                          </span>
                                        )}
                                        <span className={`text-[10px] ${isSelected ? "text-sky-100" : "text-slate-400"}`}>
                                          ({slot.bookedCount}/3)
                                        </span>
                                      </div>
                                    )}
                                  </button>

                                  {/* Delete button only for temporary extension slots */}
                                  {slot.isTemporary && (
                                    <button
                                      type="button"
                                      title={`Delete extra slot ${slot.time}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTemporarySlot(slot.time);
                                      }}
                                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-[11px] font-black shadow-sm cursor-pointer z-10 transition-transform hover:scale-110"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Dynamic Extension Buttons for this specific session */}
                          {selectedDoctor && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                <span>Extend {session.title.split(" (")[0]}:</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddSessionSlot(sIdx, session.suggestedBeforeTime)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0284c7] border border-sky-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Slot Before ({session.suggestedBeforeTime})</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAddSessionSlot(sIdx, session.suggestedAfterTime)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Slot After ({session.suggestedAfterTime})</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

            {/* CONFIRM APPOINTMENT SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-[#0284c7] hover:bg-[#0369a1] text-white text-base font-extrabold rounded-2xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Scheduling Appointment...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <span>Confirm Appointment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* SUCCESS CONFIRMATION MODAL */}
      {showSuccessModal && bookedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Appointment Confirmed!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Token generated and registered in live clinic queue.
              </p>
            </div>

            {/* TOKEN DETAILS CARD */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2.5 font-sans">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-500">Live Token</span>
                <span className="text-base font-extrabold text-[#0284c7] font-mono">
                  {bookedDetails.token}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Reg ID:</span>
                <span className="font-mono font-bold text-slate-800">{bookedDetails.regId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Patient:</span>
                <span className="font-extrabold text-slate-900">{bookedDetails.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Doctor:</span>
                <span className="font-semibold text-slate-800">{bookedDetails.doctor}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Slot:</span>
                <span className="font-semibold text-slate-800">
                  {bookedDetails.date} • {bookedDetails.time}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              Done / Book Another
            </button>
          </div>
        </div>
      )}

      {/* INTERACTIVE CALENDAR POPUP MODAL */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div
            ref={calendarModalRef}
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4"
          >
            {/* Header: Month Year & Nav */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold">Select Appointment Date</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(() => {
                  const now = new Date();
                  const isCurrentMonthOrPast =
                    calYear < now.getFullYear() ||
                    (calYear === now.getFullYear() && calMonth <= now.getMonth());
                  return (
                    <button
                      type="button"
                      disabled={isCurrentMonthOrPast}
                      onClick={() => {
                        if (isCurrentMonthOrPast) return;
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear((y) => y - 1);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      className={`w-7 h-7 rounded-lg text-slate-600 flex items-center justify-center transition-colors ${
                        isCurrentMonthOrPast
                          ? "opacity-25 cursor-not-allowed text-slate-300"
                          : "hover:bg-slate-100 cursor-pointer"
                      }`}
                      title={isCurrentMonthOrPast ? "Past months cannot be selected" : "Previous Month"}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d} className="text-[11px] font-extrabold text-slate-400 py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const formatted = `${String(day).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                const isSelected = appointmentDate === formatted;
                const isToday = (() => {
                  const t = new Date();
                  return day === t.getDate() && calMonth === t.getMonth() && calYear === t.getFullYear();
                })();
                const isPastDate = (() => {
                  const t = new Date();
                  t.setHours(0, 0, 0, 0);
                  const cellDate = new Date(calYear, calMonth, day);
                  cellDate.setHours(0, 0, 0, 0);
                  return cellDate.getTime() < t.getTime();
                })();

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPastDate}
                    onClick={() => {
                      if (isPastDate) return;
                      setAppointmentDate(formatted);
                      setIsCalendarOpen(false);
                    }}
                    title={isPastDate ? "Past dates cannot be booked (use Old Patient RX)" : formatted}
                    className={`h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                      isPastDate
                        ? "text-slate-300 bg-slate-50/50 cursor-not-allowed line-through opacity-50"
                        : isSelected
                        ? "bg-[#0284c7] text-white shadow-md shadow-sky-500/30 font-extrabold scale-105 cursor-pointer"
                        : isToday
                        ? "border-2 border-[#0284c7] text-[#0284c7] font-extrabold hover:bg-sky-50 cursor-pointer"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer Quick Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const d = String(now.getDate()).padStart(2, "0");
                  const m = String(now.getMonth() + 1).padStart(2, "0");
                  const y = now.getFullYear();
                  setAppointmentDate(`${d}-${m}-${y}`);
                  setCalMonth(now.getMonth());
                  setCalYear(y);
                  setIsCalendarOpen(false);
                }}
                className="text-xs font-extrabold text-[#0284c7] hover:underline cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILES POP-UP MODAL (CHECK PROFILES / MULTI-PROFILE POPUP) */}
      {isProfilesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Patient Profiles {modalSearchInput ? `(${modalSearchInput})` : ""}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {phoneProfiles.length} registered {phoneProfiles.length === 1 ? "profile" : "profiles"} found. Multiple family members can share this number.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfilesModalOpen(false);
                  setEditingProfileRegId(null);
                  setMergingSourceProfile(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* INPUT BOX INSIDE PROFILE CHECK POPUP (Enter 10-digit mobile or Patient ID) */}
            <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter 10-digit mobile number or Patient ID (e.g. SPH-KPB-0001)..."
                  value={modalSearchInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModalSearchInput(val);
                    const clean = val.replace(/\D/g, "");
                    if (clean.length === 10) {
                      fetchAndOpenProfiles(clean, true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchAndOpenProfiles(modalSearchInput, true);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                />
              </div>
              <button
                type="button"
                onClick={() => fetchAndOpenProfiles(modalSearchInput, true)}
                disabled={!modalSearchInput.trim() || isLoadingProfiles}
                className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>

            {/* Modal Feedback Banner */}
            {modalFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  modalFeedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <span>{modalFeedback.text}</span>
                <button
                  type="button"
                  onClick={() => setModalFeedback(null)}
                  className="text-xs underline hover:opacity-75 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Modal Body: Profiles List or Merge Mode */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingProfiles ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  Loading patient profiles...
                </div>
              ) : phoneProfiles.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <User className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    {modalSearchInput.trim()
                      ? `No existing profiles found for "${modalSearchInput}"`
                      : "Enter a 10-digit mobile number or Patient ID above"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    You can create a new profile. A new sequential ID (e.g. SPH-KPB-0001) will be assigned automatically.
                  </p>
                </div>
              ) : mergingSourceProfile ? (
                /* MERGE SUB-DIALOG */
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <GitMerge className="w-4 h-4 text-amber-600" />
                      <span>Merge Duplicate Profile: {mergingSourceProfile.name} ({mergingSourceProfile.regId})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMergingSourceProfile(null);
                        setMergingTargetRegId("");
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Select the <strong>Primary Active Profile</strong> to merge into. All appointments from <strong>{mergingSourceProfile.name} ({mergingSourceProfile.regId})</strong> will be transferred to the primary profile, and ({mergingSourceProfile.regId}) will be disabled.
                  </p>
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-extrabold text-slate-700">
                      Select Primary Active Profile:
                    </label>
                    <select
                      value={mergingTargetRegId}
                      onChange={(e) => setMergingTargetRegId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value="">-- Choose Target Profile to Keep --</option>
                      {phoneProfiles
                        .filter((p) => p.regId !== mergingSourceProfile.regId)
                        .map((p) => (
                          <option key={p.regId} value={p.regId}>
                            {p.name} ({p.regId} - {p.branch})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setMergingSourceProfile(null)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!mergingTargetRegId}
                      onClick={handleExecuteMerge}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      Confirm Merge &amp; Transfer History
                    </button>
                  </div>
                </div>
              ) : (
                /* PROFILES LIST */
                phoneProfiles.map((p) => {
                  const isEditing = editingProfileRegId === p.regId;
                  const isCurrent = (foundProfile?.regId === p.regId) || (manualRegId === p.regId);

                  return (
                    <div
                      key={p.regId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-sky-50/70 border-[#0284c7] shadow-xs"
                          : "bg-slate-50/70 hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-sm">
                              <input
                                type="text"
                                value={editingNameVal}
                                onChange={(e) => setEditingNameVal(e.target.value)}
                                className="px-2.5 py-1 text-xs font-extrabold text-slate-900 border border-[#0284c7] rounded-lg bg-white focus:outline-none"
                                placeholder="Enter updated name"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditedName(p.regId)}
                                className="px-2.5 py-1 bg-[#0284c7] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-[#0369a1]"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProfileRegId(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900">{p.name}</h4>
                              <button
                                type="button"
                                title="Edit patient name"
                                onClick={() => {
                                  setEditingProfileRegId(p.regId);
                                  setEditingNameVal(p.name);
                                }}
                                className="text-slate-400 hover:text-[#0284c7] p-0.5 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                            <span className="font-mono font-bold text-[#0284c7] bg-white px-2 py-0.5 rounded-md border border-sky-200">
                              {p.regId}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold text-[11px]">
                              {p.branch}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              • {p.appointmentCount || 0} visits
                            </span>
                            {p.diseases && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                • {p.diseases}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions for this profile */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectProfile(p)}
                            className="px-3.5 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Select Profile</span>
                          </button>

                          {phoneProfiles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setMergingSourceProfile(p);
                                const other = phoneProfiles.find((o) => o.regId !== p.regId);
                                setMergingTargetRegId(other ? other.regId : "");
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                              title="Merge duplicate profiles under this number"
                            >
                              <GitMerge className="w-3.5 h-3.5" />
                              <span>Merge</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteProfile(p.regId, p.name)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Delete profile (archived for 30 days)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer: + Add New Profile for this Number */}
            <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11.5px] text-slate-500 font-medium">
                Want to register another family member under +91 {phoneNumber}?
              </span>

              <button
                type="button"
                onClick={handleCreateNewProfileForNumber}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create New Profile for this Number</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function currentBranchDay(dt: string) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date(dt);
  return days[d.getDay()] || "Today";
}
